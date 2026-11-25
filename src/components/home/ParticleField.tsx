import { useEffect, useRef } from "react";

const COLORS = ["#003399", "#0047cc", "#1f66ff", "#5b8cff", "#9ab8ff"];
const LINK_DIST = 130;
const MOUSE_DIST = 190;

interface P { x: number; y: number; vx: number; vy: number; r: number; c: string; phase: number }

/** Interactive particle network in the brand blues. HiDPI-aware; static under reduced motion. */
export function ParticleField({ className = "" }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cv = ref.current;
    const ctx = cv?.getContext("2d");
    if (!cv || !ctx) return;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const mouse = { x: -9999, y: -9999 };
    let w = 0, h = 0, raf = 0, pts: P[] = [];

    const seed = () => {
      const n = Math.min(140, Math.round((w * h) / 11000));
      pts = Array.from({ length: n }, () => ({
        x: Math.random() * w, y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.45, vy: (Math.random() - 0.5) * 0.45,
        r: 1.2 + Math.random() * 2.2, c: COLORS[Math.floor(Math.random() * COLORS.length)]!, phase: Math.random() * Math.PI * 2,
      }));
    };
    const resize = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      w = cv.offsetWidth; h = cv.offsetHeight;
      cv.width = w * dpr; cv.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      seed();
    };

    const draw = (t: number) => {
      ctx.clearRect(0, 0, w, h);
      for (const p of pts) {
        if (!still) {
          const dx = p.x - mouse.x, dy = p.y - mouse.y, d = Math.hypot(dx, dy);
          if (d < MOUSE_DIST && d > 0) { const f = (1 - d / MOUSE_DIST) * 0.6; p.x += (dx / d) * f; p.y += (dy / d) * f; }
          p.x += p.vx; p.y += p.vy;
          if (p.x < -10) p.x = w + 10; else if (p.x > w + 10) p.x = -10;
          if (p.y < -10) p.y = h + 10; else if (p.y > h + 10) p.y = -10;
        }
      }
      ctx.lineWidth = 1;
      for (let i = 0; i < pts.length; i++) {
        const a = pts[i]!;
        for (let j = i + 1; j < pts.length; j++) {
          const b = pts[j]!, d = Math.hypot(a.x - b.x, a.y - b.y);
          if (d < LINK_DIST) { ctx.strokeStyle = `rgba(0, 61, 204, ${(1 - d / LINK_DIST) * 0.22})`; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); }
        }
        const md = Math.hypot(a.x - mouse.x, a.y - mouse.y);
        if (md < MOUSE_DIST) { ctx.strokeStyle = `rgba(31, 102, 255, ${(1 - md / MOUSE_DIST) * 0.45})`; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(mouse.x, mouse.y); ctx.stroke(); }
      }
      for (const p of pts) {
        const pulse = still ? 1 : 0.75 + 0.25 * Math.sin(t / 700 + p.phase);
        ctx.globalAlpha = 0.85 * pulse;
        ctx.fillStyle = p.c;
        ctx.shadowColor = p.c; ctx.shadowBlur = 8;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r * pulse, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1; ctx.shadowBlur = 0;
      if (!still) raf = requestAnimationFrame(draw);
    };

    const onMove = (e: PointerEvent) => { const r = cv.getBoundingClientRect(); mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top; };
    const onLeave = () => { mouse.x = -9999; mouse.y = -9999; };
    resize();
    window.addEventListener("resize", resize);
    window.addEventListener("pointermove", onMove);
    document.addEventListener("pointerleave", onLeave);
    raf = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  return <canvas ref={ref} aria-hidden className={`pointer-events-none absolute inset-0 h-full w-full ${className}`} />;
}
