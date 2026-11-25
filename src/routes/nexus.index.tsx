import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, ExternalLink, FileUp, Inbox, Pencil, Plus, Trash2, Zap } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { normalizeForm, resolvePalette } from "@/lib/forms";
import { setPendingImport } from "@/lib/form-import";
import { Button } from "@/components/ui/button";
import { ImportDialog } from "@/components/forms/ImportDialog";

export const Route = createFileRoute("/nexus/")({
  head: () => ({ meta: [{ title: "Panel · Nexus Scope" }, { name: "robots", content: "noindex,nofollow" }, { name: "description", content: "Panel de control privado." }, { property: "og:title", content: "Panel · Nexus Scope" }, { property: "og:description", content: "Panel de control privado." }] }),
  component: AdminList,
});

export function publicLink(slug: string) {
  return `${typeof window !== "undefined" ? window.location.origin : ""}/f/${slug}`;
}

function AdminList() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [importOpen, setImportOpen] = useState(false);
  const { data, isLoading } = useQuery({
    queryKey: ["forms"],
    queryFn: async () => {
      const [{ data: forms, error }, { data: resp }] = await Promise.all([
        supabase.from("forms").select("*").order("updated_at", { ascending: false }),
        supabase.from("responses").select("form_id"),
      ]);
      if (error) throw error;
      const counts: Record<string, number> = {};
      (resp ?? []).forEach((r) => { counts[r.form_id] = (counts[r.form_id] ?? 0) + 1; });
      return (forms ?? []).map((f) => ({ ...normalizeForm(f), count: counts[f.id] ?? 0 }));
    },
  });

  const remove = async (id: string) => {
    if (!confirm("¿Eliminar este formulario y todas sus respuestas?")) return;
    await supabase.from("forms").delete().eq("id", id);
    toast.success("Formulario eliminado");
    qc.invalidateQueries({ queryKey: ["forms"] });
  };

  return (
    <div className="admin-bg relative min-h-screen">
      <div className="admin-grid pointer-events-none absolute inset-0" />
      <div className="relative mx-auto max-w-6xl px-6 py-12">
        <header className="mb-12 flex flex-wrap items-end justify-between gap-6">
          <div>
            <div className="mb-3 flex items-center gap-2 font-mono text-xs uppercase tracking-[0.3em] text-primary">
              <Zap className="h-3.5 w-3.5" /> Nexus Scope · Control
            </div>
            <h1 className="font-display text-4xl font-bold md:text-5xl">
              Tus <span className="text-gradient">formularios</span>
            </h1>
            <p className="mt-3 text-muted-foreground">Creá cuestionarios para validar alcances y compartí el link con cada cliente.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button size="lg" variant="secondary" className="rounded-full px-6" onClick={() => setImportOpen(true)}>
              <FileUp className="h-4 w-4" /> Importar
            </Button>
            <Button asChild size="lg" className="glow rounded-full px-6 font-semibold">
              <Link to="/nexus/$id" params={{ id: "new" }}><Plus className="h-4 w-4" /> Nuevo formulario</Link>
            </Button>
          </div>
        </header>
        <ImportDialog open={importOpen} onOpenChange={setImportOpen}
          onImport={(r) => { setPendingImport(r); navigate({ to: "/nexus/$id", params: { id: "new" } }); }} />

        {isLoading ? (
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">{[0, 1, 2].map((i) => <div key={i} className="glass h-56 animate-pulse rounded-2xl" />)}</div>
        ) : !data?.length ? (
          <div className="glass flex flex-col items-center rounded-3xl px-6 py-20 text-center">
            <div className="glow mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary"><Plus className="h-7 w-7" /></div>
            <h2 className="font-display text-xl">Todavía no hay formularios</h2>
            <p className="mt-2 text-muted-foreground">Creá el primero para enviárselo a un cliente.</p>
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {data.map((f) => {
              const p = resolvePalette(f.theme);
              return (
                <div key={f.id} className="glass group relative overflow-hidden rounded-2xl p-5 transition-all hover:-translate-y-1 hover:border-primary/40">
                  <div className="absolute inset-x-0 top-0 h-1" style={{ background: `linear-gradient(90deg, ${p.primary}, ${p.secondary})` }} />
                  <div className="mb-4 flex items-center justify-between">
                    <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">{f.client_name || "Sin cliente"}</span>
                    <span className="flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs text-primary"><Inbox className="h-3 w-3" /> {f.count}</span>
                  </div>
                  <h3 className="mb-1 line-clamp-2 font-display text-lg font-semibold">{f.title}</h3>
                  <p className="mb-5 text-xs text-muted-foreground">{f.components.length} bloques · editado {new Date(f.updated_at).toLocaleDateString("es")}</p>
                  <div className="flex flex-wrap gap-2">
                    <Button asChild size="sm" variant="secondary"><Link to="/nexus/$id" params={{ id: f.id }}><Pencil className="h-3.5 w-3.5" /> Editar</Link></Button>
                    <Button asChild size="sm" variant="secondary"><Link to="/nexus/$id" params={{ id: f.id }} search={{ tab: "responses" }}><Inbox className="h-3.5 w-3.5" /> Respuestas</Link></Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8" title="Copiar link" onClick={() => { navigator.clipboard.writeText(publicLink(f.slug)); toast.success("Link copiado"); }}><Copy className="h-3.5 w-3.5" /></Button>
                    <Button asChild size="icon" variant="ghost" className="h-8 w-8" title="Abrir"><a href={`/f/${f.slug}`} target="_blank" rel="noreferrer"><ExternalLink className="h-3.5 w-3.5" /></a></Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" title="Eliminar" onClick={() => remove(f.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
