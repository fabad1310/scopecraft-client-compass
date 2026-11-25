import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";

const PinSchema = z.object({ pin: z.string().regex(/^\d{4}$/) });

/**
 * Agency PIN is checked on the server, so it never ships in the browser bundle.
 * Keep the constant inside the handler: the client build only gets an RPC stub.
 */
export const verifyAgencyPin = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => PinSchema.parse(d))
  .handler(async ({ data }) => {
    const AGENCY_PIN = "1310";
    return { ok: data.pin === AGENCY_PIN };
  });

// ---------- Agency session (this browser) ----------

const AGENCY_KEY = "ap:agency-until";
const AGENCY_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export function grantAgencyAccess() {
  try { localStorage.setItem(AGENCY_KEY, String(Date.now() + AGENCY_TTL_MS)); } catch { /* private mode */ }
}
export function hasAgencyAccess(): boolean {
  try { return Number(localStorage.getItem(AGENCY_KEY) ?? 0) > Date.now(); } catch { return false; }
}
export function revokeAgencyAccess() {
  try { localStorage.removeItem(AGENCY_KEY); } catch { /* ignore */ }
}

// ---------- Client PINs (one per questionnaire, stored in forms.theme.pin) ----------

export const PIN_RE = /^\d{4}$/;
const RESERVED = new Set(["0000", "1234"]);

async function usedPins(excludeFormId?: string): Promise<Set<string>> {
  const { data, error } = await supabase.from("forms").select("id, theme");
  if (error) throw error;
  const pins = (data ?? [])
    .filter((f) => f.id !== excludeFormId)
    .map((f) => (f.theme as { pin?: unknown } | null)?.pin)
    .filter((p): p is string => typeof p === "string");
  return new Set(pins);
}

export async function isPinAvailable(pin: string, excludeFormId?: string) {
  return PIN_RE.test(pin) && !RESERVED.has(pin) && !(await usedPins(excludeFormId)).has(pin);
}

export async function generateUniquePin(excludeFormId?: string): Promise<string> {
  const used = await usedPins(excludeFormId);
  for (let i = 0; i < 200; i++) {
    const pin = String(Math.floor(Math.random() * 10000)).padStart(4, "0");
    if (!used.has(pin) && !RESERVED.has(pin)) return pin;
  }
  throw new Error("No quedan PINs disponibles");
}

/** Returns the public slug of the questionnaire with this PIN, or null. */
export async function findFormSlugByPin(pin: string): Promise<string | null> {
  if (!PIN_RE.test(pin)) return null;
  const { data, error } = await supabase.from("forms").select("slug").eq("theme->>pin", pin).limit(1);
  if (error) throw error;
  return data?.[0]?.slug ?? null;
}
