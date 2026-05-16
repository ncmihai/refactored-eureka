import {
  fmt,
  pct,
  relationLabel,
  trustMetadataLine,
  type SavedSimulationReport,
} from "../report-data";
import { buildOptimizareReportModel } from "../report-view-models";
import { PdfCanvas } from "./canvas";
import { AMBER, BORDER, BRAND, INK, M, MUTED, PAGE_W } from "./constants";
import {
  drawKeyValueGrid,
  drawOptimizareChart,
  drawOptimizareYearlyPages,
  drawSectionTitle,
  drawStat,
  drawTrustSnapshotPage,
} from "./primitives";

export function drawOptimizareReport(pdf: PdfCanvas, doc: SavedSimulationReport, hash: string) {
  const model = buildOptimizareReportModel(doc);
  const { form, output, yearly } = model;
  const created = doc.createdAt ? new Date(doc.createdAt).toLocaleString("ro-RO") : new Date().toLocaleString("ro-RO");

  pdf.text(M, 58, "Raport optimizare credit", 23, { bold: true, color: INK });
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
  pdf.text(M + 16, 342, model.recommendationScenario, 15, { bold: true, color: output.recommended === "B" ? BRAND : AMBER });
  pdf.wrappedText(M + 16, 362, `${model.recommendationReason} ${model.crossoverText}`, 9, PAGE_W - M * 2 - 32, {
    color: MUTED,
    lineHeight: 12,
  });

  drawSectionTitle(pdf, "Blocuri informative", 414);
  const statW = (PAGE_W - M * 2 - 18) / 3;
  drawStat(pdf, M, 438, statW, "Rata standard", `${fmt(output.standard_monthly_payment)} EUR`, "principal + dobanda + comision");
  drawStat(pdf, M + statW + 9, 438, statW, "Efort lunar total", `${fmt(model.totalEffort)} EUR`, "rata + suma extra");
  drawStat(pdf, M + (statW + 9) * 2, 438, statW, "Investitie lunara B", `${fmt(form.monthly_extra)} EUR`);
  drawStat(pdf, M, 513, statW, "A dobanda economisita", `${fmt(output.interest_saved_by_prepay)} EUR`, `inchide in ${output.scenario_a_months_to_close ?? "-"} luni`);
  drawStat(pdf, M + statW + 9, 513, statW, "B castig net", `${fmt(output.scenario_b_gain_net)} EUR`);
  drawStat(pdf, M + (statW + 9) * 2, 513, statW, "B portofoliu final", `${fmt(output.scenario_b_final_investment_net)} EUR`);

  drawOptimizareChart(pdf, yearly, output.crossover_year, M, 606, PAGE_W - M * 2, 146);

  pdf.text(M, 756, `Share ID: ${doc.shareId ?? "-"}`, 8, { color: MUTED });
  pdf.text(M, 770, `Hash input/output: ${hash}`, 7, { color: MUTED });
  pdf.text(M, 784, trustMetadataLine(doc), 7, { color: MUTED });
  pdf.wrappedText(
    M,
    800,
    "Raport educational, nu constituie consultanta financiara, fiscala sau de investitii. Proiectiile sunt scenarii ipotetice si nu garanteaza rezultate viitoare.",
    8,
    PAGE_W - M * 2,
    { color: MUTED, lineHeight: 10 },
  );

  drawOptimizareYearlyPages(pdf, yearly);
  drawTrustSnapshotPage(pdf, doc);
}
