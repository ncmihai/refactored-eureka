"""Sentry telemetry bootstrap.

Initializes the SDK if `SENTRY_DSN` is configured; otherwise no-op so dev/CI
don't need a DSN. Keep sampling conservative to stay inside the free tier
(5K errors/month, 10K performance spans). Adjust `traces_sample_rate` once
real traffic numbers are known.
"""
from __future__ import annotations

import sentry_sdk
from sentry_sdk.integrations.fastapi import FastApiIntegration
from sentry_sdk.integrations.httpx import HttpxIntegration
from sentry_sdk.integrations.starlette import StarletteIntegration

from app.core.config import settings


def init_sentry() -> bool:
    """Returns True if SDK was initialized, False if skipped (no DSN)."""
    if not settings.sentry_dsn:
        return False

    sentry_sdk.init(
        dsn=settings.sentry_dsn,
        environment=settings.env,
        # Performance: sample 10% of transactions — plenty of signal,
        # safely under the 10K/month free quota at our traffic level.
        traces_sample_rate=0.1,
        # Scrub PII — we don't need client IPs / cookies for financial
        # compute APIs.
        send_default_pii=False,
        # Release tag — set via env on Render (RENDER_GIT_COMMIT) so we
        # can see which commit produced an error.
        release=None,
        integrations=[
            StarletteIntegration(transaction_style="endpoint"),
            FastApiIntegration(transaction_style="endpoint"),
            HttpxIntegration(),
        ],
    )
    return True
