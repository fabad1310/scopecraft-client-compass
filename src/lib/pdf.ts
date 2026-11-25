import type { FormComponent } from "./forms";
import { normalizeKey } from "./form-import";

export interface PdfForm {
  title: string;
  subtitle?: string | undefined;
  client_name?: string | undefined;
  components: FormComponent[];
}

const BLUE: [number, number, number] = [0, 51, 153];
const INK: [number, number, number] = [15, 23, 42];
const GRAY: [number, number, number] = [100, 116, 139];
const RULE: [number, number, number] = [215, 222, 235];

/** Downloads an A4 PDF with the answers of one response. */
export async function downloadResponsesPdf(form: PdfForm, answers: Record<string, unknown>, submittedAt?: string) {
  const doc = await buildResponsesPdf(form, answers, submittedAt);
  const name = normalizeKey(form.title).replace(/ /g, "-") || "cuestionario";
  doc.save(`respuestas-${name}.pdf`);
}

/** Builds the A4 PDF document (jsPDF is loaded on demand to keep it out of the main bundle). */
export async function buildResponsesPdf(form: PdfForm, answers: Record<string, unknown>, submittedAt?: string) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = 18;
  const CW = W - M * 2;
  let y = M;

  const ensure = (h: number) => { if (y + h > H - 20) { doc.addPage(); y = M; } };
  const write = (text: string, size: number, style: "normal" | "bold" | "italic", color: [number, number, number], indent = 0, lh = 1.45) => {
    doc.setFont("helvetica", style); doc.setFontSize(size); doc.setTextColor(...color);
    const lines = doc.splitTextToSize(text, CW - indent) as string[];
    const step = (size * 0.3528) * lh;
    for (const line of lines) { ensure(step); doc.text(line, M + indent, y + size * 0.3528); y += step; }
  };

  // Header: wordmark + document label
  doc.setFont("helvetica", "normal"); doc.setFontSize(20); doc.setTextColor(...BLUE);
  doc.text("ALTO", M, y + 7);
  const altoW = doc.getTextWidth("ALTO");
  doc.setFont("helvetica", "bold"); doc.text("PERFIL", M + altoW + 0.6, y + 7);
  doc.setFont("helvetica", "normal"); doc.setFontSize(6.5); doc.setCharSpace(1.1);
  doc.text("STRATEGIC DATA ANALYTICS", M, y + 11.5);
  doc.setCharSpace(0);
  const when = new Date(submittedAt ?? Date.now()).toLocaleString("es-AR", { dateStyle: "long", timeStyle: "short" });
  doc.setFontSize(8); doc.setTextColor(...GRAY);
  doc.text("RESPUESTAS DEL CUESTIONARIO", W - M, y + 5, { align: "right" });
  doc.text(when, W - M, y + 10, { align: "right" });
  y += 16;
  doc.setDrawColor(...BLUE); doc.setLineWidth(0.6); doc.line(M, y, W - M, y);
  y += 9;

  write(form.title || "Cuestionario", 17, "bold", INK, 0, 1.3);
  if (form.subtitle) { y += 1; write(form.subtitle, 10, "normal", GRAY); }
  if (form.client_name) { y += 1; write(`Cliente: ${form.client_name}`, 10, "bold", BLUE); }
  y += 5;

  let n = 0;
  for (const c of form.components) {
    if (c.type === "text") {
      if (!c.title) continue;
      ensure(14); y += 3;
      write(c.title.toUpperCase(), 9, "bold", BLUE);
      doc.setDrawColor(...RULE); doc.setLineWidth(0.3); doc.line(M, y, W - M, y); y += 4;
      continue;
    }
    n += 1;
    ensure(18);
    doc.setFillColor(235, 241, 255); doc.roundedRect(M, y - 0.5, 9, 6, 1.2, 1.2, "F");
    doc.setFont("helvetica", "bold"); doc.setFontSize(8.5); doc.setTextColor(...BLUE);
    doc.text(String(n).padStart(2, "0"), M + 4.5, y + 3.6, { align: "center" });
    const startY = y;
    write(`${c.title}${c.required ? " *" : ""}`, 11, "bold", INK, 13);
    if (y - startY < 6) y = startY + 6.5;
    y += 1.5;

    const v = answers[c.id];
    const list = Array.isArray(v) ? (v as string[]).filter(Boolean) : [];
    if (Array.isArray(v) ? list.length === 0 : typeof v !== "string" || !v.trim()) {
      write("Sin respuesta", 10, "italic", GRAY, 13);
    } else if (Array.isArray(v)) {
      for (const o of list) write(`•  ${o}`, 10.5, "normal", INK, 13);
    } else {
      write(String(v), 10.5, "normal", INK, 13);
    }
    y += 5;
  }

  // Footer on every page
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setDrawColor(...RULE); doc.setLineWidth(0.3); doc.line(M, H - 13, W - M, H - 13);
    doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(...GRAY);
    doc.text("Alto Perfil · Survey Manager", M, H - 8);
    doc.text(`Página ${i} de ${pages}`, W - M, H - 8, { align: "right" });
  }

  return doc;
}
