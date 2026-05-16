export function num(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export function fmt(value: unknown, digits = 2) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "-";
  return n.toLocaleString("ro-RO", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

export function pct(value: unknown) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "-";
  return `${fmt(n, 2)}%`;
}
