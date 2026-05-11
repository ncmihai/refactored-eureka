from decimal import Decimal

from fastapi import APIRouter
from pydantic import BaseModel, Field

from app.finance.depozit import CapitalizationMode, DepozitInput, simulate_depozit
from app.finance.investitii import InvestitieInput, simulate_investitie
from app.finance.unit_linked import UnitLinkedInput, simulate_unit_linked

router = APIRouter(prefix="/comparator", tags=["comparator"])


class ComparatorRequest(BaseModel):
    principal: Decimal = Field(..., ge=0)
    monthly_contribution: Decimal = Field(Decimal("0"), ge=0)
    months: int = Field(..., gt=0, le=720)
    deposit_annual_rate: Decimal = Field(Decimal("0.05"), ge=0, le=1)
    deposit_tax_rate: Decimal = Field(Decimal("0.10"), ge=0, le=1)
    etf_annual_return: Decimal = Field(Decimal("0.07"), ge=-1, le=1)
    etf_ter: Decimal = Field(Decimal("0.0022"), ge=0, le=1)
    etf_broker_fee_pct: Decimal = Field(Decimal("0.001"), ge=0, le=1)
    etf_broker_fee_fixed: Decimal = Field(Decimal("0"), ge=0)
    ul_annual_return: Decimal = Field(Decimal("0.06"), ge=-1, le=1)
    ul_fixed_insurance_fee: Decimal = Field(Decimal("13.5"), ge=0)
    ul_allocation_fee_low_pct: Decimal = Field(Decimal("0.05"), ge=0, le=1)
    ul_allocation_fee_high_pct: Decimal = Field(Decimal("0.025"), ge=0, le=1)
    ul_admin_fee_annual_pct: Decimal = Field(Decimal("0.0129"), ge=0, le=1)
    holding_tax: Decimal = Field(Decimal("0.10"), ge=0, le=1)


class ComparatorSeriesPoint(BaseModel):
    month: int
    deposit: Decimal
    etf: Decimal
    unit_linked: Decimal


class ComparatorProductSummary(BaseModel):
    final_value_net: Decimal
    total_contributed: Decimal
    total_fees: Decimal
    net_gain: Decimal
    cagr_net: Decimal


class ComparatorResponse(BaseModel):
    deposit: ComparatorProductSummary
    etf: ComparatorProductSummary
    unit_linked: ComparatorProductSummary
    leader: str
    series: list[ComparatorSeriesPoint]


@router.post("/simulate", response_model=ComparatorResponse)
def simulate(req: ComparatorRequest) -> ComparatorResponse:
    deposit = simulate_depozit(
        DepozitInput(
            principal=req.principal,
            months=req.months,
            annual_rate=req.deposit_annual_rate,
            monthly_contribution=req.monthly_contribution,
            tax_rate=req.deposit_tax_rate,
            capitalization=CapitalizationMode.MONTHLY,
        )
    )
    etf = simulate_investitie(
        InvestitieInput(
            principal=req.principal,
            months=req.months,
            monthly_contribution=req.monthly_contribution,
            annual_return=req.etf_annual_return,
            ter=req.etf_ter,
            broker_fee_pct=req.etf_broker_fee_pct,
            broker_fee_fixed=req.etf_broker_fee_fixed,
            holding_tax=req.holding_tax,
        )
    )
    unit_linked = simulate_unit_linked(
        UnitLinkedInput(
            initial_contribution=req.principal,
            monthly_premium=req.monthly_contribution,
            premium_start_month=2,
            months=req.months,
            annual_return=req.ul_annual_return,
            fixed_insurance_fee=req.ul_fixed_insurance_fee,
            allocation_fee_low_pct=req.ul_allocation_fee_low_pct,
            allocation_fee_high_pct=req.ul_allocation_fee_high_pct,
            admin_fee_annual_pct=req.ul_admin_fee_annual_pct,
            holding_tax=req.holding_tax,
        )
    )

    final_values = {
        "deposit": deposit.final_balance,
        "etf": etf.net_value_final,
        "unit_linked": unit_linked.net_value_final,
    }
    leader = max(final_values, key=lambda key: final_values[key])

    series = [
        ComparatorSeriesPoint(
            month=month,
            deposit=deposit.schedule[month - 1].closing_balance,
            etf=etf.schedule[month - 1].closing_balance,
            unit_linked=unit_linked.schedule[month - 1].closing_balance,
        )
        for month in range(1, req.months + 1)
    ]

    return ComparatorResponse(
        deposit=ComparatorProductSummary(
            final_value_net=deposit.final_balance,
            total_contributed=deposit.total_contributions,
            total_fees=deposit.total_tax,
            net_gain=deposit.final_balance - deposit.total_contributions,
            cagr_net=deposit.effective_annual_yield_net,
        ),
        etf=ComparatorProductSummary(
            final_value_net=etf.net_value_final,
            total_contributed=etf.total_contributions_gross,
            total_fees=etf.total_broker_fees + etf.tax,
            net_gain=etf.net_gain,
            cagr_net=etf.cagr_net,
        ),
        unit_linked=ComparatorProductSummary(
            final_value_net=unit_linked.net_value_final,
            total_contributed=unit_linked.total_premiums,
            total_fees=unit_linked.total_fee_drag + unit_linked.tax,
            net_gain=unit_linked.net_gain,
            cagr_net=unit_linked.cagr_net,
        ),
        leader=leader,
        series=series,
    )
