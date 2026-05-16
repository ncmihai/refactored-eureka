import type { Payload } from "payload";
import { isRecord, recordAt } from "./report-data";

export type TrustTool = "credit" | "optimizare" | "depozit" | "investitii" | "unit_linked" | "comparator";

const DISCLAIMER_MODULE_BY_TOOL: Record<TrustTool, string> = {
  credit: "credit",
  optimizare: "optimizare",
  depozit: "depozit",
  investitii: "etf",
  unit_linked: "ul",
  comparator: "general",
};

function valueAt(value: unknown, key: string) {
  return isRecord(value) ? value[key] : undefined;
}

function labelFromProduct(value: unknown) {
  if (!isRecord(value)) return undefined;
  const parts = [value.banca, value.provider, value.ticker, value.nume]
    .filter(Boolean)
    .map(String);
  return parts.length ? parts.join(" · ") : undefined;
}

function sourceFromProduct(value: unknown) {
  if (!isRecord(value)) return undefined;
  return value.sourceUrl ?? value.sursaTer ?? value.sursa ?? value.importBatch ?? undefined;
}

function addProductSources(entries: Array<Record<string, unknown>>, productSnapshots: unknown) {
  if (!isRecord(productSnapshots)) return;
  Object.entries(productSnapshots).forEach(([key, value]) => {
    const label = labelFromProduct(value);
    if (!label) return;
    const source = sourceFromProduct(value) ?? "CMS snapshot";
    const dedupeKey = `${key}:${label}:${String(source)}`;
    if (entries.some((entry) => entry.dedupeKey === dedupeKey)) return;
    entries.push({
      type: "product",
      key,
      label,
      source,
      url: isRecord(value) ? value.sourceUrl ?? null : null,
      dedupeKey,
    });
  });
}

export function buildAssumptionsSnapshot(tool: TrustTool, inputSnapshot: unknown) {
  const form = recordAt(inputSnapshot, "form");
  const currency = recordAt(inputSnapshot, "currency");
  const inflation = recordAt(inputSnapshot, "inflation");
  const items = [
    "Calculele folosesc snapshot-ul parametrilor de la momentul salvării.",
    "Rezultatele sunt estimări educaționale, nu recomandări personalizate sau garanții.",
  ];

  if (form?.months) items.push(`Orizont analizat: ${form.months} luni.`);
  if (currency?.code) items.push(`Monedă afișare: ${currency.code}.`);
  if (inflation?.mode === "real") {
    items.push(`Valorile reale sunt deflatate cu ${inflation.rate ?? "-"}%/an.`);
  }
  if (tool === "investitii") {
    items.push("Randamentele investiționale sunt scenarii istorice/modelate și pot diferi de viitor.");
  }
  if (tool === "credit" || tool === "optimizare") {
    items.push("Condițiile finale depind de eligibilitate, contract și politica instituției financiare.");
  }

  return {
    version: "v1",
    generatedAt: new Date().toISOString(),
    items,
  };
}

export function buildSourceSnapshot(inputSnapshot: unknown, productSnapshots: unknown) {
  const entries: Array<Record<string, unknown>> = [];
  const inputProductSnapshots =
    recordAt(inputSnapshot, "productSnapshots") ?? productSnapshots;
  addProductSources(entries, inputProductSnapshots);
  addProductSources(entries, productSnapshots);

  const currency = recordAt(inputSnapshot, "currency");
  if (currency?.source) {
    entries.push({
      type: "fx",
      label: `Curs ${currency.code ?? "-"}`,
      source: currency.source,
    });
  }

  const inflation = recordAt(inputSnapshot, "inflation");
  if (inflation?.source) {
    entries.push({
      type: "inflation",
      label: `Inflație ${inflation.currency ?? "-"}`,
      source: inflation.source,
    });
  }

  const dataset = valueAt(inputSnapshot, "selectedDatasetMetadata");
  if (isRecord(dataset)) {
    entries.push({
      type: "index_dataset",
      label: dataset.label ?? dataset.sourceName ?? "Dataset istoric",
      source: dataset.sourceName ?? dataset.sourceUrl ?? dataset.checksum ?? "local snapshot",
      url: dataset.sourceUrl ?? null,
      checksum: dataset.checksum ?? null,
    });
  }

  return {
    version: "v1",
    generatedAt: new Date().toISOString(),
    entries: entries.map(({ dedupeKey, ...entry }) => entry),
  };
}

export async function buildDisclaimerSnapshot(payload: Payload, tool: TrustTool) {
  const modul = DISCLAIMER_MODULE_BY_TOOL[tool] ?? "general";
  const result = await payload.find({
    collection: "disclaimere",
    where: {
      and: [
        { modul: { equals: modul } },
        { limba: { equals: "ro" } },
        { activ: { equals: true } },
      ],
    },
    sort: "-updatedAt",
    depth: 0,
    limit: 1,
    overrideAccess: true,
  });
  const doc = result.docs[0] as
    | {
        id?: string | number;
        nume?: string | null;
        modul?: string | null;
        limba?: string | null;
        versiune?: string | null;
        updatedAt?: string | null;
      }
    | undefined;
  if (!doc) {
    return {
      version: "missing",
      modul,
      limba: "ro",
      capturedAt: new Date().toISOString(),
    };
  }

  return {
    id: doc.id,
    nume: doc.nume,
    modul: doc.modul,
    limba: doc.limba,
    versiune: doc.versiune,
    updatedAt: doc.updatedAt,
    capturedAt: new Date().toISOString(),
  };
}
