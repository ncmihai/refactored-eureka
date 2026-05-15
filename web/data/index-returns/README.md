# Index Return Datasets

Canonical local CSVs for historical monthly returns used by the ETF Monte Carlo engine.

CSV format:

```csv
date,return
1871-02,-1.177586
```

`return` is a monthly percentage return, so `2.35` means `+2.35%`.

The frontend reads from Payload CMS. These files are the repo-local source artifacts that can be re-imported into Payload for reproducible local, staging, and production environments.

