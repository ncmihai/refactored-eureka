export type ProdusCredit = {
  id: string;
  nume: string;
  banca: string;
  tipDobanda: "fix" | "variabil" | "fix_variabil";
  dobandaInitiala: number;
  perioadaFixa?: number | null;
  spread?: number | null;
  comisionLunar?: number | null;
  moneda: "EUR" | "RON";
  sumaMinima?: number | null;
  sumaMaxima?: number | null;
  perioadaMaxima?: number | null;
  activ: boolean;
};

export type DobandaDepozit = {
  id: string;
  nume: string;
  banca: string;
  moneda: "EUR" | "RON" | "USD";
  scadentaLuni: number;
  dobandaBruta: number;
  capitalizare: "monthly" | "at_maturity";
  sumaMinima?: number | null;
  activ: boolean;
};

type PayloadListResponse<T> = {
  docs: T[];
  totalDocs: number;
  limit: number;
  page: number;
};

async function fetchCollection<T>(slug: string): Promise<T[]> {
  try {
    const res = await fetch(`/api/${slug}?limit=100&depth=0`, {
      cache: "no-store",
    });
    if (!res.ok) return [];
    const data = (await res.json()) as PayloadListResponse<T>;
    return data.docs ?? [];
  } catch {
    return [];
  }
}

export const fetchProduseCredit = () =>
  fetchCollection<ProdusCredit>("produse-credit");

export const fetchDobanziDepozit = () =>
  fetchCollection<DobandaDepozit>("dobanzi-depozit");
