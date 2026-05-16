import { createHash } from "crypto";

type Relation =
  | { id?: string | number; nume?: string | null; email?: string | null; brandColor?: string | null }
  | string
  | null
  | undefined;

type PdfDoc = {
  id?: string | number;
  tool: string;
  clientAlias?: string | null;
  inputSnapshot?: unknown;
  outputSummary?: unknown;
  productSnapshots?: unknown;
  shareId?: string | null;
  createdAt?: string | null;
  firm?: Relation;
  user?: Relation;
};

type CreditForm = {
  principal?: number;
  months?: number;
  annual_rate_initial?: number;
  annual_rate_after?: number;
  revision_month?: number;
  monthly_fee?: number;
  grace_months?: number;
  monthly_prepayment?: number;
  prepayment_mode?: string;
};

type AmortizationRow = {
  month: number;
  opening_balance: string | number;
  annuity: string | number;
  principal_paid: string | number;
  interest_paid: string | number;
  fee: string | number;
  total_payment: string | number;
  prepayment: string | number;
  closing_balance: string | number;
};

type CreditOutput = {
  schedule?: AmortizationRow[];
  total_interest?: string | number;
  total_fees?: string | number;
  total_paid?: string | number;
  months_to_close?: number;
};

type OptimizareForm = {
  principal?: number;
  months?: number;
  annual_rate_initial?: number;
  annual_rate_after?: number;
  revision_month?: number;
  monthly_fee?: number;
  grace_months?: number;
  monthly_extra?: number;
  investment_annual_return?: number;
  investment_tax_rate?: number;
};

type OptimizareYearPoint = {
  year: number;
  scenario_a_interest_saved: string | number;
  scenario_a_balance: string | number;
  scenario_b_investment_value: string | number;
  scenario_b_gain_net: string | number;
  scenario_b_balance: string | number;
  delta_b_minus_a: string | number;
};

type OptimizareOutput = {
  standard_monthly_payment?: string | number;
  scenario_a_total_interest?: string | number;
  scenario_a_months_to_close?: number;
  scenario_b_total_interest?: string | number;
  scenario_b_final_investment_net?: string | number;
  scenario_b_gain_net?: string | number;
  interest_saved_by_prepay?: string | number;
  crossover_year?: number | null;
  recommended?: "A" | "B";
  yearly?: OptimizareYearPoint[];
};

const PAGE_W = 595;
const PAGE_H = 842;
const M = 42;
const BRAND: RGB = [0.08, 0.33, 0.24];
const AMBER: RGB = [0.7, 0.31, 0.04];
const INK: RGB = [0.12, 0.11, 0.1];
const MUTED: RGB = [0.36, 0.33, 0.29];
const BORDER: RGB = [0.86, 0.84, 0.8];
const SOFT: RGB = [0.96, 0.95, 0.92];

type RGB = readonly [number, number, number];

function rgb(value: RGB) {
  return `${value[0].toFixed(3)} ${value[1].toFixed(3)} ${value[2].toFixed(3)}`;
}

function ascii(value: unknown) {
  return String(value ?? "-")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[–—]/g, "-")
    .replace(/[“”„]/g, '"')
    .replace(/[’]/g, "'")
    .replace(/[^\x20-\x7E]/g, "");
}

function escapePdf(value: string) {
  return ascii(value).replaceAll("\\", "\\\\").replaceAll("(", "\\(").replaceAll(")", "\\)");
}

function relationLabel(value: Relation) {
  if (!value) return "-";
  if (typeof value === "string") return value;
  return value.nume ?? value.email ?? String(value.id ?? "-");
}

function brandRgb(value: Relation): RGB {
  if (!value || typeof value === "string" || !value.brandColor) return BRAND;
  const hex = value.brandColor.trim().replace(/^#/, "");
  if (!/^[0-9a-fA-F]{6}$/.test(hex)) return BRAND;
  return [
    parseInt(hex.slice(0, 2), 16) / 255,
    parseInt(hex.slice(2, 4), 16) / 255,
    parseInt(hex.slice(4, 6), 16) / 255,
  ];
}

function num(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function fmt(value: unknown, digits = 2) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "-";
  return n.toLocaleString("ro-RO", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

function pct(value: unknown) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "-";
  return `${fmt(n, 2)}%`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function recordAt(value: unknown, key: string): Record<string, unknown> | undefined {
  if (!isRecord(value)) return undefined;
  const child = value[key];
  return isRecord(child) ? child : undefined;
}

function getCreditForm(doc: PdfDoc): CreditForm {
  return (recordAt(doc.inputSnapshot, "form") ?? {}) as CreditForm;
}

function getProduct(doc: PdfDoc): Record<string, unknown> | undefined {
  return (
    recordAt(recordAt(doc.inputSnapshot, "productSnapshots"), "creditProduct") ??
    recordAt(doc.productSnapshots, "creditProduct")
  );
}

function getCreditOutput(doc: PdfDoc): CreditOutput {
  return (isRecord(doc.outputSummary) ? doc.outputSummary : {}) as CreditOutput;
}

function getOptimizareForm(doc: PdfDoc): OptimizareForm {
  return (recordAt(doc.inputSnapshot, "form") ?? {}) as OptimizareForm;
}

function getOptimizareOutput(doc: PdfDoc): OptimizareOutput {
  return (isRecord(doc.outputSummary) ? doc.outputSummary : {}) as OptimizareOutput;
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

class PdfCanvas {
  pages: string[][] = [];
  private current: string[] = [];
  private pageNo = 0;
  private readonly brand: RGB;

  constructor(brand: RGB) {
    this.brand = brand;
    this.addPage();
  }

  addPage() {
    if (this.current.length) this.pages.push(this.current);
    this.pageNo += 1;
    this.current = [];
    this.rect(0, 0, PAGE_W, 22, { fill: this.brand });
    this.text(M, 17, "Finance Platform", 8, { color: [1, 1, 1], bold: true });
    this.text(PAGE_W - M, PAGE_H - 22, `Pagina ${this.pageNo}`, 8, {
      color: MUTED,
      align: "right",
    });
  }

  finish() {
    if (this.current.length) this.pages.push(this.current);
    this.current = [];
  }

  text(
    x: number,
    y: number,
    value: unknown,
    size = 10,
    opts: { color?: RGB; bold?: boolean; align?: "left" | "right" | "center"; maxWidth?: number } = {},
  ) {
    const safe = escapePdf(String(value ?? ""));
    const width = approxTextWidth(safe, size);
    const dx =
      opts.align === "right" ? x - width : opts.align === "center" ? x - width / 2 : x;
    const font = opts.bold ? "F2" : "F1";
    this.current.push(
      `BT /${font} ${size} Tf ${rgb(opts.color ?? INK)} rg ${dx.toFixed(2)} ${(PAGE_H - y).toFixed(2)} Td (${safe}) Tj ET`,
    );
  }

  wrappedText(
    x: number,
    y: number,
    value: unknown,
    size: number,
    maxWidth: number,
    opts: { color?: RGB; bold?: boolean; lineHeight?: number } = {},
  ) {
    const lines = wrapText(ascii(value), size, maxWidth);
    lines.forEach((line, i) => {
      this.text(x, y + i * (opts.lineHeight ?? size + 4), line, size, opts);
    });
    return y + lines.length * (opts.lineHeight ?? size + 4);
  }

  rect(
    x: number,
    y: number,
    w: number,
    h: number,
    opts: { fill?: RGB; stroke?: RGB; lineWidth?: number } = {},
  ) {
    const py = PAGE_H - y - h;
    if (opts.fill) this.current.push(`q ${rgb(opts.fill)} rg ${x} ${py} ${w} ${h} re f Q`);
    if (opts.stroke) {
      this.current.push(
        `q ${rgb(opts.stroke)} RG ${(opts.lineWidth ?? 1).toFixed(2)} w ${x} ${py} ${w} ${h} re S Q`,
      );
    }
  }

  line(x1: number, y1: number, x2: number, y2: number, color: RGB = BORDER, width = 1) {
    this.current.push(
      `q ${rgb(color)} RG ${width.toFixed(2)} w ${x1.toFixed(2)} ${(PAGE_H - y1).toFixed(2)} m ${x2.toFixed(2)} ${(PAGE_H - y2).toFixed(2)} l S Q`,
    );
  }

  path(points: Array<[number, number]>, color: RGB, width = 1.6) {
    if (points.length < 2) return;
    const [first, ...rest] = points;
    if (!first) return;
    const ops = [
      `${first[0].toFixed(2)} ${(PAGE_H - first[1]).toFixed(2)} m`,
      ...rest.map((p) => `${p[0].toFixed(2)} ${(PAGE_H - p[1]).toFixed(2)} l`),
    ].join(" ");
    this.current.push(`q ${rgb(color)} RG ${width.toFixed(2)} w ${ops} S Q`);
  }
}

function approxTextWidth(value: string, size: number) {
  return value.length * size * 0.52;
}

function wrapText(value: string, size: number, maxWidth: number) {
  const words = ascii(value).split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (approxTextWidth(next, size) <= maxWidth) {
      line = next;
    } else {
      if (line) lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  return lines.length ? lines : [""];
}

function drawSectionTitle(pdf: PdfCanvas, title: string, y: number) {
  pdf.text(M, y, title, 13, { bold: true, color: INK });
  pdf.line(M, y + 8, PAGE_W - M, y + 8, BORDER, 0.8);
}

function drawKeyValueGrid(pdf: PdfCanvas, items: Array<[string, string]>, x: number, y: number, w: number) {
  const colW = w / 2;
  items.forEach(([label, value], i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const bx = x + col * colW;
    const by = y + row * 34;
    pdf.text(bx, by, label, 8, { color: MUTED });
    pdf.wrappedText(bx, by + 13, value, 10, colW - 16, { bold: true, lineHeight: 11 });
  });
}

function drawStat(pdf: PdfCanvas, x: number, y: number, w: number, label: string, value: string, hint?: string) {
  pdf.rect(x, y, w, 66, { fill: [0.985, 0.98, 0.955], stroke: BORDER });
  pdf.text(x + 12, y + 18, label, 8, { color: MUTED });
  pdf.text(x + 12, y + 39, value, 15, { color: BRAND, bold: true });
  if (hint) pdf.text(x + 12, y + 56, hint, 7.5, { color: MUTED });
}

function drawCreditChart(pdf: PdfCanvas, schedule: AmortizationRow[], x: number, y: number, w: number, h: number) {
  pdf.rect(x, y, w, h, { fill: [0.995, 0.992, 0.982], stroke: BORDER });
  pdf.text(x + 12, y + 20, "Evolutie sold credit si dobanda cumulata", 11, { bold: true });
  pdf.text(x + w - 90, y + 20, "Sold ramas", 8, { color: BRAND });
  pdf.text(x + w - 90, y + 34, "Dobanda cumulata", 8, { color: AMBER });

  const gx = x + 42;
  const gy = y + 45;
  const gw = w - 62;
  const gh = h - 78;
  const points = schedule.map((row) => {
    return {
      month: row.month,
      sold: num(row.closing_balance),
      interest: num(row.interest_paid),
    };
  });
  let cum = 0;
  const series = points.map((p) => {
    cum += p.interest;
    return { month: p.month, sold: p.sold, dobanda: cum };
  });
  const max = Math.max(1, ...series.flatMap((p) => [p.sold, p.dobanda])) * 1.08;

  for (let i = 0; i <= 4; i += 1) {
    const yy = gy + (gh * i) / 4;
    pdf.line(gx, yy, gx + gw, yy, [0.9, 0.88, 0.84], 0.6);
    const label = fmt(max * (1 - i / 4), 0);
    pdf.text(gx - 8, yy + 3, label, 7, { color: MUTED, align: "right" });
  }

  const toPoint = (valueKey: "sold" | "dobanda") =>
    series.map((p, i) => {
      const xx = gx + (series.length <= 1 ? 0 : (gw * i) / (series.length - 1));
      const yy = gy + gh - (p[valueKey] / max) * gh;
      return [xx, yy] as [number, number];
    });

  pdf.path(toPoint("sold"), BRAND, 2);
  pdf.path(toPoint("dobanda"), AMBER, 2);
  pdf.line(gx, gy, gx, gy + gh, BORDER, 0.8);
  pdf.line(gx, gy + gh, gx + gw, gy + gh, BORDER, 0.8);
  pdf.text(gx, gy + gh + 17, "Luna 1", 7, { color: MUTED });
  pdf.text(gx + gw, gy + gh + 17, `Luna ${schedule.at(-1)?.month ?? "-"}`, 7, {
    color: MUTED,
    align: "right",
  });
}

function drawOptimizareChart(pdf: PdfCanvas, yearly: OptimizareYearPoint[], crossover: number | null | undefined, x: number, y: number, w: number, h: number) {
  pdf.rect(x, y, w, h, { fill: [0.995, 0.992, 0.982], stroke: BORDER });
  pdf.text(x + 12, y + 20, "Evolutie castig net - scenariu A vs B", 11, { bold: true });
  pdf.text(x + w - 112, y + 20, "A dobanda economisita", 8, { color: AMBER });
  pdf.text(x + w - 112, y + 34, "B castig investitie", 8, { color: BRAND });

  if (!yearly.length) {
    pdf.text(x + 12, y + 58, "Nu exista date anuale in snapshot.", 10, { color: MUTED });
    return;
  }

  const gx = x + 42;
  const gy = y + 50;
  const gw = w - 62;
  const gh = h - 86;
  const series = yearly.map((row) => ({
    year: row.year,
    a: num(row.scenario_a_interest_saved),
    b: num(row.scenario_b_gain_net),
  }));
  const max = Math.max(1, ...series.flatMap((p) => [p.a, p.b])) * 1.08;

  for (let i = 0; i <= 4; i += 1) {
    const yy = gy + (gh * i) / 4;
    pdf.line(gx, yy, gx + gw, yy, [0.9, 0.88, 0.84], 0.6);
    pdf.text(gx - 8, yy + 3, fmt(max * (1 - i / 4), 0), 7, {
      color: MUTED,
      align: "right",
    });
  }

  const toPoint = (valueKey: "a" | "b") =>
    series.map((p, i) => {
      const xx = gx + (series.length <= 1 ? 0 : (gw * i) / (series.length - 1));
      const yy = gy + gh - (p[valueKey] / max) * gh;
      return [xx, yy] as [number, number];
    });

  pdf.path(toPoint("a"), AMBER, 2);
  pdf.path(toPoint("b"), BRAND, 2);
  pdf.line(gx, gy, gx, gy + gh, BORDER, 0.8);
  pdf.line(gx, gy + gh, gx + gw, gy + gh, BORDER, 0.8);
  pdf.text(gx, gy + gh + 17, `Anul ${series[0]?.year ?? "-"}`, 7, { color: MUTED });
  pdf.text(gx + gw, gy + gh + 17, `Anul ${series.at(-1)?.year ?? "-"}`, 7, {
    color: MUTED,
    align: "right",
  });

  if (crossover) {
    const index = series.findIndex((row) => row.year === crossover);
    if (index >= 0) {
      const xx = gx + (series.length <= 1 ? 0 : (gw * index) / (series.length - 1));
      pdf.line(xx, gy, xx, gy + gh, [0.52, 0.5, 0.46], 0.8);
      pdf.text(xx + 4, gy + 12, "Crossover", 7, { color: MUTED });
    }
  }
}

function drawOptimizareReport(pdf: PdfCanvas, doc: PdfDoc, hash: string) {
  const form = getOptimizareForm(doc);
  const output = getOptimizareOutput(doc);
  const product = getProduct(doc);
  const yearly = Array.isArray(output.yearly) ? output.yearly : [];
  const created = doc.createdAt ? new Date(doc.createdAt).toLocaleString("ro-RO") : new Date().toLocaleString("ro-RO");
  const productName = product ? `${product.banca ?? ""} ${product.nume ?? ""}`.trim() : "Parametri custom";
  const recommendation =
    output.recommended === "B" ? "Scenariul B - investeste suma extra" : "Scenariul A - ramburseaza anticipat";
  const reason =
    output.recommended === "B"
      ? "Castigul net al investitiei depaseste dobanda economisita pe orizontul analizat."
      : "Dobanda economisita depaseste castigul net al investitiei pe orizontul analizat.";
  const totalEffort = num(output.standard_monthly_payment) + num(form.monthly_extra);

  pdf.text(M, 58, "Raport optimizare credit", 23, { bold: true, color: INK });
  pdf.text(M, 80, `Client: ${doc.clientAlias ?? "Client demo"}`, 11, { color: MUTED });
  pdf.text(PAGE_W - M, 58, relationLabel(doc.firm), 11, { bold: true, color: BRAND, align: "right" });
  pdf.text(PAGE_W - M, 76, `Consultant: ${relationLabel(doc.user)}`, 9, { color: MUTED, align: "right" });
  pdf.text(PAGE_W - M, 92, `Generat: ${created}`, 9, { color: MUTED, align: "right" });

  drawSectionTitle(pdf, "Parametri folositi", 122);
  drawKeyValueGrid(
    pdf,
    [
      ["Produs", productName],
      ["Suma imprumut", `${fmt(form.principal)} EUR`],
      ["Perioada", `${form.months ?? "-"} luni`],
      ["Dobanda initiala", pct(form.annual_rate_initial)],
      ["Revizuire dobanda", form.revision_month ? `luna ${form.revision_month}` : "fara revizuire"],
      ["Dobanda dupa revizuire", form.annual_rate_after ? pct(form.annual_rate_after) : "-"],
      ["Suma extra lunara", `${fmt(form.monthly_extra)} EUR`],
      ["Randament / impozit", `${pct(form.investment_annual_return)} / ${pct(form.investment_tax_rate)}`],
    ],
    M,
    146,
    PAGE_W - M * 2,
  );

  drawSectionTitle(pdf, "Recomandare", 294);
  pdf.rect(M, 318, PAGE_W - M * 2, 72, { fill: [0.985, 0.98, 0.955], stroke: BORDER });
  pdf.rect(M, 318, 5, 72, { fill: output.recommended === "B" ? BRAND : AMBER });
  pdf.text(M + 16, 342, recommendation, 15, { bold: true, color: output.recommended === "B" ? BRAND : AMBER });
  pdf.wrappedText(M + 16, 362, `${reason} ${output.crossover_year ? `Crossover in anul ${output.crossover_year}.` : "Fara crossover in orizontul ales."}`, 9, PAGE_W - M * 2 - 32, {
    color: MUTED,
    lineHeight: 12,
  });

  drawSectionTitle(pdf, "Blocuri informative", 414);
  const statW = (PAGE_W - M * 2 - 18) / 3;
  drawStat(pdf, M, 438, statW, "Rata standard", `${fmt(output.standard_monthly_payment)} EUR`, "principal + dobanda + comision");
  drawStat(pdf, M + statW + 9, 438, statW, "Efort lunar total", `${fmt(totalEffort)} EUR`, "rata + suma extra");
  drawStat(pdf, M + (statW + 9) * 2, 438, statW, "Investitie lunara B", `${fmt(form.monthly_extra)} EUR`);
  drawStat(pdf, M, 513, statW, "A dobanda economisita", `${fmt(output.interest_saved_by_prepay)} EUR`, `inchide in ${output.scenario_a_months_to_close ?? "-"} luni`);
  drawStat(pdf, M + statW + 9, 513, statW, "B castig net", `${fmt(output.scenario_b_gain_net)} EUR`);
  drawStat(pdf, M + (statW + 9) * 2, 513, statW, "B portofoliu final", `${fmt(output.scenario_b_final_investment_net)} EUR`);

  drawOptimizareChart(pdf, yearly, output.crossover_year, M, 606, PAGE_W - M * 2, 146);

  pdf.text(M, 768, `Share ID: ${doc.shareId ?? "-"}`, 8, { color: MUTED });
  pdf.text(M, 782, `Hash input/output: ${hash}`, 7, { color: MUTED });
  pdf.wrappedText(
    M,
    800,
    "Raport educational, nu constituie consultanta financiara, fiscala sau de investitii. Proiectiile sunt scenarii ipotetice si nu garanteaza rezultate viitoare.",
    8,
    PAGE_W - M * 2,
    { color: MUTED, lineHeight: 10 },
  );

  drawOptimizareYearlyPages(pdf, yearly);
}

function drawCreditReport(pdf: PdfCanvas, doc: PdfDoc, hash: string) {
  const form = getCreditForm(doc);
  const output = getCreditOutput(doc);
  const product = getProduct(doc);
  const schedule = Array.isArray(output.schedule) ? output.schedule : [];
  const created = doc.createdAt ? new Date(doc.createdAt).toLocaleString("ro-RO") : new Date().toLocaleString("ro-RO");
  const productName = product ? `${product.banca ?? ""} ${product.nume ?? ""}`.trim() : "Parametri custom";
  const first = schedule[0];
  const revisionIndex = form.revision_month && form.revision_month > 0 ? form.revision_month : -1;
  const postRevision = revisionIndex >= 0 ? schedule[revisionIndex] : undefined;
  const initialRate = first ? num(first.annuity) + num(first.fee) : 0;
  const revisedRate = postRevision ? num(postRevision.annuity) + num(postRevision.fee) : null;

  pdf.text(M, 58, "Raport simulare credit", 23, { bold: true, color: INK });
  pdf.text(M, 80, `Client: ${doc.clientAlias ?? "Client demo"}`, 11, { color: MUTED });
  pdf.text(PAGE_W - M, 58, relationLabel(doc.firm), 11, { bold: true, color: BRAND, align: "right" });
  pdf.text(PAGE_W - M, 76, `Consultant: ${relationLabel(doc.user)}`, 9, { color: MUTED, align: "right" });
  pdf.text(PAGE_W - M, 92, `Generat: ${created}`, 9, { color: MUTED, align: "right" });

  drawSectionTitle(pdf, "Parametri folositi", 122);
  drawKeyValueGrid(
    pdf,
    [
      ["Produs", productName],
      ["Suma imprumut", `${fmt(form.principal)} EUR`],
      ["Perioada", `${form.months ?? "-"} luni`],
      ["Dobanda initiala", pct(form.annual_rate_initial)],
      ["Revizuire dobanda", form.revision_month ? `luna ${form.revision_month}` : "fara revizuire"],
      ["Dobanda dupa revizuire", form.annual_rate_after ? pct(form.annual_rate_after) : "-"],
      ["Comision lunar", `${fmt(form.monthly_fee)} EUR`],
      ["Rambursare anticipata", `${fmt(form.monthly_prepayment)} EUR / luna`],
    ],
    M,
    146,
    PAGE_W - M * 2,
  );

  drawSectionTitle(pdf, "Blocuri informative", 294);
  const statW = (PAGE_W - M * 2 - 18) / 3;
  drawStat(pdf, M, 318, statW, "Rata lunara initiala", `${fmt(initialRate)} EUR`, "principal + dobanda + comision");
  drawStat(
    pdf,
    M + statW + 9,
    318,
    statW,
    revisedRate === null ? "Luni efective" : `Dupa revizuire`,
    revisedRate === null ? String(output.months_to_close ?? "-") : `${fmt(revisedRate)} EUR`,
    revisedRate === null ? undefined : `luna ${(form.revision_month ?? 0) + 1}`,
  );
  drawStat(pdf, M + (statW + 9) * 2, 318, statW, "Total de platit", `${fmt(output.total_paid)} EUR`);
  drawStat(pdf, M, 393, statW, "Total dobanda", `${fmt(output.total_interest)} EUR`);
  drawStat(pdf, M + statW + 9, 393, statW, "Total comisioane", `${fmt(output.total_fees)} EUR`);
  drawStat(pdf, M + (statW + 9) * 2, 393, statW, "Luni efective", String(output.months_to_close ?? "-"));

  drawCreditChart(pdf, schedule, M, 486, PAGE_W - M * 2, 248);

  pdf.text(M, 760, `Share ID: ${doc.shareId ?? "-"}`, 8, { color: MUTED });
  pdf.text(M, 774, `Hash input/output: ${hash}`, 7, { color: MUTED });
  pdf.wrappedText(
    M,
    792,
    "Raport educational, nu constituie consultanta financiara, fiscala sau de investitii. Verifica intotdeauna conditiile contractuale si eligibilitatea cu institutia relevanta.",
    8,
    PAGE_W - M * 2,
    { color: MUTED, lineHeight: 10 },
  );

  drawSchedulePages(pdf, schedule);
}

function drawSchedulePages(pdf: PdfCanvas, schedule: AmortizationRow[]) {
  const headers = ["Luna", "Sold initial", "Anuitate", "Principal", "Dobanda", "Plata ant.", "Sold final"];
  const widths = [38, 76, 70, 70, 70, 72, 78];
  const x0 = M;
  const rowH = 18;
  const rowsPerPage = 34;
  let index = 0;

  while (index < schedule.length || (schedule.length === 0 && index === 0)) {
    pdf.addPage();
    pdf.text(M, 58, "Scadentar", 20, { bold: true });
    pdf.text(M, 78, "Snapshot complet generat din parametrii simularii salvate.", 9, { color: MUTED });

    let x = x0;
    const y = 110;
    pdf.rect(x0, y - 12, widths.reduce((a, b) => a + b, 0), rowH, { fill: BRAND });
    headers.forEach((header, i) => {
      pdf.text(x + 4, y, header, 7.5, { color: [1, 1, 1], bold: true });
      x += widths[i] ?? 0;
    });

    const pageRows = schedule.slice(index, index + rowsPerPage);
    if (!pageRows.length) {
      pdf.text(x0, y + 28, "Nu exista randuri de scadentar in snapshot.", 10, { color: MUTED });
      break;
    }

    pageRows.forEach((row, rIdx) => {
      const yy = y + 18 + rIdx * rowH;
      if (rIdx % 2 === 0) {
        pdf.rect(x0, yy - 12, widths.reduce((a, b) => a + b, 0), rowH, { fill: SOFT });
      }
      let cx = x0;
      const values = [
        String(row.month),
        fmt(row.opening_balance),
        fmt(row.annuity),
        fmt(row.principal_paid),
        fmt(row.interest_paid),
        fmt(row.prepayment),
        fmt(row.closing_balance),
      ];
      values.forEach((value, i) => {
        const alignRight = i > 0;
        pdf.text(alignRight ? cx + (widths[i] ?? 0) - 5 : cx + 4, yy, value, 7.3, {
          color: INK,
          align: alignRight ? "right" : "left",
        });
        cx += widths[i] ?? 0;
      });
      pdf.line(x0, yy + 6, x0 + widths.reduce((a, b) => a + b, 0), yy + 6, [0.91, 0.9, 0.86], 0.4);
    });

    index += rowsPerPage;
  }
}

function drawOptimizareYearlyPages(pdf: PdfCanvas, yearly: OptimizareYearPoint[]) {
  const headers = ["Anul", "A dobanda econ.", "A sold credit", "B castig net", "B portofoliu", "Delta B-A"];
  const widths = [42, 92, 86, 86, 86, 84];
  const x0 = M;
  const rowH = 19;
  const rowsPerPage = 31;
  let index = 0;

  while (index < yearly.length || (yearly.length === 0 && index === 0)) {
    pdf.addPage();
    pdf.text(M, 58, "Comparatie anuala A vs B", 20, { bold: true });
    pdf.text(M, 78, "Snapshot anual generat din simularea salvata.", 9, { color: MUTED });

    let x = x0;
    const y = 110;
    pdf.rect(x0, y - 12, widths.reduce((a, b) => a + b, 0), rowH, { fill: BRAND });
    headers.forEach((header, i) => {
      pdf.text(x + 4, y, header, 7.2, { color: [1, 1, 1], bold: true });
      x += widths[i] ?? 0;
    });

    const pageRows = yearly.slice(index, index + rowsPerPage);
    if (!pageRows.length) {
      pdf.text(x0, y + 28, "Nu exista randuri anuale in snapshot.", 10, { color: MUTED });
      break;
    }

    pageRows.forEach((row, rIdx) => {
      const yy = y + 18 + rIdx * rowH;
      if (rIdx % 2 === 0) {
        pdf.rect(x0, yy - 12, widths.reduce((a, b) => a + b, 0), rowH, { fill: SOFT });
      }
      let cx = x0;
      const values = [
        String(row.year),
        fmt(row.scenario_a_interest_saved),
        fmt(row.scenario_a_balance),
        fmt(row.scenario_b_gain_net),
        fmt(row.scenario_b_investment_value),
        fmt(row.delta_b_minus_a),
      ];
      values.forEach((value, i) => {
        const alignRight = i > 0;
        pdf.text(alignRight ? cx + (widths[i] ?? 0) - 5 : cx + 4, yy, value, 7.1, {
          color: INK,
          align: alignRight ? "right" : "left",
        });
        cx += widths[i] ?? 0;
      });
      pdf.line(x0, yy + 6, x0 + widths.reduce((a, b) => a + b, 0), yy + 6, [0.91, 0.9, 0.86], 0.4);
    });

    index += rowsPerPage;
  }
}

function drawFallbackReport(pdf: PdfCanvas, doc: PdfDoc, hash: string) {
  const title =
    doc.tool === "optimizare"
      ? "Optimizare credit - raport simulare"
      : "Raport simulare";
  const output = isRecord(doc.outputSummary) ? doc.outputSummary : {};
  pdf.text(M, 58, title, 22, { bold: true });
  pdf.text(M, 88, `Client: ${doc.clientAlias ?? "Client demo"}`, 11, { color: MUTED });
  pdf.text(M, 112, `Firma: ${relationLabel(doc.firm)}`, 10, { color: MUTED });
  pdf.text(M, 130, `Consultant: ${relationLabel(doc.user)}`, 10, { color: MUTED });

  drawSectionTitle(pdf, "Rezumat", 166);
  if (doc.tool === "optimizare") {
    drawKeyValueGrid(
      pdf,
      [
        ["Recomandare", `Scenariul ${output.recommended ?? "-"}`],
        ["A - dobanda economisita", `${fmt(output.interest_saved_by_prepay)} EUR`],
        ["A - luni pana la inchidere", String(output.scenario_a_months_to_close ?? "-")],
        ["B - castig net investitie", `${fmt(output.scenario_b_gain_net)} EUR`],
        ["B - portofoliu final net", `${fmt(output.scenario_b_final_investment_net)} EUR`],
        ["Crossover", output.crossover_year ? `anul ${output.crossover_year}` : "fara crossover"],
      ],
      M,
      190,
      PAGE_W - M * 2,
    );
    pdf.wrappedText(
      M,
      328,
      "Pentru Optimizare, PDF-ul V1 pastreaza rezumatul decizional. Urmatorul pas este sa extindem si aici raportul cu graficul A vs B si tabelul anual.",
      9,
      PAGE_W - M * 2,
      { color: MUTED, lineHeight: 12 },
    );
  } else {
    pdf.text(M, 190, "Exportul detaliat este disponibil momentan pentru Simulator Credit.", 11);
  }
  pdf.text(M, 760, `Hash input/output: ${hash}`, 8, { color: MUTED });
}

export function buildSimulationPdf(doc: PdfDoc) {
  const hash = simulationHash(doc);
  const pdf = new PdfCanvas(brandRgb(doc.firm));

  if (doc.tool === "credit") {
    drawCreditReport(pdf, doc, hash);
  } else if (doc.tool === "optimizare") {
    drawOptimizareReport(pdf, doc, hash);
  } else {
    drawFallbackReport(pdf, doc, hash);
  }

  pdf.finish();
  const buffer = serializePdf(pdf.pages);
  return { buffer, hash };
}

function serializePdf(pages: string[][]) {
  const pageKids = pages.map((_, i) => `${5 + i * 2} 0 R`).join(" ");
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    `<< /Type /Pages /Kids [${pageKids}] /Count ${pages.length} >>`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>",
  ];

  pages.forEach((ops, i) => {
    const pageId = 5 + i * 2;
    const contentId = pageId + 1;
    const stream = ops.join("\n");
    objects.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_W} ${PAGE_H}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentId} 0 R >>`,
    );
    objects.push(`<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`);
  });

  let out = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(out));
    out += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xrefOffset = Buffer.byteLength(out);
  out += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach((offset) => {
    out += `${String(offset).padStart(10, "0")} 00000 n \n`;
  });
  out += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
  return Buffer.from(out, "utf8");
}
