import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { game, type WheelConfig } from "@/lib/game";
import { toast } from "sonner";
import { Shield, Coins, UserPlus } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminPage,
});

type ProfileRow = { id: string; display_name: string; coins: number };

function AdminPage() {
  const { isAdmin, loading } = useAuth();
  const [config, setConfig] = useState<WheelConfig | null>(null);
  const [players, setPlayers] = useState<ProfileRow[]>([]);
  const [adminIds, setAdminIds] = useState<Set<string>>(new Set());
  const [grantTo, setGrantTo] = useState("");
  const [grantAmount, setGrantAmount] = useState(500);

  const refresh = async () => {
    const [{ data: c }, { data: p }, { data: r }] = await Promise.all([
      supabase.from("wheel_config").select("*").eq("id", 1).maybeSingle(),
      supabase.from("profiles").select("id,display_name,coins").order("coins", { ascending: false }).limit(100),
      supabase.from("user_roles").select("user_id").eq("role", "admin"),
    ]);
    setConfig(c as WheelConfig | null);
    setPlayers((p ?? []) as ProfileRow[]);
    setAdminIds(new Set((r ?? []).map((x) => x.user_id)));
  };

  useEffect(() => {
    if (isAdmin) refresh();
  }, [isAdmin]);

  if (loading) return null;
  if (!isAdmin) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <Shield className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
        <h2 className="font-display text-2xl font-bold">Admins only</h2>
        <Link to="/game" className="text-neon-cyan underline mt-2 inline-block">
          Back to the arena
        </Link>
      </div>
    );
  }

  const save = async () => {
    if (!config) return;
    try {
      await game.updateConfig({
        entry_fee: config.entry_fee,
        winner_pct: config.winner_pct,
        admin_pct: config.admin_pct,
        app_pct: config.app_pct,
        min_participants: config.min_participants,
        join_window_seconds: config.join_window_seconds,
        elim_interval_seconds: config.elim_interval_seconds,
      });
      toast.success("Config saved");
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const promote = async (id: string) => {
    try {
      await game.promoteAdmin(id);
      toast.success("Promoted to admin");
      refresh();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const grant = async () => {
    if (!grantTo) return;
    try {
      await game.grantCoins(grantTo, grantAmount);
      toast.success(`Granted ${grantAmount} coins`);
      setGrantTo("");
      refresh();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <div className="container mx-auto px-4 py-6 grid lg:grid-cols-2 gap-6">
      <section className="rounded-2xl border border-border bg-surface/60 p-6">
        <h2 className="font-display text-2xl font-bold mb-4">Wheel config</h2>
        {config && (
          <div className="space-y-3">
            <Field label="Entry fee (coins)" value={config.entry_fee}
              onChange={(v) => setConfig({ ...config, entry_fee: v })} />
            <Field label="Winner pool %" value={config.winner_pct}
              onChange={(v) => setConfig({ ...config, winner_pct: v })} />
            <Field label="Admin pool %" value={config.admin_pct}
              onChange={(v) => setConfig({ ...config, admin_pct: v })} />
            <Field label="App pool %" value={config.app_pct}
              onChange={(v) => setConfig({ ...config, app_pct: v })} />
            <div className="text-xs text-muted-foreground">
              Sum: {config.winner_pct + config.admin_pct + config.app_pct}% (must equal 100)
            </div>
            <Field label="Min participants" value={config.min_participants}
              onChange={(v) => setConfig({ ...config, min_participants: v })} />
            <Field label="Join window (seconds)" value={config.join_window_seconds}
              onChange={(v) => setConfig({ ...config, join_window_seconds: v })} />
            <Field label="Elimination interval (seconds)" value={config.elim_interval_seconds}
              onChange={(v) => setConfig({ ...config, elim_interval_seconds: v })} />
            <button onClick={save}
              className="w-full mt-3 py-3 rounded-xl bg-arcade text-primary-foreground font-bold shadow-neon-pink">
              Save config
            </button>
          </div>
        )}
      </section>

      <section className="space-y-6">
        <div className="rounded-2xl border border-border bg-surface/60 p-6">
          <h2 className="font-display text-2xl font-bold mb-4 flex items-center gap-2">
            <Coins className="w-5 h-5 text-gold" /> Grant coins
          </h2>
          <div className="space-y-2">
            <select value={grantTo} onChange={(e) => setGrantTo(e.target.value)}
              className="w-full px-4 py-3 rounded-lg bg-input border border-border">
              <option value="">Select player…</option>
              {players.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.display_name} ({p.coins})
                </option>
              ))}
            </select>
            <input type="number" min={1} value={grantAmount}
              onChange={(e) => setGrantAmount(Number(e.target.value))}
              className="w-full px-4 py-3 rounded-lg bg-input border border-border font-mono" />
            <button onClick={grant}
              className="w-full py-3 rounded-xl bg-gold text-gold-foreground font-bold">
              Grant
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-surface/60 p-6">
          <h2 className="font-display text-xl font-bold mb-4 flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-neon-cyan" /> Players ({players.length})
          </h2>
          <ul className="space-y-1.5 max-h-96 overflow-auto">
            {players.map((p) => (
              <li key={p.id}
                className="flex items-center justify-between px-3 py-2 rounded-lg bg-background/40 border border-border text-sm">
                <span className="truncate flex items-center gap-2">
                  {p.display_name}
                  {adminIds.has(p.id) && (
                    <span className="text-xs text-neon-cyan border border-neon-cyan/40 rounded px-1.5">admin</span>
                  )}
                </span>
                <span className="flex items-center gap-3">
                  <span className="font-mono text-gold">{p.coins}</span>
                  {!adminIds.has(p.id) && (
                    <button onClick={() => promote(p.id)}
                      className="text-xs px-2 py-1 rounded border border-border hover:bg-surface">
                      promote
                    </button>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <label className="block">
      <span className="text-sm text-muted-foreground">{label}</span>
      <input type="number" value={value} onChange={(e) => onChange(Number(e.target.value))}
        className="w-full mt-1 px-4 py-2 rounded-lg bg-input border border-border font-mono" />
    </label>
  );
}