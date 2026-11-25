export type ComponentType = "text" | "question" | "choice";

export interface FormComponent {
  id: string;
  type: ComponentType;
  title: string;
  body?: string;
  placeholder?: string;
  multiline?: boolean;
  options?: string[];
  multiple?: boolean;
  required?: boolean;
}

export interface Palette {
  id: string;
  name: string;
  bg: string;
  surface: string;
  primary: string;
  secondary: string;
  text: string;
  muted: string;
}

export interface FormTheme {
  palette: string;
  font: string;
  background: "grid" | "aurora" | "particles" | "waves";
  sound: boolean;
  glow: number;
}

export interface FormRecord {
  id: string;
  slug: string;
  client_name: string;
  title: string;
  subtitle: string;
  logo_url: string | null;
  logo_size: number;
  theme: FormTheme;
  components: FormComponent[];
  created_at: string;
  updated_at: string;
}

export const PALETTES: Palette[] = [
  { id: "neon", name: "Neon Cyan", bg: "#05070d", surface: "#0c1220", primary: "#00f0ff", secondary: "#7c5cff", text: "#e8f6ff", muted: "#7a8ba3" },
  { id: "plasma", name: "Plasma", bg: "#0a0410", surface: "#160a22", primary: "#ff2bd6", secondary: "#ff8a00", text: "#fff0fb", muted: "#a07a9a" },
  { id: "matrix", name: "Matrix", bg: "#020805", surface: "#07140c", primary: "#39ff88", secondary: "#00c2a8", text: "#e6ffef", muted: "#6f9a80" },
  { id: "solar", name: "Solar Flare", bg: "#0c0703", surface: "#1a0f06", primary: "#ffb200", secondary: "#ff4d2e", text: "#fff6e6", muted: "#a8916f" },
  { id: "ice", name: "Glacier", bg: "#04080f", surface: "#0b1424", primary: "#7cc8ff", secondary: "#c3f5ff", text: "#eef7ff", muted: "#7f93ad" },
  { id: "crimson", name: "Crimson Core", bg: "#0b0306", surface: "#18070d", primary: "#ff2e55", secondary: "#ff9bb0", text: "#ffeef1", muted: "#a37a84" },
  { id: "aurora", name: "Aurora", bg: "#030712", surface: "#0b1020", primary: "#a3ff12", secondary: "#12e1ff", text: "#f2fbff", muted: "#8090a8" },
  { id: "mono", name: "Chrome", bg: "#07070a", surface: "#121218", primary: "#ffffff", secondary: "#9aa4b8", text: "#f5f5f7", muted: "#80808c" },
];

export const FONTS = [
  { id: "Orbitron", name: "Orbitron", css: "'Orbitron', sans-serif" },
  { id: "Space Grotesk", name: "Space Grotesk", css: "'Space Grotesk', sans-serif" },
  { id: "Unbounded", name: "Unbounded", css: "'Unbounded', sans-serif" },
  { id: "Sora", name: "Sora", css: "'Sora', sans-serif" },
  { id: "Syne", name: "Syne", css: "'Syne', sans-serif" },
  { id: "Exo 2", name: "Exo 2", css: "'Exo 2', sans-serif" },
  { id: "JetBrains Mono", name: "JetBrains Mono", css: "'JetBrains Mono', monospace" },
  { id: "Audiowide", name: "Audiowide", css: "'Audiowide', sans-serif" },
];

export const BACKGROUNDS: { id: FormTheme["background"]; name: string }[] = [
  { id: "grid", name: "Grid Cyber" },
  { id: "aurora", name: "Aurora" },
  { id: "particles", name: "Partículas" },
  { id: "waves", name: "Ondas" },
];

export const DEFAULT_THEME: FormTheme = { palette: "neon", font: "Orbitron", background: "grid", sound: true, glow: 70 };

export function getPalette(id: string) {
  return PALETTES.find((p) => p.id === id) ?? PALETTES[0]!;
}
export function getFont(id: string) {
  return FONTS.find((f) => f.id === id) ?? FONTS[0]!;
}

export function uid() {
  return Math.random().toString(36).slice(2, 10);
}

export function makeSlug() {
  const a = "abcdefghjkmnpqrstuvwxyz23456789";
  let s = "";
  for (let i = 0; i < 10; i++) s += a[Math.floor(Math.random() * a.length)];
  return s;
}

export function newComponent(type: ComponentType): FormComponent {
  if (type === "text") return { id: uid(), type, title: "Contexto", body: "Escribí aquí una descripción o aclaración para tu cliente." };
  if (type === "question") return { id: uid(), type, title: "Nueva pregunta", placeholder: "Escribí tu respuesta…", multiline: true, required: false };
  return { id: uid(), type, title: "Elegí una opción", options: ["Opción A", "Opción B", "Opción C"], multiple: false, required: false };
}

export function normalizeForm(row: Record<string, unknown>): FormRecord {
  const r = row as unknown as FormRecord;
  return {
    ...r,
    theme: { ...DEFAULT_THEME, ...((r.theme as Partial<FormTheme>) ?? {}) },
    components: Array.isArray(r.components) ? r.components : [],
  };
}

/** Is an answer considered filled in? */
export function isAnswered(c: FormComponent, v: unknown): boolean {
  if (c.type === "text") return true;
  if (c.type === "question") return typeof v === "string" && v.trim().length > 0;
  return Array.isArray(v) && v.length > 0;
}

export function missingRequired(components: FormComponent[], answers: Record<string, unknown>): FormComponent[] {
  return components.filter((c) => c.required && c.type !== "text" && !isAnswered(c, answers[c.id]));
}
