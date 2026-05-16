import { fmt, num, type AmortizationRow, type OptimizareYearPoint } from "../report-data";
import { PdfCanvas } from "./canvas";
import { AMBER, BORDER, BRAND, INK, M, MUTED, PAGE_W, SOFT } from "./constants";

export function drawSectionTitle(pdf: PdfCanvas, title: string, y: number) {
  pdf.text(M, y, title, 13, { bold: true, color: INK });
  pdf.line(M, y + 8, PAGE_W - M, y + 8, BORDER, 0.8);
}

export function drawKeyValueGrid(pdf: PdfCanvas, items: Array<[string, string]>, x: number, y: number, w: number) {
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

export function drawStat(pdf: PdfCanvas, x: number, y: number, w: number, label: string, value: string, hint?: string) {
  pdf.rect(x, y, w, 66, { fill: [0.985, 0.98, 0.955], stroke: BORDER });
  pdf.text(x + 12, y + 18, label, 8, { color: MUTED });
  pdf.text(x + 12, y + 39, value, 15, { color: BRAND, bold: true });
  if (hint) pdf.text(x + 12, y + 56, hint, 7.5, { color: MUTED });
}

export function drawCreditChart(pdf: PdfCanvas, schedule: AmortizationRow[], x: number, y: number, w: number, h: number) {
  pdf.rect(x, y, w, h, { fill: [0.995, 0.992, 0.982], stroke: BORDER });
  pdf.text(x + 12, y + 20, "Evolutie sold credit si dobanda cumulata", 11, { bold: true });
  pdf.text(x + w - 90, y + 20, "Sold ramas", 8, { color: BRAND });
  pdf.text(x + w - 90, y + 34, "Dobanda cumulata", 8, { color: AMBER });

  const gx = x + 42;
  const gy = y + 45;
  const gw = w - 62;
  const gh = h - 78;
  const points = schedule.map((row) => ({
    month: row.month,
    sold: num(row.closing_balance),
    interest: num(row.interest_paid),
  }));
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

export function drawOptimizareChart(
  pdf: PdfCanvas,
  yearly: OptimizareYearPoint[],
  crossover: number | null | undefined,
  x: number,
  y: number,
  w: number,
  h: number,
) {
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

export function drawSchedulePages(pdf: PdfCanvas, schedule: AmortizationRow[]) {
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

export function drawOptimizareYearlyPages(pdf: PdfCanvas, yearly: OptimizareYearPoint[]) {
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
