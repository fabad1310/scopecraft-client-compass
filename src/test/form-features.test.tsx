import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { LinkifiedText } from "@/components/forms/LinkifiedText";
import { formToCsv, parseImport, parseTable, templateCsv } from "@/lib/form-import";
import { CUSTOM_PALETTE_ID, OTHER_OPTION, missingRequired, resolveAnswers, resolvePalette, type FormComponent } from "@/lib/forms";

describe("import", () => {
  it("parses the downloadable template into blocks", () => {
    const r = parseImport(templateCsv());
    expect(r.title).toBe("Validación de alcance del proyecto");
    expect(r.client_name).toBe("Acme Corp");
    expect(r.components.map((c) => c.type)).toEqual(["text", "question", "question", "choice", "choice"]);
    const platforms = r.components[3]!;
    expect(platforms.options).toEqual(["Web", "iOS", "Android"]);
    expect(platforms.multiple).toBe(true);
    expect(platforms.allowOther).toBe(true);
    expect(platforms.required).toBe(true);
    expect(r.components[2]!.multiline).toBe(false);
    expect(r.components[4]!.referenceImage).toMatch(/^https:\/\//);
    expect(r.warnings).toEqual([]);
  });

  it("accepts tab-separated text pasted from Excel/Word, with accented headers and quoted newlines", () => {
    const tsv = 'Tipo\tTítulo\tOpciones\tOtro\nOpciones\t¿Color?\t"Rojo\nAzul"\tSí\nfoo\tx\t\t';
    const r = parseImport(tsv);
    expect(r.components).toHaveLength(1);
    expect(r.components[0]!.options).toEqual(["Rojo", "Azul"]);
    expect(r.components[0]!.allowOther).toBe(true);
    expect(r.warnings[0]).toMatch(/Fila 3/);
  });

  it("errors clearly without a header row", () => {
    expect(() => parseImport("a,b\n1,2")).toThrow(/tipo/);
  });

  it("round-trips an exported form", () => {
    const components: FormComponent[] = [
      { id: "1", type: "text", title: "Intro", body: 'Texto con ; y "comillas"' },
      { id: "2", type: "choice", title: "Elegí", options: ["A", "B"], multiple: false, allowOther: true, required: true },
    ];
    const r = parseImport(formToCsv({ title: "T", subtitle: "S", components }));
    expect(r.title).toBe("T");
    expect(r.components[0]!.body).toBe('Texto con ; y "comillas"');
    expect(r.components[1]).toMatchObject({ options: ["A", "B"], allowOther: true, required: true, multiple: false });
  });

  it("parses semicolon CSV with a BOM", () => {
    expect(parseTable(String.fromCharCode(0xfeff) + "a;b\r\n1;2\r\n")).toEqual([["a", "b"], ["1", "2"]]);
  });
});

describe("otro – explicar", () => {
  const c: FormComponent = { id: "q", type: "choice", title: "Q", options: ["A"], allowOther: true, required: true };

  it("replaces the sentinel with the typed explanation", () => {
    expect(resolveAnswers([c], { q: ["A", OTHER_OPTION] }, { q: " mi idea " })).toEqual({ q: ["A", "Otro: mi idea"] });
  });

  it("treats an empty explanation as unanswered", () => {
    const resolved = resolveAnswers([c], { q: [OTHER_OPTION] }, {});
    expect(missingRequired([c], resolved)).toHaveLength(1);
  });
});

describe("custom palette", () => {
  it("uses custom colors only when selected", () => {
    const customPalette = { bg: "#111111", surface: "#222222", primary: "#ff0000", secondary: "#00ff00", text: "#ffffff", muted: "#999999" };
    expect(resolvePalette({ palette: CUSTOM_PALETTE_ID, customPalette }).primary).toBe("#ff0000");
    expect(resolvePalette({ palette: "neon", customPalette }).id).toBe("neon");
  });
});

describe("links in text", () => {
  it("makes bare and markdown links clickable in a new tab", () => {
    const { container } = render(<LinkifiedText text="Mirá https://a.com/x. y [la propuesta](https://b.com) o www.c.com" />);
    const links = [...container.querySelectorAll("a")];
    expect(links.map((a) => [a.textContent, a.getAttribute("href"), a.target])).toEqual([
      ["https://a.com/x", "https://a.com/x", "_blank"],
      ["la propuesta", "https://b.com", "_blank"],
      ["www.c.com", "https://www.c.com", "_blank"],
    ]);
    expect(container.textContent).toContain("/x. y ");
  });

  it("does not link javascript: URLs", () => {
    const { container } = render(<LinkifiedText text="[x](javascript:alert(1))" />);
    expect(container.querySelector("a")).toBeNull();
  });
});

describe("brand footer contrast", async () => {
  const { isLightColor } = await import("@/lib/color");
  it("uses the black logo on light backgrounds and white on dark ones", () => {
    expect(isLightColor("#ffffff")).toBe(true);
    expect(isLightColor("#c3f5ff")).toBe(true);
    expect(isLightColor("#05070d")).toBe(false);
    expect(isLightColor("#003399")).toBe(false);
  });
});

describe("responses PDF", () => {
  it("lays out every answer across pages with page numbers", async () => {
    const { buildResponsesPdf } = await import("@/lib/pdf");
    const components: FormComponent[] = [
      { id: "t", type: "text", title: "Contexto", body: "x" },
      ...Array.from({ length: 30 }, (_, i): FormComponent => ({ id: `q${i}`, type: i % 2 ? "choice" : "question", title: `¿Pregunta número ${i + 1}?`, options: ["Sí", "No"] })),
    ];
    const answers: Record<string, unknown> = { q0: "Respuesta con acentos: ñandú, acción, ¿qué?", q1: ["Sí", "Otro: explicación"] };
    const doc = await buildResponsesPdf({ title: "Validación", client_name: "Acme", components }, answers, "2026-11-25T12:00:00Z");
    expect(doc.getNumberOfPages()).toBeGreaterThan(1);
    const raw = doc.output();
    expect(raw).toContain("Validaci");
    expect(raw).toContain("Sin respuesta");
    expect(raw).toContain(`gina 1 de ${doc.getNumberOfPages()}`);
  });
});
