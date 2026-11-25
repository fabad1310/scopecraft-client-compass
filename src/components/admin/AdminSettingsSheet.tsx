import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, Moon, RotateCcw, Save, Sun } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ColorField } from "@/components/forms/editor/CustomPaletteEditor";
import { ADMIN_FONTS, ADMIN_PRESETS, ADMIN_SETTINGS_KEY, DEFAULT_ADMIN_SETTINGS, saveAdminSettings, type AdminSettings } from "@/lib/admin-settings";

interface Props { open: boolean; onOpenChange: (v: boolean) => void; settings: AdminSettings }

/** Panel look & feel editor. Changes preview live; "Guardar" persists them for every device. */
export function AdminSettingsSheet({ open, onOpenChange, settings }: Props) {
  const qc = useQueryClient();
  const saved = useRef(settings);
  const [draft, setDraft] = useState(settings);
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (open) { saved.current = settings; setDraft(settings); } }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const update = (patch: Partial<AdminSettings>) => {
    const next = { ...draft, ...patch };
    setDraft(next);
    qc.setQueryData(ADMIN_SETTINGS_KEY, next); // live preview
  };
  const close = (v: boolean) => {
    if (!v) qc.setQueryData(ADMIN_SETTINGS_KEY, saved.current); // discard unsaved preview
    onOpenChange(v);
  };
  const save = async () => {
    setSaving(true);
    try { await saveAdminSettings(draft); saved.current = draft; toast.success("Ajustes guardados"); onOpenChange(false); }
    catch { toast.error("No se pudieron guardar los ajustes"); }
    finally { setSaving(false); }
  };

  return (
    <Sheet open={open} onOpenChange={close}>
      <SheetContent className="flex w-full flex-col gap-0 overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="font-display">Ajustes del panel</SheetTitle>
          <SheetDescription>Estética del Survey Manager. Se aplica en todos los dispositivos de la agencia.</SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-7 px-4 pb-6">
          <Section title="Temas prediseñados">
            <div className="grid grid-cols-2 gap-2">
              {ADMIN_PRESETS.map((p) => (
                <button key={p.id} onClick={() => update(p.settings)}
                  className="rounded-xl border border-border p-3 text-left transition hover:border-primary"
                  style={{ background: p.settings.mode === "light" ? "#ffffff" : "#0b0f1a" }}>
                  <div className="mb-2 flex gap-1.5">{[p.settings.primary, p.settings.accent].map((c) => <span key={c} className="h-4 w-4 rounded-full" style={{ background: c }} />)}</div>
                  <span className="text-xs" style={{ color: p.settings.mode === "light" ? "#0f172a" : "#e8eefc", fontFamily: ADMIN_FONTS.find((f) => f.id === p.settings.fontDisplay)?.css }}>{p.name}</span>
                </button>
              ))}
            </div>
          </Section>

          <Section title="Modo">
            <div className="grid grid-cols-2 gap-2">
              <Button variant={draft.mode === "dark" ? "default" : "secondary"} onClick={() => update({ mode: "dark" })}><Moon className="h-4 w-4" /> Oscuro</Button>
              <Button variant={draft.mode === "light" ? "default" : "secondary"} onClick={() => update({ mode: "light" })}><Sun className="h-4 w-4" /> Claro</Button>
            </div>
          </Section>

          <Section title="Colores">
            <div className="grid grid-cols-2 gap-3">
              <ColorField label="Principal" value={draft.primary} onChange={(v) => update({ primary: v })} />
              <ColorField label="Acento" value={draft.accent} onChange={(v) => update({ accent: v })} />
            </div>
          </Section>

          <Section title="Tipografía de títulos">
            <FontGrid value={draft.fontDisplay} onChange={(fontDisplay) => update({ fontDisplay })} />
          </Section>
          <Section title="Tipografía de textos">
            <FontGrid value={draft.fontBody} onChange={(fontBody) => update({ fontBody })} />
          </Section>

          <Section title={`Bordes redondeados · ${Math.round(draft.radius * 16)}px`}>
            <Slider min={0} max={1.5} step={0.125} value={[draft.radius]} onValueChange={([v]) => update({ radius: v ?? 0.75 })} />
          </Section>

          <label className="flex items-center justify-between rounded-xl border border-border p-4">
            <span><span className="block text-sm font-medium">Grilla de fondo</span><span className="text-xs text-muted-foreground">Cuadrícula sutil detrás del panel</span></span>
            <Switch checked={draft.grid} onCheckedChange={(grid) => update({ grid })} />
          </label>
        </div>

        <div className="sticky bottom-0 flex gap-2 border-t border-border bg-background/90 p-4 backdrop-blur">
          <Button variant="ghost" onClick={() => update(DEFAULT_ADMIN_SETTINGS)} title="Volver al tema original"><RotateCcw className="h-4 w-4" /> Restablecer</Button>
          <Button className="flex-1" onClick={save} disabled={saving}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Guardar</Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <div className="space-y-3"><h4 className="font-mono text-[11px] uppercase tracking-[0.25em] text-primary">{title}</h4>{children}</div>;
}

function FontGrid({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {ADMIN_FONTS.map((f) => (
        <button key={f.id} onClick={() => onChange(f.id)} style={{ fontFamily: f.css }}
          className={`rounded-xl border px-3 py-2.5 text-left text-sm transition ${value === f.id ? "border-primary bg-primary/10 text-primary" : "border-border hover:border-primary/50"}`}>
          {f.name}
        </button>
      ))}
    </div>
  );
}
