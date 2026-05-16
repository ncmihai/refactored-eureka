from decimal import Decimal

from fastapi import APIRouter
from pydantic import Field

from app.api.v1.schemas import APIModel
from app.finance.depozit import (
    CapitalizationMode,
    DepozitInput,
    simulate_depozit,
)

router = APIRouter(prefix="/depozit", tags=["depozit"])


class DepozitRequest(APIModel):
    principal: Decimal = Field(..., ge=0)
    months: int = Field(..., gt=0, le=600)
    annual_rate: Decimal = Field(..., ge=0, le=1)
    monthly_contribution: Decimal = Field(Decimal("0"), ge=0)
    tax_rate: Decimal = Field(Decimal("0.10"), ge=0, le=1)
    capitalization: CapitalizationMode = CapitalizationMode.MONTHLY


class DepozitRowResponse(APIModel):
    month: int
    opening_balance: Decimal
    contribution: Decimal
    gross_interest: Decimal
    tax: Decimal
    net_interest: Decimal
    closing_balance: Decimal


class DepozitResponse(APIModel):
    schedule: list[DepozitRowResponse]
    total_contributions: Decimal
    total_gross_interest: Decimal
    total_tax: Decimal
    total_net_interest: Decimal
    final_balance: Decimal
    effective_annual_yield_net: Decimal


@router.post("/simulate", response_model=DepozitResponse)
def simulate(req: DepozitRequest) -> DepozitResponse:
    result = simulate_depozit(DepozitInput(**req.model_dump()))
    return DepozitResponse.model_validate(result)
