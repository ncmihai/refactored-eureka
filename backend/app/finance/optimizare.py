"""Optimizare Credit — compară două scenarii pentru o sumă lunară disponibilă:
    A) Rambursare anticipată (reduce perioada creditului).
    B) Plata ratei standard + investire paralelă la rată medie anuală.

Obiectiv: punctul de crossover (anul în care investiția egalează/depășește
câștigul din dobânda economisită), plus recomandarea B vs A pe un orizont dat.

Referință: Instrumentar ACTUALIZAT.xlsx, foaia „Optimizare credit".
"""

from __future__ import annotations

from dataclasses import dataclass, field
from decimal import Decimal, getcontext

from .credit import (
    CreditInput,
    PrepaymentMode,
    simulate_credit,
)

getcontext().prec = 28


@dataclass
class OptimizareInput:
    principal: Decimal
    months: int
    annual_rate_initial: Decimal
    annual_rate_after: Decimal | None = None
    revision_month: int | None = None
    monthly_fee: Decimal = Decimal("0")
    grace_months: int = 0
    monthly_extra: Decimal = Decimal("0")
    investment_annual_return: Decimal = Decimal("0.07")
    investment_tax_rate: Decimal = Decimal("0.10")


@dataclass
class YearPoint:
    year: int
    scenario_a_interest_saved: Decimal
    scenario_a_balance: Decimal
    scenario_b_investment_value: Decimal
    scenario_b_balance: Decimal
    delta_b_minus_a: Decimal


@dataclass
class OptimizareResult:
    standard_monthly_payment: Decimal
    scenario_a_total_interest: Decimal
    scenario_a_months_to_close: int
    scenario_b_total_interest: Decimal
    scenario_b_final_investment_net: Decimal
    interest_saved_by_prepay: Decimal
    crossover_year: int | None
    recommended: str
    yearly: list[YearPoint] = field(default_factory=list)


def _invest_monthly(
    months: int,
    monthly_contribution: Decimal,
    annual_return: Decimal,
) -> list[Decimal]:
    """Returnează valoarea portofoliului la sfârșitul fiecărei luni."""
    monthly_return = annual_return / Decimal("12")
    value = Decimal("0")
    values: list[Decimal] = []
    for _ in range(months):
        value = value * (Decimal("1") + monthly_return) + monthly_contribution
        values.append(value)
    return values


def simulate_optimizare(inp: OptimizareInput) -> OptimizareResult:
    base_credit = CreditInput(
        principal=inp.principal,
        months=inp.months,
        annual_rate_initial=inp.annual_rate_initial,
        annual_rate_after=inp.annual_rate_after,
        revision_month=inp.revision_month,
        monthly_fee=inp.monthly_fee,
        grace_months=inp.grace_months,
        monthly_prepayment=Decimal("0"),
        prepayment_mode=PrepaymentMode.REDUCE_PERIOD,
    )
    base = simulate_credit(base_credit)

    scenario_a_credit = CreditInput(
        principal=inp.principal,
        months=inp.months,
        annual_rate_initial=inp.annual_rate_initial,
        annual_rate_after=inp.annual_rate_after,
        revision_month=inp.revision_month,
        monthly_fee=inp.monthly_fee,
        grace_months=inp.grace_months,
        monthly_prepayment=inp.monthly_extra,
        prepayment_mode=PrepaymentMode.REDUCE_PERIOD,
    )
    scen_a = simulate_credit(scenario_a_credit)

    interest_saved = base.total_interest - scen_a.total_interest

    invest_values = _invest_monthly(
        inp.months,
        inp.monthly_extra,
        inp.investment_annual_return,
    )

    contributions = inp.monthly_extra * Decimal(inp.months)
    final_gross = invest_values[-1] if invest_values else Decimal("0")
    gain = final_gross - contributions
    tax = gain * inp.investment_tax_rate if gain > 0 else Decimal("0")
    scen_b_net = final_gross - tax

    yearly: list[YearPoint] = []
    crossover_year: int | None = None

    years = (inp.months + 11) // 12
    for y in range(1, years + 1):
        end_month = min(y * 12, inp.months)
        idx = end_month - 1
        a_balance = (
            scen_a.schedule[idx].closing_balance
            if idx < len(scen_a.schedule)
            else Decimal("0")
        )
        base_balance = (
            base.schedule[idx].closing_balance
            if idx < len(base.schedule)
            else Decimal("0")
        )
        a_interest_saved_so_far = sum(
            (base.schedule[m].interest_paid for m in range(end_month)),
            Decimal("0"),
        ) - sum(
            (scen_a.schedule[m].interest_paid for m in range(min(end_month, len(scen_a.schedule)))),
            Decimal("0"),
        )
        b_invest = invest_values[idx]
        b_contrib = inp.monthly_extra * Decimal(end_month)
        b_gain = b_invest - b_contrib
        b_tax = b_gain * inp.investment_tax_rate if b_gain > 0 else Decimal("0")
        b_net = b_invest - b_tax

        delta = b_net - a_interest_saved_so_far
        yearly.append(
            YearPoint(
                year=y,
                scenario_a_interest_saved=a_interest_saved_so_far,
                scenario_a_balance=a_balance,
                scenario_b_investment_value=b_net,
                scenario_b_balance=base_balance,
                delta_b_minus_a=delta,
            )
        )
        if crossover_year is None and delta > 0:
            crossover_year = y

    recommended = "B" if scen_b_net > interest_saved else "A"

    standard_monthly = (
        base.schedule[0].annuity + base.schedule[0].fee
        if base.schedule
        else Decimal("0")
    )

    return OptimizareResult(
        standard_monthly_payment=standard_monthly,
        scenario_a_total_interest=scen_a.total_interest,
        scenario_a_months_to_close=scen_a.months_to_close,
        scenario_b_total_interest=base.total_interest,
        scenario_b_final_investment_net=scen_b_net,
        interest_saved_by_prepay=interest_saved,
        crossover_year=crossover_year,
        recommended=recommended,
        yearly=yearly,
    )
