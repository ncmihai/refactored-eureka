from decimal import Decimal

import sentry_sdk
from fastapi import APIRouter
from pydantic import Field, field_validator, model_validator

from app.api.v1.schemas import APIModel
from app.finance.investitii import (
    InvestitieInput,
    MonteCarloInput,
    simulate_investitie,
    simulate_investitie_monte_carlo,
)

router = APIRouter(prefix="/investitii", tags=["investitii"])


class InvestitieRequest(APIModel):
    principal: Decimal = Field(..., ge=0)
    months: int = Field(..., gt=0, le=720)
    monthly_contribution: Decimal = Field(Decimal("0"), ge=0)
    annual_return: Decimal = Field(..., ge=-1, le=1)
    ter: Decimal = Field(Decimal("0.002"), ge=0, le=1)
    broker_fee_pct: Decimal = Field(Decimal("0"), ge=0, le=1)
    broker_fee_fixed: Decimal = Field(Decimal("0"), ge=0)
    holding_tax: Decimal = Field(Decimal("0.10"), ge=0, le=1)


class InvestitieRowResponse(APIModel):
    month: int
    opening_balance: Decimal
    contribution_gross: Decimal
    broker_fee: Decimal
    contribution_net: Decimal
    gross_return: Decimal
    closing_balance: Decimal


class InvestitieResponse(APIModel):
    schedule: list[InvestitieRowResponse]
    total_contributions_gross: Decimal
    total_contributions_net: Decimal
    total_broker_fees: Decimal
    gross_value_final: Decimal
    gross_gain: Decimal
    tax: Decimal
    net_value_final: Decimal
    net_gain: Decimal
    cagr_net: Decimal
    effective_annual_return: Decimal


class MonteCarloRequest(APIModel):
    principal: Decimal = Field(..., ge=0)
    months: int = Field(..., gt=0, le=720)
    monthly_contribution: Decimal = Field(Decimal("0"), ge=0)
    monthly_returns: list[Decimal] = Field(..., min_length=1)
    monthly_return_dates: list[str] | None = None
    ter: Decimal = Field(Decimal("0.002"), ge=0, le=1)
    broker_fee_pct: Decimal = Field(Decimal("0"), ge=0, le=1)
    broker_fee_fixed: Decimal = Field(Decimal("0"), ge=0)
    holding_tax: Decimal = Field(Decimal("0.10"), ge=0, le=1)
    iterations: int = Field(10_000, gt=0, le=50_000)
    block_size: int = Field(12, gt=0, le=120)
    seed: int | None = None
    target_value: Decimal | None = Field(None, ge=0)
    risk_free_rate: Decimal = Field(Decimal("0.03"), ge=-1, le=1)

    @field_validator("monthly_returns")
    @classmethod
    def validate_monthly_returns(cls, value: list[Decimal]) -> list[Decimal]:
        if any(item <= Decimal("-1") for item in value):
            raise ValueError("monthly_returns cannot contain values <= -1")
        return value

    @model_validator(mode="after")
    def validate_monthly_return_dates(self) -> "MonteCarloRequest":
        if self.monthly_return_dates is not None and len(self.monthly_return_dates) != len(
            self.monthly_returns
        ):
            raise ValueError("monthly_return_dates must match monthly_returns length")
        return self


class MonteCarloPercentileResponse(APIModel):
    month: int
    p10: float
    p25: float
    p50: float
    p75: float
    p90: float


class MonteCarloDistributionResponse(APIModel):
    p10: float
    p25: float
    p50: float
    p75: float
    p90: float


class MonteCarloCrisisPointResponse(APIModel):
    month: int
    value: float


class MonteCarloCrisisScenarioResponse(APIModel):
    label: str
    start_year: int
    status: str
    start_date: str | None
    months_available: int
    final_net_value: float | None
    cagr_net: float | None
    max_drawdown: float | None
    line: list[MonteCarloCrisisPointResponse]


class MonteCarloResponse(APIModel):
    percentiles: list[MonteCarloPercentileResponse]
    final_distribution: MonteCarloDistributionResponse
    probability_of_loss: float
    probability_target_reached: float | None
    cagr_median_net: float
    annualized_volatility_median: float
    sharpe_median: float | None
    max_drawdown_median: float
    iterations: int
    block_size: int
    months: int
    seed: int | None
    total_contributions_gross: float
    total_contributions_net: float
    total_broker_fees: float
    crisis_scenarios: list[MonteCarloCrisisScenarioResponse]


@router.post("/simulate", response_model=InvestitieResponse)
def simulate(req: InvestitieRequest) -> InvestitieResponse:
    result = simulate_investitie(InvestitieInput(**req.model_dump()))
    return InvestitieResponse.model_validate(result)


@router.post("/monte-carlo", response_model=MonteCarloResponse)
def simulate_monte_carlo(req: MonteCarloRequest) -> MonteCarloResponse:
    sentry_sdk.add_breadcrumb(
        category="investitii.monte_carlo",
        message="simulate monte carlo",
        level="info",
        data={
            "months": req.months,
            "iterations": req.iterations,
            "block_size": req.block_size,
            "history_months": len(req.monthly_returns),
            "has_target": req.target_value is not None,
        },
    )
    result = simulate_investitie_monte_carlo(MonteCarloInput(**req.model_dump()))
    return MonteCarloResponse.model_validate(result)
