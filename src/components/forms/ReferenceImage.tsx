import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, ImageIcon, Maximize2, X } from "lucide-react";

/** Collapsible "Ver foto de referencia" panel with a full-screen zoom. */
export function ReferenceImage({ src }: { src: string }) {
  const [open, setOpen] = useState(false);
  const [zoom, setZoom] = useState(false);

  return (
    <div className="mt-5">
      <button type="button" aria-expanded={open} onClick={() => setOpen((o) => !o)}
        className="f-ref-toggle f-body inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs uppercase tracking-[0.2em]">
        <ImageIcon className="h-3.5 w-3.5" />
        {open ? "Ocultar foto de referencia" : "Ver foto de referencia"}
        <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-300 ${open ? "rotate-180" : ""}`} />
      </button>

      <div className={`grid transition-[grid-template-rows,opacity] duration-500 ease-out ${open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
        <div className="overflow-hidden">
          {open && (
            <button type="button" onClick={() => setZoom(true)} title="Ampliar"
              className="f-ref-frame group relative mt-4 block w-full overflow-hidden rounded-2xl">
              <img src={src} alt="Foto de referencia" className="mx-auto max-h-[420px] w-full object-contain" />
              <span className="absolute bottom-3 right-3 inline-flex items-center gap-1.5 rounded-full bg-black/60 px-3 py-1.5 text-xs text-white opacity-80 transition group-hover:opacity-100">
                <Maximize2 className="h-3.5 w-3.5" /> Ampliar
              </span>
            </button>
          )}
        </div>
      </div>

      {zoom && <Lightbox src={src} onClose={() => setZoom(false)} />}
    </div>
  );
}

function Lightbox({ src, onClose }: { src: string; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
  }, [onClose]);

  // Portal: sections use transform/filter animations, which would trap a fixed overlay.
  return createPortal(
    <div role="dialog" aria-modal="true" aria-label="Foto de referencia ampliada" onClick={onClose}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm"
      style={{ animation: "fade-in .2s ease-out" }}>
      <img src={src} alt="Foto de referencia" onClick={(e) => e.stopPropagation()}
        className="max-h-[92vh] max-w-[94vw] rounded-xl object-contain shadow-2xl" />
      <button type="button" onClick={onClose} aria-label="Cerrar"
        className="absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20">
        <X className="h-5 w-5" />
      </button>
      <span className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 text-xs text-white/60">Tocá fuera de la imagen o presioná Esc para cerrar</span>
    </div>,
    document.body,
  );
}
