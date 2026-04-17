# Task Tracker — Finance Platform

**Format:** `- [ ]` to-do, `- [/]` în progres, `- [x]` done.
Task-urile sunt grupate pe faze (vezi `planning.md §15`).

---

## În progres

- [/] Setup Payload CMS (structura gata, lipsește DATABASE_URI + PAYLOAD_SECRET în `.env.local`)
- [/] Simulator Credit Avansat — motor + endpoint + UI + grafic + dropdown CMS ✅
- [/] Optimizare Credit — motor + endpoint + UI + grafic + dropdown CMS ✅ (paritate matematică 14/14, model are bias B — de revăzut)
- [x] Depozit Bancar — motor + endpoint + UI + grafic + dropdown CMS + paritate matematică (13/13)

---

## Next up — Faza 1 (MVP, cost 0 €)

### Infra & Setup
- [x] Init monorepo: Next.js 16 App Router + Payload CMS v3 integrat (cost 0)
- [x] Setup proiect Python FastAPI în `/backend` + venv + dependențe
- [x] `.env.example` pentru web + backend
- [ ] Neon DB — proiect + schema inițială + branching dev/prod
- [ ] Upstash Redis instance
- [ ] Deploy skeleton: Vercel (frontend+CMS) + Render Free (backend)
- [ ] Setup Sentry (FE + BE) + PostHog
- [ ] GitHub repo privat + CI (lint, pytest, type-check)
- [ ] Secrets management (generare `PAYLOAD_SECRET`, `.env.local` per mediu)

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
- [/] **Optimizare Credit** (flagship B2B)
  - [x] Endpoint comparativ A (plată anticipată) vs B (investiție paralelă)
  - [x] Calcul crossover point
  - [x] UI side-by-side + recomandare A/B + tabel anual cu delta
  - [x] Grafic comparativ A vs B cu linie crossover (Recharts LineChart + ReferenceLine)
  - [x] Paritate matematică (14 teste pytest; 1 xfail care documentează bias-ul modelului actual)
  - [ ] **BUG MODEL:** comparația `scen_b_net` (portofoliu total cu capital) vs `interest_saved` (doar dobândă evitată) e apples-to-oranges → recomandarea e biasată sistematic spre B. Fix: compară surplusul net vs dobânda economisită, sau modelează cashflow-ul eliberat după închiderea A.
- [/] **Depozit Bancar (Termen Scurt)**
  - [x] Endpoint cu impozit 10% pe dobândă
  - [x] Capitalizare lunară vs la scadență + contribuții opționale
  - [x] UI (formular + 4 stats + tabel lunar)
  - [x] Grafic evoluție sold + total depus (Recharts AreaChart + Line)
  - [x] Paritate matematică (13 teste pytest: closed-form compound + simple, invarianți row-by-row)

### Cross-cutting MVP
- [ ] Componenta `InflationToggle` (nominal ↔ real)
- [ ] Componenta `CurrencyToggle` + tabel devalorizare istorică EUR/RON & USD/RON
- [ ] Componenta `IndexationInput` (rata indexare anuală)
- [ ] Disclaimere persistente în UI (per modul) + în PDF
- [ ] Export PDF cu logo firmă (white-label)
- [ ] i18n RO/EN (next-intl sau echivalent; conținut dual-field în CMS)

### QA MVP
- [ ] `pytest` — suite paritate cu Excel (min 20 test-case-uri per modul)
- [ ] Property-based tests (Hypothesis) pentru invarianți credit
- [ ] Playwright E2E — flow „consultant deschide sesiune → credit → PDF”

---

## Backlog — Faza 2 (Investiții & Monte Carlo)

- [ ] Colecție CMS `Produse_UL` (versionate cu `effective_from`/`effective_to`)
- [ ] Colecție CMS `Fonduri_ETF`
- [ ] Colecție CMS `Indici_Istorici` (S&P 500, MSCI World, STOXX 600, BET — CSV randamente lunare)
- [ ] Simulator UL Stand-alone (parametrizat CMS; Allianz Dinamic Invest ca prim produs)
- [ ] Integrare `yfinance` + caching Redis pe ticker/TER
- [ ] Simulator ETF Stand-alone (TER + comision broker)
- [ ] Monte Carlo historical bootstrap (block 12 luni, 10k iter)
- [ ] Fan chart P10/P25/P50/P75/P90 în UI
- [ ] Scenarii „cel mai rău caz istoric” (start 1929/1999/2000/2008)
- [ ] Comparator Suprem 3-way (UL / ETF / Depozit)
- [ ] Metrici: Sharpe Ratio, Regula 72, TCO, CAGR net, Drawdown maxim
- [ ] Salvare sesiune cu ID unic + link shareable
- [ ] Snapshot parametri pe simulare (versionare §9)
- [ ] Indexare anuală activă în toate modulele de acumulare
- [ ] Top-up-uri ad-hoc în UL și ETF

---

## Backlog — Faza 3 (Lifecycle & Scalare)

- [ ] Gap Pensie + Monte Carlo pe atingere target
- [ ] Siguranța Financiară (decumulation) — mod „Venit Pasiv Sustenabil” și „Anuitate Fixă”
- [ ] Modelare Piloni II și III (deductibilitate 400 EUR/an)
- [ ] Viitorul Copilului cu retrageri programate (18-22 ani)
- [ ] Analizor Profil Risc MiFID II simplificat
- [ ] Blog educațional activat (Nicu scrie conținutul)
- [ ] SEO polish: schema.org, sitemap, hreflang, OG/Twitter cards
- [ ] Migrare Render Free → Starter
- [ ] Evaluare feed de date plătit (EOD Historical Data / alternativă proprie)

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
