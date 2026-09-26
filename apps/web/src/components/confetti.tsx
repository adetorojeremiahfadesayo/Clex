"use client";

import { useEffect, useRef } from "react";

const colors = ["#0b8a5f", "#3ddc97", "#ff6a3d", "#ffc53d", "#7c5cff", "#2f7cf6"];

/** One-off celebration burst; skipped when the user prefers reduced motion. */
export function Confetti({ fire }: { fire: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (!fire || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = innerWidth * dpr;
    canvas.height = innerHeight * dpr;
    ctx.scale(dpr, dpr);
    const parts = Array.from({ length: 180 }, () => ({
      x: innerWidth / 2 + (Math.random() - 0.5) * 200, y: innerHeight * 0.35,
      vx: (Math.random() - 0.5) * 16, vy: -Math.random() * 16 - 4,
      r: Math.random() * Math.PI, vr: (Math.random() - 0.5) * 0.3,
      w: 6 + Math.random() * 6, h: 8 + Math.random() * 8, c: colors[Math.floor(Math.random() * colors.length)]!,
    }));
    let frame = 0;
    let raf = 0;
    const tick = () => {
      frame++;
      ctx.clearRect(0, 0, innerWidth, innerHeight);
      for (const p of parts) {
        p.vy += 0.35; p.vx *= 0.99; p.x += p.vx; p.y += p.vy; p.r += p.vr;
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r); ctx.fillStyle = p.c;
        ctx.globalAlpha = Math.max(0, 1 - frame / 200); ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h); ctx.restore();
      }
      if (frame < 200) raf = requestAnimationFrame(tick);
      else ctx.clearRect(0, 0, innerWidth, innerHeight);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [fire]);
  return <canvas ref={ref} className="clex-confetti" aria-hidden="true" />;
}
