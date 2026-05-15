"use client";

import { useEffect, useMemo, useState } from "react";
import { PageHeader, Select, TableCard, Td, Th } from "@/components/ui";
import { displayName, roleLabel, type AuthStatus } from "@/lib/auth";
import { fetchAuthStatus, fetchSimulari, type SimulareDoc } from "@/lib/simulari";

const TOOL_LABELS: Record<string, string> = {
  credit: "Credit",
  optimizare: "Optimizare",
  depozit: "Depozit",
  investitii: "Investiții",
  unit_linked: "Unit-Linked",
  comparator: "Comparator",
};

export default function SimulariPage() {
  const [docs, setDocs] = useState<SimulareDoc[]>([]);
  const [tool, setTool] = useState("all");
  const [query, setQuery] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [auth, setAuth] = useState<AuthStatus | null>(null);

  useEffect(() => {
    async function load() {
      const status = await fetchAuthStatus();
      setAuth(status);
      if (status.authenticated) {
        setDocs(await fetchSimulari());
      }
      setLoaded(true);
    }
    load().catch(() => {
      setAuth({ authenticated: false, user: null });
      setLoaded(true);
    });
  }, []);

  const filtered = useMemo(
    () =>
      docs.filter((doc) => {
        const matchesTool = tool === "all" || doc.tool === tool;
        const matchesQuery = doc.clientAlias
          .toLowerCase()
          .includes(query.toLowerCase());
        return matchesTool && matchesQuery;
      }),
    [docs, query, tool],
  );

  return (
    <main className="flex-1 max-w-6xl mx-auto px-6 py-10 md:py-14 space-y-8">
      <PageHeader
        eyebrow="SaaS Beta"
        title="Simulări salvate."
        description="Istoric pentru consultanți și admini de firmă. Guest poate rula unelte, dar salvarea cere autentificare."
      />

      {auth?.authenticated && auth.user && (
        <div className="card p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-2 text-sm">
          <span>
            Conectat ca <strong>{displayName(auth.user)}</strong>
          </span>
          <span className="pill">{roleLabel(auth.user.role)}</span>
        </div>
      )}

      <div className="card p-5 grid grid-cols-1 md:grid-cols-3 gap-4">
        <Select
          label="Unealtă"
          value={tool}
          onChange={setTool}
          options={[
            { value: "all", label: "Toate" },
            { value: "credit", label: "Credit" },
            { value: "optimizare", label: "Optimizare" },
            { value: "depozit", label: "Depozit" },
            { value: "investitii", label: "Investiții" },
            { value: "unit_linked", label: "Unit-Linked" },
            { value: "comparator", label: "Comparator" },
          ]}
        />
        <label className="flex flex-col gap-1.5 text-sm md:col-span-2">
          <span className="text-[var(--foreground)] font-medium">
            Caută alias client
          </span>
          <input
            className="input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
      </div>

      {!loaded || auth === null ? (
        <p className="text-sm text-[var(--muted)]">Se încarcă…</p>
      ) : !auth.authenticated ? (
        <div className="card p-6 text-sm text-[var(--muted)]">
          Istoricul de simulări este disponibil după autentificare.{" "}
          <a className="underline" href="/admin">
            Intră în admin
          </a>
          .
        </div>
      ) : docs.length === 0 ? (
        <div className="card p-6 text-sm text-[var(--muted)]">
          Nu există simulări vizibile pentru rolul tău.
        </div>
      ) : (
        <TableCard>
          <thead className="bg-[var(--background)] sticky top-0 border-b border-[var(--border)]">
            <tr>
              <Th>Data</Th>
              <Th>Unealtă</Th>
              <Th>Client</Th>
              <Th>Share</Th>
              <Th>PDF</Th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((doc) => (
              <tr key={doc.id} className="border-t border-[var(--border)]">
                <Td>{new Date(doc.createdAt).toLocaleString("ro-RO")}</Td>
                <Td>{TOOL_LABELS[doc.tool] ?? doc.tool}</Td>
                <Td>{doc.clientAlias}</Td>
                <Td>
                  <a className="underline" href={`/s/${doc.shareId}`}>
                    deschide
                  </a>
                </Td>
                <Td>
                  {["credit", "optimizare"].includes(doc.tool) ? (
                    <a className="underline" href={`/api/simulari/${doc.id}/pdf`}>
                      export
                    </a>
                  ) : (
                    "—"
                  )}
                </Td>
              </tr>
            ))}
          </tbody>
        </TableCard>
      )}
    </main>
  );
}
