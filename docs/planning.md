# Planificare Proiect: Platformă Modulară de Analiză Financiară

## 0. Viziune și Obiective

Transformarea instrumentelor complexe din Excel într-o platformă web modulară, rapidă și scalabilă.

Platformă web hibridă:
- **Educație publică (B2C):** gratuit, acces larg, SEO-optimizat.
- **Vânzare consultativă (B2B SaaS):** unelte interactive folosite live de consultanții financiari în față clientului.

Obiective cheie:
- Mutarea calculelor grele (anuități, dobânzi compuse, Monte Carlo) din Excel în Python.
- Eliminarea limitărilor Excel-ului (ex: `#REF!` în foaia „Comparatie” a Instrumentarului actual) printr-o arhitectură modulară.
- Gestionarea produselor și a parametrilor fără a atinge codul — totul prin Payload CMS.

---

## 1. Modelul Legal / Disclaimere

Platforma este un **instrument de calcul și vizualizare**, NU furnizor de consultanță de investiții.

Clauze obligatorii (afișate în UI și în orice PDF generat):
- „Acest instrument nu constituie consultanță financiară sau de investiții.”
- „Performanțele trecute nu garantează performanțele viitoare.”
- „Proiecțiile sunt scenarii ipotetice bazate pe ipotezele introduse de utilizator.”
- Disclaimere ESMA pentru simulări Monte Carlo.
- Warning MiFID II pentru comparații de produse de investiții.

Responsabilitate juridică limitată prin TOS. Deținătorul platformei este momentan Nicu Mihai (PFA) — structură care poate evolua către SRL la prima vânzare B2B.

---

## 2. Arhitectura Sistemului

Structură **„Headless” modulară**, monorepo Next.js + Payload CMS v3 integrat.

| Strat | Tehnologie | Hosting |
|---|---|---|
| Frontend + CMS | Next.js 16 (App Router + Turbopack) + Payload CMS v3 | Vercel (Hobby) |
| Backend Core | Python FastAPI (async, OpenAPI auto) | Render (Free → Starter la demo) |
| Bază de date | Neon (Serverless PostgreSQL, `eu-central-1`, branch prod + dev) | Neon Free |
| Cache | Redis (BNR rates, rezultate simulări deterministice) | Upstash Free (`eu-central-1`) |
| Surse date piață | BNR XML (FX, cache stale-while-revalidate 1h fresh / 30d stale) · `yfinance` (Faza 2) → feed plătit (Faza 3) | — |
| Observabilitate | Sentry (FE+BE) + PostHog EU GDPR-safe | Free tier |
| CI/CD | GitHub Actions (ruff + mypy + pytest BE, tsc FE) | GitHub Free |

**Cost total MVP: 0 €.** GitHub Pro via Student Pack pentru repo + CI.

---

## 3. Multi-tenancy & Roluri

Izolare **per-firm** în DB (fiecare rând are `firm_id`, enforced via row-level security / WHERE clauses stricte).

| Rol | Permisiuni |
|---|---|
| **Super Admin** (deținător platformă) | Acces global. Gestionează firmele, produsele generice, indici istorici, cursuri valutare, disclaimere. |
| **Admin Firmă** | Invită/revocă consultanți. Vede simulările tuturor consultanților firmei. Setează logo-ul firmei pentru PDF-uri white-label. |
| **Consultant** | Folosește uneltele, salvează simulări cu pseudonim client, generează PDF-uri cu logo-ul firmei, reia sesiuni via link. |
| **Guest (public)** | Folosește uneltele fără login. NU poate salva sesiune. Poate descărca PDF cu disclaimer explicit „Simulare educativă — nu constituie sfat financiar”. |

---

## 4. Internaționalizare

**RO + EN din prima zi.**
- Next.js i18n routing (`/ro/…`, `/en/…`)
- Conținut din Payload CMS: colecții cu câmpuri `_ro` și `_en`.
- Formulele matematice sunt neutre (numere) — doar etichetele și textele se traduc.
- `hreflang` în head pentru SEO multi-lingual.

---

## 5. UI/UX & Structură Navigare

### A. Landing Page
- Hero axat pe importanța educației financiare.
- Carduri interactive cu sfaturi/noutăți (din CMS).
- Spații dedicate pentru afiliere non-invazivă (brokeraje reglementate).

### B. Navbar
- Acasă
- Unelte (Tools Hub)
- Blog / Educație (content SEO)
- Despre
- Login (B2B)

---

## 6. Module (Tools)

Fiecare unealtă respectă standard de date și include:
- **Comutator Global Inflație** (per monedă — EUR pentru proiecții în EUR, RON pentru RON).
- **Comutator Curs Valutar** (EUR/RON, USD/RON) + tabel auxiliar „devalorizare istorică RON vs EUR/USD” — pentru a arăta că dobânzile nominale mai mari în RON sunt tăiate de inflație și depreciere.
- **Indexare anuală a contribuției** (ex: +3%/an).
- **Top-up-uri ad-hoc** (depuneri extra la momente specifice).
- **Export PDF white-label** (logo firmă din CMS).

### 6.1 Investiții & Acumulare
1. **Depozit Bancar (Termen Scurt)** — dobândă compusă lunară, impozit 10% pe dobândă, comisioane de administrare. Preluat din Excel „Termen Scurt”.
2. **Simulator Unit-Linked** (Stand-alone) — „Happy Path” pentru UL (Allianz Dinamic Invest, NN, Aegon). Parametri definiți din CMS, nu în cod.
3. **Simulator ETF** (Stand-alone) — proiecție cu TER + Monte Carlo historical bootstrap.
4. **Comparator Suprem (UL / ETF / Depozit)** — side-by-side cu TCO, Sharpe Ratio, Regula 72, fan chart P10/P50/P90.

### 6.2 Credite
1. **Simulator Credit Avansat** — include:
   - **Perioadă fixă + revizuire dobândă la luna N** (standardul românesc: fix → IRCC + spread).
   - Perioadă de grație.
   - Rambursare anticipată lunară/one-time cu toggle „Reduce perioada” ↔ „Reduce rata”.
   - Comision lunar de administrare.
2. **Optimizare Credit** (modul flagship B2B) — compară „plătești anticipat creditul” vs „investești aceeași sumă” și identifică *crossover point-ul financiar*. Preluat din Excel „Optimizare credit”. **Acesta este modulul care vinde** către OVB Allfinanz.

### 6.3 Planificare Personală / Lifecycle
1. **Analizor Profil Risc (MiFID II simplificat)** — chestionar care setează parametrii default ai simulărilor.
2. **Gap Pensie** — calculează capitalul necesar la 65 ani (regula 4%).
3. **Siguranța Financiară (Decumulation)** — faza de retragere: cât pot scoate lunar fără să epuizez capitalul. Include modelare piloni II + III cu deductibilitate fiscală.
4. **Viitorul Copilului** — acumulare cu **retrageri parțiale programate** la anumite vârste (ex: 18-22 ani pentru facultate). Preluat din Excel „Viitorul copilului”.

---

## 7. Administrare (Payload CMS)

Pilonul modularității — zero cod când se adaugă un produs nou.

**Colecții:**
- **Produse_UL** — structură taxe (alocare, administrare, recuperare cheltuieli), distribuție pe găleți (unități inițiale/acumulare), parametri contractuali. Versionate (§9).
- **Produse_Credit** — dobânzi de referință, IRCC, spread, comisioane, tipuri de credit.
- **Dobânzi_Depozit_Bancar** — import CSV, per bancă și monedă.
- **Fonduri_ETF** — ticker, TER, monedă, indice de referință.
- **Indici_Istorici** — S&P 500, MSCI World, STOXX 600, BET (CSV cu randamente lunare).
- **Inflatii** — CPI pe RON, EUR, USD (istorice + proiecție).
- **Cursuri_Valutare** — EUR/RON, USD/RON (istorice + live).
- **Firme_Client (B2B)** — logo, branding, useri asociați.
- **Continut_Educational** — articole blog, tips, localizare RO/EN.
- **Disclaimere** — versionate, per modul.

---

## 8. Calcul Financiar — principii

### 8.1 Motor
- Python + NumPy vectorizat (Monte Carlo pe 10k iter < 500ms pentru orizont 30 ani).
- `decimal` pentru calcule deterministice (credite, UL, depozite — paritate la bănuț cu Excel).
- `float64` pentru Monte Carlo (viteza contează mai mult decât precizia sub-bani).

### 8.2 Monte Carlo — Historical Bootstrap Multi-Indice
- **Universe:** S&P 500 (1927+), MSCI World (1970+), STOXX 600 (1987+), BET (2000+).
- **Metodă:** block bootstrap cu blocuri de 12 luni (păstrează autocorelațiile de regim — dot-com, 2008, COVID, stagflația '70).
- **Output:** fan chart P10/P50/P90 + scenarii „cel mai rău caz istoric” (start în 1929, 1999, 2000, 2008).
- **Iterații:** 10.000 per run.

### 8.3 Cache & Performanță
- Array-urile istorice de randamente → Redis, TTL 24h, încărcate o dată din DB la startup.
- Simulările deterministice (credit, UL, depozit) → cache pe `hash(parametri)`, TTL 1h.
- **Un singur endpoint** per modul returnează JSON complet (amortizare + date grafic + metrici) — nu chaining frontend.
- FastAPI async end-to-end; cod structurat async-ready pentru migrare RQ/Celery când traficul o cere.

---

## 9. Versionare Parametri Produse

**Invariant critic:** o simulare salvată trebuie să rămână reproducibilă chiar dacă produsul și-a schimbat taxele între timp.

- Fiecare simulare salvată stochează **snapshot complet al parametrilor folosiți**, nu doar FK către produs.
- Colecțiile de produse din CMS au `version`, `effective_from`, `effective_to`.
- Modificarea unei taxe → versiune nouă, nu update in-place.

---

## 10. Persistență, GDPR, Securitate

- **Simulări salvate în Neon** cu ID generat; consultant regăsește sesiune via link.
- **GDPR:** fără PII (nume complet, CNP). Doar pseudonime sau „Client ID” generat de consultant.
- **Export PDF** include disclaimer legal + timestamp + hash pentru integritate.
- **Audit log** pentru toate modificările din CMS (cine a schimbat ce taxă și când).
- **Auth:** JWT cu refresh token, stocat httpOnly cookie.
- **Row-level security** în Postgres pentru izolarea per firmă.

---

## 11. QA & Testing

- **pytest** pentru toate formulele financiare — fiecare funcție matematică are unit test cu valori din Instrumentarul Excel actual (**paritate la 0.01 RON**).
- **Property-based testing** (Hypothesis) pentru invarianți (ex: suma plăților credit = principal + dobândă totală ± comisioane).
- **Playwright** pentru E2E pe flow-uri critice (consultant → deschide sesiune → generare PDF).
- **Niciun modul financiar în producție fără tests verzi.**

---

## 12. Observabilitate

- **Sentry** (free) — erori backend + frontend.
  - Backend: `sentry-sdk[fastapi]` cu integrations FastApi/Starlette/Httpx, `traces_sample_rate=0.1`, `send_default_pii=False`.
  - Frontend (Next.js 16): `@sentry/nextjs` cu three-file pattern (`instrumentation.ts`, `instrumentation-client.ts`, `sentry.server/edge.config.ts`) + `withSentryConfig` wrap cu `tunnelRoute: '/monitoring'` (bypass ad-blockers) + source-maps upload la build.
  - `app/global-error.tsx` pentru capturare erori render Next.js 16.
- **PostHog** (free) — product analytics, event tracking, feature flags (dezactivate pe MVP).
  - **EU cloud** (`eu.i.posthog.com`) — zero date rutate prin US.
  - GDPR-safe defaults: `person_profiles: 'identified_only'`, `autocapture: false`, `disable_session_recording: true`, `respect_dnt: true`, `capture_pageview: false` (manual pe `onRouterTransitionStart`).
  - Wrapper centralizat `lib/posthog.ts` — niciun alt fișier nu importă `posthog-js` direct. Exports: `captureSimulation(tool)`, `capturePdfExport(tool)` — zero input values părăsesc clientul.
- **Logging structurat JSON** → stdout → Render logs.
- **Health checks** pe toate endpoint-urile critice (`/health/redis`, `/api/v1/bnr/rates` cu cache diagnostic).
- **CI/CD:** GitHub Actions rulează ruff + mypy + pytest (backend) și tsc (frontend) în paralel pe fiecare push/PR, ~46s verde. Cancel-in-progress pe PR nou.

---

## 13. SEO & Content

- **Next.js SSR/ISR** pentru toate paginile publice.
- **Blog modular** în Payload CMS (Nicu scrie conținutul educațional).
- **Schema.org markup** pentru articole financiare.
- **Sitemap auto-generat**, OpenGraph, Twitter Cards per pagină.
- **i18n SEO:** `hreflang` tags pentru RO/EN.

---

## 14. Model de Business

- **B2B SaaS:** abonament lunar plat per consultant activ (estimativ 20-50 €/consultant/lună). Pitch către firme de consultanță (OVB Allfinanz, Safety Broker, independenți). **Beta-testing cu manageri mici din rețeaua existentă.**
- **B2C:** afiliere non-invazivă cu brokeri reglementați; eventual tier „Pro” retail (€5/lună) cu salvare sesiuni, fără ads.

---

## 15. Roadmap

### Faza 1: MVP (cost 0 €)
- Setup monorepo: Next.js + Payload CMS v3 + FastAPI + Neon + Upstash.
- Auth + RBAC (4 roluri).
- Module prioritare: **Credit Avansat**, **Optimizare Credit**, **Depozit Bancar**.
- CMS-driven: dobânzi, comisioane, cursuri valutare, disclaimere.
- PDF export white-label.
- i18n RO/EN.
- **Țintă:** demo-ready pentru beta-testerii OVB/Safety.

### Faza 2: Investiții & Monte Carlo
- UL Stand-alone (Allianz Dinamic Invest ca prim produs CMS-driven).
- ETF Stand-alone + Monte Carlo historical bootstrap.
- Comparator Suprem 3-way.
- Salvare sesiune + link shareable.
- Indexare anuală + top-up-uri peste tot.
- **Țintă:** pitch la un decision-maker OVB.

### Faza 3: Lifecycle & Scalare
- Gap Pensie + Siguranța Financiară (decumulation).
- Viitorul Copilului cu retrageri programate.
- Analizor Profil Risc (MiFID II).
- Blog educațional SEO activ.
- Migrare Render Starter + feed de date plătit.
