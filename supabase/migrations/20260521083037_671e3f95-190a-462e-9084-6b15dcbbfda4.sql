
-- ============== ENUMS ==============
create type public.app_role as enum ('admin', 'user');
create type public.wheel_status as enum ('waiting', 'running', 'completed', 'aborted');
create type public.tx_kind as enum (
  'starting_grant', 'join_debit', 'winner_credit', 'admin_credit',
  'app_credit', 'refund', 'admin_grant'
);

-- ============== TABLES ==============
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  coins bigint not null default 0 check (coins >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role app_role not null,
  unique (user_id, role)
);

create table public.wheel_config (
  id int primary key default 1 check (id = 1),
  entry_fee bigint not null default 100 check (entry_fee > 0),
  winner_pct int not null default 70 check (winner_pct between 0 and 100),
  admin_pct  int not null default 20 check (admin_pct between 0 and 100),
  app_pct    int not null default 10 check (app_pct between 0 and 100),
  min_participants int not null default 3 check (min_participants >= 2),
  join_window_seconds int not null default 180 check (join_window_seconds > 0),
  elim_interval_seconds int not null default 7 check (elim_interval_seconds > 0),
  updated_at timestamptz not null default now(),
  check (winner_pct + admin_pct + app_pct = 100)
);
insert into public.wheel_config (id) values (1);

create table public.spin_wheels (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references auth.users(id),
  status wheel_status not null default 'waiting',
  entry_fee bigint not null,
  winner_pct int not null,
  admin_pct  int not null,
  app_pct    int not null,
  min_participants int not null,
  join_window_seconds int not null,
  elim_interval_seconds int not null,
  scheduled_start_at timestamptz not null,
  started_at timestamptz,
  ended_at timestamptz,
  winner_user_id uuid references auth.users(id),
  winner_pool bigint not null default 0,
  admin_pool  bigint not null default 0,
  app_pool    bigint not null default 0,
  created_at timestamptz not null default now()
);

-- Only one wheel can be waiting or running at a time
create unique index spin_wheels_only_one_active
  on public.spin_wheels ((1)) where status in ('waiting', 'running');

create table public.wheel_participants (
  id uuid primary key default gen_random_uuid(),
  wheel_id uuid not null references public.spin_wheels(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  joined_at timestamptz not null default now(),
  elimination_order int,
  eliminated_at timestamptz,
  is_winner boolean not null default false,
  unique (wheel_id, user_id)
);
create index on public.wheel_participants (wheel_id);

create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  wheel_id uuid references public.spin_wheels(id) on delete set null,
  kind tx_kind not null,
  amount bigint not null,
  balance_after bigint,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index on public.transactions (user_id, created_at desc);
create index on public.transactions (wheel_id);

-- ============== ROLE HELPER ==============
create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

-- ============== NEW USER HANDLER ==============
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_name text;
begin
  v_name := coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1));
  insert into public.profiles (id, display_name, coins)
  values (new.id, v_name, 1000);

  insert into public.user_roles (user_id, role) values (new.id, 'user');

  insert into public.transactions (user_id, kind, amount, balance_after, meta)
  values (new.id, 'starting_grant', 1000, 1000, jsonb_build_object('reason','signup bonus'));
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- ============== RLS ==============
alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.wheel_config enable row level security;
alter table public.spin_wheels enable row level security;
alter table public.wheel_participants enable row level security;
alter table public.transactions enable row level security;

create policy "profiles readable by authed" on public.profiles
  for select to authenticated using (true);
create policy "profiles update own name" on public.profiles
  for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

create policy "roles readable by authed" on public.user_roles
  for select to authenticated using (true);

create policy "config readable by authed" on public.wheel_config
  for select to authenticated using (true);
create policy "config admin update" on public.wheel_config
  for update to authenticated
  using (public.has_role(auth.uid(),'admin'))
  with check (public.has_role(auth.uid(),'admin'));

create policy "wheels readable by authed" on public.spin_wheels
  for select to authenticated using (true);

create policy "participants readable by authed" on public.wheel_participants
  for select to authenticated using (true);

create policy "tx readable own or admin" on public.transactions
  for select to authenticated
  using (auth.uid() = user_id or public.has_role(auth.uid(),'admin'));

-- (no insert/update/delete policies → only SECURITY DEFINER RPCs can write)

-- ============== RPCs ==============

-- Atomic helper: credit/debit a profile and write a ledger row
create or replace function public._move_coins(
  _user_id uuid, _delta bigint, _kind tx_kind, _wheel_id uuid, _meta jsonb
) returns bigint language plpgsql security definer set search_path = public as $$
declare v_new bigint;
begin
  update public.profiles set coins = coins + _delta, updated_at = now()
  where id = _user_id returning coins into v_new;
  if v_new is null then raise exception 'profile not found: %', _user_id; end if;
  if v_new < 0 then raise exception 'insufficient_coins'; end if;
  insert into public.transactions (user_id, wheel_id, kind, amount, balance_after, meta)
  values (_user_id, _wheel_id, _kind, _delta, v_new, coalesce(_meta,'{}'::jsonb));
  return v_new;
end;
$$;

-- Admin grants coins to a user (manual top-up tool, useful for testing)
create or replace function public.grant_coins(_target uuid, _amount bigint)
returns bigint language plpgsql security definer set search_path = public as $$
begin
  if not public.has_role(auth.uid(),'admin') then raise exception 'not_admin'; end if;
  if _amount <= 0 then raise exception 'amount_must_be_positive'; end if;
  return public._move_coins(_target, _amount, 'admin_grant', null,
    jsonb_build_object('granted_by', auth.uid()));
end;
$$;

-- Create a wheel (admin only)
create or replace function public.create_wheel()
returns uuid language plpgsql security definer set search_path = public as $$
declare v_cfg public.wheel_config; v_id uuid;
begin
  if not public.has_role(auth.uid(),'admin') then raise exception 'not_admin'; end if;
  select * into v_cfg from public.wheel_config where id = 1;
  insert into public.spin_wheels (
    created_by, entry_fee, winner_pct, admin_pct, app_pct,
    min_participants, join_window_seconds, elim_interval_seconds, scheduled_start_at
  ) values (
    auth.uid(), v_cfg.entry_fee, v_cfg.winner_pct, v_cfg.admin_pct, v_cfg.app_pct,
    v_cfg.min_participants, v_cfg.join_window_seconds, v_cfg.elim_interval_seconds,
    now() + make_interval(secs => v_cfg.join_window_seconds)
  ) returning id into v_id;
  return v_id;
exception when unique_violation then
  raise exception 'active_wheel_exists';
end;
$$;

-- Join wheel: locks the wheel + profile, debits user, splits across pools
create or replace function public.join_wheel(_wheel_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_w public.spin_wheels;
  v_uid uuid := auth.uid();
  v_winner_share bigint; v_admin_share bigint; v_app_share bigint;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  select * into v_w from public.spin_wheels where id = _wheel_id for update;
  if v_w.id is null then raise exception 'wheel_not_found'; end if;
  if v_w.status <> 'waiting' then raise exception 'wheel_not_joinable'; end if;
  if now() >= v_w.scheduled_start_at then raise exception 'join_window_closed'; end if;

  -- splits computed deterministically; remainder goes to app pool
  v_winner_share := (v_w.entry_fee * v_w.winner_pct) / 100;
  v_admin_share  := (v_w.entry_fee * v_w.admin_pct)  / 100;
  v_app_share    := v_w.entry_fee - v_winner_share - v_admin_share;

  perform public._move_coins(v_uid, -v_w.entry_fee, 'join_debit', _wheel_id,
    jsonb_build_object('entry_fee', v_w.entry_fee));

  insert into public.wheel_participants (wheel_id, user_id) values (_wheel_id, v_uid);

  update public.spin_wheels
    set winner_pool = winner_pool + v_winner_share,
        admin_pool  = admin_pool  + v_admin_share,
        app_pool    = app_pool    + v_app_share
    where id = _wheel_id;
exception when unique_violation then
  raise exception 'already_joined';
end;
$$;

-- Begin wheel: assign elimination_order randomly (winner picked at random too)
create or replace function public._begin_wheel(_wheel_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_count int; v_winner_pid uuid;
begin
  select count(*) into v_count from public.wheel_participants where wheel_id = _wheel_id;
  -- pick the winner randomly
  select id into v_winner_pid from public.wheel_participants
    where wheel_id = _wheel_id order by random() limit 1;
  -- give all losers a random elimination_order 1..n-1
  with shuffled as (
    select id, row_number() over (order by random()) as ord
    from public.wheel_participants
    where wheel_id = _wheel_id and id <> v_winner_pid
  )
  update public.wheel_participants p
    set elimination_order = s.ord
    from shuffled s where p.id = s.id;
  update public.spin_wheels
    set status = 'running', started_at = now()
    where id = _wheel_id;
end;
$$;

-- Finalize wheel: distribute pools to winner + admin (creator) and close
create or replace function public._finalize_wheel(_wheel_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_w public.spin_wheels; v_winner uuid;
begin
  select * into v_w from public.spin_wheels where id = _wheel_id for update;
  if v_w.status <> 'running' then return; end if;

  select user_id into v_winner from public.wheel_participants
    where wheel_id = _wheel_id and eliminated_at is null;
  if v_winner is null then raise exception 'no_winner_found'; end if;

  update public.wheel_participants set is_winner = true
    where wheel_id = _wheel_id and user_id = v_winner;

  if v_w.winner_pool > 0 then
    perform public._move_coins(v_winner, v_w.winner_pool, 'winner_credit', _wheel_id, '{}');
  end if;
  if v_w.admin_pool > 0 then
    perform public._move_coins(v_w.created_by, v_w.admin_pool, 'admin_credit', _wheel_id, '{}');
  end if;
  if v_w.app_pool > 0 then
    -- record app pool in ledger (no user account)
    insert into public.transactions (wheel_id, kind, amount, meta)
    values (_wheel_id, 'app_credit', v_w.app_pool, jsonb_build_object('note','platform fee'));
  end if;

  update public.spin_wheels
    set status='completed', ended_at=now(), winner_user_id=v_winner
    where id = _wheel_id;
end;
$$;

-- Abort + refund (used when join window closed with < min participants)
create or replace function public._abort_wheel(_wheel_id uuid, _reason text)
returns void language plpgsql security definer set search_path = public as $$
declare r record;
begin
  for r in select user_id from public.wheel_participants where wheel_id = _wheel_id loop
    perform public._move_coins(r.user_id,
      (select entry_fee from public.spin_wheels where id = _wheel_id),
      'refund', _wheel_id, jsonb_build_object('reason', _reason));
  end loop;
  update public.spin_wheels
    set status='aborted', ended_at=now(), winner_pool=0, admin_pool=0, app_pool=0
    where id = _wheel_id;
end;
$$;

-- Manual admin start (force-starts if min met, else errors)
create or replace function public.start_wheel(_wheel_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_w public.spin_wheels; v_count int;
begin
  if not public.has_role(auth.uid(),'admin') then raise exception 'not_admin'; end if;
  select * into v_w from public.spin_wheels where id = _wheel_id for update;
  if v_w.status <> 'waiting' then raise exception 'not_waiting'; end if;
  select count(*) into v_count from public.wheel_participants where wheel_id = _wheel_id;
  if v_count < v_w.min_participants then raise exception 'not_enough_participants'; end if;
  perform public._begin_wheel(_wheel_id);
end;
$$;

-- Tick: advance state machine for any open wheel.
-- Safe to call from any authed user, from cron, etc. — idempotent.
create or replace function public.tick_wheels()
returns void language plpgsql security definer set search_path = public as $$
declare v_w public.spin_wheels; v_count int; v_due int; v_remaining int;
begin
  for v_w in
    select * from public.spin_wheels
    where status in ('waiting','running')
    for update skip locked
  loop
    if v_w.status = 'waiting' then
      if now() >= v_w.scheduled_start_at then
        select count(*) into v_count from public.wheel_participants where wheel_id = v_w.id;
        if v_count >= v_w.min_participants then
          perform public._begin_wheel(v_w.id);
        else
          perform public._abort_wheel(v_w.id, 'not_enough_participants');
        end if;
      end if;
    elsif v_w.status = 'running' then
      v_due := floor(extract(epoch from (now() - v_w.started_at)) / v_w.elim_interval_seconds)::int;
      select count(*) into v_count from public.wheel_participants where wheel_id = v_w.id;
      v_due := least(v_due, v_count - 1);
      if v_due > 0 then
        update public.wheel_participants
          set eliminated_at = v_w.started_at + (elimination_order * v_w.elim_interval_seconds || ' seconds')::interval
          where wheel_id = v_w.id
            and eliminated_at is null
            and elimination_order is not null
            and elimination_order <= v_due;
      end if;
      select count(*) into v_remaining from public.wheel_participants
        where wheel_id = v_w.id and eliminated_at is null;
      if v_remaining <= 1 then
        perform public._finalize_wheel(v_w.id);
      end if;
    end if;
  end loop;
end;
$$;

-- Update config (admin only)
create or replace function public.update_config(
  _entry_fee bigint, _winner_pct int, _admin_pct int, _app_pct int,
  _min_participants int, _join_window_seconds int, _elim_interval_seconds int
) returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.has_role(auth.uid(),'admin') then raise exception 'not_admin'; end if;
  if (_winner_pct + _admin_pct + _app_pct) <> 100 then raise exception 'pct_must_sum_100'; end if;
  update public.wheel_config set
    entry_fee = _entry_fee,
    winner_pct = _winner_pct,
    admin_pct = _admin_pct,
    app_pct = _app_pct,
    min_participants = _min_participants,
    join_window_seconds = _join_window_seconds,
    elim_interval_seconds = _elim_interval_seconds,
    updated_at = now()
  where id = 1;
end;
$$;

-- Self-promote helper: lets the FIRST user to call it become admin.
-- After someone is admin, subsequent callers must be promoted by an existing admin.
create or replace function public.claim_admin_if_first()
returns boolean language plpgsql security definer set search_path = public as $$
declare v_has_admin boolean;
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  select exists (select 1 from public.user_roles where role='admin') into v_has_admin;
  if v_has_admin then return false; end if;
  insert into public.user_roles (user_id, role) values (auth.uid(), 'admin')
    on conflict do nothing;
  return true;
end;
$$;

-- Promote another user (existing admin only)
create or replace function public.promote_to_admin(_target uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.has_role(auth.uid(),'admin') then raise exception 'not_admin'; end if;
  insert into public.user_roles (user_id, role) values (_target, 'admin')
    on conflict do nothing;
end;
$$;

-- ============== REALTIME ==============
alter publication supabase_realtime add table public.spin_wheels;
alter publication supabase_realtime add table public.wheel_participants;
alter publication supabase_realtime add table public.profiles;
alter publication supabase_realtime add table public.transactions;
alter publication supabase_realtime add table public.wheel_config;

alter table public.spin_wheels replica identity full;
alter table public.wheel_participants replica identity full;
alter table public.profiles replica identity full;
