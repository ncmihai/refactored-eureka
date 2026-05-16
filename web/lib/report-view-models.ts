import {
  getCreditForm,
  getCreditOutput,
  getCreditProduct,
  getCreditSchedule,
  getOptimizareForm,
  getOptimizareOutput,
  num,
  productName,
  recommendationText,
  type SavedSimulationReport,
} from "./report-data";

export function buildCreditReportModel(doc: SavedSimulationReport) {
  const form = getCreditForm(doc);
  const output = getCreditOutput(doc);
  const product = getCreditProduct(doc);
  const schedule = getCreditSchedule(doc);
  const first = schedule[0];
  const initialRate = first ? num(first.annuity) + num(first.fee) : 0;
  const revisionIndex = form.revision_month && form.revision_month > 0 ? form.revision_month : -1;
  const postRevision = revisionIndex >= 0 ? schedule[revisionIndex] : undefined;
  const revisedRate = postRevision ? num(postRevision.annuity) + num(postRevision.fee) : null;
  let cumulativeInterest = 0;
  const chartRows = schedule.map((row) => {
    cumulativeInterest += num(row.interest_paid);
    return {
      month: row.month,
      sold: num(row.closing_balance),
      dobanda: cumulativeInterest,
    };
  });

  return {
    form,
    output,
    productName: productName(product),
    schedule,
    previewSchedule: schedule.slice(0, 24),
    initialRate,
    revisedRate,
    revisedRateHint: revisedRate === null ? undefined : `luna ${(form.revision_month ?? 0) + 1}`,
    chartRows,
  };
}

export function buildOptimizareReportModel(doc: SavedSimulationReport) {
  const form = getOptimizareForm(doc);
  const output = getOptimizareOutput(doc);
  const product = getCreditProduct(doc);
  const yearly = Array.isArray(output.yearly) ? output.yearly : [];
  const totalEffort = num(output.standard_monthly_payment) + num(form.monthly_extra);
  const recommendationScenario =
    output.recommended === "B" ? "Scenariul B - investeste suma extra" : "Scenariul A - ramburseaza anticipat";
  const recommendationReason =
    output.recommended === "B"
      ? "Castigul net al investitiei depaseste dobanda economisita pe orizontul analizat."
      : "Dobanda economisita depaseste castigul net al investitiei pe orizontul analizat.";
  const recommendationReasonRo =
    output.recommended === "B"
      ? "Câștigul net al investiției depășește dobânda economisită pe orizontul analizat."
      : "Dobânda economisită depășește câștigul net al investiției.";

  return {
    form,
    output,
    productName: productName(product),
    yearly,
    totalEffort,
    recommendationText: recommendationText(output),
    recommendationScenario,
    recommendationReason,
    recommendationReasonRo,
    crossoverText: output.crossover_year
      ? `Crossover in anul ${output.crossover_year}.`
      : "Fara crossover in orizontul ales.",
    crossoverTextRo: output.crossover_year
      ? `Crossover în anul ${output.crossover_year}.`
      : "Fără crossover pe orizontul ales.",
  };
}
