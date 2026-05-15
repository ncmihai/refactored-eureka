# Task Tracker — Finance Platform

**Format:** `- [ ]` to-do, `- [/]` în progres, `- [x]` done.
Task-urile sunt grupate pe faze (vezi `planning.md §15`).

---

## În progres

- [x] Setup Payload CMS — producție live (Neon + Vercel)
- [x] Simulator Credit Avansat — motor + endpoint + UI + grafic + dropdown CMS
- [x] Optimizare Credit — motor + endpoint + UI + grafic + dropdown CMS + paritate matematică (16/16, bias B rezolvat prin comparație gain_net vs interest_saved)
- [x] Depozit Bancar — motor + endpoint + UI + grafic + dropdown CMS + paritate matematică (13/13)
- [x] Investiții ETF — motor SIP + TER + capital gains + paritate matematică (19/19) + UI complet
- [x] Deploy producție — Vercel (instrumentar.vercel.app) + Render (FastAPI) + Neon Postgres, CORS OK
- [x] Observabilitate live — Sentry FE+BE (ingestion verificată) + PostHog EU GDPR-safe (4 unelte trimit `captureSimulation`)
- [x] CI verde pe fiecare push — GitHub Actions (ruff + mypy + pytest BE, tsc FE) în ~46s
- [x] Admin dark theme — brand green, login glass card, fix CSS Turbopack prod (`@payloadcms/next/css`)

## Production URLs

- Frontend + Payload admin: https://instrumentar.vercel.app
- FastAPI backend: https://refactored-eureka-h7bs.onrender.com
- DB: Neon pooled, regiune `eu-central-1`
- Analytics: PostHog EU cloud (`eu.i.posthog.com`)
- Errors: Sentry (DSN pe Vercel × 3 scope-uri + Render)

---

## Next up — Faza 1 (MVP, cost 0 €)

### Infra & Setup
- [x] Init monorepo: Next.js 16 App Router + Payload CMS v3 integrat (cost 0)
- [x] Setup proiect Python FastAPI în `/backend` + venv + dependențe
- [x] `.env.example` pentru web + backend
- [x] Neon DB — proiect prod (schema auto-push Payload; branching dev deferred)
- [x] Deploy skeleton: Vercel (frontend+CMS) + Render Free (backend) + Python 3.13 pinned
- [x] Secrets management (`PAYLOAD_SECRET` generat, env vars pe Vercel+Render)
- [x] Rotate Neon password — ALTER ROLE + env vars rotite pe Vercel (3/3 envs) + local
- [x] Upstash Redis instance — `eu-central-1`, TLS, wire cache layer în FastAPI, `/health/redis` reachable în prod
- [x] Endpoint BNR `/api/v1/bnr/rates` — 1h TTL fresh + 30d stale-while-revalidate, multiplier-aware parsing, 6.2× speedup (222ms → 36ms local, <5ms Render↔Upstash)
- [x] Setup Sentry (FE + BE) — BE FastAPI (`telemetry.py`, FastApi/Starlette/Httpx integrations, 10% sampling, PII off), FE Next.js 16 App Router (`@sentry/nextjs` 10.49, instrumentation.ts + instrumentation-client.ts, sentry.{server,edge}.config.ts, global-error.tsx, `withSentryConfig` cu tunnelRoute `/monitoring` + source-maps upload), DSN-uri setate pe Vercel (3 scope-uri) + Render, ingestion verificată cap-coadă (backend `/debug/sentry-crash` + FE throw)
- [x] PostHog (product analytics) — EU cloud, `person_profiles: 'identified_only'`, autocapture off, replay off, respect_dnt, `captureSimulation()` pe cele 4 tool-uri, pageview manual pe router transition. `lib/posthog.ts` centralizat (niciun alt fișier nu importă `posthog-js`).
- [x] GitHub CI (lint, pytest, type-check) — `.github/workflows/ci.yml`, 2 job-uri paralele (ruff+mypy+pytest backend, tsc frontend), concurrency cancel-in-progress, rulează pe push+PR, verde în ~46s
- [x] Neon branching dev — branch `dev` (id `br-old-recipe-al9j8dru`) creat din `production`, `.env.local` local pointează pe dev, Vercel rămâne pe prod; `.env.example` actualizat cu instrucțiuni

### Auth & RBAC
- [ ] Auth bazat pe Payload CMS (JWT httpOnly cookie)
- [ ] Roluri: Super Admin / Admin Firmă / Consultant / Guest
- [ ] Row-level security multi-tenancy pe Postgres (`firm_id`)
- [ ] Flow invitație consultant (email link) — opțional Faza 1, dacă timpul permite

### CMS Collections (Payload) — MVP
- [x] `Users` (auth + rol super_admin/admin_firma/consultant)
- [x] `Firme` (B2B tenants — nume, slug, logo, brand color)
- [x] `Media` (upload images)
- [x] `Produse_Credit` (dobânzi, IRCC, spread, comisioane, effectiveFrom/To, versions)
- [x] `Dobanzi_Depozit_Bancar` (bancă/monedă/scadență, capitalizare, versions)
- [x] `Cursuri_Valutare` (EUR/RON, USD/RON — BNR + manual)
- [x] `Inflatii` (per monedă + an, default flag)
- [x] `Disclaimere` (versionate per modul, richText, RO/EN)
- [x] Seed date piață RO (6 credite, 8 depozite, 5 inflații) — `npm run seed`
- [ ] `Continut_Educational` (stub — blog activat în Faza 3)

### Module MVP — Calcul & UI
- [/] **Simulator Credit Avansat**
  - [x] Endpoint FastAPI + `decimal` math
  - [x] Revizuire dobândă la lună N (perioadă fixă → variabilă)
  - [x] Perioadă de grație
  - [x] Rambursare anticipată cu toggle „Reduce perioada" ↔ „Reduce rata"
  - [x] Comision lunar administrare
  - [x] Paritate la 0.01 RON cu foaia Excel „Credit" (6/6 teste pytest verzi)
  - [x] UI React (formular + tabel amortizare)
  - [x] Wire frontend → backend (fetch direct `NEXT_PUBLIC_BACKEND_URL`)
  - [x] Grafic evoluție sold + dobândă cumulată (Recharts AreaChart)
- [x] **Optimizare Credit** (flagship B2B)
  - [x] Endpoint comparativ A (plată anticipată) vs B (investiție paralelă)
  - [x] Calcul crossover point
  - [x] UI side-by-side + recomandare A/B + tabel anual cu delta
  - [x] Grafic comparativ A vs B cu linie crossover (Recharts LineChart + ReferenceLine)
  - [x] Paritate matematică (16 teste pytest, toate verzi)
  - [x] Fix bias model: recomandarea se bazează acum pe `scen_b_gain_net` (FV − contribuții − tax) vs `interest_saved` — comparație apples-to-apples
- [x] **Depozit Bancar (Termen Scurt)**
  - [x] Endpoint cu impozit 10% pe dobândă
  - [x] Capitalizare lunară vs la scadență + contribuții opționale
  - [x] UI (formular + 4 stats + tabel lunar)
  - [x] Grafic evoluție sold + total depus (Recharts AreaChart + Line)
  - [x] Paritate matematică (13 teste pytest: closed-form compound + simple, invarianți row-by-row)
  - [x] InflationToggle nominal ↔ real integrat
- [x] **Investiții ETF (DCA / SIP)**
  - [x] Motor backend: DCA lunar, compound end-of-month, TER, broker fee (% + fix), tax pe gain la final
  - [x] Endpoint `POST /api/v1/investitii/simulate`
  - [x] UI cu CurrencyToggle + InflationToggle + CMS Disclaimer (modul=etf)
  - [x] Paritate matematică (19 teste pytest: lump-sum closed-form, SIP anuity-due, fee math, CAGR, tax invariants)

### Cross-cutting MVP
- [x] Componenta `InflationToggle` (nominal ↔ real) — integrată în Depozit + Investiții, folosește colecția `Inflatii`, exportă `deflate()` helper
- [x] Componenta `CurrencyToggle` — wire live la BNR via `/api/v1/bnr/rates` (Upstash cached), cascadă BNR → CMS `CursuriValutare` → fallback static 4.9765, arată sursa în UI
- [ ] Tabel devalorizare istorică EUR/RON & USD/RON (extensie pentru CurrencyToggle)
- [ ] Componenta `IndexationInput` (rata indexare anuală)
- [x] Disclaimere persistente în UI (per modul) — component `<Disclaimer modul="..." />` fetch din CMS cu render richText
- [ ] Disclaimere în PDF
- [ ] Export PDF cu logo firmă (white-label)
- [ ] i18n RO/EN (next-intl sau echivalent; conținut dual-field în CMS)
- [x] Typography fluidă (`clamp()` scale h1-h3/body/small) + hero stats strip + „Cum funcționează" steps pe homepage
- [x] Navbar dropdown Tools (scalabil — click-outside + Escape + route-change auto-close)

### QA MVP
- [/] `pytest` — suite paritate cu Excel. Curent: **86 teste verzi** local (11 BNR/cache + 6 credit + 16 optimizare + 18 depozit + 19 ETF deterministic + 9 Monte Carlo + 5 UL + 2 comparator). Target inițial ≥20/modul încă nu atins pe credit/depozit.
- [ ] Property-based tests (Hypothesis) pentru invarianți credit
- [ ] Playwright E2E — flow „consultant deschide sesiune → credit → PDF”

---

### Admin UI / UX
- [x] Dark theme forțat (`admin.theme = 'dark'`) — single brand look pentru MVP
- [x] Brand green 19-stop scale pe `--theme-success-*` → primary buttons / focus / active nav
- [x] Warm near-black base (pure `#000` flattenează elevation layers Payload)
- [x] Fraunces serif fallback pe logo + doc/step headers (in-family cu site public)
- [x] Login page glass card peste ambient radial gradient + hairline grid pattern
- [x] Fix CSS Turbopack prod — `import '@payloadcms/next/css'` în `(payload)/layout.tsx`
- [x] Custom Dashboard widget (`admin.components.beforeDashboard`) — `lib/posthog-server.ts` + RSC `components/admin/DashboardStats/` cu 4 KPI tiles + per-tool bar + sparkline SVG inline (fără Recharts, RSC pur). HogQL Query API, cache 60s via `unstable_cache`. Status modes: `ok` / `not_configured` / `error`. `POSTHOG_PROJECT_ID` + `POSTHOG_PERSONAL_API_KEY` configurate în Vercel prod.
- [ ] PostHog `/flags/` 401 — fie enable feature flags în proiect, fie `advanced_disable_feature_flags: true`
- [ ] Payload CLI `generate:importmap` crapă pe Next.js 16 (bug `@next/env` default export) — hand-patched temporar. Fix: fie bump Payload când iese v3.84+, fie PR upstream în `dist/bin/loadEnv.js`.

---

## Backlog — Faza 2 (Investiții, Monte Carlo & Beta B2B)

**Obiectiv:** transformăm platforma din 4 calculatoare funcționale într-un demo investițional convingător pentru consultanți: ETF deterministic + Monte Carlo, UL parametrizat din CMS, comparator 3-way și sesiuni salvabile.

### Faza 2A — Data foundation investiții
- [x] Colecție CMS `Fonduri_ETF` — ticker, nume, provider, ISIN, TER, monedă, indice referință, activ, effectiveFrom/To, versions
- [x] Seed `Fonduri_ETF` cu 8 ETF-uri uzuale pentru consultanță RO/EU (S&P 500, MSCI World, FTSE All-World, STOXX Europe, BET exposure demonstrativ)
- [x] Colecție CMS `Indici_Istorici` — indice, monedă, dată lunară, randament lunar, sursă, upload CSV, checksum import
- [x] Script import CSV randamente lunare pentru S&P 500, MSCI World, STOXX 600, BET; validare duplicate + opțiune `--update`
- [x] Structură repo-locală pentru dataseturi istorice — `web/data/index-returns/` cu README + metadata pentru surse, acoperire, tip randament și batch import
- [x] Import complet `SP500` long-history proxy în `Indici_Istorici` — 1.863 randamente lunare din Robert Shiller / Irrational Exuberance, 1871-02 → 2026-04, batch `shiller-sp500-monthly-total-return-1871-2026`
- [x] Păstrare FRED `SP500` recent ca fișier audit/comparație — 119 randamente lunare price-return, 2016-06 → 2026-04, batch `fred-sp500-monthly-2016-2026`
- [x] Import provizoriu `MSCI_WORLD` via proxy ETF IWDA.AS — 199 randamente lunare adjusted-close, 2009-10 → 2026-04, batch `yahoo-iwda-msci-world-proxy-2009-2026`
- [x] Import provizoriu `STOXX_600` via proxy ETF EXSA.DE — 219 randamente lunare adjusted-close, 2008-02 → 2026-04, batch `yahoo-exsa-stoxx600-proxy-2008-2026`
- [x] Import provizoriu `FTSE_ALL_WORLD` via proxy ETF VWCE.DE — 81 randamente lunare adjusted-close, 2019-08 → 2026-04, batch `yahoo-vwce-ftse-all-world-proxy-2019-2026`
- [ ] Integrare `yfinance` doar ca sursă auxiliară pentru ticker metadata/TER unde e stabil; randamentele istorice rămân în DB pentru reproducibilitate
- [ ] Cache Redis pentru seriile istorice (`index_returns:{symbol}` TTL 24h) + endpoint diagnostic pentru freshness
- [/] Politică surse date: metadata locală introdusă; MSCI World / STOXX 600 / FTSE All-World au proxy-uri provizorii pentru demo intern, PDF/export comercial rămâne blocat până la review licențe

### Faza 2B — ETF Monte Carlo
- [x] Motor Monte Carlo historical bootstrap în backend — NumPy vectorizat, block size default 12 luni, 10k iter, seed opțional pentru reproducibilitate
- [x] Endpoint `POST /api/v1/investitii/monte-carlo` — reutilizează cash-flow-ul ETF deterministic + `monthly_returns`, `iterations`, `block_size`
- [x] Output percentiles lunar: P10/P25/P50/P75/P90 + final distribution + probability of loss + probability target reached
- [ ] Scenarii worst-start deterministic: 1929, 1999, 2000, 2008 unde seria permite; fallback explicat dacă indicele nu are istoric suficient
- [/] Metrici investiții: CAGR median/net, volatilitate anualizată, Sharpe simplificat, max drawdown median; Regula 72 rămâne pentru comparator/UI
- [x] Teste unitare: shape output, seed determinism, percentile monotonicity, target probability, fee/contribution invariants
- [x] Benchmark local: 10k × 30 ani în ~223ms pentru motor pur
- [x] UI ETF: toggle Determinist / Monte Carlo, fan chart P10-P90, final distribution și copy explicativ; citește `Indici_Istorici` din CMS și folosește serie demo doar ca fallback pentru indici neimportați
- [x] UI ETF afișează contextul datasetului Monte Carlo: număr randamente, interval, monedă, sursă, tip randament și status date/proxy

### Faza 2C — Unit-Linked stand-alone
- [x] Colecție CMS `Produse_UL` — taxe alocare, taxe administrare, recuperare cheltuieli inițiale, găleți unități, asigurare fixă, durate, effectiveFrom/To, versions
- [x] Seed primul produs UL demonstrativ (Allianz Dinamic Invest style) ca „exemplu generic” până la clarificarea licenței
- [x] Motor UL deterministic în backend — cash-flow lunar, unități inițiale/acumulare, taxe pe sold, taxe fixe, randament net
- [x] Endpoint `POST /api/v1/unit-linked/simulate`
- [x] UI `tools/unit-linked` — formular, produs CMS dropdown, grafic sold vs contribuții, defalcare taxe, disclaimer MiFID/insurance
- [x] Teste paritate/invarianți UL: contribuții brute/net investite, taxe totale, sold final, zero-return, zero-fee, schedule length
- [x] Capture analytics `captureSimulation("unit_linked")` + breakdown separat în admin dashboard PostHog

### Faza 2D — Comparator investițional 3-way
- [x] Definește contract comun de output pentru Depozit / ETF / UL: contribuții, valoare netă, taxe, CAGR, schedule
- [x] Endpoint `POST /api/v1/comparator/simulate` — rulează Depozit + ETF + UL cu același cash-flow și returnează comparație normalizată
- [x] UI `tools/comparator` — 3 coloane, grafic net value, taxe, câștig, CAGR și lider numeric neutru
- [/] Metrici comparative: TCO simplificat + CAGR net live; Sharpe/drawdown/probabilitate target vin după conectarea Monte Carlo în comparator
- [x] Disclaimer explicit: comparație educațională, nu recomandare personalizată; produsul potrivit depinde de profil MiFID și obiective
- [x] Teste backend comparator: aceeași contribuție brută pentru toate modulele, output pozitiv și lider valid
- [x] Capture analytics `captureSimulation("comparator")` + breakdown separat în admin dashboard PostHog

### Faza 2E — Sesiuni, PDF & pitch readiness
- [ ] Colecție/tablă `Simulari` — tool, input snapshot, output summary, product snapshots, firm/user, createdAt, shareId, expiresAt
- [ ] Salvare sesiune cu ID unic + link shareable; public view read-only fără PII
- [ ] Snapshot complet parametri produse pe simulare (nu FK live) pentru reproducibilitate legală/comercială
- [ ] Export PDF v1 pentru Credit + Optimizare; include logo firmă, disclaimer, timestamp, hash input/output
- [ ] Export PDF v2 pentru ETF/UL/Comparator cu fan chart și surse date
- [ ] Admin dashboard: ultimele simulări, top tools, exporturi PDF, conversie guest → consultant demo
- [ ] Script demo data pentru pitch: firmă demo, consultant demo, produse demo, 3 simulări saved links
- [ ] Playwright E2E beta: guest rulează ETF MC → salvează sesiune → export PDF → link shareable deschis read-only
- [ ] Pregătire demo OVB/Safety: 3 scenarii reale, 1 pagină pitch, listă întrebări frecvente consultanți

---

## Backlog — Faza 3 (Lifecycle, Commercializare & Scalare)

**Obiectiv:** după demo investițional, platforma devine produs SaaS utilizabil de firme mici: auth complet, multi-tenancy real, module lifecycle, conținut SEO și infrastructură fără cold-start.

### Faza 3A — Auth, tenancy & commercial access
- [ ] Auth app-level pe Payload Users — login consultant, logout, protected routes pentru saved sessions/admin firmă
- [ ] Roluri enforce în UI + API: Super Admin / Admin Firmă / Consultant / Guest
- [ ] Multi-tenancy strict: `firm_id` pe simulări, produse custom firmă, logo PDF; acces filtrat by user.firm
- [ ] Row-level security Postgres sau access-control Payload echivalent documentat; test de izolare cross-firm
- [ ] Flow invitație consultant: Admin Firmă trimite email link, user setează parola, asociere automată la firmă
- [ ] Plan abonament intern: trial firmă, active consultants count, status abonament, limitări export/saved sessions
- [ ] Audit log pentru modificări CMS sensibile: produse, taxe, disclaimere, users, firme

### Faza 3B — Lifecycle tools
- [ ] Analizor Profil Risc MiFID II simplificat — scor Conservator/Moderat/Dinamic/Agresiv, mapat la default ETF/UL
- [ ] Gap Pensie + Monte Carlo pe atingere target — probabilitate target, contribuție necesară, scenarii real/nominal
- [ ] Siguranța Financiară (decumulation) — mod „Venit Pasiv Sustenabil” și „Anuitate Fixă”
- [ ] Modelare Piloni II și III — contribuții, deductibilitate 400 EUR/an, estimare conservatoare, disclaimere fiscale
- [ ] Viitorul Copilului — acumulare + retrageri programate 18-22 ani, warning sold insuficient
- [ ] Top-up-uri ad-hoc generalizate pe ETF/UL/Viitorul Copilului
- [ ] Indexare anuală activă în toate modulele de acumulare și decumulation
- [ ] Contract comun pentru module lifecycle ca să poată intra ulterior în Comparator / PDF / saved sessions

### Faza 3C — Content, SEO & acquisition
- [ ] Colecție CMS `Continut_Educational` — articole, categorii, autor, limba, SEO title/description, status publish
- [ ] Blog educațional activat — listă, detaliu articol, related tools CTA, legal disclaimer
- [ ] i18n RO/EN — routing, labels, CMS dual-field sau locale support Payload, fallback RO
- [ ] SEO polish: schema.org Article/SoftwareApplication, sitemap, robots, canonical, hreflang, OG/Twitter cards
- [ ] Landing B2B pentru consultanți — demo request, tool screenshots, beneficii, legal positioning
- [ ] Landing B2C educațională — calculator hub + articole evergreen, fără promisiuni investiționale
- [ ] Analytics funnel PostHog: pageview → tool run → PDF export → saved session → demo request

### Faza 3D — Infrastructure scaling
- [ ] Migrare Render Free → Starter înainte de primul beta extern stabil; elimină cold-start-ul de ~30s
- [ ] Decide hosting backend pe termen mediu: Render Starter vs Fly.io/Railway/VPS, criterii cost/latency/ops
- [ ] Rate limiting pe API public + protecție pentru endpointuri Monte Carlo costisitoare
- [ ] Cache rezultate Monte Carlo pe hash input + index version; TTL și invalidare la import nou de date istorice
- [ ] Job background pentru importuri date/refresh yfinance dacă request-time devine prea lent
- [ ] DB migrations controlate pentru Payload/Neon; procedură dev branch → validate → prod
- [ ] Backup/restore drill Neon înainte de a porni firme beta reale
- [ ] Error budget operațional: health checks, Sentry alerts, PostHog dashboard, uptime check extern

### Faza 3E — Data feed & compliance scale
- [ ] Evaluare feed de date plătit (EOD Historical Data / Stooq / Nasdaq Data Link / alternativă proprie)
- [ ] Matrice licențiere date: ce putem afișa în UI, ce putem stoca, ce putem exporta în PDF, ce cere atribuire
- [ ] Politică TOS/Privacy/Cookies pentru B2B beta, inclusiv analytics opt-out și zero PII în simulări
- [ ] Revizuire disclaimere cu avocat/consultant compliance înainte de demo plătit
- [ ] Proces update parametri fiscali anual: impozit dobândă, capital gains, dividende, Pilon III

---

## Întrebări deschise / de discutat

- [ ] Licențiere parametri Allianz Dinamic Invest — folosim date publice sau cerem acord formal?
- [ ] Tranziție PFA → SRL: când? (probabil la primul contract B2B semnat)
- [ ] Domeniu final — nume de brand pentru platformă (momentan placeholder Vercel)
- [ ] Bootstrap block size: 12 luni e default, dar merită testat și 3/6/24 după ce avem date
- [ ] Ce manager mic din OVB Allfinanz primește primul acces beta?
- [ ] Strategie abonament B2B: per consultant activ sau forfetar per firmă?

---

## Idei pentru viitor (nice-to-have)

- [ ] Simulator tax optimization (impozit dividende, capital gain RO)
- [ ] Mod „predare-învățare” pentru consultanți noi (tutorial in-app)
- [ ] Integrare CRM (HubSpot) pentru B2B — import clienți
- [ ] Widget embedabil pe site-urile firmelor de consultanță
- [ ] API public pentru devs/terți
- [ ] Asistent AI (GPT / Claude API) care explică graficele în limbaj natural
- [ ] Import extras bancar CSV pentru auto-categorizare cheltuieli
- [ ] Scor „sănătate financiară” personală (credit + economii + pensie)
