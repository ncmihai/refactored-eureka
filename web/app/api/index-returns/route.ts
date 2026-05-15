import config from "@payload-config";
import { unstable_cache } from "next/cache";
import { NextResponse } from "next/server";
import { getPayload } from "payload";

const fetchIndexReturnsCached = unstable_cache(
  async () => {
    const payload = await getPayload({ config });
    const result = await payload.find({
      collection: "indici-istorici",
      where: { activ: { equals: true } },
      sort: "data",
      depth: 0,
      limit: 10000,
      overrideAccess: true,
    });

    const diagnostics = new Map<
      string,
      {
        indice: string;
        count: number;
        from: string;
        through: string;
        latestBatch?: string | null;
        latestChecksum?: string | null;
        cacheKey: string;
      }
    >();

    result.docs.forEach((row) => {
      const indice = String(row.indice);
      const data = String(row.data).slice(0, 10);
      const current = diagnostics.get(indice);
      if (!current) {
        diagnostics.set(indice, {
          indice,
          count: 1,
          from: data,
          through: data,
          latestBatch: row.importBatch as string | null | undefined,
          latestChecksum: row.checksum as string | null | undefined,
          cacheKey: `index_returns:${indice}:${row.importBatch ?? row.checksum ?? "unknown"}`,
        });
        return;
      }
      current.count += 1;
      current.through = data;
      current.latestBatch = row.importBatch as string | null | undefined;
      current.latestChecksum = row.checksum as string | null | undefined;
      current.cacheKey = `index_returns:${indice}:${row.importBatch ?? row.checksum ?? "unknown"}`;
    });

    return {
      docs: result.docs,
      totalDocs: result.totalDocs,
      diagnostics: Array.from(diagnostics.values()),
      cachedForSeconds: 86400,
    };
  },
  ["index-returns-active-v1"],
  { revalidate: 86400 },
);

export async function GET() {
  return NextResponse.json(await fetchIndexReturnsCached());
}
