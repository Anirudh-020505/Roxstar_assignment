import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { game, type SpinWheel, type Participant, type WheelConfig } from "@/lib/game";
import { useAuth } from "@/lib/auth";
import { SpinWheelDisplay } from "@/components/SpinWheelDisplay";
import { toast } from "sonner";
import { Clock, Coins, Crown, Skull, Users, Trash2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/game")({
  component: GamePage,
});

type EnrichedParticipant = Participant & { display_name: string };

function GamePage() {
  const { user, isAdmin, profile } = useAuth();
  const [wheel, setWheel] = useState<SpinWheel | null>(null);
  const [participants, setParticipants] = useState<EnrichedParticipant[]>([]);
  const [config, setConfig] = useState<WheelConfig | null>(null);
  const [now, setNow] = useState(Date.now());
  const [busy, setBusy] = useState(false);
  const tickingRef = useRef(false);

  // Load profile names cache
  const enrich = async (rows: Participant[]): Promise<EnrichedParticipant[]> => {
    if (!rows.length) return [];
    const ids = [...new Set(rows.map((r) => r.user_id))];
    const { data: profs } = await supabase
      .from("profiles")
      .select("id,display_name")
      .in("id", ids);
    const map = new Map((profs ?? []).map((p) => [p.id, p.display_name]));
    return rows.map((r) => ({ ...r, display_name: map.get(r.user_id) ?? "?" }));
  };

  // Fetch the currently active (or most recent) wheel + its participants
  const refresh = async () => {
    const { data: w } = await supabase
      .from("spin_wheels")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    setWheel(w as SpinWheel | null);
    if (w) {
      const { data: ps } = await supabase
        .from("wheel_participants")
        .select("*")
        .eq("wheel_id", w.id)
        .order("joined_at");
      setParticipants(await enrich((ps ?? []) as Participant[]));
    } else {
      setParticipants([]);
    }
  };

  useEffect(() => {
    refresh();
    supabase
      .from("wheel_config")
      .select("*")
      .eq("id", 1)
      .maybeSingle()
      .then(({ data }) => setConfig(data as WheelConfig | null));
  }, []);

  // Handle auto-join & auto-admin flags
  useEffect(() => {
    if (!wheel || !user) return;
    const iAmIn = participants.some((p) => p.user_id === user.id);
    
    // Auto-Join for players
    if (wheel.status === "waiting" && !iAmIn && localStorage.getItem("autoJoinWheel") === "true") {
      localStorage.removeItem("autoJoinWheel");
      if ((profile?.coins ?? 0) >= wheel.entry_fee) {
        handleJoin();
      }
    }

    // Auto-Admin for Admin dummy account
    if (localStorage.getItem("autoClaimAdmin") === "true") {
      localStorage.removeItem("autoClaimAdmin");
      supabase.rpc("force_admin").then(({ error }) => {
        if (!error) {
          toast.success("Admin rights forcefully acquired!");
          // Force a small delay then reload to refresh profile
          setTimeout(() => window.location.reload(), 500);
        }
      });
    }
  }, [wheel, user, participants, profile]);

  // Realtime subscriptions
  useEffect(() => {
    const ch = supabase
      .channel("wheel-feed")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "spin_wheels" },
        () => refresh(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "wheel_participants" },
        () => refresh(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "wheel_config" },
        (p) => setConfig(p.new as WheelConfig),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 1s clock + drive tick_wheels every 2s while a wheel is open
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    const driver = setInterval(async () => {
      if (!wheel || wheel.status === "completed" || wheel.status === "aborted") return;
      if (tickingRef.current) return;
      tickingRef.current = true;
      try {
        await game.tick();
      } catch {
        /* swallow — realtime will catch up */
      } finally {
        tickingRef.current = false;
      }
    }, 2000);
    return () => {
      clearInterval(t);
      clearInterval(driver);
    };
  }, [wheel?.id, wheel?.status]);

  const iAmIn = useMemo(
    () => !!participants.find((p) => p.user_id === user?.id),
    [participants, user?.id],
  );
  const myParticipant = participants.find((p) => p.user_id === user?.id);
  const activeWheel = wheel && (wheel.status === "waiting" || wheel.status === "running");

  const secondsUntilStart =
    wheel && wheel.status === "waiting"
      ? Math.max(0, Math.ceil((new Date(wheel.scheduled_start_at).getTime() - now) / 1000))
      : 0;

  const handleCreate = async () => {
    setBusy(true);
    try {
      await game.createWheel();
      toast.success("Wheel opened!");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const handleJoin = async () => {
    if (!wheel) return;
    setBusy(true);
    try {
      await game.joinWheel(wheel.id);
      toast.success(`Joined! −${wheel.entry_fee} coins`);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const handleStart = async () => {
    if (!wheel) return;
    setBusy(true);
    try {
      await game.startWheel(wheel.id);
      toast.success("Wheel started!");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const handleResetArena = async () => {
    if (!confirm("Are you sure you want to completely reset the arena? All wheels, participants, and transactions will be deleted, and all users will be reset to 1000 coins.")) return;
    setBusy(true);
    try {
      const { error } = await supabase.rpc("reset_arena");
      if (error) throw error;
      toast.success("Arena has been completely reset!");
      setWheel(null);
      setParticipants([]);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const handleClaimAdmin = async () => {
    try {
      const ok = await game.claimAdmin();
      if (ok) toast.success("You are now admin!");
      else toast.error("An admin already exists.");
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <div className="container mx-auto px-4 py-6 grid lg:grid-cols-[1fr_360px] gap-6">
      {/* Left: wheel + status */}
      <section className="space-y-6">
        <div className="rounded-2xl border border-border bg-surface/60 backdrop-blur p-6">
          {!wheel || wheel.status === "completed" || wheel.status === "aborted" ? (
            <EmptyState
              isAdmin={isAdmin}
              onCreate={handleCreate}
              onClaim={handleClaimAdmin}
              onReset={handleResetArena}
              busy={busy}
              lastWheel={wheel}
              participants={participants}
            />
          ) : (
            <>
              <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                <div>
                  <div className="text-xs uppercase tracking-widest text-neon-cyan">
                    {wheel.status === "waiting" ? "Join window open" : "Eliminating"}
                  </div>
                  <h2 className="font-display text-2xl font-bold">
                    Wheel #{wheel.id.slice(0, 6)}
                  </h2>
                </div>
                <div className="flex items-center gap-2 font-mono">
                  <Clock className="w-4 h-4 text-neon-cyan" />
                  {wheel.status === "waiting" ? (
                    <span className="text-lg tabular-nums">
                      starts in {secondsUntilStart}s
                    </span>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="text-lg tabular-nums">
                        next elim in{" "}
                        {wheel.started_at
                          ? wheel.elim_interval_seconds -
                            (Math.floor((now - new Date(wheel.started_at).getTime()) / 1000) %
                              wheel.elim_interval_seconds)
                          : "—"}
                        s
                      </span>
                      {wheel.started_at && (
                        <div className="w-16 h-2 bg-surface rounded-full overflow-hidden border border-border">
                          <div 
                            className="h-full bg-neon-cyan transition-all duration-1000 ease-linear"
                            style={{ 
                              width: `${(1 - ((Math.floor((now - new Date(wheel.started_at).getTime()) / 1000) % wheel.elim_interval_seconds) / wheel.elim_interval_seconds)) * 100}%` 
                            }}
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <SpinWheelDisplay
                participants={participants}
                spinning={wheel.status === "running"}
                winnerId={wheel.winner_user_id}
              />

              <div className="grid grid-cols-3 gap-3 mt-6 text-center">
                <Pool label="Winner pool" value={wheel.winner_pool} accent="text-gold" />
                <Pool label="Admin pool" value={wheel.admin_pool} accent="text-neon-pink" />
                <Pool label="App pool" value={wheel.app_pool} accent="text-neon-cyan" />
              </div>

              <div className="mt-6 flex flex-wrap gap-2 justify-center">
                {wheel.status === "waiting" && !iAmIn && (
                  <button
                    onClick={handleJoin}
                    disabled={busy || (profile?.coins ?? 0) < wheel.entry_fee}
                    className="px-6 py-3 rounded-xl bg-arcade text-primary-foreground font-bold shadow-neon-pink hover:scale-[1.02] transition disabled:opacity-50"
                  >
                    Join · {wheel.entry_fee} coins
                  </button>
                )}
                {wheel.status === "waiting" && iAmIn && (
                  <div className="px-4 py-3 rounded-xl border border-neon-cyan/40 text-neon-cyan font-semibold">
                    You're in. Waiting for more players…
                  </div>
                )}
                {wheel.status === "waiting" && isAdmin && (
                  <button
                    onClick={handleStart}
                    disabled={busy || participants.length < wheel.min_participants}
                    className="px-6 py-3 rounded-xl border border-neon-cyan text-neon-cyan font-bold hover:bg-accent/10 transition disabled:opacity-40"
                  >
                    Activate 7s Eliminations ({participants.length}/{wheel.min_participants}+)
                  </button>
                )}
                {wheel.status === "running" && myParticipant?.eliminated_at && (
                  <div className="px-4 py-3 rounded-xl border border-destructive/40 text-destructive font-semibold flex items-center gap-2">
                    <Skull className="w-4 h-4" /> You were eliminated
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </section>

      {/* Right: live participant feed */}
      <aside className="space-y-4">
        <div className="rounded-2xl border border-border bg-surface/60 backdrop-blur p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 font-display font-bold">
              <Users className="w-4 h-4" /> Players
            </div>
            <span className="text-sm font-mono text-muted-foreground">
              {participants.filter((p) => !p.eliminated_at).length} / {participants.length}
            </span>
          </div>
          {!participants.length && (
            <div className="text-sm text-muted-foreground py-4 text-center">
              No one has joined yet.
            </div>
          )}
          <ul className="space-y-1.5">
            {[...participants]
              .sort((a, b) => {
                if (a.is_winner) return -1;
                if (b.is_winner) return 1;
                if (!!a.eliminated_at !== !!b.eliminated_at)
                  return a.eliminated_at ? 1 : -1;
                return a.joined_at.localeCompare(b.joined_at);
              })
              .map((p) => (
                <li
                  key={p.id}
                  className={`flex items-center justify-between px-3 py-2 rounded-lg border ${
                    p.is_winner
                      ? "border-gold/60 bg-gold/10 shadow-neon-gold"
                      : p.eliminated_at
                        ? "border-border/40 bg-background/40 text-muted-foreground line-through"
                        : "border-border bg-background/40"
                  }`}
                >
                  <span className="flex items-center gap-2 truncate">
                    {p.is_winner ? (
                      <Crown className="w-4 h-4 text-gold" />
                    ) : p.eliminated_at ? (
                      <Skull className="w-4 h-4" />
                    ) : (
                      <span className="w-2 h-2 rounded-full bg-neon-cyan animate-pulse" />
                    )}
                    <span className="truncate">{p.display_name}</span>
                    {p.user_id === user?.id && (
                      <span className="text-xs text-neon-pink">(you)</span>
                    )}
                  </span>
                  {p.eliminated_at && p.elimination_order && (
                    <span className="font-mono text-xs">#{p.elimination_order}</span>
                  )}
                </li>
              ))}
          </ul>
        </div>

        {config && (
          <div className="rounded-2xl border border-border bg-surface/40 p-4 text-sm">
            <div className="font-display font-bold mb-2">House rules</div>
            <dl className="grid grid-cols-2 gap-y-1 text-muted-foreground">
              <dt>Entry fee</dt>
              <dd className="font-mono text-foreground text-right flex items-center justify-end gap-1">
                <Coins className="w-3 h-3 text-gold" />
                {config.entry_fee}
              </dd>
              <dt>Winner / Admin / App</dt>
              <dd className="font-mono text-foreground text-right">
                {config.winner_pct}/{config.admin_pct}/{config.app_pct}%
              </dd>
              <dt>Min players</dt>
              <dd className="font-mono text-foreground text-right">{config.min_participants}</dd>
              <dt>Join window</dt>
              <dd className="font-mono text-foreground text-right">
                {config.join_window_seconds}s
              </dd>
              <dt>Tempo</dt>
              <dd className="font-mono text-foreground text-right">
                1 elim / {config.elim_interval_seconds}s
              </dd>
            </dl>
          </div>
        )}
      </aside>
    </div>
  );
}

function Pool({ label, value, accent }: { label: string; value: number; accent: string }) {
  return (
    <div className="rounded-xl border border-border bg-background/40 p-3">
      <div className="text-xs uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className={`font-mono text-2xl font-bold ${accent}`}>{value.toLocaleString()}</div>
    </div>
  );
}

function EmptyState({
  isAdmin,
  onCreate,
  onClaim,
  onReset,
  busy,
  lastWheel,
  participants,
}: {
  isAdmin: boolean;
  onCreate: () => void;
  onClaim: () => void;
  onReset: () => void;
  busy: boolean;
  lastWheel: SpinWheel | null;
  participants: EnrichedParticipant[];
}) {
  const winner = lastWheel?.winner_user_id
    ? participants.find((p) => p.user_id === lastWheel.winner_user_id)
    : null;
  return (
    <div className="py-12 text-center space-y-5">
      {lastWheel?.status === "completed" && winner && (
        <div className="inline-flex flex-col items-center gap-2 px-6 py-4 rounded-2xl border border-gold/60 shadow-neon-gold bg-gold/5">
          <Crown className="w-8 h-8 text-gold" />
          <div className="font-display text-xl font-bold text-gold">
            {winner.display_name} won {lastWheel.winner_pool.toLocaleString()} coins!
          </div>
        </div>
      )}
      {lastWheel?.status === "aborted" && (
        <div className="inline-block px-4 py-2 rounded-lg border border-destructive/40 text-destructive">
          Last wheel aborted — not enough players. Entries refunded.
        </div>
      )}
      <h2 className="font-display text-3xl font-bold">No wheel running</h2>
      <p className="text-muted-foreground">
        {isAdmin
          ? "Spin one up to open the arena."
          : "Waiting for an admin to open the next wheel."}
      </p>
      <div className="flex justify-center gap-2">
        {isAdmin ? (
          <>
            <button
              onClick={onCreate}
              disabled={busy}
              className="px-6 py-3 rounded-xl bg-arcade text-primary-foreground font-bold shadow-neon-pink hover:scale-[1.02] transition disabled:opacity-60"
            >
              Open new wheel
            </button>
            <button
              onClick={onReset}
              disabled={busy}
              className="px-4 py-3 flex items-center gap-2 rounded-xl border border-destructive/40 text-destructive font-bold shadow-sm hover:bg-destructive/10 transition disabled:opacity-60"
              title="Completely reset the database for testing"
            >
              <Trash2 className="w-4 h-4" /> Reset Arena
            </button>
          </>
        ) : (
          <button
            onClick={onClaim}
            className="px-4 py-2 rounded-lg border border-border text-sm text-muted-foreground hover:bg-surface transition"
          >
            Claim admin (first user only)
          </button>
        )}
      </div>
    </div>
  );
}