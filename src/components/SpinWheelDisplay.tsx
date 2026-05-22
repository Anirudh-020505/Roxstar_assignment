import { useMemo, useEffect, useRef } from "react";
import confetti from "canvas-confetti";
import type { Participant } from "@/lib/game";

type Props = {
  participants: (Participant & { display_name: string })[];
  spinning: boolean;
  winnerId?: string | null;
};

// Vibrant arcade segment colors
const PALETTE = [
  "oklch(0.72 0.27 340)",
  "oklch(0.78 0.17 200)",
  "oklch(0.6 0.27 305)",
  "oklch(0.87 0.17 85)",
  "oklch(0.65 0.25 25)",
  "oklch(0.7 0.22 145)",
  "oklch(0.75 0.2 60)",
  "oklch(0.7 0.25 270)",
];

export function SpinWheelDisplay({ participants, spinning, winnerId }: Props) {
  const firedConfetti = useRef(false);

  useEffect(() => {
    if (winnerId && !firedConfetti.current) {
      firedConfetti.current = true;
      
      const duration = 3000;
      const animationEnd = Date.now() + duration;
      const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 50 };

      const interval: any = setInterval(function() {
        const timeLeft = animationEnd - Date.now();

        if (timeLeft <= 0) {
          return clearInterval(interval);
        }

        const particleCount = 50 * (timeLeft / duration);
        confetti({
          ...defaults, particleCount,
          origin: { x: Math.random() * 0.4 + 0.3, y: Math.random() * 0.4 + 0.2 }
        });
      }, 250);
      
    } else if (!winnerId) {
      firedConfetti.current = false;
    }
  }, [winnerId]);

  const segments = useMemo(() => {
    const active = participants.filter((p) => !p.eliminated_at);
    return active.length ? active : participants.slice(0, 1);
  }, [participants]);

  const size = 360;
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 8;
  const sliceAngle = (2 * Math.PI) / segments.length;

  return (
    <div className="relative w-full max-w-[420px] aspect-square mx-auto">
      {/* Outer glow */}
      <div className={`absolute inset-0 rounded-full transition-all duration-1000 ${spinning ? 'bg-neon-cyan opacity-40 blur-3xl scale-105' : 'bg-arcade opacity-30 blur-2xl'}`} />
      
      {/* Pointer */}
      <div className="absolute left-1/2 -translate-x-1/2 -top-2 z-20 transition-transform hover:scale-110">
        <div className={`w-0 h-0 border-l-[14px] border-r-[14px] border-t-[24px] border-l-transparent border-r-transparent transition-colors duration-300 ${spinning ? 'border-t-neon-cyan drop-shadow-[0_0_12px_oklch(0.8_0.15_200)]' : 'border-t-primary drop-shadow-[0_0_8px_oklch(0.72_0.27_340)]'}`} />
      </div>

      <div
        className={`relative w-full h-full rounded-full border-4 border-border bg-surface shadow-[0_0_20px_oklch(0.7_0.2_340)] ${
          spinning ? "animate-spin-fast" : ""
        }`}
        style={spinning ? { animationDuration: '0.8s' } : { transition: 'transform 3s cubic-bezier(0.2, 0.8, 0.2, 1)' }}
      >
        <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-full">
          {segments.map((p, i) => {
            const a0 = i * sliceAngle - Math.PI / 2;
            const a1 = (i + 1) * sliceAngle - Math.PI / 2;
            const x0 = cx + r * Math.cos(a0);
            const y0 = cy + r * Math.sin(a0);
            const x1 = cx + r * Math.cos(a1);
            const y1 = cy + r * Math.sin(a1);
            const large = sliceAngle > Math.PI ? 1 : 0;
            const path = `M ${cx} ${cy} L ${x0} ${y0} A ${r} ${r} 0 ${large} 1 ${x1} ${y1} Z`;
            const labelAngle = a0 + sliceAngle / 2;
            const lr = r * 0.65;
            const lx = cx + lr * Math.cos(labelAngle);
            const ly = cy + lr * Math.sin(labelAngle);
            const isWinner = winnerId && p.user_id === winnerId;
            return (
              <g key={p.id}>
                <path
                  d={path}
                  fill={PALETTE[i % PALETTE.length]}
                  stroke="oklch(0.13 0.05 285)"
                  strokeWidth={2}
                  opacity={isWinner ? 1 : 0.95}
                />
                <text
                  x={lx}
                  y={ly}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize={segments.length > 8 ? 10 : 13}
                  fontWeight={700}
                  fill="oklch(0.13 0.05 285)"
                  transform={`rotate(${(labelAngle * 180) / Math.PI + 90} ${lx} ${ly})`}
                >
                  {p.display_name.slice(0, 10)}
                </text>
              </g>
            );
          })}
        </svg>
        {/* Hub */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full bg-background border-4 border-primary shadow-[0_0_15px_oklch(0.7_0.2_340)] grid place-items-center font-display font-bold z-10 transition-transform">
          {segments.length}
        </div>
      </div>
    </div>
  );
}