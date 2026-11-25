import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowRight, Building2, KeyRound, UserRound } from "lucide-react";
import { AltoPerfilLogo } from "@/components/brand/AltoPerfilLogo";
import { BrandFooter } from "@/components/brand/BrandFooter";
import { ParticleField } from "@/components/home/ParticleField";
import { PinEntry } from "@/components/home/PinEntry";
import { findFormSlugByPin, grantAgencyAccess, verifyAgencyPin } from "@/lib/access";

type Access = "agencia" | "cliente";

export const Route = createFileRoute("/")({
  validateSearch: (s: Record<string, unknown>): { acceso?: Access } =>
    s["acceso"] === "agencia" || s["acceso"] === "cliente" ? { acceso: s["acceso"] } : {},
  head: () => ({
    meta: [
      { title: "Alto Perfil — Cuestionarios estratégicos" },
      { name: "description", content: "Portal de cuestionarios de Alto Perfil — Strategic Data Analytics." },
      { property: "og:title", content: "Alto Perfil — Cuestionarios estratégicos" },
      { property: "og:description", content: "Portal de cuestionarios de Alto Perfil — Strategic Data Analytics." },
    ],
  }),
  component: Home,
});

function Home() {
  const { acceso } = Route.useSearch();
  const navigate = useNavigate();
  const [mode, setMode] = useState<Access | null>(acceso ?? null);

  const agency = async (pin: string) => {
    const { ok } = await verifyAgencyPin({ data: { pin } });
    if (!ok) return "PIN incorrecto.";
    grantAgencyAccess();
    await navigate({ to: "/panel" });
    return null;
  };
  const client = async (pin: string) => {
    const slug = await findFormSlugByPin(pin);
    if (!slug) return "No encontramos un cuestionario con ese PIN.";
    await navigate({ to: "/f/$slug", params: { slug } });
    return null;
  };

  return (
    <div className="ap-home relative flex min-h-screen flex-col overflow-hidden">
      <div className="ap-blob ap-blob-1" /><div className="ap-blob ap-blob-2" /><div className="ap-blob ap-blob-3" />
      <div className="ap-dots pointer-events-none absolute inset-0" />
      <ParticleField />

      <main className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 py-16">
        <div className="ap-logo-in relative mb-6 w-full max-w-[560px]">
          <AltoPerfilLogo className="h-auto w-full drop-shadow-[0_10px_30px_rgba(0,51,153,0.18)]" />
          <span className="ap-shine" aria-hidden />
        </div>
        <p className="ap-rise mb-12 text-center text-xs font-medium uppercase tracking-[0.4em] text-[#003399]/60" style={{ animationDelay: ".35s" }}>
          Portal de cuestionarios
        </p>

        {mode === null ? (
          <div className="ap-rise grid w-full max-w-xl gap-4 sm:grid-cols-2" style={{ animationDelay: ".5s" }}>
            <EntryButton primary icon={<Building2 className="h-5 w-5" />} label="Ingresar como agencia" sub="Panel de administración" onClick={() => setMode("agencia")} />
            <EntryButton icon={<UserRound className="h-5 w-5" />} label="Ingresar como cliente" sub="Con el PIN de tu cuestionario" onClick={() => setMode("cliente")} />
          </div>
        ) : mode === "agencia" ? (
          <PinEntry key="a" title="Acceso agencia" hint="Ingresá el PIN de 4 dígitos de la agencia." icon={<KeyRound className="h-6 w-6" />} onSubmit={agency} onBack={() => setMode(null)} />
        ) : (
          <PinEntry key="c" title="Acceso cliente" hint="Ingresá el PIN de 4 dígitos que te compartimos junto con tu cuestionario." icon={<UserRound className="h-6 w-6" />} onSubmit={client} onBack={() => setMode(null)} />
        )}
      </main>

      <BrandFooter background="#ffffff" />
    </div>
  );
}

function EntryButton({ primary, icon, label, sub, onClick }: { primary?: boolean; icon: React.ReactNode; label: string; sub: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className={`ap-entry group ${primary ? "ap-entry-primary" : "ap-entry-ghost"}`}>
      <span className="ap-entry-icon">{icon}</span>
      <span className="flex-1 text-left">
        <span className="block font-semibold">{label}</span>
        <span className="block text-xs opacity-70">{sub}</span>
      </span>
      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
    </button>
  );
}
