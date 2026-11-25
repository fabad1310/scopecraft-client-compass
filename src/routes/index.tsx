import { createFileRoute } from "@tanstack/react-router";
import { Zap } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Nexus Scope — Validación de alcance de proyectos" },
      { name: "description", content: "Cuestionarios interactivos para validar el alcance de cada proyecto con tus clientes." },
      { property: "og:title", content: "Nexus Scope — Validación de alcance" },
      { property: "og:description", content: "Cuestionarios interactivos para validar el alcance de cada proyecto con tus clientes." },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <div className="admin-bg relative flex min-h-screen items-center justify-center overflow-hidden px-6">
      <div className="admin-grid pointer-events-none absolute inset-0" />
      <div className="relative text-center">
        <div className="glow mx-auto mb-8 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary"><Zap className="h-7 w-7" /></div>
        <h1 className="font-display text-5xl font-bold md:text-7xl"><span className="text-gradient">Nexus</span> Scope</h1>
        <p className="mx-auto mt-5 max-w-md text-muted-foreground">Si recibiste un enlace privado, abrilo directamente para completar tu formulario.</p>
      </div>
    </div>
  );
}
