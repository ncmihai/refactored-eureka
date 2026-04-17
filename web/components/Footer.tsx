export function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="mt-24 border-t border-[var(--border)] bg-[var(--background)]">
      <div className="max-w-6xl mx-auto px-6 py-10 grid gap-8 md:grid-cols-[1.4fr_1fr_1fr] text-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded bg-[var(--foreground)] text-white grid place-items-center text-[9px] font-semibold tracking-wider">
              FP
            </span>
            <span className="font-medium">Finance Platform</span>
          </div>
          <p className="text-[var(--muted)] mt-3 max-w-sm leading-relaxed">
            Unelte de analiză financiară pentru consultanți și clienți. Date
            piață RO actualizate via CMS. Calcule transparente, fără cutie
            neagră.
          </p>
        </div>
        <div>
          <div className="font-medium mb-3">Unelte</div>
          <ul className="space-y-2 text-[var(--muted)]">
            <li><a href="/tools/credit" className="hover:text-[var(--foreground)]">Simulator Credit</a></li>
            <li><a href="/tools/optimizare" className="hover:text-[var(--foreground)]">Optimizare Credit</a></li>
            <li><a href="/tools/depozit" className="hover:text-[var(--foreground)]">Depozit Bancar</a></li>
          </ul>
        </div>
        <div>
          <div className="font-medium mb-3">Platformă</div>
          <ul className="space-y-2 text-[var(--muted)]">
            <li><a href="/admin" className="hover:text-[var(--foreground)]">Admin CMS</a></li>
            <li><span className="text-[var(--muted-2)]">Blog (în curând)</span></li>
            <li><span className="text-[var(--muted-2)]">Despre (în curând)</span></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-[var(--border)]">
        <div className="max-w-6xl mx-auto px-6 py-5 flex flex-col md:flex-row md:items-center md:justify-between gap-2 text-xs text-[var(--muted)]">
          <p className="italic max-w-2xl">
            Acest instrument nu constituie consultanță financiară sau de
            investiții. Simulările sunt educative; verifică întotdeauna
            condițiile contractuale cu banca sau consultantul tău.
          </p>
          <p>© {year} Finance Platform</p>
        </div>
      </div>
    </footer>
  );
}
