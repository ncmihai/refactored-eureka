"""Tests for BNR integration — XML parsing, caching semantics, endpoint."""
from __future__ import annotations

from decimal import Decimal
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.services import bnr

SAMPLE_XML = (
    b'<?xml version="1.0" encoding="utf-8"?>'
    b'<DataSet xmlns="http://www.bnr.ro/xsd">'
    b"<Header>"
    b"<Publisher>National Bank of Romania</Publisher>"
    b"<PublishingDate>2026-04-17</PublishingDate>"
    b"<MessageType>DR</MessageType>"
    b"</Header>"
    b"<Body>"
    b"<Subject>Reference rates</Subject>"
    b"<OrigCurrency>RON</OrigCurrency>"
    b'<Cube date="2026-04-17">'
    b'<Rate currency="EUR">5.0987</Rate>'
    b'<Rate currency="USD">4.3229</Rate>'
    b'<Rate currency="HUF" multiplier="100">1.4028</Rate>'
    b'<Rate currency="JPY" multiplier="100">2.7184</Rate>'
    b"</Cube>"
    b"</Body>"
    b"</DataSet>"
)


@pytest.fixture(autouse=True)
def _clear_cache() -> None:
    """In-memory fake cache — each test starts clean, bypassing real redis."""
    store: dict[str, object] = {}

    def fake_get(key: str) -> object | None:
        return store.get(key)

    def fake_set(key: str, value: object, ttl_seconds: int | None = None) -> bool:
        store[key] = value
        return True

    with patch("app.core.cache.get_json", side_effect=fake_get), patch(
        "app.core.cache.set_json", side_effect=fake_set
    ):
        yield


def test_parse_normalizes_multiplier() -> None:
    """HUF multiplier=100 → rate should be 1.4028 / 100 = 0.014028 RON per HUF."""
    parsed = bnr._parse_xml(SAMPLE_XML)
    assert parsed["date"] == "2026-04-17"
    assert parsed["published_at"] == "2026-04-17"
    assert parsed["rates"]["EUR"] == Decimal("5.0987")
    assert parsed["rates"]["USD"] == Decimal("4.3229")
    assert parsed["rates"]["HUF"] == Decimal("1.4028") / Decimal(100)
    assert parsed["rates"]["JPY"] == Decimal("2.7184") / Decimal(100)


def test_parse_raises_on_empty_cube() -> None:
    xml = (
        b'<DataSet xmlns="http://www.bnr.ro/xsd">'
        b"<Body><Cube date=\"2026-04-17\"></Cube></Body>"
        b"</DataSet>"
    )
    with pytest.raises(ValueError):
        bnr._parse_xml(xml)


def test_get_rates_cache_miss_then_hit() -> None:
    """First call hits BNR (cached=False); second call returns from cache (cached=True)."""
    with patch("app.services.bnr._fetch_xml", return_value=SAMPLE_XML) as mock_fetch:
        first = bnr.get_rates()
        second = bnr.get_rates()

    assert mock_fetch.call_count == 1  # second call served from cache
    assert first["cached"] is False
    assert second["cached"] is True
    assert first["rates"]["EUR"] == Decimal("5.0987")
    assert second["rates"]["EUR"] == Decimal("5.0987")
    assert first["fetched_at"] == second["fetched_at"]  # cache preserves original timestamp


def test_get_rates_force_refresh_bypasses_cache() -> None:
    with patch("app.services.bnr._fetch_xml", return_value=SAMPLE_XML) as mock_fetch:
        bnr.get_rates()
        bnr.get_rates(force_refresh=True)

    assert mock_fetch.call_count == 2


def test_get_rates_returns_stale_on_upstream_failure() -> None:
    """When BNR is unreachable, stale cache (30d TTL) is served with stale=True."""
    import httpx

    # First call succeeds → populates both fresh + stale caches
    with patch("app.services.bnr._fetch_xml", return_value=SAMPLE_XML):
        first = bnr.get_rates()
    assert first["stale"] is False

    # Expire fresh cache, force refresh; upstream now raises → expect stale fallback
    from app.core import cache as cache_mod
    cache_mod.get_json("bnr:rates:daily")  # no-op; fixture store has both keys
    # Simulate TTL expiry by deleting the fresh key from the fake store
    # (the fake store is a dict mounted by the fixture; we don't have direct
    # access here, so instead we use force_refresh=True to bypass it)
    with patch(
        "app.services.bnr._fetch_xml",
        side_effect=httpx.ConnectError("TLS verify failed"),
    ):
        second = bnr.get_rates(force_refresh=True)

    assert second["stale"] is True
    assert second["rates"]["EUR"] == Decimal("5.0987")


def test_get_rates_raises_when_no_stale_either() -> None:
    import httpx

    with patch(
        "app.services.bnr._fetch_xml",
        side_effect=httpx.ConnectError("cold start, no cache"),
    ):
        with pytest.raises(httpx.ConnectError):
            bnr.get_rates()


def test_endpoint_returns_full_table() -> None:
    client = TestClient(app)
    with patch("app.services.bnr._fetch_xml", return_value=SAMPLE_XML):
        response = client.get("/api/v1/bnr/rates")

    assert response.status_code == 200
    body = response.json()
    assert body["date"] == "2026-04-17"
    assert body["rates"]["EUR"] == "5.0987"
    assert body["rates"]["USD"] == "4.3229"
    assert body["cached"] is False


def test_endpoint_returns_single_pair() -> None:
    client = TestClient(app)
    with patch("app.services.bnr._fetch_xml", return_value=SAMPLE_XML):
        response = client.get("/api/v1/bnr/rates?pair=EUR-RON")

    assert response.status_code == 200
    body = response.json()
    assert body["pair"] == "EUR-RON"
    assert body["rate"] == "5.0987"
    assert body["date"] == "2026-04-17"


def test_endpoint_unknown_currency_returns_404() -> None:
    client = TestClient(app)
    with patch("app.services.bnr._fetch_xml", return_value=SAMPLE_XML):
        response = client.get("/api/v1/bnr/rates?pair=XYZ-RON")

    assert response.status_code == 404


def test_endpoint_malformed_pair_returns_400() -> None:
    client = TestClient(app)
    with patch("app.services.bnr._fetch_xml", return_value=SAMPLE_XML):
        response = client.get("/api/v1/bnr/rates?pair=EUR-USD")

    assert response.status_code == 400
    assert "RON" in response.json()["detail"]


def test_endpoint_refresh_param_forces_live_fetch() -> None:
    client = TestClient(app)
    with patch("app.services.bnr._fetch_xml", return_value=SAMPLE_XML) as mock_fetch:
        client.get("/api/v1/bnr/rates")  # populates cache
        response = client.get("/api/v1/bnr/rates?refresh=true")

    assert mock_fetch.call_count == 2
    assert response.status_code == 200
    assert response.json()["cached"] is False
