import { createHash } from "crypto";
import type { SavedSimulationReport } from "./report-data";
import { PdfCanvas, serializePdf } from "./pdf/canvas";
import { brandRgb } from "./pdf/constants";
import { drawCreditReport } from "./pdf/credit-report";
import { drawFallbackReport } from "./pdf/fallback-report";
import { drawOptimizareReport } from "./pdf/optimizare-report";

export function simulationHash(doc: SavedSimulationReport) {
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

export function buildSimulationPdf(doc: SavedSimulationReport) {
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
