"""Motor determinist pentru produse Unit-Linked.

Model MVP: primă lunară + contribuție inițială opțională, taxă fixă de
asigurare, taxă de alocare, bucket-uri de unități inițiale/acumulare,
recuperare cheltuieli inițiale pe bucket-ul inițial și taxă administrare
program dedusă din randamentul lunar.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from decimal import Decimal, getcontext

from .common import annualized_return, tax_on_positive_gain

getcontext().prec = 28


@dataclass(frozen=True)
class UnitLinkedInput:
    initial_contribution: Decimal
    monthly_premium: Decimal
    months: int
    premium_start_month: int = 1
    annual_return: Decimal = Decimal("0.06")
    allocation_fee_low_pct: Decimal = Decimal("0.05")
    allocation_fee_high_pct: Decimal = Decimal("0.025")
    allocation_threshold: Decimal = Decimal("6000")
    fixed_insurance_fee: Decimal = Decimal("13.5")
    initial_units_months: int = 24
    initial_expense_recovery_annual_pct: Decimal = Decimal("0.03")
    admin_fee_annual_pct: Decimal = Decimal("0.0129")
    holding_tax: Decimal = Decimal("0.10")


@dataclass(frozen=True)
class UnitLinkedRow:
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


@dataclass(frozen=True)
class UnitLinkedResult:
    schedule: list[UnitLinkedRow] = field(default_factory=list)
    total_premiums: Decimal = Decimal("0")
    total_invested: Decimal = Decimal("0")
    total_fixed_fees: Decimal = Decimal("0")
    total_allocation_fees: Decimal = Decimal("0")
    total_expense_recovery_fees: Decimal = Decimal("0")
    total_fee_drag: Decimal = Decimal("0")
    gross_value_final: Decimal = Decimal("0")
    tax: Decimal = Decimal("0")
    net_value_final: Decimal = Decimal("0")
    net_gain: Decimal = Decimal("0")
    cagr_net: Decimal = Decimal("0")


def _allocation_fee_pct(balance: Decimal, inp: UnitLinkedInput) -> Decimal:
    return (
        inp.allocation_fee_low_pct
        if balance <= inp.allocation_threshold
        else inp.allocation_fee_high_pct
    )


def simulate_unit_linked(inp: UnitLinkedInput) -> UnitLinkedResult:
    if inp.months <= 0:
        raise ValueError("months must be > 0")
    if inp.premium_start_month <= 0:
        raise ValueError("premium_start_month must be > 0")
    if inp.initial_units_months < 0:
        raise ValueError("initial_units_months must be >= 0")

    monthly_return = (inp.annual_return - inp.admin_fee_annual_pct) / Decimal("12")
    expense_recovery_monthly = inp.initial_expense_recovery_annual_pct / Decimal("12")

    initial_units_balance = Decimal("0")
    accumulation_units_balance = Decimal("0")
    total_premiums = Decimal("0")
    total_invested = Decimal("0")
    total_fixed_fees = Decimal("0")
    total_allocation_fees = Decimal("0")
    total_expense_recovery_fees = Decimal("0")
    total_fee_drag = Decimal("0")
    schedule: list[UnitLinkedRow] = []

    for month in range(1, inp.months + 1):
        opening_balance = initial_units_balance + accumulation_units_balance
        gross_premium = (
            inp.monthly_premium if month >= inp.premium_start_month else Decimal("0")
        )
        if month == 1:
            gross_premium += inp.initial_contribution

        total_premiums += gross_premium

        fixed_fee = min(inp.fixed_insurance_fee, gross_premium) if gross_premium > 0 else Decimal("0")
        premium_after_fixed = gross_premium - fixed_fee
        allocation_fee_pct = _allocation_fee_pct(opening_balance, inp)
        allocation_fee = premium_after_fixed * allocation_fee_pct
        invested_amount = premium_after_fixed - allocation_fee

        if month <= inp.initial_units_months:
            initial_units_balance += invested_amount
        else:
            accumulation_units_balance += invested_amount

        balance_before_growth = initial_units_balance + accumulation_units_balance
        gross_return = balance_before_growth * monthly_return
        if balance_before_growth > 0:
            initial_share = initial_units_balance / balance_before_growth
        else:
            initial_share = Decimal("0")

        initial_units_balance += gross_return * initial_share
        accumulation_units_balance += gross_return * (Decimal("1") - initial_share)

        expense_recovery_fee = initial_units_balance * expense_recovery_monthly
        expense_recovery_fee = min(expense_recovery_fee, initial_units_balance)
        initial_units_balance -= expense_recovery_fee

        closing_balance = initial_units_balance + accumulation_units_balance

        total_fixed_fees += fixed_fee
        total_allocation_fees += allocation_fee
        total_invested += invested_amount
        total_expense_recovery_fees += expense_recovery_fee
        total_fee_drag += fixed_fee + allocation_fee + expense_recovery_fee

        schedule.append(
            UnitLinkedRow(
                month=month,
                gross_premium=gross_premium,
                fixed_fee=fixed_fee,
                allocation_fee=allocation_fee,
                invested_amount=invested_amount,
                initial_units_balance=initial_units_balance,
                accumulation_units_balance=accumulation_units_balance,
                admin_fee_effect=balance_before_growth * (inp.admin_fee_annual_pct / Decimal("12")),
                expense_recovery_fee=expense_recovery_fee,
                gross_return=gross_return,
                closing_balance=closing_balance,
            )
        )

    gross_value = initial_units_balance + accumulation_units_balance
    gross_gain = gross_value - total_invested
    tax = tax_on_positive_gain(gross_gain, inp.holding_tax)
    net_value = gross_value - tax
    net_gain = net_value - total_premiums

    return UnitLinkedResult(
        schedule=schedule,
        total_premiums=total_premiums,
        total_invested=total_invested,
        total_fixed_fees=total_fixed_fees,
        total_allocation_fees=total_allocation_fees,
        total_expense_recovery_fees=total_expense_recovery_fees,
        total_fee_drag=total_fee_drag,
        gross_value_final=gross_value,
        tax=tax,
        net_value_final=net_value,
        net_gain=net_gain,
        cagr_net=annualized_return(net_value, total_premiums, inp.months),
    )
