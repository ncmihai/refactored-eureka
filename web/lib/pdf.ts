import { createHash } from "crypto";

type PdfDoc = {
  tool: string;
  clientAlias?: string | null;
  inputSnapshot?: unknown;
  outputSummary?: unknown;
  productSnapshots?: unknown;
  shareId?: string | null;
  createdAt?: string | null;
  firm?: { nume?: string | null; brandColor?: string | null } | string | null;
  user?: { email?: string | null; nume?: string | null } | string | null;
};

function escapePdf(value: string) {
  return value.replaceAll("\\", "\\\\").replaceAll("(", "\\(").replaceAll(")", "\\)");
}

function relationLabel(value: PdfDoc["firm"] | PdfDoc["user"]) {
  if (!value) return "—";
  if (typeof value === "string") return value;
  if ("email" in value) return value.nume ?? value.email ?? "—";
  return value.nume ?? "—";
}

function brandRgb(value: PdfDoc["firm"]) {
  const fallback = [0.08, 0.33, 0.24] as const;
  if (!value || typeof value === "string" || !value.brandColor) return fallback;
  const hex = value.brandColor.trim().replace(/^#/, "");
  if (!/^[0-9a-fA-F]{6}$/.test(hex)) return fallback;
  return [
    parseInt(hex.slice(0, 2), 16) / 255,
    parseInt(hex.slice(2, 4), 16) / 255,
    parseInt(hex.slice(4, 6), 16) / 255,
  ] as const;
}

function fmt(value: unknown) {
  const num = Number(value);
  if (!Number.isFinite(num)) return "—";
  return num.toLocaleString("ro-RO", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function outputLines(doc: PdfDoc) {
  const output = (doc.outputSummary ?? {}) as Record<string, unknown>;
  if (doc.tool === "credit") {
    return [
      `Luni efective: ${output.months_to_close ?? "—"}`,
      `Total de platit: ${fmt(output.total_paid)}`,
      `Total dobanda: ${fmt(output.total_interest)}`,
      `Total comisioane: ${fmt(output.total_fees)}`,
    ];
  }

  if (doc.tool === "optimizare") {
    return [
      `Recomandare: scenariul ${output.recommended ?? "—"}`,
      `A - dobanda economisita: ${fmt(output.interest_saved_by_prepay)}`,
      `B - castig net investitie: ${fmt(output.scenario_b_gain_net)}`,
      `B - portofoliu final net: ${fmt(output.scenario_b_final_investment_net)}`,
      `Crossover: ${output.crossover_year ?? "fara crossover"}`,
    ];
  }

  return ["Exportul PDF V1 este disponibil doar pentru Credit si Optimizare."];
}

export function simulationHash(doc: PdfDoc) {
  return createHash("sha256")
    .update(
      JSON.stringify({
        tool: doc.tool,
        inputSnapshot: doc.inputSnapshot,
        outputSummary: doc.outputSummary,
        productSnapshots: doc.productSnapshots,
      }),
    )
    .digest("hex");
}

export function buildSimulationPdf(doc: PdfDoc) {
  const hash = simulationHash(doc);
  const title =
    doc.tool === "optimizare"
      ? "Optimizare credit - raport simulare"
      : "Simulator credit - raport simulare";
  const created = doc.createdAt
    ? new Date(doc.createdAt).toLocaleString("ro-RO")
    : new Date().toLocaleString("ro-RO");
  const lines = [
    title,
    "",
    `Firma: ${relationLabel(doc.firm)}`,
    `Culoare brand: ${
      doc.firm && typeof doc.firm !== "string" && doc.firm.brandColor
        ? doc.firm.brandColor
        : "#15543d"
    }`,
    `Consultant: ${relationLabel(doc.user)}`,
    `Client: ${doc.clientAlias ?? "Client demo"}`,
    `Generat la: ${created}`,
    `Share ID: ${doc.shareId ?? "—"}`,
    `Hash input/output: ${hash}`,
    "",
    "Rezumat",
    ...outputLines(doc),
    "",
    "Disclaimer",
    "Raport educational, nu constituie consultanta financiara, fiscala sau de investitii.",
    "Verifica intotdeauna conditiile contractuale si eligibilitatea cu institutia relevanta.",
  ];

  const text = lines
    .slice(0, 42)
    .map((line, index) => {
      const prefix = index === 0 ? "BT /F1 18 Tf 50 790 Td" : "";
      const font = index === 2 ? " /F1 11 Tf" : "";
      const move = index === 0 ? "" : " 0 -18 Td";
      return `${prefix}${font}${move} (${escapePdf(line)}) Tj`;
    })
    .join("\n");
  const [r, g, b] = brandRgb(doc.firm);
  const brandBar = `q ${r.toFixed(3)} ${g.toFixed(3)} ${b.toFixed(3)} rg 0 817 595 25 re f Q`;
  const stream = `${brandBar}\n${text}\nET`;

  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`,
  ];

  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(pdf));
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xrefOffset = Buffer.byteLength(pdf);
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach((offset) => {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;

  return { buffer: Buffer.from(pdf, "utf8"), hash };
}
