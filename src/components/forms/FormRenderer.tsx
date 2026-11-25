import { useMemo, useState, type CSSProperties, type MouseEvent } from "react";
import { Check, Loader2, Sparkles } from "lucide-react";
import { FormBackground } from "./FormBackground";
import { LinkifiedText } from "./LinkifiedText";
import { ReferenceImage } from "./ReferenceImage";
import { OTHER_LABEL, OTHER_OPTION, getFont, isAnswered, missingRequired, resolveAnswers, resolvePalette, type FormRecord } from "@/lib/forms";
import { sfx } from "@/lib/sound";

type Answers = Record<string, string | string[]>;

interface Props {
  form: Pick<FormRecord, "title" | "subtitle" | "logo_url" | "logo_size" | "theme" | "components">;
  preview?: boolean;
  onSubmit?: (answers: Answers) => Promise<void>;
}

export function FormRenderer({ form, preview, onSubmit }: Props) {
  const palette = resolvePalette(form.theme);
  const font = getFont(form.theme.font);
  const [answers, setAnswers] = useState<Answers>({});
  const [otherText, setOtherText] = useState<Record<string, string>>({});
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const play = (k: keyof typeof sfx) => { if (form.theme.sound) sfx[k](); };

  const style = {
    "--f-bg": palette.bg, "--f-surface": palette.surface, "--f-primary": palette.primary,
    "--f-secondary": palette.secondary, "--f-text": palette.text, "--f-muted": palette.muted,
    "--f-font": font.css, "--f-glow": form.theme.glow,
  } as CSSProperties;

  const resolved = useMemo(() => resolveAnswers(form.components, answers, otherText), [form.components, answers, otherText]);
  const questions = form.components.filter((c) => c.type !== "text");
  const progress = questions.length ? questions.filter((c) => isAnswered(c, resolved[c.id])).length / questions.length : 0;

  const ripple = (e: MouseEvent<HTMLButtonElement>) => {
    const el = e.currentTarget;
    const r = el.getBoundingClientRect();
    const s = document.createElement("span");
    const size = Math.max(r.width, r.height);
    s.className = "ripple";
    s.style.cssText = `width:${size}px;height:${size}px;left:${e.clientX - r.left - size / 2}px;top:${e.clientY - r.top - size / 2}px`;
    el.appendChild(s);
    setTimeout(() => s.remove(), 650);
  };

  const toggle = (id: string, opt: string, multiple?: boolean) => {
    setAnswers((a) => {
      const cur = Array.isArray(a[id]) ? (a[id] as string[]) : [];
      const on = cur.includes(opt);
      play(on ? "deselect" : "select");
      const next = multiple ? (on ? cur.filter((o) => o !== opt) : [...cur, opt]) : on ? [] : [opt];
      return { ...a, [id]: next };
    });
  };

  const submit = async () => {
    const emptyOther = form.components.filter((c) => Array.isArray(answers[c.id]) && (answers[c.id] as string[]).includes(OTHER_OPTION) && !(otherText[c.id] ?? "").trim());
    if (emptyOther.length) { setError(`Explicá tu respuesta en "Otro": ${emptyOther.map((m) => m.title).join(", ")}`); play("deselect"); return; }
    const missing = missingRequired(form.components, resolved);
    if (missing.length) { setError(`Faltan respuestas obligatorias: ${missing.map((m) => m.title).join(", ")}`); play("deselect"); return; }
    setError(null);
    if (preview || !onSubmit) { play("submit"); setDone(true); return; }
    setSending(true);
    try { await onSubmit(resolved); play("submit"); setDone(true); }
    catch { setError("No pudimos enviar el formulario. Intentá nuevamente."); }
    finally { setSending(false); }
  };

  let qn = 0;

  return (
    <div className="f-root relative min-h-full overflow-hidden" style={style}>
      <FormBackground theme={form.theme} palette={palette} />
      {!preview && (
        <div className="fixed left-0 top-0 z-50 h-1 w-full" style={{ background: "transparent" }}>
          <div className="f-progress h-full transition-all duration-700" style={{ width: `${progress * 100}%` }} />
        </div>
      )}
      <div className="relative z-10 mx-auto max-w-3xl px-5 py-16 md:py-24">
        {done ? (
          <div className="f-card anim-rise flex flex-col items-center rounded-3xl px-8 py-20 text-center">
            <div className="f-index mb-8 flex h-20 w-20 items-center justify-center rounded-full" style={{ animation: "pulse-glow 2s infinite" }}>
              <Check className="h-10 w-10" />
            </div>
            <h2 className="f-title text-3xl font-bold md:text-4xl">Transmisión completada</h2>
            <p className="f-muted f-body mt-4 max-w-md">Tus respuestas fueron enviadas con éxito. ¡Gracias por tu tiempo!</p>
          </div>
        ) : (
          <>
            <header className="mb-14 flex flex-col items-center text-center">
              {form.logo_url && (
                <img src={form.logo_url} alt="Logo" className="anim-logo mb-10 object-contain"
                  style={{ height: form.logo_size, maxWidth: "100%", filter: `drop-shadow(0 0 ${form.theme.glow / 4}px ${palette.primary}66)` }} />
              )}
              <div className="f-body f-accent mb-4 flex items-center gap-2 text-xs uppercase tracking-[0.35em] anim-rise">
                <Sparkles className="h-3.5 w-3.5" /> Validación de alcance
              </div>
              <h1 className="f-title anim-rise text-4xl font-bold leading-tight md:text-6xl" style={{ animationDelay: ".1s" }}>{form.title || "Sin título"}</h1>
              {form.subtitle && <p className="f-muted f-body anim-rise mt-5 max-w-xl text-lg" style={{ animationDelay: ".2s" }}>{form.subtitle}</p>}
            </header>

            <div className="space-y-6">
              {form.components.map((c, i) => {
                const delay = { animationDelay: `${0.25 + i * 0.07}s` };
                if (c.type === "text") {
                  return (
                    <section key={c.id} className="anim-rise px-2 py-4" style={delay}>
                      {c.title && <h3 className="f-accent mb-3 text-sm uppercase tracking-[0.25em]">{c.title}</h3>}
                      <p className="f-body whitespace-pre-wrap text-lg leading-relaxed" style={{ opacity: 0.88 }}><LinkifiedText text={c.body ?? ""} /></p>
                      {c.referenceImage && <ReferenceImage src={c.referenceImage} />}
                    </section>
                  );
                }
                qn += 1;
                const num = String(qn).padStart(2, "0");
                return (
                  <section key={c.id} className="f-card anim-rise rounded-3xl p-6 md:p-8" style={delay}>
                    <div className="mb-5 flex items-start gap-4">
                      <span className="f-index shrink-0 rounded-lg px-2.5 py-1 text-xs font-bold">{num}</span>
                      <h3 className="text-lg font-semibold leading-snug md:text-xl">
                        {c.title}{c.required && <span className="f-accent"> *</span>}
                      </h3>
                    </div>
                    {c.type === "question" ? (
                      c.multiline ? (
                        <textarea rows={4} className="f-input f-body resize-y" placeholder={c.placeholder}
                          value={(answers[c.id] as string) ?? ""} onKeyDown={() => play("tick")}
                          onChange={(e) => setAnswers((a) => ({ ...a, [c.id]: e.target.value }))} />
                      ) : (
                        <input className="f-input f-body" placeholder={c.placeholder}
                          value={(answers[c.id] as string) ?? ""} onKeyDown={() => play("tick")}
                          onChange={(e) => setAnswers((a) => ({ ...a, [c.id]: e.target.value }))} />
                      )
                    ) : (
                      <>
                        {c.multiple && <p className="f-muted f-body -mt-2 mb-4 text-xs uppercase tracking-widest">Podés elegir varias</p>}
                        <div className="grid gap-3 sm:grid-cols-2">
                          {[...(c.options ?? []), ...(c.allowOther ? [OTHER_OPTION] : [])].map((opt) => {
                            const on = Array.isArray(answers[c.id]) && (answers[c.id] as string[]).includes(opt);
                            return (
                              <button key={opt} type="button" data-on={on} className="f-chip f-body flex items-center gap-3"
                                onClick={(e) => { ripple(e); toggle(c.id, opt, c.multiple); }}>
                                <span className={`f-dot flex h-5 w-5 shrink-0 items-center justify-center transition-all ${c.multiple ? "rounded-md" : "rounded-full"}`}>
                                  {on && <Check className="h-3 w-3" style={{ color: palette.bg }} />}
                                </span>
                                <span>{opt === OTHER_OPTION ? OTHER_LABEL : opt}</span>
                              </button>
                            );
                          })}
                        </div>
                        {c.allowOther && Array.isArray(answers[c.id]) && (answers[c.id] as string[]).includes(OTHER_OPTION) && (
                          <textarea rows={2} autoFocus className="f-input f-body anim-rise mt-3 resize-y" placeholder="Contanos tu respuesta…"
                            value={otherText[c.id] ?? ""} onKeyDown={() => play("tick")}
                            onChange={(e) => setOtherText((o) => ({ ...o, [c.id]: e.target.value }))} />
                        )}
                      </>
                    )}
                    {c.referenceImage && <ReferenceImage src={c.referenceImage} />}
                  </section>
                );
              })}
            </div>

            <div className="mt-14 flex flex-col items-center gap-4">
              {error && <p className="f-body text-sm" style={{ color: palette.primary }}>{error}</p>}
              <button type="button" className="f-btn inline-flex items-center gap-3" disabled={sending} onClick={submit}>
                {sending && <Loader2 className="h-4 w-4 animate-spin" />} Enviar formulario
              </button>
              {preview && <p className="f-muted f-body text-xs">Vista previa — no se guardan respuestas</p>}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
