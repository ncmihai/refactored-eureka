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

export type FondETF = {
  id: string;
  nume: string;
  ticker: string;
  isin?: string | null;
  provider: string;
  moneda: "EUR" | "RON" | "USD";
  ter: number;
  indiceReferinta:
    | "SP500"
    | "MSCI_WORLD"
    | "FTSE_ALL_WORLD"
    | "STOXX_600"
    | "BET"
    | "OTHER";
  exchange?: string | null;
  accumulating: boolean;
  sursaTer?: "manual" | "factsheet" | "yfinance";
  sourceUrl?: string | null;
  activ: boolean;
};

export type RandamentIndice = {
  id: string;
  nume: string;
  indice:
    | "SP500"
    | "MSCI_WORLD"
    | "FTSE_ALL_WORLD"
    | "STOXX_600"
    | "BET"
    | "OTHER";
  data: string;
  randamentLunar: number;
  moneda: "EUR" | "RON" | "USD";
  sursa: "csv" | "manual" | "yfinance" | "licensed_feed";
  sourceUrl?: string | null;
  checksum?: string | null;
  importBatch?: string | null;
  activ: boolean;
};

export type ProdusUL = {
  id: string;
  nume: string;
  provider: string;
  moneda: "EUR" | "RON" | "USD";
  fixedInsuranceFee: number;
  allocationFeeLow: number;
  allocationFeeHigh: number;
  allocationThreshold: number;
  initialUnitsMonths: number;
  expenseRecoveryAnnual: number;
  adminFeeAnnual: number;
  sourceUrl?: string | null;
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

export type Inflatie = {
  id: string;
  nume: string;
  moneda: "EUR" | "RON" | "USD";
  an: number;
  rata: number;
  default: boolean;
  activ: boolean;
};

export type Disclaimer = {
  id: string;
  nume: string;
  modul:
    | "general"
    | "credit"
    | "optimizare"
    | "depozit"
    | "ul"
    | "etf"
    | "pensie";
  limba: "ro" | "en";
  versiune: string;
  continut: unknown;
  activ: boolean;
  updatedAt: string;
};

export const fetchProduseCredit = () =>
  fetchCollection<ProdusCredit>("produse-credit");

export const fetchDobanziDepozit = () =>
  fetchCollection<DobandaDepozit>("dobanzi-depozit");

export const fetchFonduriETF = () => fetchCollection<FondETF>("fonduri-etf");

export const fetchProduseUL = () => fetchCollection<ProdusUL>("produse-ul");

export const fetchIndiciIstorici = async (limit = 10000) => {
  try {
    const res = await fetch(`/api/indici-istorici?limit=${limit}&depth=0`, {
      cache: "no-store",
    });
    if (!res.ok) return [];
    const data = (await res.json()) as PayloadListResponse<RandamentIndice>;
    return data.docs ?? [];
  } catch {
    return [];
  }
};

export const fetchInflatii = () => fetchCollection<Inflatie>("inflatii");

export const fetchDisclaimere = () =>
  fetchCollection<Disclaimer>("disclaimere");

export type Curs = {
  id: string;
  pereche: "EUR_RON" | "USD_RON";
  data: string;
  curs: number;
  sursa: "BNR" | "manual" | "csv";
};

export const fetchCursuri = () => fetchCollection<Curs>("cursuri-valutare");
