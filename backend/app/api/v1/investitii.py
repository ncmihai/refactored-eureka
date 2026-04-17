from decimal import Decimal

from fastapi import APIRouter
from pydantic import BaseModel, Field

from app.finance.investitii import (
    InvestitieInput,
    simulate_investitie,
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
