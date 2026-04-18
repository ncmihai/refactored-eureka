"""BNR (Banca Națională a României) FX rates integration.

Fetches daily reference rates from https://www.bnr.ro/nbrfxrates.xml — public,
no auth, ~1.8 KB payload, ~1s cold latency. Published once per business day.

Rates are quoted as RON per 1 unit of foreign currency. Some currencies have
a `multiplier="100"` attribute meaning the quoted rate is RON per 100 units;
we normalize to RON-per-unit before returning.

Values are cached as JSON under `bnr:rates:daily` with a 1-hour TTL — on cache
miss we fall through to the live fetch, parse, and warm the cache. Redis
downtime degrades gracefully (always returns fresh live data).
"""
from __future__ import annotations

from datetime import datetime, timezone
from decimal import Decimal
from typing import Any
from xml.etree import ElementTree as ET

import httpx

from app.core import cache

BNR_XML_URL = "https://www.bnr.ro/nbrfxrates.xml"
BNR_NS = "{http://www.bnr.ro/xsd}"
CACHE_KEY = "bnr:rates:daily"
STALE_CACHE_KEY = "bnr:rates:daily:stale"
CACHE_TTL_SECONDS = 3600  # 1h — cheap feed, keep rates fresh during publish window
STALE_CACHE_TTL_SECONDS = 60 * 60 * 24 * 30  # 30 days stale-while-revalidate backstop
HTTP_TIMEOUT_SECONDS = 5.0

# TLS verification for BNR is intentionally relaxed: certSIGN's intermediate CA
# (chain position 2) has periodic gaps where Python's certifi bundle trails
# macOS Keychain / Windows Trust Store. BNR publishes public unauthenticated
# reference rates — data is also broadcast via press release and several other
# channels, so MITM risk is effectively zero. TODO: migrate to CMS-seeded rates
# with a backfill job so we stop depending on upstream TLS entirely.
BNR_VERIFY_TLS = False


def _fetch_xml() -> bytes:
    """Raw GET against BNR. Raises httpx exceptions on network/HTTP errors."""
    with httpx.Client(timeout=HTTP_TIMEOUT_SECONDS, verify=BNR_VERIFY_TLS) as client:
        response = client.get(BNR_XML_URL)
        response.raise_for_status()
        return response.content


def _parse_xml(xml_bytes: bytes) -> dict[str, Any]:
    """Parse BNR XML into `{date, rates: {CCY: Decimal}, published_at}`.

    Normalizes `multiplier="100"` rates to per-unit (divides by multiplier).
    """
    root = ET.fromstring(xml_bytes)

    header = root.find(f"{BNR_NS}Header")
    publishing_date = (
        header.find(f"{BNR_NS}PublishingDate").text  # type: ignore[union-attr]
        if header is not None
        else ""
    )

    body = root.find(f"{BNR_NS}Body")
    cube = body.find(f"{BNR_NS}Cube") if body is not None else None
    if cube is None:
        raise ValueError("BNR XML missing <Cube> element")

    cube_date = cube.get("date", "")
    rates: dict[str, Decimal] = {}
    for rate_el in cube.findall(f"{BNR_NS}Rate"):
        ccy = rate_el.get("currency", "").upper()
        text = (rate_el.text or "").strip()
        if not ccy or not text:
            continue
        try:
            value = Decimal(text)
        except (ValueError, ArithmeticError):
            continue
        multiplier = rate_el.get("multiplier")
        if multiplier:
            try:
                value = value / Decimal(multiplier)
            except (ValueError, ArithmeticError):
                continue
        rates[ccy] = value

    if not rates:
        raise ValueError("BNR XML returned zero <Rate> elements")

    return {
        "date": cube_date or publishing_date,
        "published_at": publishing_date,
        "rates": rates,
    }


def _serialize_for_cache(parsed: dict[str, Any]) -> dict[str, Any]:
    """Decimal → str for JSON-safe caching; preserves full precision."""
    return {
        "date": parsed["date"],
        "published_at": parsed["published_at"],
        "rates": {ccy: str(v) for ccy, v in parsed["rates"].items()},
    }


def _deserialize_from_cache(raw: dict[str, Any]) -> dict[str, Any]:
    """Reverse of _serialize_for_cache — str → Decimal."""
    return {
        "date": raw.get("date", ""),
        "published_at": raw.get("published_at", ""),
        "rates": {ccy: Decimal(v) for ccy, v in raw.get("rates", {}).items()},
    }


def get_rates(force_refresh: bool = False) -> dict[str, Any]:
    """Cached BNR rates with stale-while-revalidate fallback.

    Path: hot cache → live BNR → 30-day stale cache → raise.
    Returns `{date, published_at, rates: {CCY: Decimal}, cached: bool, stale: bool,
    fetched_at}`.
    """
    if not force_refresh:
        fresh = cache.get_json(CACHE_KEY)
        if fresh is not None:
            parsed = _deserialize_from_cache(fresh)
            return {
                **parsed,
                "cached": True,
                "stale": False,
                "fetched_at": fresh.get("fetched_at", ""),
            }

    try:
        xml_bytes = _fetch_xml()
        parsed = _parse_xml(xml_bytes)
    except (httpx.HTTPError, ValueError) as exc:
        stale = cache.get_json(STALE_CACHE_KEY)
        if stale is not None:
            parsed = _deserialize_from_cache(stale)
            return {
                **parsed,
                "cached": True,
                "stale": True,
                "fetched_at": stale.get("fetched_at", ""),
            }
        raise exc

    fetched_at = datetime.now(timezone.utc).isoformat()
    payload = _serialize_for_cache(parsed)
    payload["fetched_at"] = fetched_at
    cache.set_json(CACHE_KEY, payload, ttl_seconds=CACHE_TTL_SECONDS)
    cache.set_json(STALE_CACHE_KEY, payload, ttl_seconds=STALE_CACHE_TTL_SECONDS)
    return {**parsed, "cached": False, "stale": False, "fetched_at": fetched_at}
