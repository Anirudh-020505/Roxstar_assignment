# Roxstar Spin Wheel Assessment

This document outlines the architectural decisions, edge cases handled, and assumptions made during the implementation of the Spin Wheel Game System.

## 1. Architectural Decisions

### Database & Security First
The core of this system is heavily reliant on PostgreSQL Row Level Security (RLS) and Remote Procedure Calls (RPCs). 
- **Why?** Handling multiplayer transactions (coins) and state changes (wheels) purely on the client is dangerous. All critical game logic (`_move_coins`, `create_wheel`, `join_wheel`, `_begin_wheel`, `_abort_wheel`) is encapsulated in secure, server-side Postgres functions.
- RLS ensures that users can only read the data they need and can *never* directly insert or update their coin balances.

### Atomic Coin Operations
Coin transfers use strict atomic operations.
- **Why?** If two requests try to spend coins simultaneously, one could overwrite the other if handled in the client. We use `SELECT ... FOR UPDATE` inside Postgres functions (`_move_coins`) to lock the user's row, preventing race conditions and ensuring balances never drop below zero.

### Realtime Synchronization
The application leverages Supabase Realtime subscriptions.
- **Why?** A spin wheel requires all participants to see the exact same state (who joined, who was eliminated, who won) concurrently. By listening to `postgres_changes` on the `spin_wheels` and `wheel_participants` tables, the React frontend stays perfectly in sync without aggressive polling.

## 2. Assumptions Made

### Client-Side Ticker vs pg_cron
**Assumption:** Due to the limitations of `pg_cron` (which has a minimum execution interval of 1 minute), we assumed that simulating the 7-second wheel elimination tick via a client-side driver was acceptable for this assignment. 
- **Implementation:** While the wheel is "running", a 2-second driver loop in the React client calls the `tick_wheels()` RPC.
- **Production Note:** In a true production environment, we would replace this with a Supabase Edge Function triggered by a database webhook or a `pg_net` recursive timer to eliminate dependency on an active client tab.

### Email Verification Disabled
**Assumption:** To facilitate rapid testing and grading by the assessor, email verification was deliberately disabled. This allows dummy accounts (e.g., `admin@roxstar.test`) to be created and signed in instantaneously.

### Dummy Data for Evaluation
**Assumption:** The UI includes a "Quick Demo Access" panel and a "Reset Arena" button specifically for the assessment. These are not production features but were added to ensure the evaluator can seamlessly test multi-player interactions across different browser tabs.

## 3. Edge Cases Handled

- **Insufficient Funds:** A player attempting to join without enough coins is rejected both at the UI level (button disabled) and at the database level (`CHECK (coins >= 0)` constraint in `_move_coins`).
- **Not Enough Participants:** If a wheel is manually started (or the 3-minute timer expires) and there are fewer than 3 participants, the `_abort_wheel()` RPC automatically triggers. It safely loops through all participants, refunds their entry fees, and zeroes out the prize pools.
- **Concurrency (Double Joins):** The `wheel_participants` table has a `UNIQUE(wheel_id, user_id)` constraint. If a user tries to double-click "Join" or sends concurrent requests, the database rejects the second insertion, preventing double charging.
- **Admin Isolation:** Only users with `app_role = 'admin'` can create wheels or start them. This is enforced directly in the RPCs via `has_role(auth.uid(), 'admin')`.
- **Elimination Math:** The 7-second elimination timer handles arbitrary numbers of players seamlessly. The backend calculates `eliminated_at` using `started_at + (order * 7 seconds)`.

## 4. What We Added

1. **Robust Authentication:** JWT-based auth via Supabase.
2. **Interactive UI:** Smooth, cubic-bezier CSS animations for the wheel spinning, canvas-based confetti on victory, and real-time elimination syncing.
3. **Admin Tools:** The ability to forcefully grab admin rights, reset the entire arena, and trigger the 7-second elimination phase manually.
4. **Dynamic Timer:** A visual progress bar that accurately tracks the exact second until the next player is eliminated from the active wheel.
