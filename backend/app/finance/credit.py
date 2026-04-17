"""Motor de calcul pentru credite — anuități constante, revizuire dobândă, rambursare anticipată.

Referință: Instrumentar ACTUALIZAT.xlsx, foaia "Credit".
Paritate cerută: 0.01 unitate monedă pentru fiecare rând al scadențarului.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from decimal import Decimal, getcontext
from enum import Enum

getcontext().prec = 28


class PrepaymentMode(str, Enum):
    REDUCE_PERIOD = "reduce_period"
    REDUCE_RATE = "reduce_rate"


@dataclass
class CreditInput:
    principal: Decimal
    months: int
    annual_rate_initial: Decimal
    annual_rate_after: Decimal | None = None
    revision_month: int | None = None
    monthly_fee: Decimal = Decimal("0")
    grace_months: int = 0
    monthly_prepayment: Decimal = Decimal("0")
    prepayment_mode: PrepaymentMode = PrepaymentMode.REDUCE_PERIOD


@dataclass
class AmortizationRow:
    month: int
    opening_balance: Decimal
    annuity: Decimal
    principal_paid: Decimal
    interest_paid: Decimal
    fee: Decimal
    total_payment: Decimal
    prepayment: Decimal
    closing_balance: Decimal


@dataclass
class CreditResult:
    schedule: list[AmortizationRow] = field(default_factory=list)
    total_interest: Decimal = Decimal("0")
    total_fees: Decimal = Decimal("0")
    total_paid: Decimal = Decimal("0")
    months_to_close: int = 0


def _annuity(principal: Decimal, monthly_rate: Decimal, months: int) -> Decimal:
    """Formula anuității constante: A = P * r(1+r)^n / ((1+r)^n - 1)."""
    if monthly_rate == 0:
        return principal / Decimal(months)
    one_plus_r_n = (Decimal("1") + monthly_rate) ** months
    return principal * (monthly_rate * one_plus_r_n) / (one_plus_r_n - Decimal("1"))


def simulate_credit(inp: CreditInput) -> CreditResult:
    """Generează scadențarul lunar al unui credit cu anuități constante.

    Suportă:
    - Perioadă fixă + revizuire la luna N (rata standard românească fix → IRCC).
    - Perioadă de grație (se plătește doar dobânda).
    - Rambursare anticipată lunară cu mod „reduce perioada" sau „reduce rata".
    - Comision lunar fix.
    """
    rate = inp.annual_rate_initial / Decimal("12")
    annuity = _annuity(inp.principal, rate, inp.months)

    balance = inp.principal
    schedule: list[AmortizationRow] = []
    total_interest = Decimal("0")
    total_fees = Decimal("0")
    total_paid = Decimal("0")

    month = 1
    while balance > Decimal("0") and month <= inp.months * 2:
        if (
            inp.revision_month is not None
            and inp.annual_rate_after is not None
            and month == inp.revision_month + 1
        ):
            rate = inp.annual_rate_after / Decimal("12")
            remaining = inp.months - (month - 1)
            if remaining > 0:
                annuity = _annuity(balance, rate, remaining)

        interest = balance * rate

        if month <= inp.grace_months:
            principal_paid = Decimal("0")
            current_annuity = interest
        else:
            principal_paid = annuity - interest
            current_annuity = annuity

        if month == inp.months or principal_paid >= balance:
            principal_paid = balance
            current_annuity = principal_paid + interest
            new_balance = Decimal("0")
        else:
            new_balance = balance - principal_paid
        prepayment = Decimal("0")

        if inp.monthly_prepayment > 0 and new_balance > 0 and month > inp.grace_months:
            prepayment = min(inp.monthly_prepayment, new_balance)
            new_balance -= prepayment
            if inp.prepayment_mode == PrepaymentMode.REDUCE_RATE and new_balance > 0:
                remaining = inp.months - month
                if remaining > 0:
                    annuity = _annuity(new_balance, rate, remaining)

        row = AmortizationRow(
            month=month,
            opening_balance=balance,
            annuity=current_annuity,
            principal_paid=principal_paid,
            interest_paid=interest,
            fee=inp.monthly_fee,
            total_payment=current_annuity + inp.monthly_fee,
            prepayment=prepayment,
            closing_balance=new_balance,
        )
        schedule.append(row)

        total_interest += interest
        total_fees += inp.monthly_fee
        total_paid += current_annuity + inp.monthly_fee + prepayment
        balance = new_balance
        month += 1

    return CreditResult(
        schedule=schedule,
        total_interest=total_interest,
        total_fees=total_fees,
        total_paid=total_paid,
        months_to_close=len(schedule),
    )
