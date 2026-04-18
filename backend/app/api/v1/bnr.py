"""BNR FX rates API.

GET /api/v1/bnr/rates
  → { date, published_at, rates: { EUR: "5.0987", USD: "4.3229", ... },
      cached: bool, fetched_at: ISO8601 }

GET /api/v1/bnr/rates?pair=EUR-RON
  → { pair: "EUR-RON", rate: "5.0987", date, cached, fetched_at }

Query params
  - pair: optional, one of `<CCY>-RON` (e.g. "EUR-RON", "USD-RON"). When set,
    returns just the single pair instead of the full rate table.
  - refresh: optional bool, forces a live BNR fetch and repopulates cache.
"""
from __future__ import annotations

from decimal import Decimal
from typing import Any

import httpx
from fastapi import APIRouter, HTTPException, Query

from app.services import bnr

router = APIRouter(prefix="/bnr", tags=["bnr"])


def _decimal_dict_to_str(rates: dict[str, Decimal]) -> dict[str, str]:
    return {ccy: str(v) for ccy, v in rates.items()}


@router.get("/rates")
def get_rates(
    pair: str | None = Query(
        default=None,
        description="Optional pair e.g. 'EUR-RON'. Must end in '-RON' (BNR quotes rates vs RON).",
    ),
    refresh: bool = Query(default=False, description="Force live fetch, bypass cache."),
) -> dict[str, Any]:
    try:
        data = bnr.get_rates(force_refresh=refresh)
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=502, detail=f"BNR upstream error: {exc}") from exc
    except ValueError as exc:
        raise HTTPException(status_code=502, detail=f"BNR parse error: {exc}") from exc

    rates: dict[str, Decimal] = data["rates"]

    if pair:
        normalized = pair.upper().strip()
        if not normalized.endswith("-RON"):
            raise HTTPException(
                status_code=400,
                detail="pair must end in '-RON' (BNR quotes all rates against RON)",
            )
        ccy = normalized.removesuffix("-RON")
        if ccy not in rates:
            raise HTTPException(
                status_code=404,
                detail=f"currency '{ccy}' not found in BNR feed",
            )
        return {
            "pair": normalized,
            "rate": str(rates[ccy]),
            "date": data["date"],
            "published_at": data["published_at"],
            "cached": data["cached"],
            "stale": data.get("stale", False),
            "fetched_at": data["fetched_at"],
        }

    return {
        "date": data["date"],
        "published_at": data["published_at"],
        "rates": _decimal_dict_to_str(rates),
        "cached": data["cached"],
        "stale": data.get("stale", False),
        "fetched_at": data["fetched_at"],
    }
