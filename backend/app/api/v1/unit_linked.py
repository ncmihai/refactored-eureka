from decimal import Decimal

from fastapi import APIRouter
from pydantic import Field

from app.api.v1.schemas import APIModel
from app.finance.unit_linked import UnitLinkedInput, simulate_unit_linked

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


@router.post("/simulate", response_model=UnitLinkedResponse)
def simulate(req: UnitLinkedRequest) -> UnitLinkedResponse:
    result = simulate_unit_linked(UnitLinkedInput(**req.model_dump()))
    return UnitLinkedResponse.model_validate(result)
