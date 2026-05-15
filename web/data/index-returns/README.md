# Index Return Datasets

Canonical local CSVs for historical monthly returns used by the ETF Monte Carlo engine.

CSV format:

```csv
date,return
1871-02,-1.177586
```

`return` is a monthly percentage return, so `2.35` means `+2.35%`.

The frontend reads from Payload CMS. These files are the repo-local source artifacts that can be re-imported into Payload for reproducible local, staging, and production environments.

## Regeneration

S&P long-history proxy:

```bash
npm run build:shiller-returns -- \
  --input ./data/sources/ie_data.xls \
  --output ./data/index-returns/sp500-shiller-monthly-total-return.csv \
  --through 2026-04
```

Yahoo chart exports:

```bash
npm run build:yahoo-returns -- \
  --input /tmp/yahoo-iwda.json \
  --output ./data/index-returns/msci-world-iwda-monthly-adjusted-return.csv \
  --through 2026-04
```

Import:

```bash
npm run import:index-returns -- \
  --file ./data/index-returns/msci-world-iwda-monthly-adjusted-return.csv \
  --indice MSCI_WORLD \
  --moneda EUR \
  --source yfinance \
  --source-url https://finance.yahoo.com/quote/IWDA.AS/history/ \
  --batch yahoo-iwda-msci-world-proxy-2009-2026 \
  --update
```

Datasets marked `provisional_review_later` are usable for internal demos, but should not be exported into PDFs or marketed as official index datasets until licensing/source review is complete.
