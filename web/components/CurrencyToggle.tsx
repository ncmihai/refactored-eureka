"use client";

import { useEffect, useRef } from "react";

import { fetchBnrPair } from "@/lib/bnr";
import { fetchCursuri } from "@/lib/cms";

export type Currency = "EUR" | "RON";

export type CurrencyState = {
  display: Currency;
  rateEurRon: number;
  source: string | null;
};

type Props = {
  value: CurrencyState;
  onChange: (next: CurrencyState) => void;
};

export function CurrencyToggle({ value, onChange }: Props) {
  // Load the EUR/RON rate once on mount.
  // Preference order: BNR live (our FastAPI + Upstash cache) → CMS
  // (Cursuri_Valutare, for consultant-authored overrides) → hardcoded 5.0
  // fallback. `sourceLoadedRef` ensures we don't clobber a user-chosen
  // display currency or racing overrides on subsequent renders.
  const sourceLoadedRef = useRef(false);

  useEffect(() => {
    if (sourceLoadedRef.current) return;
    if (value.source) {
      sourceLoadedRef.current = true;
      return;
    }

    let cancelled = false;

    (async () => {
      // 1. BNR live via backend
      const bnr = await fetchBnrPair("EUR-RON");
      if (cancelled) return;
      if (bnr) {
        const qualifier = bnr.stale
          ? " · stale"
          : bnr.cached
            ? " · cached"
            : " · live";
        onChange({
          display: value.display,
          rateEurRon: bnr.rate,
          source: `BNR ${bnr.date}${qualifier}`,
        });
        sourceLoadedRef.current = true;
        return;
      }

      // 2. CMS override (Cursuri_Valutare)
      const cursuri = await fetchCursuri();
      if (cancelled) return;
      const eurRon = cursuri
        .filter((c) => c.pereche === "EUR_RON")
        .sort(
          (a, b) => new Date(b.data).getTime() - new Date(a.data).getTime(),
        )[0];
      if (eurRon) {
        onChange({
          display: value.display,
          rateEurRon: eurRon.curs,
          source: `CMS ${eurRon.data.slice(0, 10)}`,
        });
        sourceLoadedRef.current = true;
        return;
      }

      // 3. Hardcoded fallback — disclosed so user knows it's not live
      onChange({
        display: value.display,
        rateEurRon: 5,
        source: "default 5.0000",
      });
      sourceLoadedRef.current = true;
    })();

    return () => {
      cancelled = true;
    };
    // We deliberately run this effect only once per mount — onChange is
    // stable enough for our purposes and adding it would re-trigger the
    // fetch on every parent re-render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const rate = value.rateEurRon || 5;

  return (
    <div className="card p-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <div className="flex flex-col gap-1">
        <div className="text-xs uppercase tracking-[0.14em] text-[var(--muted-2)]">
          Monedă afișare
        </div>
        <div className="text-sm text-[var(--muted)]">
          Sumele rămân identice; se schimbă doar afișarea. Curs EUR/RON ={" "}
          <span className="font-medium text-[var(--foreground)]">
            {rate.toFixed(4)}
          </span>{" "}
          {value.source && (
            <span className="text-[var(--muted-2)]">({value.source})</span>
          )}
        </div>
      </div>

      <div
        className="inline-flex rounded-md border border-[var(--border)] p-0.5 text-sm"
        role="tablist"
        aria-label="Monedă"
      >
        {(["EUR", "RON"] as const).map((c) => (
          <button
            key={c}
            type="button"
            role="tab"
            aria-selected={value.display === c}
            onClick={() =>
              onChange({
                display: c,
                rateEurRon: rate,
                source: value.source,
              })
            }
            className={`px-3 py-1 rounded-[4px] transition min-w-[52px] ${
              value.display === c
                ? "bg-[var(--accent)] text-white"
                : "text-[var(--muted)] hover:text-[var(--foreground)]"
            }`}
          >
            {c}
          </button>
        ))}
      </div>
    </div>
  );
}

export function convertAmount(
  valueInEur: number,
  state: CurrencyState,
): number {
  return state.display === "RON"
    ? valueInEur * (state.rateEurRon || 1)
    : valueInEur;
}

export function currencySymbol(state: CurrencyState): string {
  return state.display === "RON" ? "lei" : "€";
}
