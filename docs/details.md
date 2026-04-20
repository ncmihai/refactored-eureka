# Specificații Tehnice și Logica Matematică (Baza de Calcul)

Acest document conține logica de business, formulele financiare și pașii de calcul care trebuie implementați în backend (Python).

**Reguli generale de implementare:**
- Calculele deterministice (credite, UL, depozite) folosesc `decimal.Decimal` pentru paritate la bănuț cu Instrumentarul Excel.
- Simulările Monte Carlo folosesc `float64` + NumPy vectorizat pentru performanță.
- Toate valorile monetare trebuie asociate cu moneda (`RON`, `EUR`, `USD`).
- Orice funcție financiară are unit test `pytest` cu valori de referință din Instrumentarul actual.

---

## 1. Comutatorul Global de Inflație

Toate valorile viitoare generate de simulatoarele de acumulare au metodă de ajustare la inflație.

- **Formula:** $Valoare\_Reala = \dfrac{Valoare\_Nominala}{(1 + Rata\_Inflatiei)^{An\_Curent}}$
- **Rata inflației:** per monedă (RON, EUR, USD), încărcată din CMS — istoric + proiecție. Default: CPI INS pentru RON, HICP Eurostat pentru EUR.
- **UI:** toggle care aplică transformarea pe array-ul de rezultate înainte de plot.

---

## 2. Multi-Currency & FX

Fiecare simulare este asociată unei monede primare (a produsului/contractului).

- **Inflația** se aplică în moneda simulării.
- **Conversia FX** pentru comparații: cascadă de surse cu fallback grațios:
  1. **BNR live** via `GET /api/v1/bnr/rates?currencies=EUR,USD` — parse XML oficial BNR, cache Upstash cu strategie *stale-while-revalidate* (fresh TTL 1h, stale tolerance 30 zile). Speedup măsurat 6.2× (222ms fresh fetch → 36ms local hit).
  2. **CMS** (`Cursuri_Valutare`) — ultimul entry după `validFrom`, folosit când BNR e down > 30 zile sau când se impune un curs manual pentru scenarii istorice.
  3. **Default static** (4.9765 EUR/RON la seed time) — fallback de siguranță.
  - UI (`CurrencyToggle`) afișează sursa cursului („BNR 20 Apr" / „CMS 18 Apr" / „default") pentru transparență față de consultant.
  - Parser suportă `multiplier` din XML-ul BNR (ex: JPY 100) — valoarea e normalizată per unitate înainte de expunere.
- **Tabel auxiliar „Devalorizare istorică”:** afișează grafic EUR/RON, USD/RON pe ultimii 10-20 ani pentru a arăta impactul compus al deprecierii (dobânzi nominale mai mari în RON sunt tăiate de inflație și FX). (Încă pending — feature backlog.)

---

## 3. Indexare Anuală a Contribuției (cross-cutting)

Aplicabil oricărui simulator de acumulare (Depozit, UL, ETF, Plan Acumulare).

- **Input:** `rata_indexare` (ex: 0.03 = +3%/an).
- **Formula:** $Contributie\_An_n = Contributie\_Initiala \times (1 + rata\_indexare)^{n-1}$
- **Aplicare:** la începutul fiecărui an calendaristic de simulare, contribuția lunară crește cu rata configurată.

---

## 4. Top-up-uri Ad-hoc (cross-cutting)

Depuneri extra la momente specifice, peste contribuția recurentă.

- **Input:** array de tupluri `(luna, suma)`, ex: `[(12, 5000), (60, 10000)]`.
- **Aplicare:** în luna specificată, `Suma_Depusa_Luna = Contributie_Lunara + Top_Up_Luna`.
- Pentru UL, top-up-urile se supun **aceluiași traseu** ca prima lunară (taxă alocare etc.).

---

## 5. Simulator Depozit Bancar (Termen Scurt)

Preluat din foaia Excel „Termen Scurt”.

**Intrări:** `Suma_Initiala`, `Suma_Lunara`, `Durata_Luni`, `Dobanda_Anuala`, `Impozit_Dobanda` (default 0.10 = 10%), `Comision_Administrare_Lunar`.

**Buclă lunară:**
1. $Dobanda\_Lunara = Sold\_Initial \times \dfrac{Dobanda\_Anuala}{12}$
2. $Impozit\_Lunar = Dobanda\_Lunara \times Impozit\_Dobanda$
3. $Sold\_Final = Sold\_Initial + Suma\_Depusa + Dobanda\_Lunara - Impozit\_Lunar - Comision$

**Output:** tabel lună cu lună + total depus / total dobândă netă / total impozit / sold final.

---

## 6. Simulator Unit-Linked (Ex: Allianz Dinamic Invest)

- **Sursă referință:** documentație contractuală Dinamic Invest (Allianz-Țiriac).
- **Frecvența:** lunară.

**Traseul banilor (lunar):**
1. **Prima Netă Investită:** $Suma\_Neta = Prima\_Bruta - Taxa\_Asigurare\_Fixa$ (ex: 13.5 RON/lună).
2. **Deducere Taxă Alocare** (în funcție de sold):
   - Sold ≤ 6000 RON → 5.0%
   - Sold > 6000 RON → 2.5%
   - $Investitia\_Efectiva = Suma\_Neta \times (1 - Taxa\_Alocare)$
3. **Distribuție în găleți:**
   - L1–L24 → **Unități Inițiale**
   - L25+ → **Unități de Acumulare**
4. **Deduceri de administrare (lunare):**
   - Taxa recuperare cheltuieli inițiale: 3%/an pe sold Unități Inițiale (primii 20 ani) → $0.25\%$/lună.
   - Taxa administrare program: 1.29%/an (dedusă prin prețul unității).
5. **Creșterea contului:** dobândă compusă lunară pe totalul contului.

**Parametrizare CMS:** toate taxele, plafoanele, durata găleților, sunt definite în colecția `Produse_UL` (versionate §9 din planning).

---

## 7. Simulator ETF (Stand-alone)

### 7.1 Motor determinist (Faza 1 — live)

**Intrări:** `Suma_Initiala`, `Suma_Lunara` (DCA/SIP), `Durata_Luni`, `Randament_Anual` (așteptat, nominal), `TER` (ex: 0.07%), `Comision_Broker_Procent` (ex: 0.1%), `Comision_Broker_Fix` (ex: 0 EUR), `Impozit_Castig` (10% RO), `Moneda`.

**Randament efectiv lunar:** $r_{ef} = \dfrac{Randament\_Anual - TER}{12}$

**Aplicarea comisionului broker per tranzacție:**
- Fiecare depunere pierde `Comision_Procent × Suma + Comision_Fix` **înainte** să fie cumpărate unități.
- Suma efectiv investită: $Depus\_Efectiv = Suma\_Depusa \times (1 - Comision\_Procent) - Comision\_Fix$

**Compounding end-of-month:**
$Valoare\_Cont_n = \left( Valoare\_Cont_{n-1} + Depus\_Efectiv_n \right) \times (1 + r_{ef})$

(Depunerea lunii $n$ participă la randamentul lunii $n$ — annuity-due, nu ordinary annuity. Paritate verificată cu formula closed-form SIP.)

**Impozit pe câștig — model buy-and-hold:**
- Aplicat **doar la sfârșit**, pe câștigul brut agregat.
- $Castig\_Brut = Valoare\_Final - Total\_Contribuit\_Efectiv$
- $Impozit = \max(0, Castig\_Brut) \times Impozit\_Castig$ (nu impozităm pierderi)
- $Valoare\_Neta = Valoare\_Final - Impozit$

**Output:**
- `final_value_gross`, `final_value_net`, `total_contributed` (brut, înainte de broker), `total_contributed_effective` (după broker), `total_broker_fees`, `total_tax`, `gain_net`, `cagr_net`.
- `schedule[]` — sold lunar (gross) + contribuție brut/efectiv per lună.

**Paritate pytest (19 teste verzi):**
- Lump-sum closed-form (fără DCA, doar suma inițială × compound).
- SIP annuity-due closed-form (fără sumă inițială, doar DCA).
- Broker fee math — invariant `total_broker_fees = Σ (suma × procent + fix)`.
- CAGR definition — `(FV/PV)^(1/ani) − 1`.
- Tax invariants — impozit 0 pe loss, impozit liniar pe gain.

### 7.2 Extensie Monte Carlo (Faza 2 — planificat)

Înlocuiește `Randament_Anual` determinist cu array simulat per iterație (vezi §8). Fan chart P10/P50/P90 + scenarii worst historical start. Motorul determinist se reutilizează 1:1 — Monte Carlo doar wraps bucla într-o matrice NumPy `(10000 × N_luni)`.

---

## 8. Monte Carlo — Historical Bootstrap Multi-Indice

**Folosit pentru:** ETF Simulator, Comparator Suprem, Gap Pensie (opțional).

**Parametri:**
- Indici disponibili: S&P 500 (1927+), MSCI World (1970+), STOXX 600 (1987+), BET (2000+).
- Bootstrap block size: 12 luni (păstrează autocorelațiile de regim).
- Iterații: 10.000.

**Algoritm:**
1. Încarcă array-ul de randamente lunare istorice pentru indicele ales (din Redis cache).
2. Pentru fiecare iterație:
   - Construiește un sir de randamente de lungime `N_luni` prin concatenare de blocuri de 12 luni sampled random (with replacement) din seria istorică.
   - Aplică traseul de cash-flow (contribuții, top-up-uri, TER, comisioane).
3. Output per iterație: array `Valoare_Cont_luna`.
4. Agregare cross-iterații: calculează **P10, P25, P50, P75, P90** per lună.

**Scenarii „cel mai rău caz istoric”:** rulează simularea cu start determinist în 1929, 1999, 2000, 2008 — afișate ca linii contextuale peste fan chart.

**Implementare:** NumPy vectorizat — matrice `(10000 × N_luni)` operată cumulativ. Benchmark target: < 500ms pentru 30 ani.

---

## 9. Metrici Comparative (Fund Managers Ratios)

Pentru Comparator Suprem, backend returnează JSON cu:

1. **Regula 72:** $Ani\_Pana\_La\_Dublare = \dfrac{72}{Randament\_Anual\_Net\_Procentual}$
2. **TCO (Total Cost of Ownership):** suma absolută în monedă a tuturor taxelor plătite pe durata contractului.
3. **Sharpe Ratio:** $Sharpe = \dfrac{Randament\_Asteptat - Rata\_Fara\_Risc}{\sigma}$ (deviația standard extrasă din Monte Carlo; rata fără risc default = 3% titluri de stat RO).
4. **CAGR Net:** randamentul anual compus după toate costurile.
5. **Drawdown Maxim Istoric:** cel mai mare declin pe orizont din scenariile MC.

---

## 10. Simulator Credit Avansat

Platforma generează un **tabel de amortizare** (array de obiecte JSON).

### 10.1 Anuitatea de Bază
$A = P \times \dfrac{r(1+r)^n}{(1+r)^n - 1}$

Unde $P$ = principal, $r$ = dobândă lunară = $Dobanda\_Anuala / 12$, $n$ = număr total de luni.

### 10.2 Revizuirea Dobânzii (Standard Românesc)

**Esențial — lipsa asta era eroare fundamentală în varianta inițială.**

Creditele ipotecare în RO au structură: **perioadă fixă** (ex: primele 36 luni la 4.9%) → **perioadă variabilă** (IRCC + spread, ex: 7.76%).

**Intrări:**
- `Dobanda_Initiala`
- `Luna_Revizuire` (ex: 36)
- `Dobanda_Ulterioara`

**Logică:** la `Luna_Revizuire`, recalculează anuitatea $A$ pe baza soldului rămas și a lunilor rămase, cu noua dobândă.

### 10.3 Buclă Lunară (Amortizare)
1. $Dobanda\_Lunara = Sold\_Ramas \times r_{curent}$
2. $Principal\_Rambursat = Rata\_Lunara - Dobanda\_Lunara$
3. Dacă `Plata_Anticipata > 0`: $Sold\_Ramas = Sold\_Ramas - Plata\_Anticipata$

### 10.4 Comutatorul de Plată Anticipată
- **Opțiunea 1 — Scade Perioada:** anuitatea $A$ rămâne fixă. Bucla se oprește când `Sold_Ramas ≤ 0`.
- **Opțiunea 2 — Scade Rata:** după plata anticipată, recalculează $A_{nou}$ pe baza `Sold_Ramas` nou și `n_ramas`.

### 10.5 Perioadă de Grație

În perioada de grație se plătește **doar dobânda**, principalul rămâne neschimbat. Anuitatea standard începe după finalul perioadei de grație, cu $n$ redus corespunzător.

---

## 11. Optimizare Credit (modul flagship B2B)

Preluat din foaia Excel „Optimizare credit”.

**Scop:** compară două strategii ale aceluiași cash-flow lunar și identifică *crossover point-ul*.

**Intrări:**
- Parametrii creditului (vezi §10).
- `Economie_Lunara` (suma pe care clientul o are disponibilă peste rată).
- Parametrii planului de acumulare (randament estimat, TER, taxe).
- `Curs_Valutar` (dacă creditul și economisirea sunt în monede diferite).

**Strategia A — Plătești Anticipat:**
Direcționează `Economie_Lunara` ca rambursare anticipată lunară → credit închis mai repede, fără economii.

**Strategia B — Investești Paralel:**
Plătești rata normală + investești `Economie_Lunara` în planul de acumulare → credit plătit în perioada contractuală, dar cont de investiții în creștere.

**Output:**
- Tabel anual: `Sold_Credit` (strategia B) + `Sold_Acumulare` (strategia B).
- **Crossover point:** anul în care `Sold_Acumulare ≥ Sold_Credit` (clientul ar putea închide creditul cu economiile acumulate).
- **Avantaj financiar final:** `Sold_Acumulare_Final - Dobanda_Totala_Platita`.
- **Recomandare contextuală:** când are sens B vs A, în funcție de diferența dintre randamentul net estimat și dobânda creditului.

---

## 12. Gap Pensie & Regula 4% (Safe Withdrawal Rate)

- **Intrare:** `Necesar_Lunar_Pensie` (ex: 6000 RON) − `Pensie_Stat_Estimata` (ex: 3000 RON) = **Gap Lunar** (3000 RON).
- **Calcul capital necesar:** $Capital\_Target = Gap\_Lunar \times 12 \times 25$ (echivalent regulii de retragere 4%).
- **Extensie:** rulează Monte Carlo pe orizontul rămas până la pensie pentru a afișa probabilitatea atingerii `Capital_Target` cu un plan dat (contribuție lunară + randament estimat).

---

## 13. Siguranța Financiară (Decumulation)

Preluat din foaia Excel „Siguranta financiara”.

**Scop:** modelează faza de retragere — cât pot scoate lunar fără să epuizez capitalul.

**Intrări:**
- `Capital_Initial` (la momentul începerii retragerilor).
- `Retragere_Lunara` (sau `Procent_Anual_Retragere`).
- `Randament_Estimat` pe fondul rămas.
- `Indexare_Retragere` (ex: retragerea crește anual cu inflația).
- `Orizont` (luni) sau „până la epuizare”.

**Buclă lunară:**
1. $Sold = Sold \times (1 + r/12) - Retragere\_Luna$
2. Dacă `Sold ≤ 0` → capital epuizat, return `Luna_Epuizare`.

**Moduri afișare:**
- Modul „**Venit Pasiv Sustenabil**”: calculează retragerea maximă la care capitalul **nu** se epuizează în orizontul dat (dynamic search).
- Modul „**Anuitate Fixă**”: user setează retragerea, platforma arată când se epuizează capitalul.

**Extensie (Fază 3):** modelare piloni II și III români, cu deductibilitate fiscală contribuții (400 EUR/an Pilon III).

---

## 14. Viitorul Copilului

Preluat din foaia Excel „Viitorul copilului”.

Plan de acumulare cu **retrageri parțiale programate la anumite vârste ale copilului** (ex: 10.000 RON/an între 18-22 ani pentru facultate).

**Intrări:**
- Plan acumulare standard (contribuție, durată, randament).
- Array de `(varsta_copil, suma_retragere, durata_retragere_ani)`.
- `Varsta_Copil_Start` (pentru mapare varsta → luna din simulare).

**Output:** ca plan standard, cu marcaj vizual pe grafic la momentele retragerilor + notificare dacă retragerea e imposibilă (sold insuficient).

---

## 15. Analizor Profil de Risc (MiFID II simplificat)

Chestionar cu ~10 întrebări (orizont investițional, toleranță la pierderi, obiective, experiență). Output: **Scor de risc** (Conservator / Moderat / Dinamic / Agresiv).

Scorul setează **parametri default** pentru alte simulări:
- Alocare sugerată (% acțiuni / % obligațiuni).
- Randament estimat (CAGR) pentru modulul ETF.
- Rata de retragere recomandată (Decumulation).

---

## 16. Parametri Globali (din CMS)

Valori default care se aplică tuturor modulelor, editabile prin CMS:

| Parametru | Default | Sursă |
|---|---|---|
| Inflație RON | 3.0% | INS (CPI mediu 10 ani) |
| Inflație EUR | 2.0% | Eurostat HICP |
| Inflație USD | 2.5% | BLS CPI |
| Rată fără risc RON | 3.0% | Titluri de stat 10Y |
| Curs EUR/RON | 4.97 | BNR |
| Impozit dividende | 8% | Cod Fiscal RO |
| Impozit dobândă depozit | 10% | Cod Fiscal RO |
| Impozit câștig capital | 10% | Cod Fiscal RO |
| Deductibilitate Pilon III | 400 EUR/an | Cod Fiscal RO |

---

## 17. Note operaționale (gotchas persistate)

### 17.1 Payload CMS admin — CSS loading în Next.js 16 Turbopack prod

`@payloadcms/next@3.83` ship-uiește pre-compiled — sursele `.scss` sunt șterse din pachet, iar `import './index.scss'` din JS sunt stripped. În **dev** (Turbopack dev / webpack) source-maps-ul rezolvă SCSS-ul la runtime → admin stilizat. În **Next.js 16 Turbopack prod**, build-ul sare peste SCSS → admin renderuiește cu browser defaults (body unstyled, linkuri albastre, sidebar gol).

**Fix:** adăugat `import '@payloadcms/next/css'` în `app/(payload)/layout.tsx`, **înainte** de `./custom.scss`. Pachetul expune stylesheet-ul prebuilt la `dist/prod/styles.css` (~306KB) care conține toate selector-urile `.template-default`, `.template-minimal`, `.nav`, `.login__form`, `.doc-header` etc.

**Cascada `@layer`:** Payload injectează `<style>@layer payload-default, payload;</style>` în `<head>` la startup pentru a pin-a precedența. Overrides-urile locale trebuie să folosească `@layer payload { ... }` (nu `payload-default`), altfel sunt suprascrise de propriul stylesheet Payload.

### 17.2 Tema admin — single lever pe `--theme-success-*`

Payload folosește scale-ul `success` pentru primary buttons, focus rings, active nav indicator, link hover, toast success. Re-mapparea celor 19 stop-uri `--theme-success-50` → `-950` pe brand green (`#15543d` derivat) re-skin-uiește tot admin-ul cu o singură secțiune SCSS. Fără această remappare, temele custom cer 20+ selector overrides.

### 17.3 Scope `.template-minimal` vs dashboard

Wrapper-ul `.template-minimal` acoperă login + forgot-password + reset — nu dashboard-ul. Stilurile de login card se pot scrie cu scope `.template-minimal` fără risc de leakage în CMS-ul principal (care folosește `.template-default`).
