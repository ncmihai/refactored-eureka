"""Redis cache layer — lazy singleton client.

Backed by Upstash Redis in production (TLS, TCP, same region as Neon).
In dev, defaults to local redis at redis://localhost:6379 — the module is
tolerant of a missing server: calls return None on connection failure so
the API still serves even if redis is down.
"""
from __future__ import annotations

import json
from typing import Any

import redis

from app.core.config import settings

_client: redis.Redis | None = None


def get_client() -> redis.Redis | None:
    """Lazy singleton. Returns None if REDIS_URL is empty (redis disabled)."""
    global _client
    if not settings.redis_url:
        return None
    if _client is None:
        _client = redis.from_url(
            settings.redis_url,
            decode_responses=True,
            socket_timeout=2.0,
            socket_connect_timeout=2.0,
        )
    return _client


def get_json(key: str) -> Any | None:
    """Best-effort cache read. Returns None on miss, connection error, or bad JSON."""
    client = get_client()
    if client is None:
        return None
    try:
        raw = client.get(key)
    except redis.RedisError:
        return None
    if raw is None:
        return None
    try:
        return json.loads(raw)
    except (TypeError, ValueError):
        return None


def set_json(key: str, value: Any, ttl_seconds: int | None = None) -> bool:
    """Best-effort cache write. Returns True on success, False on any failure."""
    client = get_client()
    if client is None:
        return False
    try:
        payload = json.dumps(value, default=str)
        if ttl_seconds:
            client.setex(key, ttl_seconds, payload)
        else:
            client.set(key, payload)
        return True
    except (redis.RedisError, TypeError, ValueError):
        return False


def ping() -> bool:
    """Health probe. Returns True if redis is reachable."""
    client = get_client()
    if client is None:
        return False
    try:
        return bool(client.ping())
    except redis.RedisError:
        return False
