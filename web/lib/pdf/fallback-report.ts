import {
  fmt,
  isRecord,
  relationLabel,
  type SavedSimulationReport,
} from "../report-data";
import { PdfCanvas } from "./canvas";
import { M, MUTED, PAGE_W } from "./constants";
import { drawKeyValueGrid, drawSectionTitle } from "./primitives";

export function drawFallbackReport(pdf: PdfCanvas, doc: SavedSimulationReport, hash: string) {
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
