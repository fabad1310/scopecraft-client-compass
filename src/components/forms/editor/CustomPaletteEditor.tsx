import { useEffect, useState } from "react";
import { Palette as PaletteIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { CUSTOM_PALETTE_ID, PALETTE_COLOR_FIELDS, resolvePalette, type FormTheme, type PaletteColors } from "@/lib/forms";

const HEX = /^#[0-9a-f]{6}$/i;

/** "Personalizada" palette card + color pickers for each palette role. */
export function CustomPaletteEditor({ theme, onChange }: { theme: FormTheme; onChange: (t: Partial<FormTheme>) => void }) {
  const active = theme.palette === CUSTOM_PALETTE_ID;
  const colors = theme.customPalette;

  const activate = () => {
    if (active) return;
    // Start from the palette currently in use, so tweaking feels natural.
    const { id: _id, name: _name, ...base } = resolvePalette(theme);
    onChange({ palette: CUSTOM_PALETTE_ID, customPalette: colors ?? base });
  };
  const setColor = (key: keyof PaletteColors, v: string) => {
    if (colors) onChange({ customPalette: { ...colors, [key]: v } });
  };

  return (
    <div className="space-y-3">
      <button onClick={activate} style={colors ? { background: colors.bg } : undefined}
        className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition ${active ? "border-primary glow" : "border-dashed border-border hover:border-primary/50"}`}>
        {colors ? (
          <div className="flex gap-1.5">{[colors.primary, colors.secondary, colors.text].map((c, i) => <span key={i} className="h-4 w-4 rounded-full" style={{ background: c, boxShadow: `0 0 8px ${c}` }} />)}</div>
        ) : <PaletteIcon className="h-4 w-4 text-primary" />}
        <span className="text-xs" style={colors ? { color: colors.text } : undefined}>{colors ? "Personalizada" : "Crear paleta personalizada"}</span>
      </button>

      {active && colors && (
        <div className="grid grid-cols-2 gap-2 rounded-xl border border-border p-3">
          {PALETTE_COLOR_FIELDS.map((f) => <ColorField key={f.key} label={f.label} value={colors[f.key]} onChange={(v) => setColor(f.key, v)} />)}
        </div>
      )}
    </div>
  );
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const [text, setText] = useState(value);
  useEffect(() => setText(value), [value]);
  return (
    <label className="space-y-1">
      <span className="text-[11px] text-muted-foreground">{label}</span>
      <div className="flex items-center gap-1.5">
        <input type="color" value={HEX.test(value) ? value : "#000000"} onChange={(e) => onChange(e.target.value)}
          className="h-8 w-9 shrink-0 cursor-pointer rounded-md border border-border bg-transparent p-0.5" />
        <Input value={text} maxLength={7} className="h-8 font-mono text-xs"
          onChange={(e) => { const v = e.target.value.startsWith("#") ? e.target.value : `#${e.target.value}`; setText(v); if (HEX.test(v)) onChange(v.toLowerCase()); }}
          onBlur={() => setText(value)} />
      </div>
    </label>
  );
}
