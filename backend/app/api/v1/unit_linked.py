from decimal import Decimal

import sentry_sdk
from fastapi import APIRouter
from pydantic import Field, field_validator, model_validator

from app.api.v1.schemas import APIModel
from app.finance.unit_linked import (
    UnitLinkedInput,
    UnitLinkedMonteCarloInput,
    simulate_unit_linked,
    simulate_unit_linked_monte_carlo,
)

router = APIRouter(prefix="/unit-linked", tags=["unit-linked"])


class UnitLinkedRequest(APIModel):
    initial_contribution: Decimal = Field(Decimal("0"), ge=0)
    monthly_premium: Decimal = Field(..., ge=0)
    months: int = Field(..., gt=0, le=720)
    premium_start_month: int = Field(1, gt=0, le=720)
    annual_return: Decimal = Field(Decimal("0.06"), ge=-1, le=1)
    allocation_fee_low_pct: Decimal = Field(Decimal("0.05"), ge=0, le=1)
    allocation_fee_high_pct: Decimal = Field(Decimal("0.025"), ge=0, le=1)
    allocation_threshold: Decimal = Field(Decimal("6000"), ge=0)
    fixed_insurance_fee: Decimal = Field(Decimal("13.5"), ge=0)
    initial_units_months: int = Field(24, ge=0, le=720)
    initial_expense_recovery_annual_pct: Decimal = Field(Decimal("0.03"), ge=0, le=1)
    admin_fee_annual_pct: Decimal = Field(Decimal("0.0129"), ge=0, le=1)
    holding_tax: Decimal = Field(Decimal("0.10"), ge=0, le=1)


class UnitLinkedRowResponse(APIModel):
    month: int
    gross_premium: Decimal
    fixed_fee: Decimal
    allocation_fee: Decimal
    invested_amount: Decimal
    initial_units_balance: Decimal
    accumulation_units_balance: Decimal
    admin_fee_effect: Decimal
    expense_recovery_fee: Decimal
    gross_return: Decimal
    closing_balance: Decimal


class UnitLinkedResponse(APIModel):
    schedule: list[UnitLinkedRowResponse]
    total_premiums: Decimal
    total_invested: Decimal
    total_fixed_fees: Decimal
    total_allocation_fees: Decimal
    total_expense_recovery_fees: Decimal
    total_fee_drag: Decimal
    gross_value_final: Decimal
    tax: Decimal
    net_value_final: Decimal
    net_gain: Decimal
    cagr_net: Decimal


class UnitLinkedMonteCarloRequest(APIModel):
    initial_contribution: Decimal = Field(Decimal("0"), ge=0)
    monthly_premium: Decimal = Field(..., ge=0)
    months: int = Field(..., gt=0, le=720)
    premium_start_month: int = Field(1, gt=0, le=720)
    monthly_returns: list[Decimal] = Field(..., min_length=1)
    monthly_return_dates: list[str] | None = None
    allocation_fee_low_pct: Decimal = Field(Decimal("0.05"), ge=0, le=1)
    allocation_fee_high_pct: Decimal = Field(Decimal("0.025"), ge=0, le=1)
    allocation_threshold: Decimal = Field(Decimal("6000"), ge=0)
    fixed_insurance_fee: Decimal = Field(Decimal("13.5"), ge=0)
    initial_units_months: int = Field(24, ge=0, le=720)
    initial_expense_recovery_annual_pct: Decimal = Field(Decimal("0.03"), ge=0, le=1)
    admin_fee_annual_pct: Decimal = Field(Decimal("0.0129"), ge=0, le=1)
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
    def validate_monthly_return_dates(self) -> "UnitLinkedMonteCarloRequest":
        if self.monthly_return_dates is not None and len(self.monthly_return_dates) != len(
            self.monthly_returns
        ):
            raise ValueError("monthly_return_dates must match monthly_returns length")
        if self.initial_contribution <= 0 and self.monthly_premium <= 0:
            raise ValueError("initial_contribution or monthly_premium must be > 0")
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


class UnitLinkedMonteCarloResponse(APIModel):
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
    total_fee_drag_median: float
    crisis_scenarios: list[MonteCarloCrisisScenarioResponse]


@router.post("/simulate", response_model=UnitLinkedResponse)
def simulate(req: UnitLinkedRequest) -> UnitLinkedResponse:
    result = simulate_unit_linked(UnitLinkedInput(**req.model_dump()))
    return UnitLinkedResponse.model_validate(result)


@router.post("/monte-carlo", response_model=UnitLinkedMonteCarloResponse)
def simulate_monte_carlo(req: UnitLinkedMonteCarloRequest) -> UnitLinkedMonteCarloResponse:
    sentry_sdk.add_breadcrumb(
        category="unit_linked.monte_carlo",
        message="simulate unit-linked monte carlo",
        level="info",
        data={
            "months": req.months,
            "iterations": req.iterations,
            "block_size": req.block_size,
            "history_months": len(req.monthly_returns),
            "has_target": req.target_value is not None,
        },
    )
    result = simulate_unit_linked_monte_carlo(UnitLinkedMonteCarloInput(**req.model_dump()))
    return UnitLinkedMonteCarloResponse.model_validate(result)
