import { Link, useNavigate } from "@tanstack/react-router";
import { Coins, LogOut, Shield, Sparkles } from "lucide-react";
import { useAuth } from "@/lib/auth";

export function AppHeader() {
  const { profile, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();
  return (
    <header className="px-4 md:px-6 py-4 flex items-center justify-between border-b border-border/60 bg-surface/40 backdrop-blur sticky top-0 z-30">
      <Link to="/game" className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-arcade shadow-neon-pink grid place-items-center">
          <Sparkles className="w-4 h-4 text-primary-foreground" />
        </div>
        <span className="font-display text-lg font-bold tracking-tight">ROXSTAR</span>
      </Link>
      <div className="flex items-center gap-2 md:gap-3">
        <div className="px-3 py-1.5 rounded-full bg-surface border border-border flex items-center gap-2 font-mono text-sm shadow-neon-gold">
          <Coins className="w-4 h-4 text-gold" />
          <span className="text-gold font-bold tabular-nums">
            {profile?.coins?.toLocaleString() ?? "—"}
          </span>
        </div>
        <div className="hidden sm:block px-3 py-1.5 rounded-full bg-surface border border-border text-sm">
          {profile?.display_name ?? "…"}
        </div>
        {isAdmin && (
          <Link
            to="/admin"
            className="px-3 py-1.5 rounded-full border border-neon-cyan/40 text-neon-cyan text-sm flex items-center gap-1.5 hover:bg-accent/10 transition"
          >
            <Shield className="w-3.5 h-3.5" />
            Admin
          </Link>
        )}
        <button
          onClick={async () => {
            await signOut();
            navigate({ to: "/" });
          }}
          className="p-2 rounded-full hover:bg-surface transition"
          aria-label="Sign out"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}