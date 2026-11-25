import { useEffect, useRef } from "react";
import type { FormTheme, Palette } from "@/lib/forms";

function Particles({ palette }: { palette: Palette }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    let raf = 0;
    let w = 0, h = 0;
    const resize = () => { w = cv.width = cv.offsetWidth; h = cv.height = cv.offsetHeight; };
    resize();
    window.addEventListener("resize", resize);
    const pts = Array.from({ length: 70 }, () => ({ x: Math.random() * w, y: Math.random() * h, vx: (Math.random() - 0.5) * 0.4, vy: (Math.random() - 0.5) * 0.4 }));
    const loop = () => {
      ctx.clearRect(0, 0, w, h);
      for (const p of pts) {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0 || p.x > w) p.vx *= -1;
        if (p.y < 0 || p.y > h) p.vy *= -1;
      }
      for (let i = 0; i < pts.length; i++) {
        const a = pts[i]!;
        for (let j = i + 1; j < pts.length; j++) {
          const b = pts[j]!;
          const d = Math.hypot(a.x - b.x, a.y - b.y);
          if (d < 140) {
            ctx.strokeStyle = palette.primary;
            ctx.globalAlpha = (1 - d / 140) * 0.35;
            ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
          }
        }
        ctx.globalAlpha = 0.9;
        ctx.fillStyle = i % 3 ? palette.primary : palette.secondary;
        ctx.beginPath(); ctx.arc(a.x, a.y, 1.6, 0, Math.PI * 2); ctx.fill();
      }
      raf = requestAnimationFrame(loop);
    };
    loop();
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); };
  }, [palette]);
  return <canvas ref={ref} className="absolute inset-0 h-full w-full" />;
}

export function FormBackground({ theme, palette }: { theme: FormTheme; palette: Palette }) {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <div className="bg-blob" style={{ width: "40vw", height: "40vw", left: "-10vw", top: "-10vw", background: palette.primary }} />
      <div className="bg-blob" style={{ width: "35vw", height: "35vw", right: "-10vw", top: "30vh", background: palette.secondary, animationDelay: "-6s" }} />
      {theme.background === "aurora" && (
        <div className="bg-blob" style={{ width: "50vw", height: "30vw", left: "25vw", bottom: "-10vw", background: palette.primary, animationDelay: "-12s" }} />
      )}
      {theme.background === "grid" && <div className="bg-grid-cyber" />}
      {theme.background === "particles" && <Particles palette={palette} />}
      {theme.background === "waves" && (
        <>
          <div className="bg-wave" style={{ bottom: "-45%", background: palette.primary }} />
          <div className="bg-wave" style={{ bottom: "-50%", background: palette.secondary, animationDuration: "30s" }} />
        </>
      )}
      <div className="bg-scan" />
    </div>
  );
}
