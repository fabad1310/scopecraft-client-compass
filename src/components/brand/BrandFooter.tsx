import { isLightColor } from "@/lib/color";
import { AltoPerfilLogo } from "./AltoPerfilLogo";

/**
 * Alto Perfil signature footer. Pass the background it sits on and it picks
 * the black or white logo with the best contrast.
 */
export function BrandFooter({ background, className = "" }: { background: string; className?: string }) {
  const light = isLightColor(background);
  return (
    <footer className={`relative z-10 flex flex-col items-center gap-2 px-6 py-8 ${className}`}>
      <a href="/" aria-label="Alto Perfil" className="opacity-70 transition-opacity hover:opacity-100">
        <AltoPerfilLogo tone={light ? "black" : "white"} className="h-9 w-auto" />
      </a>
      <span className="text-[11px] tracking-wide" style={{ color: light ? "rgba(0,0,0,.45)" : "rgba(255,255,255,.45)" }}>
        © {new Date().getFullYear()} Alto Perfil
      </span>
    </footer>
  );
}
