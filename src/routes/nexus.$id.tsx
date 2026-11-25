import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowDown, ArrowLeft, ArrowUp, Check, CheckSquare, Copy, Download, ExternalLink, FileUp, ImagePlus, Inbox, ListChecks, Loader2, MessageSquareText, Plus, Rocket, Save, Trash2, Type, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { BACKGROUNDS, DEFAULT_THEME, FONTS, OTHER_LABEL, PALETTES, makeSlug, newComponent, normalizeForm, type ComponentType, type FormComponent, type FormTheme } from "@/lib/forms";
import { downloadCsv, formToCsv, normalizeKey, takePendingImport, type ImportResult } from "@/lib/form-import";
import { resizeImage } from "@/lib/image";
import { FormRenderer } from "@/components/forms/FormRenderer";
import { ImportDialog, type ImportMode } from "@/components/forms/ImportDialog";
import { CustomPaletteEditor } from "@/components/forms/editor/CustomPaletteEditor";
import { ReferenceImageField } from "@/components/forms/editor/ReferenceImageField";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { publicLink } from "./nexus.index";

type Tab = "content" | "style" | "responses";

export const Route = createFileRoute("/nexus/$id")({
  validateSearch: (s: Record<string, unknown>): { tab?: Tab } => (s["tab"] === "responses" || s["tab"] === "style" ? { tab: s["tab"] } : {}),
  head: () => ({ meta: [{ title: "Editor · Nexus Scope" }, { name: "robots", content: "noindex,nofollow" }, { name: "description", content: "Editor de formularios." }, { property: "og:title", content: "Editor · Nexus Scope" }, { property: "og:description", content: "Editor de formularios." }] }),
  component: Editor,
});

interface Draft {
  client_name: string; title: string; subtitle: string; logo_url: string | null; logo_size: number;
  theme: FormTheme; components: FormComponent[];
}
const EMPTY: Draft = { client_name: "", title: "Validación de alcance del proyecto", subtitle: "Respondé estas preguntas para confirmar juntos el alcance.", logo_url: null, logo_size: 120, theme: DEFAULT_THEME, components: [newComponent("text"), newComponent("question"), newComponent("choice")] };

/** Merges an imported questionnaire into the draft. */
function applyImport(d: Draft, r: ImportResult, mode: ImportMode): Draft {
  return {
    ...d,
    title: r.title || d.title,
    subtitle: r.subtitle ?? d.subtitle,
    client_name: r.client_name || d.client_name,
    components: mode === "append" ? [...d.components, ...r.components] : r.components,
  };
}

function Editor() {
  const { id } = Route.useParams();
  const { tab } = Route.useSearch();
  const isNew = id === "new";
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [slug, setSlug] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const loaded = useRef(false);

  // Questionnaire imported from the forms list.
  useEffect(() => {
    if (!isNew) return;
    const pending = takePendingImport();
    if (pending) { setDraft((d) => applyImport(d, pending, "replace")); toast.success(`${pending.components.length} bloques importados. Revisá y tocá CREAR.`); }
  }, [isNew]);

  const { data: form } = useQuery({
    queryKey: ["form", id], enabled: !isNew,
    queryFn: async () => { const { data, error } = await supabase.from("forms").select("*").eq("id", id).single(); if (error) throw error; return normalizeForm(data); },
  });
  useEffect(() => {
    if (form && !loaded.current) {
      loaded.current = true;
      setDraft({ client_name: form.client_name, title: form.title, subtitle: form.subtitle, logo_url: form.logo_url, logo_size: form.logo_size, theme: form.theme, components: form.components });
      setSlug(form.slug);
    }
  }, [form]);

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setDraft((d) => ({ ...d, [k]: v }));
  const setTheme = (t: Partial<FormTheme>) => setDraft((d) => ({ ...d, theme: { ...d.theme, ...t } }));
  const updateComp = (cid: string, patch: Partial<FormComponent>) => setDraft((d) => ({ ...d, components: d.components.map((c) => (c.id === cid ? { ...c, ...patch } : c)) }));
  const addComp = (t: ComponentType) => setDraft((d) => ({ ...d, components: [...d.components, newComponent(t)] }));
  const removeComp = (cid: string) => setDraft((d) => ({ ...d, components: d.components.filter((c) => c.id !== cid) }));
  const move = (i: number, dir: -1 | 1) => setDraft((d) => {
    const arr = [...d.components]; const j = i + dir;
    if (j < 0 || j >= arr.length) return d;
    [arr[i], arr[j]] = [arr[j]!, arr[i]!];
    return { ...d, components: arr };
  });

  const save = async () => {
    setSaving(true);
    const payload = { ...draft, theme: draft.theme as never, components: draft.components as never, updated_at: new Date().toISOString() };
    try {
      if (isNew) {
        const s = makeSlug();
        const { data, error } = await supabase.from("forms").insert({ ...payload, slug: s }).select("id").single();
        if (error) throw error;
        setSlug(s); setShareOpen(true);
        loaded.current = true;
        navigate({ to: "/nexus/$id", params: { id: data.id }, replace: true });
      } else {
        const { error } = await supabase.from("forms").update(payload).eq("id", id);
        if (error) throw error;
        toast.success("Cambios guardados");
      }
      qc.invalidateQueries({ queryKey: ["forms"] });
    } catch { toast.error("No se pudo guardar"); }
    finally { setSaving(false); }
  };

  const link = slug ? publicLink(slug) : "";
  const copy = () => { navigator.clipboard.writeText(link); toast.success("Link copiado"); };

  return (
    <div className="admin-bg flex h-screen flex-col">
      <header className="glass z-20 flex items-center gap-3 border-x-0 border-t-0 px-4 py-3">
        <Button asChild variant="ghost" size="icon"><Link to="/nexus"><ArrowLeft className="h-4 w-4" /></Link></Button>
        <div className="min-w-0 flex-1">
          <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary">{isNew ? "Nuevo formulario" : "Editando"}</div>
          <div className="truncate font-display text-sm">{draft.title}</div>
        </div>
        {slug && (
          <>
            <Button variant="secondary" size="sm" onClick={copy}><Copy className="h-3.5 w-3.5" /> Copiar link</Button>
            <Button asChild variant="secondary" size="sm"><a href={`/f/${slug}`} target="_blank" rel="noreferrer"><ExternalLink className="h-3.5 w-3.5" /></a></Button>
          </>
        )}
        <Button onClick={save} disabled={saving} className="glow rounded-full px-5 font-semibold">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : isNew ? <Rocket className="h-4 w-4" /> : <Save className="h-4 w-4" />}
          {isNew ? "CREAR" : "Guardar"}
        </Button>
      </header>

      <Tabs value={tab ?? "content"} onValueChange={(v) => navigate({ to: "/nexus/$id", params: { id }, search: v === "content" ? {} : { tab: v as Tab }, replace: true })} className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <aside className="glass flex min-h-0 flex-col border-y-0 border-l-0 lg:w-[440px]">
          <TabsList className="m-3 grid grid-cols-3">
            <TabsTrigger value="content">Contenido</TabsTrigger>
            <TabsTrigger value="style">Estética</TabsTrigger>
            <TabsTrigger value="responses" disabled={isNew}>Respuestas</TabsTrigger>
          </TabsList>
          <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-10">
            <TabsContent value="content" className="mt-0 space-y-5">
              <Field label="Cliente (solo visible para vos)"><Input value={draft.client_name} onChange={(e) => set("client_name", e.target.value)} placeholder="Ej: Acme Corp" /></Field>
              <Field label="Título"><Input value={draft.title} onChange={(e) => set("title", e.target.value)} /></Field>
              <Field label="Subtítulo"><Textarea rows={2} value={draft.subtitle} onChange={(e) => set("subtitle", e.target.value)} /></Field>

              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <SectionTitle>Bloques</SectionTitle>
                  <div className="flex gap-1.5">
                    <Button size="sm" variant="secondary" className="h-7 text-xs" onClick={() => setImportOpen(true)}><FileUp className="h-3.5 w-3.5" /> Importar</Button>
                    <Button size="sm" variant="secondary" className="h-7 text-xs" title="Descargar este cuestionario como planilla (CSV)"
                      onClick={() => downloadCsv(`${normalizeKey(draft.title).replace(/ /g, "-") || "cuestionario"}.csv`, formToCsv(draft))}>
                      <Download className="h-3.5 w-3.5" /> Exportar
                    </Button>
                  </div>
                </div>
                {draft.components.map((c, i) => (
                  <CompEditor key={c.id} c={c} first={i === 0} last={i === draft.components.length - 1}
                    onChange={(p) => updateComp(c.id, p)} onRemove={() => removeComp(c.id)} onMove={(d) => move(i, d)} />
                ))}
                <div className="grid grid-cols-3 gap-2 pt-2">
                  <AddBtn icon={<Type className="h-4 w-4" />} label="Texto" onClick={() => addComp("text")} />
                  <AddBtn icon={<MessageSquareText className="h-4 w-4" />} label="Pregunta" onClick={() => addComp("question")} />
                  <AddBtn icon={<ListChecks className="h-4 w-4" />} label="Opciones" onClick={() => addComp("choice")} />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="style" className="mt-0 space-y-7">
              <div className="space-y-3">
                <SectionTitle>Logo</SectionTitle>
                <label className="flex cursor-pointer items-center justify-center gap-3 rounded-xl border border-dashed border-border p-5 text-sm text-muted-foreground transition hover:border-primary hover:text-primary">
                  {draft.logo_url ? <img src={draft.logo_url} alt="" className="h-12 object-contain" /> : <ImagePlus className="h-5 w-5" />}
                  {draft.logo_url ? "Cambiar logo" : "Subir logo de la empresa"}
                  <input type="file" accept="image/*" className="hidden" onChange={async (e) => { const f = e.target.files?.[0]; if (f) set("logo_url", await resizeImage(f)); }} />
                </label>
                {draft.logo_url && (
                  <>
                    <div className="flex items-center justify-between text-xs text-muted-foreground"><span>Tamaño</span><span className="font-mono text-primary">{draft.logo_size}px</span></div>
                    <Slider min={40} max={320} step={4} value={[draft.logo_size]} onValueChange={([v]) => set("logo_size", v ?? 120)} />
                    <div className="flex gap-2">
                      {[["S", 70], ["M", 120], ["L", 180], ["XL", 260]].map(([l, v]) => (
                        <Button key={l} size="sm" variant={draft.logo_size === v ? "default" : "secondary"} className="flex-1" onClick={() => set("logo_size", v as number)}>{l}</Button>
                      ))}
                      <Button size="sm" variant="ghost" onClick={() => set("logo_url", null)}><X className="h-3.5 w-3.5" /></Button>
                    </div>
                  </>
                )}
              </div>

              <div className="space-y-3">
                <SectionTitle>Paleta</SectionTitle>
                <div className="grid grid-cols-2 gap-2">
                  {PALETTES.map((p) => (
                    <button key={p.id} onClick={() => setTheme({ palette: p.id })}
                      className={`rounded-xl border p-3 text-left transition ${draft.theme.palette === p.id ? "border-primary glow" : "border-border hover:border-primary/50"}`}
                      style={{ background: p.bg }}>
                      <div className="mb-2 flex gap-1.5">{[p.primary, p.secondary, p.text].map((c) => <span key={c} className="h-4 w-4 rounded-full" style={{ background: c, boxShadow: `0 0 8px ${c}` }} />)}</div>
                      <span className="text-xs" style={{ color: p.text }}>{p.name}</span>
                    </button>
                  ))}
                </div>
                <CustomPaletteEditor theme={draft.theme} onChange={setTheme} />
              </div>

              <div className="space-y-3">
                <SectionTitle>Tipografía</SectionTitle>
                <div className="grid grid-cols-2 gap-2">
                  {FONTS.map((f) => (
                    <button key={f.id} onClick={() => setTheme({ font: f.id })} style={{ fontFamily: f.css }}
                      className={`rounded-xl border px-3 py-3 text-left text-sm transition ${draft.theme.font === f.id ? "border-primary bg-primary/10 text-primary" : "border-border hover:border-primary/50"}`}>
                      {f.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <SectionTitle>Fondo animado</SectionTitle>
                <div className="grid grid-cols-2 gap-2">
                  {BACKGROUNDS.map((b) => (
                    <Button key={b.id} variant={draft.theme.background === b.id ? "default" : "secondary"} onClick={() => setTheme({ background: b.id })}>{b.name}</Button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs text-muted-foreground"><SectionTitle>Intensidad de glow</SectionTitle><span className="font-mono text-primary">{draft.theme.glow}%</span></div>
                <Slider min={0} max={100} step={5} value={[draft.theme.glow]} onValueChange={([v]) => setTheme({ glow: v ?? 70 })} />
              </div>

              <div className="flex items-center justify-between rounded-xl border border-border p-4">
                <div><div className="text-sm font-medium">Efectos de sonido</div><div className="text-xs text-muted-foreground">Al tocar botones y enviar</div></div>
                <Switch checked={draft.theme.sound} onCheckedChange={(v) => setTheme({ sound: v })} />
              </div>
            </TabsContent>

            <TabsContent value="responses" className="mt-0">
              {!isNew && <Responses formId={id} components={draft.components} />}
            </TabsContent>
          </div>
        </aside>

        <main className="relative min-h-[60vh] flex-1 overflow-y-auto">
          <div className="pointer-events-none sticky top-3 z-20 flex justify-center">
            <span className="glass rounded-full px-3 py-1 font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">Vista previa en vivo</span>
          </div>
          <div className="-mt-8 min-h-full"><FormRenderer form={draft} preview /></div>
        </main>
      </Tabs>

      <ImportDialog open={importOpen} onOpenChange={setImportOpen} allowAppend
        onImport={(r, mode) => { setDraft((d) => applyImport(d, r, mode)); toast.success(`${r.components.length} bloques importados`); }} />

      <Dialog open={shareOpen} onOpenChange={setShareOpen}>
        <DialogContent className="glass">
          <DialogHeader>
            <div className="glow mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-primary/15 text-primary"><Check className="h-7 w-7" /></div>
            <DialogTitle className="text-center font-display">¡Formulario creado!</DialogTitle>
            <DialogDescription className="text-center">Compartí este link privado con tu cliente.</DialogDescription>
          </DialogHeader>
          <div className="flex gap-2"><Input readOnly value={link} className="font-mono text-xs" onFocus={(e) => e.target.select()} /><Button onClick={copy}><Copy className="h-4 w-4" /></Button></div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">{label}</Label>{children}</div>;
}
function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h4 className="font-mono text-[11px] uppercase tracking-[0.25em] text-primary">{children}</h4>;
}
function AddBtn({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex flex-col items-center gap-1.5 rounded-xl border border-dashed border-border py-3 text-xs text-muted-foreground transition hover:border-primary hover:bg-primary/5 hover:text-primary">
      <Plus className="h-3 w-3" />{icon}{label}
    </button>
  );
}

const TYPE_LABEL: Record<ComponentType, string> = { text: "Texto", question: "Pregunta", choice: "Opciones" };

function CompEditor({ c, first, last, onChange, onRemove, onMove }: { c: FormComponent; first: boolean; last: boolean; onChange: (p: Partial<FormComponent>) => void; onRemove: () => void; onMove: (d: -1 | 1) => void }) {
  const Icon = c.type === "text" ? Type : c.type === "question" ? MessageSquareText : ListChecks;
  return (
    <div className="rounded-xl border border-border bg-card/60 p-3">
      <div className="mb-3 flex items-center gap-2">
        <Icon className="h-3.5 w-3.5 text-primary" />
        <span className="flex-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{TYPE_LABEL[c.type]}</span>
        <Button size="icon" variant="ghost" className="h-7 w-7" disabled={first} onClick={() => onMove(-1)}><ArrowUp className="h-3.5 w-3.5" /></Button>
        <Button size="icon" variant="ghost" className="h-7 w-7" disabled={last} onClick={() => onMove(1)}><ArrowDown className="h-3.5 w-3.5" /></Button>
        <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={onRemove}><Trash2 className="h-3.5 w-3.5" /></Button>
      </div>
      <div className="space-y-2">
        <Input value={c.title} onChange={(e) => onChange({ title: e.target.value })} placeholder={c.type === "text" ? "Encabezado (opcional)" : "Pregunta"} />
        {c.type === "text" && <Textarea rows={3} value={c.body ?? ""} onChange={(e) => onChange({ body: e.target.value })} placeholder="Texto descriptivo" />}
        {c.type === "question" && (
          <>
            <Input value={c.placeholder ?? ""} onChange={(e) => onChange({ placeholder: e.target.value })} placeholder="Texto de ayuda" />
            <Toggle label="Respuesta larga" checked={!!c.multiline} onChange={(v) => onChange({ multiline: v })} />
          </>
        )}
        {c.type === "choice" && (
          <>
            {(c.options ?? []).map((o, i) => (
              <div key={i} className="flex gap-2">
                <Input value={o} onChange={(e) => { const arr = [...(c.options ?? [])]; arr[i] = e.target.value; onChange({ options: arr }); }} />
                <Button size="icon" variant="ghost" onClick={() => onChange({ options: (c.options ?? []).filter((_, j) => j !== i) })}><X className="h-3.5 w-3.5" /></Button>
              </div>
            ))}
            <Button size="sm" variant="secondary" className="w-full" onClick={() => onChange({ options: [...(c.options ?? []), `Opción ${(c.options?.length ?? 0) + 1}`] })}><Plus className="h-3.5 w-3.5" /> Agregar opción</Button>
            <Toggle label="Permitir varias respuestas" checked={!!c.multiple} onChange={(v) => onChange({ multiple: v })} />
            <Toggle label={`Agregar opción "${OTHER_LABEL}"`} checked={!!c.allowOther} onChange={(v) => onChange({ allowOther: v })} />
          </>
        )}
        {c.type !== "text" && <Toggle label="Obligatoria" checked={!!c.required} onChange={(v) => onChange({ required: v })} />}
        <ReferenceImageField value={c.referenceImage} onChange={(v) => onChange({ referenceImage: v })} />
      </div>
    </div>
  );
}
function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return <label className="flex items-center justify-between pt-1 text-xs text-muted-foreground">{label}<Switch checked={checked} onCheckedChange={onChange} /></label>;
}

function Responses({ formId, components }: { formId: string; components: FormComponent[] }) {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["responses", formId],
    queryFn: async () => { const { data, error } = await supabase.from("responses").select("*").eq("form_id", formId).order("created_at", { ascending: false }); if (error) throw error; return data; },
  });
  if (isLoading) return <Loader2 className="mx-auto mt-10 h-5 w-5 animate-spin text-primary" />;
  if (!data?.length) return (
    <div className="mt-10 flex flex-col items-center text-center text-sm text-muted-foreground"><Inbox className="mb-3 h-8 w-8 text-primary" />Todavía no hay respuestas.</div>
  );
  const questions = components.filter((c) => c.type !== "text");
  return (
    <div className="space-y-4">
      <div className="font-mono text-xs text-muted-foreground">{data.length} respuesta{data.length > 1 ? "s" : ""}</div>
      {data.map((r) => {
        const a = (r.answers ?? {}) as Record<string, string | string[]>;
        return (
          <div key={r.id} className="rounded-xl border border-border bg-card/60 p-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="font-mono text-[11px] text-primary">{new Date(r.created_at).toLocaleString("es")}</span>
              <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={async () => { if (!confirm("¿Eliminar respuesta?")) return; await supabase.from("responses").delete().eq("id", r.id); qc.invalidateQueries({ queryKey: ["responses", formId] }); }}><Trash2 className="h-3.5 w-3.5" /></Button>
            </div>
            <div className="space-y-3">
              {questions.map((q) => {
                const v = a[q.id];
                return (
                  <div key={q.id}>
                    <div className="text-xs text-muted-foreground">{q.title}</div>
                    {Array.isArray(v) ? (
                      v.length ? <div className="mt-1 flex flex-wrap gap-1.5">{v.map((o) => <span key={o} className="flex items-center gap-1 rounded-md bg-primary/10 px-2 py-0.5 text-xs text-primary"><CheckSquare className="h-3 w-3" />{o}</span>)}</div> : <div className="text-sm italic text-muted-foreground">—</div>
                    ) : <div className="whitespace-pre-wrap text-sm">{v || <span className="italic text-muted-foreground">—</span>}</div>}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
