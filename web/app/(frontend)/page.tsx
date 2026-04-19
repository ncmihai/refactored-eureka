import Link from "next/link";

const tools = [
  {
    href: "/tools/credit",
    title: "Simulator Credit",
    desc: "Scadențar complet cu anuități constante, revizuire dobândă la lună N, rambursare anticipată și comisioane.",
    tag: "Credit",
  },
  {
    href: "/tools/optimizare",
    title: "Optimizare Credit",
    desc: "Plată anticipată vs investiție paralelă. Identifică crossover-ul și oferă recomandarea numerică.",
    tag: "Flagship",
  },
  {
    href: "/tools/depozit",
    title: "Depozit Bancar",
    desc: "Capitalizare lunară sau la scadență, impozit 10% pe dobândă, contribuții recurente opționale.",
    tag: "Economii",
  },
  {
    href: "/tools/investitii",
    title: "Investiții ETF",
    desc: "Acumulare DCA pe termen lung. Randament brut minus TER, comisioane broker și impozit pe câștig. CAGR net.",
    tag: "Investiții",
  },
];

const principles = [
  {
    title: "Calcul transparent",
    body: "Fiecare cifră are o formulă vizibilă. Fără cutie neagră. Paritate la 0.01 RON cu Excel-ul de referință.",
  },
  {
    title: "Date piață live",
    body: "Produsele bancare sunt în CMS, nu hardcodate. Când dobânzile se schimbă, un singur loc e de modificat.",
  },
  {
    title: "Fără vânzare agresivă",
    body: "Uneltele arată adevărul matematic. Consultantul discută contextul. Clientul decide informat.",
  },
];

const stats = [
  { value: "4", label: "Unelte live" },
  { value: "19", label: "Produse CMS" },
  { value: "0.01 RON", label: "Paritate Excel" },
  { value: "54", label: "Teste matematice" },
];

const steps = [
  {
    n: "01",
    title: "Alegi unealta",
    body: "Credit, depozit, optimizare sau investiții ETF. Fiecare unealtă cere strict inputurile relevante — nu formulare bufer.",
  },
  {
    n: "02",
    title: "Completezi parametrii",
    body: "Dobânzile și cursurile valutare vin pre-populate din CMS. Poți lucra pe scenarii alternative — o modificare, recalcul instant.",
  },
  {
    n: "03",
    title: "Exporți PDF cu logo firmă",
    body: "White-label pentru clienți finali. Scadențarul complet, graficele și disclaimerul legal într-un singur document imprimabil.",
  },
];

export default function Home() {
  return (
    <main className="flex-1">
      <section className="max-w-6xl mx-auto px-6 pt-20 pb-16 md:pt-28 md:pb-24">
        <div className="max-w-3xl">
          <span className="pill reveal reveal-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]" />
            Piața RO · date actualizate 2026
          </span>
          <h1 className="reveal reveal-2 mt-6 h-hero font-serif tracking-tight">
            Decizii financiare{" "}
            <span className="italic text-[var(--accent)]">limpezi,</span>
            <br />
            sprijinite de matematică.
          </h1>
          <p className="reveal reveal-3 mt-6 text-lg md:text-xl text-[var(--muted)] leading-relaxed max-w-2xl">
            Platformă de unelte pentru consultanți financiari și clienți
            informați. Simulări reproductibile, dobânzi reale, fără promisiuni
            de randament.
          </p>
          <div className="reveal reveal-4 mt-8 flex flex-wrap items-center gap-3">
            <Link href="/tools/credit" className="btn-primary">
              Deschide Simulator Credit →
            </Link>
            <Link href="/tools/optimizare" className="btn-ghost">
              sau încearcă Optimizarea
            </Link>
          </div>
        </div>

        <dl className="reveal reveal-5 mt-16 md:mt-20 grid grid-cols-2 md:grid-cols-4 gap-px bg-[var(--border)] border border-[var(--border)] rounded-lg overflow-hidden">
          {stats.map((s) => (
            <div
              key={s.label}
              className="bg-[var(--background)] px-5 py-4 md:px-6 md:py-5"
            >
              <dt className="text-[11px] uppercase tracking-[0.16em] text-[var(--muted-2)]">
                {s.label}
              </dt>
              <dd className="stat-value mt-1.5 text-2xl md:text-3xl leading-none">
                {s.value}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <div className="divider max-w-6xl mx-auto" />

      <section className="max-w-6xl mx-auto px-6 py-16 md:py-20">
        <div className="flex items-end justify-between mb-8">
          <div>
            <div className="text-xs uppercase tracking-[0.18em] text-[var(--muted-2)]">
              Unelte
            </div>
            <h2 className="font-serif h-section mt-2 tracking-tight">
              Patru calculatoare, un singur limbaj.
            </h2>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {tools.map((t, i) => (
            <Link
              key={t.href}
              href={t.href}
              className={`card card-hover p-6 group block reveal reveal-${i + 2}`}
            >
              <div className="flex items-center justify-between mb-6">
                <span className="pill">{t.tag}</span>
                <span className="text-[var(--muted-2)] group-hover:text-[var(--accent)] transition-colors text-lg">
                  →
                </span>
              </div>
              <h3 className="font-serif text-2xl tracking-tight">{t.title}</h3>
              <p className="text-sm text-[var(--muted)] mt-3 leading-relaxed">
                {t.desc}
              </p>
            </Link>
          ))}
        </div>
      </section>

      <div className="divider max-w-6xl mx-auto" />

      <section className="max-w-6xl mx-auto px-6 py-16 md:py-20">
        <div className="flex items-end justify-between mb-10">
          <div>
            <div className="text-xs uppercase tracking-[0.18em] text-[var(--muted-2)]">
              Flux
            </div>
            <h2 className="font-serif h-section mt-2 tracking-tight">
              Cum funcționează.
            </h2>
          </div>
        </div>

        <ol className="grid grid-cols-1 md:grid-cols-3 gap-px bg-[var(--border)] border border-[var(--border)] rounded-lg overflow-hidden">
          {steps.map((s, i) => (
            <li
              key={s.n}
              className={`bg-[var(--background)] p-6 md:p-8 reveal reveal-${i + 2}`}
            >
              <div className="flex items-baseline gap-4">
                <span className="font-serif text-3xl md:text-4xl text-[var(--muted-2)] tabular-nums leading-none">
                  {s.n}
                </span>
                <div className="flex-1">
                  <h3 className="font-medium text-base">{s.title}</h3>
                  <p className="text-sm text-[var(--muted)] mt-2 leading-relaxed">
                    {s.body}
                  </p>
                </div>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="max-w-6xl mx-auto px-6 py-16 md:py-24">
        <div className="grid md:grid-cols-[1fr_1.6fr] gap-10">
          <div>
            <div className="text-xs uppercase tracking-[0.18em] text-[var(--muted-2)]">
              De ce platforma asta
            </div>
            <h2 className="font-serif h-section mt-2 tracking-tight">
              Construită pentru{" "}
              <span className="italic">conversații cinstite</span>, nu pentru
              ochi și urechi.
            </h2>
          </div>
          <div className="grid gap-px bg-[var(--border)]">
            {principles.map((p, i) => (
              <div
                key={p.title}
                className={`bg-[var(--background)] p-6 reveal reveal-${i + 2}`}
              >
                <div className="flex items-center gap-3">
                  <span
                    aria-hidden
                    className="h-px w-6 bg-[var(--accent)]"
                  />
                  <h3 className="font-medium">{p.title}</h3>
                </div>
                <p className="text-sm text-[var(--muted)] mt-2.5 leading-relaxed">
                  {p.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-6 pb-24">
        <div className="card p-8 md:p-12 bg-gradient-to-br from-[var(--surface)] to-[var(--accent-soft)]">
          <div className="max-w-2xl">
            <h3 className="font-serif h-card tracking-tight">
              În curând: comparator 3-way UL / ETF / Depozit cu Monte Carlo
              istoric.
            </h3>
            <p className="text-sm text-[var(--muted)] mt-3 leading-relaxed">
              Fan chart P10/P50/P90, scenarii „cel mai rău caz istoric", Sharpe
              Ratio, Regula 72 și TCO — toate într-o singură vizualizare. Pentru
              consultanți care vor să arate clar trade-off-ul între produse.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
