"""Motor de calcul pentru depozite bancare (termen scurt).

Referință: Instrumentar ACTUALIZAT.xlsx, foaia „Termen Scurt".
Impozit standard RO: 10% pe dobândă (flat).

Capitalizare:
- `monthly`: dobânda se adaugă lunar la sold (efect compus).
- `at_maturity`: dobânda se calculează simplu pe sold, plătită la final.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from decimal import Decimal, getcontext
from enum import Enum

getcontext().prec = 28


class CapitalizationMode(str, Enum):
    MONTHLY = "monthly"
    AT_MATURITY = "at_maturity"


@dataclass
class DepozitInput:
    principal: Decimal
    months: int
    annual_rate: Decimal
    monthly_contribution: Decimal = Decimal("0")
    tax_rate: Decimal = Decimal("0.10")
    capitalization: CapitalizationMode = CapitalizationMode.MONTHLY


@dataclass
class DepozitRow:
    month: int
    opening_balance: Decimal
    contribution: Decimal
    gross_interest: Decimal
    tax: Decimal
    net_interest: Decimal
    closing_balance: Decimal


@dataclass
class DepozitResult:
    schedule: list[DepozitRow] = field(default_factory=list)
    total_contributions: Decimal = Decimal("0")
    total_gross_interest: Decimal = Decimal("0")
    total_tax: Decimal = Decimal("0")
    total_net_interest: Decimal = Decimal("0")
    final_balance: Decimal = Decimal("0")
    effective_annual_yield_net: Decimal = Decimal("0")


def simulate_depozit(inp: DepozitInput) -> DepozitResult:
    """Generează evoluția lunară a unui depozit cu contribuții opționale."""
    monthly_rate = inp.annual_rate / Decimal("12")
    balance = inp.principal
    total_contributions = inp.principal
    total_gross = Decimal("0")
    total_tax = Decimal("0")
    schedule: list[DepozitRow] = []

    pending_gross_interest = Decimal("0")

    for month in range(1, inp.months + 1):
        opening = balance
        contribution = inp.monthly_contribution if month > 1 else Decimal("0")
        if contribution > 0:
            balance += contribution
            total_contributions += contribution

        gross = balance * monthly_rate

        if inp.capitalization == CapitalizationMode.MONTHLY:
            tax = gross * inp.tax_rate
            net = gross - tax
            balance += net
            row_gross = gross
            row_tax = tax
            row_net = net
        else:
            pending_gross_interest += gross
            if month == inp.months:
                tax = pending_gross_interest * inp.tax_rate
                net = pending_gross_interest - tax
                balance += net
                row_gross = pending_gross_interest
                row_tax = tax
                row_net = net
            else:
                row_gross = gross
                row_tax = Decimal("0")
                row_net = Decimal("0")
                tax = Decimal("0")

        total_gross += gross
        total_tax += tax if inp.capitalization == CapitalizationMode.MONTHLY or month == inp.months else Decimal("0")

        schedule.append(
            DepozitRow(
                month=month,
                opening_balance=opening,
                contribution=contribution,
                gross_interest=row_gross,
                tax=row_tax,
                net_interest=row_net,
                closing_balance=balance,
            )
        )

    total_net = total_gross - total_tax

    if total_contributions > 0 and inp.months > 0:
        years = Decimal(inp.months) / Decimal("12")
        ratio = (balance / total_contributions) ** (Decimal("1") / years) - Decimal("1")
        effective_yield = ratio
    else:
        effective_yield = Decimal("0")

    return DepozitResult(
        schedule=schedule,
        total_contributions=total_contributions,
        total_gross_interest=total_gross,
        total_tax=total_tax,
        total_net_interest=total_net,
        final_balance=balance,
        effective_annual_yield_net=effective_yield,
    )
