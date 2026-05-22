import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";

export const Route = createFileRoute("/auth")({
  component: AuthPage,
});

function AuthPage() {
  const { user, signIn, signUp, loading } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && user) navigate({ to: "/game" });
  }, [loading, user, navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        await signUp(email, password, displayName || email.split("@")[0]);
        toast.success("Account created — signing you in…");
      } else {
        await signIn(email, password);
        toast.success("Welcome back!");
      }
    } catch (err) {
      toast.error((err as Error).message || "Auth failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <Link to="/" className="flex items-center gap-2 justify-center mb-8">
          <div className="w-9 h-9 rounded-lg bg-arcade shadow-neon-pink grid place-items-center">
            <Sparkles className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="font-display text-xl font-bold">ROXSTAR</span>
        </Link>

        <div className="rounded-2xl border border-border bg-surface/80 backdrop-blur p-6 shadow-neon-pink">
          <h1 className="font-display text-2xl font-bold mb-1">
            {mode === "signin" ? "Sign in to play" : "Create your player"}
          </h1>
          <p className="text-sm text-muted-foreground mb-6">
            {mode === "signin"
              ? "Welcome back to the arena."
              : "You start with 1,000 coins. Spend them wisely."}
          </p>

          <form onSubmit={submit} className="space-y-3">
            {mode === "signup" && (
              <input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Player name"
                className="w-full px-4 py-3 rounded-lg bg-input border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            )}
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email"
              className="w-full px-4 py-3 rounded-lg bg-input border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="password (min 6 chars)"
              className="w-full px-4 py-3 rounded-lg bg-input border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <button
              type="submit"
              disabled={busy}
              className="w-full py-3 rounded-lg bg-arcade text-primary-foreground font-bold shadow-neon-pink hover:scale-[1.01] transition-transform disabled:opacity-60"
            >
              {busy ? "…" : mode === "signin" ? "Sign in" : "Create account"}
            </button>
          </form>

          <button
            onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
            className="w-full mt-4 text-sm text-muted-foreground hover:text-foreground transition"
          >
            {mode === "signin" ? "Need an account? Create one →" : "Already have one? Sign in →"}
          </button>
        </div>

        {/* Quick Demo Access */}
        <div className="mt-8 rounded-2xl border border-neon-cyan/40 bg-surface/80 backdrop-blur p-6 shadow-[0_0_15px_oklch(0.7_0.2_240)]">
          <h2 className="font-display text-lg font-bold text-neon-cyan mb-4 text-center">
            Quick Demo Access
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <QuickLoginButton role="admin" label="Admin" email="admin@roxstar.test" />
            <QuickLoginButton role="player" label="Player 1" email="player1@roxstar.test" />
            <QuickLoginButton role="player" label="Player 2" email="player2@roxstar.test" />
            <QuickLoginButton role="player" label="Player 3" email="player3@roxstar.test" />
            <QuickLoginButton role="player" label="Player 4" email="player4@roxstar.test" />
            <QuickLoginButton role="player" label="Player 5" email="player5@roxstar.test" />
          </div>
        </div>
      </div>
    </div>
  );
}

function QuickLoginButton({ role, label, email }: { role: "admin" | "player"; label: string; email: string }) {
  const { signIn, signUp } = useAuth();
  const [busy, setBusy] = useState(false);

  const handleQuickLogin = async () => {
    setBusy(true);
    // Use a strong, complex password to pass Supabase's default security checks
    const password = "RoxstarDemo2026!_Secure";
    try {
      try {
        await signIn(email, password);
      } catch {
        // If signIn fails, they don't exist yet, so we sign them up
        await signUp(email, password, label);
      }
      toast.success(`Logged in as ${label}`);
      
      // If player, set auto-join flag for the game view
      if (role === "player") {
        localStorage.setItem("autoJoinWheel", "true");
      }
      // If admin, set auto-admin flag
      if (role === "admin") {
        localStorage.setItem("autoClaimAdmin", "true");
      }
    } catch (err) {
      toast.error((err as Error).message || "Quick auth failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      onClick={handleQuickLogin}
      disabled={busy}
      className={`px-4 py-2 rounded-lg font-bold text-sm transition-all shadow-sm ${
        role === "admin"
          ? "bg-neon-pink/20 text-neon-pink border border-neon-pink hover:bg-neon-pink/30"
          : "bg-surface border border-border text-foreground hover:bg-accent/20"
      }`}
    >
      {busy ? "..." : label}
    </button>
  );
}