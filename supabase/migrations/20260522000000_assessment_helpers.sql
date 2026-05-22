-- Reset Arena RPC for easy testing
create or replace function public.reset_arena() returns void as $$
begin
  -- Require admin role to prevent abuse
  if not public.has_role(auth.uid(), 'admin') then
    raise exception 'admin only';
  end if;

  -- Truncate wheels (this cascades to wheel_participants)
  delete from public.spin_wheels where id is not null;
  
  -- Clear all transactions
  delete from public.transactions where id is not null;

  -- Reset all users to 1000 coins
  update public.profiles set coins = 1000 where id is not null;
end;
$$ language plpgsql security definer;

grant execute on function public.reset_arena() to authenticated;

-- Force Admin RPC: Demotes everyone else and makes the caller the sole admin.
-- Very useful for the dummy login to instantly grab admin rights for testing.
create or replace function public.force_admin() returns void as $$
begin
  -- Demote all current admins
  update public.profiles set app_role = 'user' where app_role = 'admin';
  -- Promote the caller
  update public.profiles set app_role = 'admin' where id = auth.uid();
end;
$$ language plpgsql security definer;

grant execute on function public.force_admin() to authenticated;
