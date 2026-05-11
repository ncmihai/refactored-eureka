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
from math import sqrt

import numpy as np
from numpy.typing import NDArray

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


@dataclass(frozen=True)
class MonteCarloInput:
    principal: Decimal
    months: int
    monthly_returns: list[Decimal]
    monthly_contribution: Decimal = Decimal("0")
    ter: Decimal = Decimal("0.002")
    broker_fee_pct: Decimal = Decimal("0")
    broker_fee_fixed: Decimal = Decimal("0")
    holding_tax: Decimal = Decimal("0.10")
    iterations: int = 10_000
    block_size: int = 12
    seed: int | None = None
    target_value: Decimal | None = None
    risk_free_rate: Decimal = Decimal("0.03")


@dataclass(frozen=True)
class MonteCarloPercentileRow:
    month: int
    p10: float
    p25: float
    p50: float
    p75: float
    p90: float


@dataclass(frozen=True)
class MonteCarloDistribution:
    p10: float
    p25: float
    p50: float
    p75: float
    p90: float


@dataclass(frozen=True)
class MonteCarloResult:
    percentiles: list[MonteCarloPercentileRow]
    final_distribution: MonteCarloDistribution
    probability_of_loss: float
    probability_target_reached: float | None
    cagr_median_net: float
    annualized_volatility_median: float
    sharpe_median: float | None
    max_drawdown_median: float
    iterations: int
    block_size: int
    months: int
    seed: int | None
    total_contributions_gross: float
    total_contributions_net: float
    total_broker_fees: float


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


def _to_float(value: Decimal) -> float:
    return float(value)


def _apply_broker_fee_float(amount: float, pct: float, fixed: float) -> tuple[float, float]:
    if amount <= 0:
        return 0.0, 0.0
    fee = amount * pct + fixed
    if fee > amount:
        fee = amount
    return amount - fee, fee


def _bootstrap_monthly_returns(inp: MonteCarloInput) -> NDArray[np.float64]:
    source_returns = np.asarray([_to_float(value) for value in inp.monthly_returns], dtype=np.float64)
    if source_returns.size == 0:
        raise ValueError("monthly_returns must contain at least one value")
    if np.any(source_returns <= -1):
        raise ValueError("monthly_returns cannot contain values <= -1")
    if inp.months <= 0:
        raise ValueError("months must be > 0")
    if inp.iterations <= 0:
        raise ValueError("iterations must be > 0")
    if inp.block_size <= 0:
        raise ValueError("block_size must be > 0")

    rng = np.random.default_rng(inp.seed)
    block_size = min(inp.block_size, int(source_returns.size))
    blocks_needed = int(np.ceil(inp.months / block_size))
    max_start = int(source_returns.size) - block_size
    starts = rng.integers(0, max_start + 1, size=(inp.iterations, blocks_needed))

    sampled = np.empty((inp.iterations, blocks_needed * block_size), dtype=np.float64)
    for block_index in range(blocks_needed):
        offsets = np.arange(block_size)
        sampled[:, block_index * block_size : (block_index + 1) * block_size] = source_returns[
            starts[:, block_index, None] + offsets
        ]

    return sampled[:, : inp.months]


def _percentile_row(month: int, values: NDArray[np.float64]) -> MonteCarloPercentileRow:
    p10, p25, p50, p75, p90 = np.percentile(values, [10, 25, 50, 75, 90])
    return MonteCarloPercentileRow(
        month=month,
        p10=float(p10),
        p25=float(p25),
        p50=float(p50),
        p75=float(p75),
        p90=float(p90),
    )


def simulate_investitie_monte_carlo(inp: MonteCarloInput) -> MonteCarloResult:
    """Historical block-bootstrap Monte Carlo for the ETF cash-flow model.

    `monthly_returns` are decimal monthly returns, e.g. 0.0235 for +2.35%.
    Monthly account paths are gross account values before final exit tax.
    Final distribution is net of holding tax, matching `simulate_investitie`.
    """
    sampled_returns = _bootstrap_monthly_returns(inp)

    ter_monthly = _to_float(inp.ter) / 12.0
    effective_returns = sampled_returns - ter_monthly

    principal = _to_float(inp.principal)
    monthly_contribution = _to_float(inp.monthly_contribution)
    broker_fee_pct = _to_float(inp.broker_fee_pct)
    broker_fee_fixed = _to_float(inp.broker_fee_fixed)

    contribution_gross = np.full(inp.months, monthly_contribution, dtype=np.float64)
    contribution_gross[0] = principal

    contribution_net = np.empty(inp.months, dtype=np.float64)
    broker_fees = np.empty(inp.months, dtype=np.float64)
    for index, amount in enumerate(contribution_gross):
        contribution_net[index], broker_fees[index] = _apply_broker_fee_float(
            float(amount), broker_fee_pct, broker_fee_fixed
        )

    balances = np.empty((inp.iterations, inp.months), dtype=np.float64)
    current = np.zeros(inp.iterations, dtype=np.float64)
    for month_index in range(inp.months):
        current = (current + contribution_net[month_index]) * (1.0 + effective_returns[:, month_index])
        balances[:, month_index] = current

    final_gross_values = balances[:, -1]
    total_contributions_gross = float(np.sum(contribution_gross))
    total_contributions_net = float(np.sum(contribution_net))
    total_broker_fees = float(np.sum(broker_fees))
    holding_tax = _to_float(inp.holding_tax)
    taxes = np.maximum(0.0, final_gross_values - total_contributions_net) * holding_tax
    final_net_values = final_gross_values - taxes

    years = inp.months / 12.0
    cagr_values = np.power(
        np.maximum(final_net_values, 0.0) / total_contributions_gross,
        1.0 / years,
    ) - 1.0

    annualized_volatility = np.std(effective_returns, axis=1, ddof=0) * sqrt(12.0)
    annualized_volatility_median = float(np.median(annualized_volatility))
    cagr_median = float(np.median(cagr_values))
    sharpe = (
        (cagr_median - _to_float(inp.risk_free_rate)) / annualized_volatility_median
        if annualized_volatility_median > 0
        else None
    )

    running_max = np.maximum.accumulate(balances, axis=1)
    drawdowns = np.divide(
        balances,
        running_max,
        out=np.ones_like(balances),
        where=running_max > 0,
    ) - 1.0
    max_drawdown_median = float(np.median(np.min(drawdowns, axis=1)))

    p10, p25, p50, p75, p90 = np.percentile(final_net_values, [10, 25, 50, 75, 90])
    target_value = _to_float(inp.target_value) if inp.target_value is not None else None

    return MonteCarloResult(
        percentiles=[
            _percentile_row(month + 1, balances[:, month]) for month in range(inp.months)
        ],
        final_distribution=MonteCarloDistribution(
            p10=float(p10),
            p25=float(p25),
            p50=float(p50),
            p75=float(p75),
            p90=float(p90),
        ),
        probability_of_loss=float(np.mean(final_net_values < total_contributions_gross)),
        probability_target_reached=(
            float(np.mean(final_net_values >= target_value)) if target_value is not None else None
        ),
        cagr_median_net=cagr_median,
        annualized_volatility_median=annualized_volatility_median,
        sharpe_median=float(sharpe) if sharpe is not None else None,
        max_drawdown_median=max_drawdown_median,
        iterations=inp.iterations,
        block_size=min(inp.block_size, len(inp.monthly_returns)),
        months=inp.months,
        seed=inp.seed,
        total_contributions_gross=total_contributions_gross,
        total_contributions_net=total_contributions_net,
        total_broker_fees=total_broker_fees,
    )
