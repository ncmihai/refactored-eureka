export { fmt, num, pct } from "./format";

export type Relation =
  | { id?: string | number; nume?: string | null; email?: string | null; brandColor?: string | null }
  | string
  | number
  | null
  | undefined;

export type SavedSimulationReport = {
  id?: string | number;
  tool: string;
  clientAlias?: string | null;
  inputSnapshot?: unknown;
  outputSummary?: unknown;
  productSnapshots?: unknown;
  shareId?: string | null;
  shareExpiresAt?: string | null;
  createdAt?: string | null;
  firm?: Relation;
  user?: Relation;
};

export type CreditForm = {
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

export type AmortizationRow = {
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

export type CreditOutput = {
  schedule?: AmortizationRow[];
  total_interest?: string | number;
  total_fees?: string | number;
  total_paid?: string | number;
  months_to_close?: number;
};

export type OptimizareForm = {
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

export type OptimizareYearPoint = {
  year: number;
  scenario_a_interest_saved: string | number;
  scenario_a_balance: string | number;
  scenario_b_investment_value: string | number;
  scenario_b_gain_net: string | number;
  scenario_b_balance: string | number;
  delta_b_minus_a: string | number;
};

export type OptimizareOutput = {
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

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function recordAt(value: unknown, key: string): Record<string, unknown> | undefined {
  if (!isRecord(value)) return undefined;
  const child = value[key];
  return isRecord(child) ? child : undefined;
}

export function relationId(value: Relation): string | undefined {
  if (!value) return undefined;
  if (typeof value === "string" || typeof value === "number") return String(value);
  return value.id === undefined ? undefined : String(value.id);
}

export function relationLabel(value: Relation) {
  if (!value) return "-";
  if (typeof value === "string" || typeof value === "number") return String(value);
  return value.nume ?? value.email ?? String(value.id ?? "-");
}

export function toolLabel(tool: string) {
  return {
    credit: "Simulator Credit",
    optimizare: "Optimizare Credit",
    depozit: "Depozit Bancar",
    investitii: "Investitii ETF",
    unit_linked: "Unit-Linked",
    comparator: "Comparator",
  }[tool] ?? tool;
}

export function getCreditForm(doc: SavedSimulationReport): CreditForm {
  return (recordAt(doc.inputSnapshot, "form") ?? {}) as CreditForm;
}

export function getOptimizareForm(doc: SavedSimulationReport): OptimizareForm {
  return (recordAt(doc.inputSnapshot, "form") ?? {}) as OptimizareForm;
}

export function getCreditOutput(doc: SavedSimulationReport): CreditOutput {
  return (isRecord(doc.outputSummary) ? doc.outputSummary : {}) as CreditOutput;
}

export function getOptimizareOutput(doc: SavedSimulationReport): OptimizareOutput {
  return (isRecord(doc.outputSummary) ? doc.outputSummary : {}) as OptimizareOutput;
}

export function getCreditProduct(doc: SavedSimulationReport): Record<string, unknown> | undefined {
  return (
    recordAt(recordAt(doc.inputSnapshot, "productSnapshots"), "creditProduct") ??
    recordAt(doc.productSnapshots, "creditProduct")
  );
}

export function productName(product: Record<string, unknown> | undefined) {
  if (!product) return "Parametri custom";
  return `${product.banca ?? ""} ${product.nume ?? ""}`.trim() || "Produs selectat";
}

export function getCreditSchedule(doc: SavedSimulationReport) {
  const output = getCreditOutput(doc);
  return Array.isArray(output.schedule) ? output.schedule : [];
}

export function recommendationText(output: OptimizareOutput) {
  if (output.recommended === "B") {
    return "Investește suma extra";
  }
  if (output.recommended === "A") {
    return "Rambursează anticipat";
  }
  return "Recomandare indisponibilă";
}

export function compactDate(value: unknown) {
  const date = new Date(String(value ?? ""));
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("ro-RO");
}
