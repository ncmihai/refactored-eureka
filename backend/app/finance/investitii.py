"""Motor de calcul pentru investiții (ETF / fond de acțiuni) cu SIP + TER.

Model: DCA (dollar-cost averaging) lunar, compunere la finalul lunii.
Randamentul efectiv = randament brut anual − TER (Total Expense Ratio).
Comisionul broker se scade la fiecare contribuție (procentual + fix).
Impozitul se aplică doar la final, pe câștigul realizat (buy-and-hold).

Convenția motorului: contribuția începe din luna 2 (principal investit la luna 1).
"""

from __future__ import annotations

from dataclasses import dataclass, field
from decimal import Decimal, getcontext

getcontext().prec = 28


@dataclass
class InvestitieInput:
    principal: Decimal
    months: int
    monthly_contribution: Decimal = Decimal("0")
    annual_return: Decimal = Decimal("0.07")
    ter: Decimal = Decimal("0.002")
    broker_fee_pct: Decimal = Decimal("0")
    broker_fee_fixed: Decimal = Decimal("0")
    holding_tax: Decimal = Decimal("0.10")


@dataclass
class InvestitieRow:
    month: int
    opening_balance: Decimal
    contribution_gross: Decimal
    broker_fee: Decimal
    contribution_net: Decimal
    gross_return: Decimal
    closing_balance: Decimal


@dataclass
class InvestitieResult:
    schedule: list[InvestitieRow] = field(default_factory=list)
    total_contributions_gross: Decimal = Decimal("0")
    total_contributions_net: Decimal = Decimal("0")
    total_broker_fees: Decimal = Decimal("0")
    gross_value_final: Decimal = Decimal("0")
    gross_gain: Decimal = Decimal("0")
    tax: Decimal = Decimal("0")
    net_value_final: Decimal = Decimal("0")
    net_gain: Decimal = Decimal("0")
    cagr_net: Decimal = Decimal("0")
    effective_annual_return: Decimal = Decimal("0")


def _apply_broker_fee(
    amount: Decimal, pct: Decimal, fixed: Decimal
) -> tuple[Decimal, Decimal]:
    """Returnează (net_investit, fee) după aplicarea comisionului broker."""
    if amount <= 0:
        return Decimal("0"), Decimal("0")
    fee = amount * pct + fixed
    if fee > amount:
        fee = amount
    return amount - fee, fee


def simulate_investitie(inp: InvestitieInput) -> InvestitieResult:
    """Evoluția unei investiții DCA lunar, după TER și impozit la final."""
    effective_annual = inp.annual_return - inp.ter
    monthly_rate = effective_annual / Decimal("12")

    # Luna 1: principal investit, după comision broker
    principal_net, principal_fee = _apply_broker_fee(
        inp.principal, inp.broker_fee_pct, inp.broker_fee_fixed
    )
    balance = principal_net
    total_contrib_gross = inp.principal
    total_contrib_net = principal_net
    total_fees = principal_fee

    schedule: list[InvestitieRow] = []

    for month in range(1, inp.months + 1):
        opening = balance

        if month == 1:
            contrib_gross = inp.principal
            contrib_net = principal_net
            fee = principal_fee
            # principal_net e deja în balance; nu mai adăugăm nimic
            gross_return = balance * monthly_rate
            balance += gross_return
        else:
            contrib_gross = inp.monthly_contribution
            contrib_net, fee = _apply_broker_fee(
                inp.monthly_contribution, inp.broker_fee_pct, inp.broker_fee_fixed
            )
            total_contrib_gross += contrib_gross
            total_contrib_net += contrib_net
            total_fees += fee

            # Contribuția intră la începutul lunii, randamentul se aplică pe soldul nou
            balance += contrib_net
            gross_return = balance * monthly_rate
            balance += gross_return

        schedule.append(
            InvestitieRow(
                month=month,
                opening_balance=opening,
                contribution_gross=contrib_gross,
                broker_fee=fee,
                contribution_net=contrib_net,
                gross_return=gross_return,
                closing_balance=balance,
            )
        )

    gross_value = balance
    gross_gain = gross_value - total_contrib_net
    tax = gross_gain * inp.holding_tax if gross_gain > 0 else Decimal("0")
    net_value = gross_value - tax
    net_gain = net_value - total_contrib_gross

    if total_contrib_gross > 0 and inp.months > 0:
        years = Decimal(inp.months) / Decimal("12")
        cagr = (net_value / total_contrib_gross) ** (Decimal("1") / years) - Decimal("1")
    else:
        cagr = Decimal("0")

    return InvestitieResult(
        schedule=schedule,
        total_contributions_gross=total_contrib_gross,
        total_contributions_net=total_contrib_net,
        total_broker_fees=total_fees,
        gross_value_final=gross_value,
        gross_gain=gross_gain,
        tax=tax,
        net_value_final=net_value,
        net_gain=net_gain,
        cagr_net=cagr,
        effective_annual_return=effective_annual,
    )
