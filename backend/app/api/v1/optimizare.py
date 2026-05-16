from decimal import Decimal

from fastapi import APIRouter
from pydantic import Field

from app.api.v1.schemas import APIModel, CreditTermsRequest
from app.finance.optimizare import OptimizareInput, simulate_optimizare

router = APIRouter(prefix="/optimizare", tags=["optimizare"])


class OptimizareRequest(CreditTermsRequest):
    monthly_extra: Decimal = Field(..., gt=0)
    investment_annual_return: Decimal = Field(Decimal("0.07"), ge=0, le=1)
    investment_tax_rate: Decimal = Field(Decimal("0.10"), ge=0, le=1)


class YearPointResponse(APIModel):
    year: int
    scenario_a_interest_saved: Decimal
    scenario_a_balance: Decimal
    scenario_b_investment_value: Decimal
    scenario_b_gain_net: Decimal
    scenario_b_balance: Decimal
    delta_b_minus_a: Decimal


class OptimizareResponse(APIModel):
    standard_monthly_payment: Decimal
    scenario_a_total_interest: Decimal
    scenario_a_months_to_close: int
    scenario_b_total_interest: Decimal
    scenario_b_final_investment_net: Decimal
    scenario_b_gain_net: Decimal
    interest_saved_by_prepay: Decimal
    crossover_year: int | None
    recommended: str
    yearly: list[YearPointResponse]


@router.post("/simulate", response_model=OptimizareResponse)
def simulate(req: OptimizareRequest) -> OptimizareResponse:
    result = simulate_optimizare(OptimizareInput(**req.model_dump()))
    return OptimizareResponse.model_validate(result)
