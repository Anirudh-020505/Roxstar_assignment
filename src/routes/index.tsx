import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { Sparkles, Coins, Zap } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="px-6 py-5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-lg bg-arcade shadow-neon-pink grid place-items-center">
            <Sparkles className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="font-display text-xl font-bold tracking-tight">ROXSTAR</span>
        </div>
        <Link
          to="/auth"
          className="px-4 py-2 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition shadow-neon-pink"
        >
          Enter Arena
        </Link>
      </header>

      <main className="flex-1 flex items-center justify-center px-6">
        <div className="max-w-3xl text-center space-y-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border bg-surface/60 text-xs uppercase tracking-widest text-neon-cyan">
            <span className="w-1.5 h-1.5 rounded-full bg-neon-cyan animate-pulse" />
            Real-time multiplayer
          </div>
          <h1 className="font-display text-5xl md:text-7xl font-bold leading-[1.05]">
            Spin the wheel.
            <br />
            <span className="bg-arcade bg-clip-text text-transparent">Last one standing wins.</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto">
            Drop coins, join the wheel, watch players get eliminated every 7 seconds. The survivor sweeps the pot.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/auth"
              className="px-7 py-3 rounded-xl bg-arcade text-primary-foreground font-bold shadow-neon-pink hover:scale-105 transition-transform"
            >
              Play now
            </Link>
            <Link
              to="/game"
              className="px-7 py-3 rounded-xl border border-border bg-surface/60 text-foreground font-semibold hover:bg-surface transition"
            >
              Watch live
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-8">
            {[
              { icon: Coins, label: "Coin-driven entry", text: "1,000 starter coins on signup" },
              { icon: Zap, label: "7-second tempo", text: "One elimination every 7s" },
              { icon: Sparkles, label: "Split payouts", text: "Winner / admin / app pools" },
            ].map((f) => (
              <div key={f.label} className="rounded-xl border border-border bg-surface/60 p-4 text-left">
                <f.icon className="w-5 h-5 text-neon-pink mb-2" />
                <div className="font-semibold">{f.label}</div>
                <div className="text-sm text-muted-foreground">{f.text}</div>
              </div>
            ))}
          </div>
        </div>
      </main>

      <footer className="px-6 py-4 text-center text-xs text-muted-foreground">
        Built for the ROXSTAR assessment
      </footer>
    </div>
  );
}
