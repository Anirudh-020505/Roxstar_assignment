# ROXSTAR — Spin Wheel Arena

Real-time multiplayer spin wheel built on TanStack Start + Supabase.

## Run

```bash
npm install && npm run dev   # or: bun install && bun run dev
```

Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` in `.env`.

## Disable email confirmation (required for instant sign-in)

In Supabase Dashboard → **Authentication → Settings** → toggle **"Confirm email"** OFF.
With it enabled, signups won't be able to log in until they click the verification link.

## How it works

- **Auth**: email + password. The first signed-in user can self-promote via "Claim admin" on the empty lobby.
- **One active wheel** at a time: enforced by a partial unique index on `status IN ('waiting','running')`.
- **Join window**: configurable (default 180s). Auto-starts at T=0 if ≥ min players, otherwise aborts and refunds.
- **Eliminations**: on start, a random elimination order is assigned to everyone except a randomly-picked winner. `tick_wheels()` is idempotent — it reconciles state from `started_at + order * elim_interval`, so eliminations remain deterministic even if the driver tick is delayed.
- **Coins**: every move goes through `_move_coins()` (SECURITY DEFINER, row-locked, ledger-writing, enforces `coins >= 0`). Clients cannot UPDATE coins directly — only RPCs can.
- **Payouts**: at finalize, accumulated `winner_pool`, `admin_pool`, `app_pool` are credited atomically. App pool is recorded in the ledger (no user account).
- **Realtime**: `spin_wheels`, `wheel_participants`, `profiles`, `wheel_config`, `transactions` are in `supabase_realtime`. A 2s client driver also calls `tick_wheels()` so state advances live.

## Schema highlights

- `profiles(id, display_name, coins)`
- `user_roles(user_id, role)` — separate table to avoid RLS recursion
- `wheel_config` — singleton, admin-editable
- `spin_wheels(status, entry_fee, winner_pct, admin_pct, app_pct, winner_pool, admin_pool, app_pool, …)`
- `wheel_participants(wheel_id, user_id, elimination_order, eliminated_at, is_winner)`
- `transactions(user_id, wheel_id, kind, amount, balance_after, meta)` — full audit ledger

## RPCs (SECURITY DEFINER, EXECUTE only to `authenticated`)

`create_wheel`, `join_wheel`, `start_wheel`, `tick_wheels`, `update_config`, `claim_admin_if_first`, `promote_to_admin`, `grant_coins`.

## Edge cases handled

- Insufficient coins → blocks join, no partial debit
- Double-join → unique index + friendly error
- Concurrent joins → `FOR UPDATE` on wheel row
- Two admins racing to create → partial unique index blocks the second one
- Tick driver missing intervals → `tick_wheels()` recomputes from `started_at`, self-heals
- Aborted wheel → all entries refunded, pools zeroed

## Security

- RLS on every table. Reads open to authed users (lobby visibility); writes only via RPCs that check `auth.uid()` / `has_role(...)`.
- `has_role` keyed on a separate `user_roles` table — no privilege escalation via profile edits.
- Service-role key is server-only and never imported into client bundles.

## Performance

- `SKIP LOCKED` in `tick_wheels()` lets concurrent tickers cooperate without blocking.
- Coin updates are single-row `UPDATE … RETURNING` under row lock — no read-modify-write race.
- State is reconstructable from `started_at` alone, so the 2s driver is just a nudge; a `pg_cron` minute-tick can act as backstop.

## Assumptions

- Coins are integer (bigint).
- Pool splits use integer division; remainder rolls into app pool so totals stay exact.
- 1,000 starter coins on signup.
