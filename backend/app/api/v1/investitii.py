from decimal import Decimal

from fastapi import APIRouter
from pydantic import BaseModel, Field, field_validator

from app.finance.investitii import (
    InvestitieInput,
    MonteCarloInput,
    simulate_investitie,
    simulate_investitie_monte_carlo,
)

router = APIRouter(prefix="/investitii", tags=["investitii"])


class InvestitieRequest(BaseModel):
    principal: Decimal = Field(..., ge=0)
    months: int = Field(..., gt=0, le=720)
    monthly_contribution: Decimal = Field(Decimal("0"), ge=0)
    annual_return: Decimal = Field(..., ge=-1, le=1)
    ter: Decimal = Field(Decimal("0.002"), ge=0, le=1)
    broker_fee_pct: Decimal = Field(Decimal("0"), ge=0, le=1)
    broker_fee_fixed: Decimal = Field(Decimal("0"), ge=0)
    holding_tax: Decimal = Field(Decimal("0.10"), ge=0, le=1)


class InvestitieRowResponse(BaseModel):
    month: int
    opening_balance: Decimal
    contribution_gross: Decimal
    broker_fee: Decimal
    contribution_net: Decimal
    gross_return: Decimal
    closing_balance: Decimal


class InvestitieResponse(BaseModel):
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


class MonteCarloRequest(BaseModel):
    principal: Decimal = Field(..., ge=0)
    months: int = Field(..., gt=0, le=720)
    monthly_contribution: Decimal = Field(Decimal("0"), ge=0)
    monthly_returns: list[Decimal] = Field(..., min_length=1)
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


class MonteCarloPercentileResponse(BaseModel):
    month: int
    p10: float
    p25: float
    p50: float
    p75: float
    p90: float


class MonteCarloDistributionResponse(BaseModel):
    p10: float
    p25: float
    p50: float
    p75: float
    p90: float


class MonteCarloResponse(BaseModel):
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


@router.post("/simulate", response_model=InvestitieResponse)
def simulate(req: InvestitieRequest) -> InvestitieResponse:
    result = simulate_investitie(InvestitieInput(**req.model_dump()))
    return InvestitieResponse(
        schedule=[InvestitieRowResponse(**row.__dict__) for row in result.schedule],
        total_contributions_gross=result.total_contributions_gross,
        total_contributions_net=result.total_contributions_net,
        total_broker_fees=result.total_broker_fees,
        gross_value_final=result.gross_value_final,
        gross_gain=result.gross_gain,
        tax=result.tax,
        net_value_final=result.net_value_final,
        net_gain=result.net_gain,
        cagr_net=result.cagr_net,
        effective_annual_return=result.effective_annual_return,
    )


@router.post("/monte-carlo", response_model=MonteCarloResponse)
def simulate_monte_carlo(req: MonteCarloRequest) -> MonteCarloResponse:
    result = simulate_investitie_monte_carlo(MonteCarloInput(**req.model_dump()))
    return MonteCarloResponse(
        percentiles=[
            MonteCarloPercentileResponse(**row.__dict__) for row in result.percentiles
        ],
        final_distribution=MonteCarloDistributionResponse(**result.final_distribution.__dict__),
        probability_of_loss=result.probability_of_loss,
        probability_target_reached=result.probability_target_reached,
        cagr_median_net=result.cagr_median_net,
        annualized_volatility_median=result.annualized_volatility_median,
        sharpe_median=result.sharpe_median,
        max_drawdown_median=result.max_drawdown_median,
        iterations=result.iterations,
        block_size=result.block_size,
        months=result.months,
        seed=result.seed,
        total_contributions_gross=result.total_contributions_gross,
        total_contributions_net=result.total_contributions_net,
        total_broker_fees=result.total_broker_fees,
    )
