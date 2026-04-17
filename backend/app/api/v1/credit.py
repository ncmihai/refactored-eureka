from decimal import Decimal

from fastapi import APIRouter
from pydantic import BaseModel, Field

from app.finance.credit import CreditInput, PrepaymentMode, simulate_credit

router = APIRouter(prefix="/credit", tags=["credit"])


class CreditRequest(BaseModel):
    principal: Decimal = Field(..., gt=0)
    months: int = Field(..., gt=0, le=600)
    annual_rate_initial: Decimal = Field(..., ge=0, le=1)
    annual_rate_after: Decimal | None = Field(None, ge=0, le=1)
    revision_month: int | None = Field(None, gt=0)
    monthly_fee: Decimal = Decimal("0")
    grace_months: int = Field(0, ge=0)
    monthly_prepayment: Decimal = Decimal("0")
    prepayment_mode: PrepaymentMode = PrepaymentMode.REDUCE_PERIOD


class AmortizationRowResponse(BaseModel):
    month: int
    opening_balance: Decimal
    annuity: Decimal
    principal_paid: Decimal
    interest_paid: Decimal
    fee: Decimal
    total_payment: Decimal
    prepayment: Decimal
    closing_balance: Decimal


class CreditResponse(BaseModel):
    schedule: list[AmortizationRowResponse]
    total_interest: Decimal
    total_fees: Decimal
    total_paid: Decimal
    months_to_close: int


@router.post("/simulate", response_model=CreditResponse)
def simulate(req: CreditRequest) -> CreditResponse:
    result = simulate_credit(CreditInput(**req.model_dump()))
    return CreditResponse(
        schedule=[AmortizationRowResponse(**row.__dict__) for row in result.schedule],
        total_interest=result.total_interest,
        total_fees=result.total_fees,
        total_paid=result.total_paid,
        months_to_close=result.months_to_close,
    )
