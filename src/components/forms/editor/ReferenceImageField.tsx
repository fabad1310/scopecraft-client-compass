import { useState } from "react";
import { ImagePlus, Link2, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { resizeReferencePhoto } from "@/lib/image";

/** Editor control: upload a photo or paste an image link for a block. */
export function ReferenceImageField({ value, onChange }: { value?: string | undefined; onChange: (v: string | undefined) => void }) {
  const [busy, setBusy] = useState(false);
  const [url, setUrl] = useState("");

  const upload = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    try { onChange(await resizeReferencePhoto(file)); }
    catch { toast.error("No se pudo procesar la imagen"); }
    finally { setBusy(false); }
  };

  const applyUrl = () => {
    const v = url.trim();
    if (!/^https?:\/\//i.test(v)) { toast.error("El link debe empezar con http:// o https://"); return; }
    onChange(v); setUrl("");
  };

  if (value) {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-border p-2">
        <img src={value} alt="" className="h-12 w-16 rounded object-cover" />
        <span className="flex-1 text-xs text-muted-foreground">Foto de referencia</span>
        <label className="cursor-pointer text-xs text-primary hover:underline">
          Cambiar<input type="file" accept="image/*" className="hidden" onChange={(e) => { upload(e.target.files?.[0]); e.target.value = ""; }} />
        </label>
        <Button size="icon" variant="ghost" className="h-7 w-7" title="Quitar foto" onClick={() => onChange(undefined)}><X className="h-3.5 w-3.5" /></Button>
      </div>
    );
  }

  return (
    <div className="space-y-2 rounded-lg border border-dashed border-border p-2">
      <label className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground transition hover:text-primary">
        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ImagePlus className="h-3.5 w-3.5" />}
        Agregar foto de referencia
        <input type="file" accept="image/*" className="hidden" onChange={(e) => { upload(e.target.files?.[0]); e.target.value = ""; }} />
      </label>
      <div className="flex gap-1.5">
        <Input value={url} onChange={(e) => setUrl(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") applyUrl(); }} placeholder="…o pegá el link de una imagen" className="h-8 text-xs" />
        <Button size="icon" variant="secondary" className="h-8 w-8 shrink-0" disabled={!url.trim()} onClick={applyUrl} title="Usar link"><Link2 className="h-3.5 w-3.5" /></Button>
      </div>
    </div>
  );
}
