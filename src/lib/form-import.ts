import { uid, type FormComponent } from "./forms";

/**
 * Import/export of questionnaires as a spreadsheet (CSV) — one row per block.
 * Works with Excel, Google Sheets, LibreOffice and tables copied from Word.
 */

export interface ImportResult {
  title?: string | undefined;
  subtitle?: string | undefined;
  client_name?: string | undefined;
  components: FormComponent[];
  warnings: string[];
}

type Col = "tipo" | "titulo" | "texto" | "opciones" | "varias" | "otro" | "obligatoria" | "larga" | "foto";

export const TEMPLATE_COLUMNS: Col[] = ["tipo", "titulo", "texto", "opciones", "varias", "otro", "obligatoria", "larga", "foto"];

/** Header aliases (already normalized: lowercase, no accents). */
const COLUMN_ALIASES: Record<Col, string[]> = {
  tipo: ["tipo", "type", "bloque"],
  titulo: ["titulo", "title", "pregunta", "encabezado"],
  texto: ["texto", "descripcion", "cuerpo", "ayuda", "subtitulo", "body"],
  opciones: ["opciones", "options", "alternativas"],
  varias: ["varias", "multiple", "varias respuestas", "seleccion multiple"],
  otro: ["otro", "other", "otro explicar"],
  obligatoria: ["obligatoria", "obligatorio", "requerida", "required"],
  larga: ["larga", "respuesta larga", "multilinea", "multiline"],
  foto: ["foto", "imagen", "foto referencia", "foto de referencia", "image"],
};

type Kind = "formulario" | "cliente" | "text" | "question" | "choice";
const TYPE_ALIASES: Record<Kind, string[]> = {
  formulario: ["formulario", "form", "cuestionario"],
  cliente: ["cliente", "client"],
  text: ["texto", "text", "parrafo", "contexto", "info", "informacion"],
  question: ["pregunta", "question", "abierta", "respuesta libre"],
  choice: ["opciones", "opcion", "choice", "multiple choice", "seleccion", "multiple"],
};

const BOM = String.fromCharCode(0xfeff);
const REPLACEMENT_CHAR = String.fromCharCode(0xfffd);

const YES = new Set(["si", "s", "x", "yes", "y", "true", "1", "verdadero"]);

export function normalizeKey(s: string) {
  return s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();
}

function detectDelimiter(text: string): string {
  const firstLines = text.split(/\r?\n/).filter((l) => l.trim()).slice(0, 10).join("\n");
  const count = (d: string) => firstLines.split(d).length - 1;
  return ["\t", ";", ","].reduce((best, d) => (count(d) > count(best) ? d : best), "\t");
}

/** RFC-4180-ish parser: quoted cells, escaped quotes, newlines inside quotes. */
export function parseTable(input: string, delimiter = detectDelimiter(input)): string[][] {
  const text = (input.charCodeAt(0) === BOM.charCodeAt(0) ? input.slice(1) : input);
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]!;
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"' && cell === "") quoted = true;
    else if (ch === delimiter) { row.push(cell); cell = ""; }
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(cell); rows.push(row); row = []; cell = "";
    } else cell += ch;
  }
  if (cell !== "" || row.length) { row.push(cell); rows.push(row); }
  return rows;
}

function matchKind(raw: string): Kind | null {
  const k = normalizeKey(raw);
  for (const [kind, aliases] of Object.entries(TYPE_ALIASES) as [Kind, string[]][]) if (aliases.includes(k)) return kind;
  return null;
}

function splitOptions(raw: string) {
  return raw.split(/\s*\|\s*|\r?\n/).map((o) => o.trim()).filter(Boolean);
}

/** Converts the spreadsheet text into blocks. Throws when the header row is missing. */
export function parseImport(text: string): ImportResult {
  const rows = parseTable(text);
  const headerIdx = rows.findIndex((r) => r.some((c) => COLUMN_ALIASES.tipo.includes(normalizeKey(c))));
  if (headerIdx < 0) throw new Error('No encontré la fila de encabezados. La primera columna debe llamarse "tipo" (descargá la plantilla para ver el formato).');

  const header = rows[headerIdx]!.map(normalizeKey);
  const idx = {} as Record<Col, number>;
  for (const col of TEMPLATE_COLUMNS) idx[col] = header.findIndex((h) => COLUMN_ALIASES[col].includes(h));

  const result: ImportResult = { components: [], warnings: [] };
  rows.slice(headerIdx + 1).forEach((r, i) => {
    const line = headerIdx + i + 2;
    const get = (col: Col) => (idx[col] >= 0 ? (r[idx[col]] ?? "").trim() : "");
    const yes = (col: Col) => YES.has(normalizeKey(get(col)));
    const rawType = get("tipo");
    if (!r.some((c) => c.trim()) || rawType.startsWith("#")) return;

    const kind = matchKind(rawType);
    if (!kind) { result.warnings.push(`Fila ${line}: tipo "${rawType || "(vacío)"}" no reconocido — se omitió.`); return; }

    if (kind === "formulario") { result.title = get("titulo") || result.title; result.subtitle = get("texto") || result.subtitle; return; }
    if (kind === "cliente") { result.client_name = get("titulo") || get("texto"); return; }

    const comp: FormComponent = { id: uid(), type: kind, title: get("titulo") };
    if (kind === "text") comp.body = get("texto");
    if (kind === "question") {
      comp.placeholder = get("texto") || "Escribí tu respuesta…";
      comp.multiline = get("larga") ? yes("larga") : true;
    }
    if (kind === "choice") {
      comp.options = splitOptions(get("opciones"));
      comp.multiple = yes("varias");
      comp.allowOther = yes("otro");
      if (!comp.options.length) result.warnings.push(`Fila ${line}: "${comp.title}" no tiene opciones (separalas con | en la columna "opciones").`);
    }
    if (kind !== "text") comp.required = yes("obligatoria");
    if (!comp.title && kind !== "text") result.warnings.push(`Fila ${line}: la pregunta no tiene título.`);

    const foto = get("foto");
    if (foto) {
      if (/^https?:\/\//i.test(foto)) comp.referenceImage = foto;
      else result.warnings.push(`Fila ${line}: la foto debe ser un link que empiece con http:// o https:// — se omitió.`);
    }
    result.components.push(comp);
  });
  return result;
}

// ---------- Export / template ----------

const DELIM = ";"; // Excel en español usa ";" como separador de listas.

function csvCell(v: string) {
  return /[";\r\n,\t]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}
function toCsv(rows: string[][]) {
  return BOM + rows.map((r) => r.map(csvCell).join(DELIM)).join("\r\n") + "\r\n";
}
const yn = (b: boolean | undefined) => (b ? "si" : "no");

function componentRow(c: FormComponent): string[] {
  const foto = c.referenceImage?.startsWith("http") ? c.referenceImage : "";
  if (c.type === "text") return ["texto", c.title, c.body ?? "", "", "", "", "", "", foto];
  if (c.type === "question") return ["pregunta", c.title, c.placeholder ?? "", "", "", "", yn(c.required), yn(c.multiline), foto];
  return ["opciones", c.title, "", (c.options ?? []).join(" | "), yn(c.multiple), yn(c.allowOther), yn(c.required), "", foto];
}

export function formToCsv(form: { title: string; subtitle: string; client_name?: string; components: FormComponent[] }) {
  const rows: string[][] = [TEMPLATE_COLUMNS, ["formulario", form.title, form.subtitle, "", "", "", "", "", ""]];
  if (form.client_name) rows.push(["cliente", form.client_name, "", "", "", "", "", "", ""]);
  rows.push(...form.components.map(componentRow));
  return toCsv(rows);
}

export function templateCsv() {
  return toCsv([
    TEMPLATE_COLUMNS,
    ["formulario", "Validación de alcance del proyecto", "Respondé estas preguntas para confirmar juntos el alcance.", "", "", "", "", "", ""],
    ["cliente", "Acme Corp", "", "", "", "", "", "", ""],
    ["texto", "Contexto", "Este bloque es solo informativo. Los links se vuelven clickeables: https://www.google.com o [ver propuesta](https://www.google.com)", "", "", "", "", "", ""],
    ["pregunta", "¿Cuál es el objetivo principal del proyecto?", "Escribí tu respuesta…", "", "", "", "si", "si", ""],
    ["pregunta", "Nombre de contacto", "Nombre y apellido", "", "", "", "no", "no", ""],
    ["opciones", "¿Qué plataformas necesitás?", "", "Web | iOS | Android", "si", "si", "si", "", ""],
    ["opciones", "¿Tenés identidad visual definida?", "", "Sí | No | En proceso", "no", "no", "no", "", "https://images.unsplash.com/photo-1561070791-2526d30994b5?w=1200"],
  ]);
}

export function downloadCsv(filename: string, csv: string) {
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}

/** Reads a CSV/TSV file; falls back to Windows-1252 for "CSV (delimitado por comas)" saved by old Excel. */
export async function readTableFile(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  const bytes = new Uint8Array(buf);
  if (bytes[0] === 0x50 && bytes[1] === 0x4b) {
    throw new Error('Ese archivo es un Excel (.xlsx). En Excel usá "Archivo → Guardar como → CSV UTF-8 (delimitado por comas)" y subí ese archivo, o copiá las celdas y pegalas abajo.');
  }
  const utf8 = new TextDecoder("utf-8").decode(buf);
  return utf8.includes(REPLACEMENT_CHAR) ? new TextDecoder("windows-1252").decode(buf) : utf8;
}

// Hand-off from the forms list to the editor (client-side navigation keeps module state).
let pending: ImportResult | null = null;
export function setPendingImport(r: ImportResult) { pending = r; }
export function takePendingImport() { const r = pending; pending = null; return r; }
