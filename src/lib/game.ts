import { supabase } from "@/integrations/supabase/client";

export type WheelStatus = "waiting" | "running" | "completed" | "aborted";

export type SpinWheel = {
  id: string;
  created_by: string;
  status: WheelStatus;
  entry_fee: number;
  winner_pct: number;
  admin_pct: number;
  app_pct: number;
  min_participants: number;
  join_window_seconds: number;
  elim_interval_seconds: number;
  scheduled_start_at: string;
  started_at: string | null;
  ended_at: string | null;
  winner_user_id: string | null;
  winner_pool: number;
  admin_pool: number;
  app_pool: number;
  created_at: string;
};

export type Participant = {
  id: string;
  wheel_id: string;
  user_id: string;
  joined_at: string;
  elimination_order: number | null;
  eliminated_at: string | null;
  is_winner: boolean;
};

export type WheelConfig = {
  id: number;
  entry_fee: number;
  winner_pct: number;
  admin_pct: number;
  app_pct: number;
  min_participants: number;
  join_window_seconds: number;
  elim_interval_seconds: number;
  updated_at: string;
};

// Translate Postgres error codes / our raise messages into user-friendly text
function friendly(err: unknown): Error {
  const msg = (err as { message?: string })?.message ?? String(err);
  const map: Record<string, string> = {
    not_admin: "Only admins can do that.",
    active_wheel_exists: "Another wheel is already active. Wait for it to finish.",
    wheel_not_found: "Wheel not found.",
    wheel_not_joinable: "This wheel is no longer accepting players.",
    join_window_closed: "The join window has closed.",
    insufficient_coins: "Not enough coins.",
    already_joined: "You already joined this wheel.",
    not_waiting: "Wheel can't be started right now.",
    not_enough_participants: "Need more players before starting.",
    pct_must_sum_100: "Winner/Admin/App percentages must add to 100.",
    amount_must_be_positive: "Amount must be positive.",
    not_authenticated: "Please sign in.",
  };
  for (const [k, v] of Object.entries(map)) if (msg.includes(k)) return new Error(v);
  return new Error(msg);
}

async function rpc<T = unknown>(fn: string, args?: Record<string, unknown>) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any).rpc(fn, args ?? {});
  if (error) throw friendly(error);
  return data as T;
}

export const game = {
  createWheel: () => rpc<string>("create_wheel"),
  joinWheel: (wheelId: string) => rpc("join_wheel", { _wheel_id: wheelId }),
  startWheel: (wheelId: string) => rpc("start_wheel", { _wheel_id: wheelId }),
  tick: () => rpc("tick_wheels"),
  claimAdmin: () => rpc<boolean>("claim_admin_if_first"),
  promoteAdmin: (target: string) => rpc("promote_to_admin", { _target: target }),
  grantCoins: (target: string, amount: number) =>
    rpc("grant_coins", { _target: target, _amount: amount }),
  updateConfig: (cfg: Omit<WheelConfig, "id" | "updated_at">) =>
    rpc("update_config", {
      _entry_fee: cfg.entry_fee,
      _winner_pct: cfg.winner_pct,
      _admin_pct: cfg.admin_pct,
      _app_pct: cfg.app_pct,
      _min_participants: cfg.min_participants,
      _join_window_seconds: cfg.join_window_seconds,
      _elim_interval_seconds: cfg.elim_interval_seconds,
    }),
};