from decimal import Decimal

from fastapi import APIRouter
from pydantic import BaseModel, Field

from app.finance.optimizare import OptimizareInput, simulate_optimizare

router = APIRouter(prefix="/optimizare", tags=["optimizare"])


class OptimizareRequest(BaseModel):
    principal: Decimal = Field(..., gt=0)
    months: int = Field(..., gt=0, le=600)
    annual_rate_initial: Decimal = Field(..., ge=0, le=1)
    annual_rate_after: Decimal | None = Field(None, ge=0, le=1)
    revision_month: int | None = Field(None, gt=0)
    monthly_fee: Decimal = Decimal("0")
    grace_months: int = Field(0, ge=0)
    monthly_extra: Decimal = Field(..., gt=0)
    investment_annual_return: Decimal = Field(Decimal("0.07"), ge=0, le=1)
    investment_tax_rate: Decimal = Field(Decimal("0.10"), ge=0, le=1)


class YearPointResponse(BaseModel):
    year: int
    scenario_a_interest_saved: Decimal
    scenario_a_balance: Decimal
    scenario_b_investment_value: Decimal
    scenario_b_balance: Decimal
    delta_b_minus_a: Decimal


class OptimizareResponse(BaseModel):
    standard_monthly_payment: Decimal
    scenario_a_total_interest: Decimal
    scenario_a_months_to_close: int
    scenario_b_total_interest: Decimal
    scenario_b_final_investment_net: Decimal
    interest_saved_by_prepay: Decimal
    crossover_year: int | None
    recommended: str
    yearly: list[YearPointResponse]


@router.post("/simulate", response_model=OptimizareResponse)
def simulate(req: OptimizareRequest) -> OptimizareResponse:
    result = simulate_optimizare(OptimizareInput(**req.model_dump()))
    return OptimizareResponse(
        standard_monthly_payment=result.standard_monthly_payment,
        scenario_a_total_interest=result.scenario_a_total_interest,
        scenario_a_months_to_close=result.scenario_a_months_to_close,
        scenario_b_total_interest=result.scenario_b_total_interest,
        scenario_b_final_investment_net=result.scenario_b_final_investment_net,
        interest_saved_by_prepay=result.interest_saved_by_prepay,
        crossover_year=result.crossover_year,
        recommended=result.recommended,
        yearly=[YearPointResponse(**y.__dict__) for y in result.yearly],
    )
