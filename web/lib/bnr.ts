/**
 * BNR FX rates client — hits FastAPI backend which caches the BNR XML feed
 * in Upstash Redis (1h fresh + 30d stale-while-revalidate). See
 * backend/app/services/bnr.py for the upstream contract.
 */
const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL ??
  "https://refactored-eureka-h7bs.onrender.com";

export type BnrPairResponse = {
  pair: string;
  rate: number;
  date: string;
  publishedAt: string;
  cached: boolean;
  stale: boolean;
  fetchedAt: string;
};

export async function fetchBnrPair(
  pair: "EUR-RON" | "USD-RON",
): Promise<BnrPairResponse | null> {
  try {
    const res = await fetch(
      `${BACKEND_URL}/api/v1/bnr/rates?pair=${encodeURIComponent(pair)}`,
      { cache: "no-store" },
    );
    if (!res.ok) return null;
    const data = (await res.json()) as {
      pair: string;
      rate: string;
      date: string;
      published_at: string;
      cached: boolean;
      stale: boolean;
      fetched_at: string;
    };
    const rate = Number.parseFloat(data.rate);
    if (!Number.isFinite(rate) || rate <= 0) return null;
    return {
      pair: data.pair,
      rate,
      date: data.date,
      publishedAt: data.published_at,
      cached: data.cached,
      stale: data.stale,
      fetchedAt: data.fetched_at,
    };
  } catch {
    return null;
  }
}
