import {
  fmt,
  pct,
  relationLabel,
  type SavedSimulationReport,
} from "../report-data";
import { buildCreditReportModel } from "../report-view-models";
import { PdfCanvas } from "./canvas";
import { BORDER, BRAND, INK, M, MUTED, PAGE_W } from "./constants";
import {
  drawCreditChart,
  drawKeyValueGrid,
  drawSchedulePages,
  drawSectionTitle,
  drawStat,
} from "./primitives";

export function drawCreditReport(pdf: PdfCanvas, doc: SavedSimulationReport, hash: string) {
  const model = buildCreditReportModel(doc);
  const { form, output, schedule } = model;
  const created = doc.createdAt ? new Date(doc.createdAt).toLocaleString("ro-RO") : new Date().toLocaleString("ro-RO");

  pdf.text(M, 58, "Raport simulare credit", 23, { bold: true, color: INK });
  pdf.text(M, 80, `Client: ${doc.clientAlias ?? "Client demo"}`, 11, { color: MUTED });
  pdf.text(PAGE_W - M, 58, relationLabel(doc.firm), 11, { bold: true, color: BRAND, align: "right" });
  pdf.text(PAGE_W - M, 76, `Consultant: ${relationLabel(doc.user)}`, 9, { color: MUTED, align: "right" });
  pdf.text(PAGE_W - M, 92, `Generat: ${created}`, 9, { color: MUTED, align: "right" });

  drawSectionTitle(pdf, "Parametri folositi", 122);
  drawKeyValueGrid(
    pdf,
    [
      ["Produs", model.productName],
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
  drawStat(pdf, M, 318, statW, "Rata lunara initiala", `${fmt(model.initialRate)} EUR`, "principal + dobanda + comision");
  drawStat(
    pdf,
    M + statW + 9,
    318,
    statW,
    model.revisedRate === null ? "Luni efective" : "Dupa revizuire",
    model.revisedRate === null ? String(output.months_to_close ?? "-") : `${fmt(model.revisedRate)} EUR`,
    model.revisedRateHint,
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
