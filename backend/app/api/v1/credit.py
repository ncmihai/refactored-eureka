from decimal import Decimal

from fastapi import APIRouter

from app.api.v1.schemas import APIModel, CreditTermsRequest
from app.finance.credit import CreditInput, PrepaymentMode, simulate_credit

router = APIRouter(prefix="/credit", tags=["credit"])


class CreditRequest(CreditTermsRequest):
    monthly_prepayment: Decimal = Decimal("0")
    prepayment_mode: PrepaymentMode = PrepaymentMode.REDUCE_PERIOD


class AmortizationRowResponse(APIModel):
    month: int
    opening_balance: Decimal
    annuity: Decimal
    principal_paid: Decimal
    interest_paid: Decimal
    fee: Decimal
    total_payment: Decimal
    prepayment: Decimal
    closing_balance: Decimal


class CreditResponse(APIModel):
    schedule: list[AmortizationRowResponse]
    total_interest: Decimal
    total_fees: Decimal
    total_paid: Decimal
    months_to_close: int


@router.post("/simulate", response_model=CreditResponse)
def simulate(req: CreditRequest) -> CreditResponse:
    result = simulate_credit(CreditInput(**req.model_dump()))
    return CreditResponse.model_validate(result)
