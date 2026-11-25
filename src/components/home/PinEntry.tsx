import { useState } from "react";
import { OTPInput, REGEXP_ONLY_DIGITS } from "input-otp";
import { ArrowLeft, Loader2 } from "lucide-react";

interface Props {
  title: string;
  hint: string;
  icon: React.ReactNode;
  /** Resolve to an error message, or null when access is granted. */
  onSubmit: (pin: string) => Promise<string | null>;
  onBack: () => void;
}

/** 4-digit PIN card for the light home page. Submits automatically on the 4th digit. */
export function PinEntry({ title, hint, icon, onSubmit, onBack }: Props) {
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shake, setShake] = useState(0);

  const submit = async (value: string) => {
    setBusy(true); setError(null);
    try {
      const err = await onSubmit(value);
      if (err) { setError(err); setPin(""); setShake((s) => s + 1); }
    } catch {
      setError("No pudimos verificar el PIN. Revisá tu conexión e intentá de nuevo."); setPin("");
    } finally { setBusy(false); }
  };

  return (
    <div className="ap-card ap-rise w-full max-w-md rounded-3xl p-8 text-center">
      <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#003399]/8 text-[#003399]">{icon}</div>
      <h2 className="text-xl font-semibold text-slate-900">{title}</h2>
      <p className="mt-2 text-sm text-slate-500">{hint}</p>

      <div key={shake} className={`mt-7 flex justify-center ${shake ? "ap-shake" : ""}`}>
        <OTPInput maxLength={4} value={pin} onChange={(v) => { setPin(v); setError(null); }} onComplete={submit}
          pattern={REGEXP_ONLY_DIGITS} inputMode="numeric" autoFocus disabled={busy} aria-label="PIN de 4 dígitos"
          containerClassName="flex gap-3"
          render={({ slots }) => (
            <>
              {slots.map((s, i) => (
                <div key={i} data-active={s.isActive} data-filled={!!s.char}
                  className="ap-pin-slot relative flex h-16 w-14 items-center justify-center rounded-2xl text-2xl font-semibold text-[#003399]">
                  {s.char ? "●" : null}
                  {s.hasFakeCaret && <span className="absolute h-7 w-px animate-caret-blink bg-[#003399]" />}
                </div>
              ))}
            </>
          )} />
      </div>

      <div className="mt-5 h-5 text-sm">
        {busy ? <Loader2 className="mx-auto h-5 w-5 animate-spin text-[#003399]" /> : error && <span className="text-red-600">{error}</span>}
      </div>

      <button type="button" onClick={onBack} className="mt-4 inline-flex items-center gap-1.5 text-sm text-slate-500 transition hover:text-[#003399]">
        <ArrowLeft className="h-4 w-4" /> Volver
      </button>
    </div>
  );
}
