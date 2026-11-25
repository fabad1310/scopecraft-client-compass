import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { isLightColor } from "./color";
import { FONTS } from "./forms";

/**
 * Admin panel look & feel, shared by every agency device.
 * Stored in a reserved row of `forms` (theme JSON) so no schema change is needed;
 * that row is hidden from the list and from the public /f/ route.
 */
export const SETTINGS_SLUG = "__ap_settings__";

const HEX = /^#[0-9a-f]{6}$/i;
const SettingsSchema = z.object({
  mode: z.enum(["dark", "light"]),
  primary: z.string().regex(HEX),
  accent: z.string().regex(HEX),
  fontDisplay: z.string(),
  fontBody: z.string(),
  radius: z.number().min(0).max(1.5),
  grid: z.boolean(),
});
export type AdminSettings = z.infer<typeof SettingsSchema>;

export const ADMIN_FONTS = [{ id: "Montserrat", name: "Montserrat", css: "'Montserrat', sans-serif" }, ...FONTS];

export const ADMIN_PRESETS: { id: string; name: string; settings: AdminSettings }[] = [
  { id: "neon", name: "Neón (original)", settings: { mode: "dark", primary: "#22e3f5", accent: "#8a5cf0", fontDisplay: "Orbitron", fontBody: "Space Grotesk", radius: 0.75, grid: true } },
  { id: "altoperfil", name: "Alto Perfil", settings: { mode: "light", primary: "#003399", accent: "#1f66ff", fontDisplay: "Montserrat", fontBody: "Montserrat", radius: 0.75, grid: true } },
  { id: "midnight", name: "Medianoche", settings: { mode: "dark", primary: "#5b8cff", accent: "#003399", fontDisplay: "Montserrat", fontBody: "Montserrat", radius: 0.75, grid: false } },
  { id: "emerald", name: "Esmeralda", settings: { mode: "dark", primary: "#34d399", accent: "#06b6d4", fontDisplay: "Sora", fontBody: "Sora", radius: 1, grid: true } },
  { id: "minimal", name: "Minimal claro", settings: { mode: "light", primary: "#0f172a", accent: "#64748b", fontDisplay: "Space Grotesk", fontBody: "Space Grotesk", radius: 0.5, grid: false } },
];
export const DEFAULT_ADMIN_SETTINGS = ADMIN_PRESETS[0]!.settings;

export function normalizeSettings(raw: unknown): AdminSettings {
  const merged = { ...DEFAULT_ADMIN_SETTINGS, ...(raw && typeof raw === "object" ? raw : {}) };
  const parsed = SettingsSchema.safeParse(merged);
  return parsed.success ? parsed.data : DEFAULT_ADMIN_SETTINGS;
}

// ---------- Persistence ----------

const CACHE_KEY = "ap:admin-settings";
function readCache(): AdminSettings | undefined {
  try { const v = localStorage.getItem(CACHE_KEY); return v ? normalizeSettings(JSON.parse(v)) : undefined; } catch { return undefined; }
}
function writeCache(s: AdminSettings) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(s)); } catch { /* ignore */ }
}

export async function loadAdminSettings(): Promise<AdminSettings> {
  const { data, error } = await supabase.from("forms").select("theme").eq("slug", SETTINGS_SLUG).maybeSingle();
  if (error) throw error;
  const s = normalizeSettings(data?.theme);
  writeCache(s);
  return s;
}

export async function saveAdminSettings(s: AdminSettings) {
  const { error } = await supabase.from("forms").upsert(
    { slug: SETTINGS_SLUG, title: "Ajustes del panel (sistema)", theme: s as never, components: [] as never },
    { onConflict: "slug" },
  );
  if (error) throw error;
  writeCache(s);
}

export const ADMIN_SETTINGS_KEY = ["admin-settings"] as const;
export function useAdminSettings() {
  return useQuery({
    queryKey: ADMIN_SETTINGS_KEY,
    queryFn: loadAdminSettings,
    initialData: readCache,
    initialDataUpdatedAt: 0, // always refresh from the database once
    staleTime: 5 * 60 * 1000,
  });
}

// ---------- Applying to the page ----------

const LIGHT_TOKENS: Record<string, string> = {
  "--background": "#f4f6fb", "--foreground": "#0f172a",
  "--card": "#ffffff", "--card-foreground": "#0f172a",
  "--popover": "#ffffff", "--popover-foreground": "#0f172a",
  "--secondary": "#e8edf6", "--secondary-foreground": "#0f172a",
  "--muted": "#e8edf6", "--muted-foreground": "#5b6477",
  "--border": "rgba(15, 23, 42, 0.10)", "--input": "rgba(15, 23, 42, 0.16)",
};
const ALL_KEYS = [
  ...Object.keys(LIGHT_TOKENS), "--primary", "--ring", "--chart-1", "--primary-foreground",
  "--accent", "--chart-2", "--accent-foreground", "--radius", "--app-font-display", "--app-font-sans",
];

const fontCss = (id: string) => (ADMIN_FONTS.find((f) => f.id === id) ?? ADMIN_FONTS[0]!).css;

/** Overrides the design tokens on <html>; returns a cleanup that restores the defaults. */
export function applyAdminSettings(s: AdminSettings): () => void {
  const root = document.documentElement;
  const set = (k: string, v: string) => root.style.setProperty(k, v);
  set("--primary", s.primary); set("--ring", s.primary); set("--chart-1", s.primary);
  set("--primary-foreground", isLightColor(s.primary) ? "#0b1020" : "#ffffff");
  set("--accent", s.accent); set("--chart-2", s.accent);
  set("--accent-foreground", isLightColor(s.accent) ? "#0b1020" : "#ffffff");
  set("--radius", `${s.radius}rem`);
  set("--app-font-display", fontCss(s.fontDisplay));
  set("--app-font-sans", fontCss(s.fontBody));
  if (s.mode === "light") for (const [k, v] of Object.entries(LIGHT_TOKENS)) set(k, v);
  else for (const k of Object.keys(LIGHT_TOKENS)) root.style.removeProperty(k);
  root.classList.toggle("dark", s.mode === "dark");
  root.style.colorScheme = s.mode;
  root.dataset["adminGrid"] = s.grid ? "on" : "off";

  return () => {
    for (const k of ALL_KEYS) root.style.removeProperty(k);
    root.classList.add("dark");
    root.style.colorScheme = "";
    delete root.dataset["adminGrid"];
  };
}
