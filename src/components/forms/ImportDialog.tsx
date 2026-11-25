import { useState } from "react";
import { AlertTriangle, Download, FileUp, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { downloadCsv, parseImport, readTableFile, templateCsv, type ImportResult } from "@/lib/form-import";

export type ImportMode = "replace" | "append";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onImport: (r: ImportResult, mode: ImportMode) => void;
  /** Editor: offer "agregar al final" besides "reemplazar". */
  allowAppend?: boolean;
}

const COLUMNS_HELP: [string, string][] = [
  ["tipo", "formulario · cliente · texto · pregunta · opciones"],
  ["titulo", "Título del bloque o de la pregunta (en «formulario»: título; en «cliente»: nombre)"],
  ["texto", "Texto descriptivo (texto), texto de ayuda (pregunta) o subtítulo (formulario). Los links quedan clickeables."],
  ["opciones", "Solo «opciones»: separadas con |  →  Web | iOS | Android"],
  ["varias", "si/no — permite elegir varias opciones"],
  ["otro", "si/no — agrega «Otro – explicar» con campo de texto"],
  ["obligatoria", "si/no"],
  ["larga", "si/no — respuesta de varias líneas (preguntas)"],
  ["foto", "Opcional: link https:// a una foto de referencia"],
];

export function ImportDialog({ open, onOpenChange, onImport, allowAppend }: Props) {
  const [raw, setRaw] = useState("");
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const analyze = (text: string) => {
    setRaw(text);
    if (!text.trim()) { setResult(null); setError(null); return; }
    try { setResult(parseImport(text)); setError(null); }
    catch (e) { setResult(null); setError(e instanceof Error ? e.message : "No se pudo leer el contenido."); }
  };

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    try { analyze(await readTableFile(file)); }
    catch (e) { setResult(null); setError(e instanceof Error ? e.message : "No se pudo leer el archivo."); }
  };

  const close = (v: boolean) => { if (!v) { setRaw(""); setResult(null); setError(null); } onOpenChange(v); };
  const confirm = (mode: ImportMode) => { if (result) { onImport(result, mode); close(false); } };

  const counts = result ? {
    text: result.components.filter((c) => c.type === "text").length,
    question: result.components.filter((c) => c.type === "question").length,
    choice: result.components.filter((c) => c.type === "choice").length,
  } : null;

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="glass max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display">Importar cuestionario</DialogTitle>
          <DialogDescription>Armalo en Excel, Google Sheets o una tabla de Word con una fila por bloque, y subilo acá.</DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div className="rounded-xl border border-border p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <span className="font-mono text-[11px] uppercase tracking-[0.25em] text-primary">1 · Plantilla</span>
              <Button size="sm" variant="secondary" onClick={() => downloadCsv("plantilla-cuestionario.csv", templateCsv())}>
                <Download className="h-3.5 w-3.5" /> Descargar plantilla
              </Button>
            </div>
            <dl className="grid gap-1.5 text-xs">
              {COLUMNS_HELP.map(([k, v]) => (
                <div key={k} className="grid grid-cols-[90px_1fr] gap-2">
                  <dt className="font-mono text-primary">{k}</dt><dd className="text-muted-foreground">{v}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-3 text-xs text-muted-foreground">En Excel: <b>Archivo → Guardar como → CSV UTF-8</b>. Las fotos subidas desde la PC se agregan después en el editor.</p>
          </div>

          <div className="space-y-3 rounded-xl border border-border p-4">
            <span className="font-mono text-[11px] uppercase tracking-[0.25em] text-primary">2 · Subí o pegá tu cuestionario</span>
            <label className="flex cursor-pointer items-center justify-center gap-3 rounded-xl border border-dashed border-border p-5 text-sm text-muted-foreground transition hover:border-primary hover:text-primary">
              <FileUp className="h-5 w-5" /> Elegir archivo .csv / .tsv / .txt
              <input type="file" accept=".csv,.tsv,.txt,text/csv,text/plain" className="hidden" onChange={(e) => { onFile(e.target.files?.[0]); e.target.value = ""; }} />
            </label>
            <Textarea rows={5} value={raw} onChange={(e) => analyze(e.target.value)} className="font-mono text-xs"
              placeholder="…o copiá las celdas (incluida la fila de encabezados) desde Excel, Google Sheets o una tabla de Word y pegalas acá." />
          </div>

          {error && <p className="flex gap-2 rounded-xl border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />{error}</p>}

          {result && counts && (
            <div className="space-y-2 rounded-xl border border-primary/40 bg-primary/5 p-4 text-sm">
              {result.title && <div><span className="text-muted-foreground">Título: </span>{result.title}</div>}
              {result.client_name && <div><span className="text-muted-foreground">Cliente: </span>{result.client_name}</div>}
              <div className="font-medium text-primary">{result.components.length} bloques · {counts.text} textos · {counts.question} preguntas · {counts.choice} de opciones</div>
              {result.warnings.length > 0 && (
                <ul className="space-y-1 text-xs text-amber-400">{result.warnings.map((w) => <li key={w}>⚠ {w}</li>)}</ul>
              )}
            </div>
          )}

          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="ghost" onClick={() => close(false)}>Cancelar</Button>
            {allowAppend && <Button variant="secondary" disabled={!result?.components.length} onClick={() => confirm("append")}>Agregar al final</Button>}
            <Button className="glow" disabled={!result?.components.length} onClick={() => confirm("replace")}>
              <Upload className="h-4 w-4" /> {allowAppend ? "Reemplazar bloques" : "Importar"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
