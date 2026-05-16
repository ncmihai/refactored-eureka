"""Motor determinist pentru produse Unit-Linked.

Model MVP: primă lunară + contribuție inițială opțională, taxă fixă de
asigurare, taxă de alocare, bucket-uri de unități inițiale/acumulare,
recuperare cheltuieli inițiale pe bucket-ul inițial și taxă administrare
program dedusă din randamentul lunar.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from decimal import Decimal, getcontext
from math import sqrt

import numpy as np
from numpy.typing import NDArray

from .common import annualized_return, tax_on_positive_gain
from .investitii import (
    CRISIS_SCENARIOS,
    MonteCarloCrisisPoint,
    MonteCarloCrisisScenario,
    MonteCarloDistribution,
    MonteCarloPercentileRow,
    _bootstrap_monthly_returns,
    _max_drawdown_for_path,
    _normalize_month,
    _percentile_row,
    _to_float,
)

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


@dataclass(frozen=True)
class UnitLinkedMonteCarloInput:
    initial_contribution: Decimal = Decimal("0")
    monthly_premium: Decimal = Decimal("0")
    months: int = 1
    premium_start_month: int = 1
    monthly_returns: list[Decimal] = field(default_factory=list)
    monthly_return_dates: list[str] | None = None
    allocation_fee_low_pct: Decimal = Decimal("0.05")
    allocation_fee_high_pct: Decimal = Decimal("0.025")
    allocation_threshold: Decimal = Decimal("6000")
    fixed_insurance_fee: Decimal = Decimal("13.5")
    initial_units_months: int = 24
    initial_expense_recovery_annual_pct: Decimal = Decimal("0.03")
    admin_fee_annual_pct: Decimal = Decimal("0.0129")
    holding_tax: Decimal = Decimal("0.10")
    iterations: int = 10_000
    block_size: int = 12
    seed: int | None = None
    target_value: Decimal | None = None
    risk_free_rate: Decimal = Decimal("0.03")


@dataclass(frozen=True)
class UnitLinkedMonteCarloResult:
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
    total_fee_drag_median: float
    crisis_scenarios: list[MonteCarloCrisisScenario] = field(default_factory=list)


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


def _simulate_unit_linked_paths(
    effective_returns: NDArray[np.float64],
    inp: UnitLinkedMonteCarloInput,
) -> tuple[NDArray[np.float64], float, NDArray[np.float64], NDArray[np.float64], NDArray[np.float64]]:
    if effective_returns.ndim == 1:
        effective_returns = effective_returns.reshape(1, -1)

    path_count = effective_returns.shape[0]
    initial_units = np.zeros(path_count, dtype=np.float64)
    accumulation_units = np.zeros(path_count, dtype=np.float64)
    balances = np.empty_like(effective_returns, dtype=np.float64)

    total_premiums = 0.0
    total_invested = np.zeros(path_count, dtype=np.float64)
    total_fee_drag = np.zeros(path_count, dtype=np.float64)

    allocation_fee_low = _to_float(inp.allocation_fee_low_pct)
    allocation_fee_high = _to_float(inp.allocation_fee_high_pct)
    allocation_threshold = _to_float(inp.allocation_threshold)
    fixed_insurance_fee = _to_float(inp.fixed_insurance_fee)
    expense_recovery_monthly = _to_float(inp.initial_expense_recovery_annual_pct) / 12.0

    for month_index in range(effective_returns.shape[1]):
        month = month_index + 1
        opening_balance = initial_units + accumulation_units
        gross_premium = _to_float(inp.monthly_premium) if month >= inp.premium_start_month else 0.0
        if month == 1:
            gross_premium += _to_float(inp.initial_contribution)
        total_premiums += gross_premium

        fixed_fee = min(fixed_insurance_fee, gross_premium) if gross_premium > 0 else 0.0
        premium_after_fixed = gross_premium - fixed_fee
        allocation_pct = np.where(
            opening_balance <= allocation_threshold,
            allocation_fee_low,
            allocation_fee_high,
        )
        allocation_fee = premium_after_fixed * allocation_pct
        invested_amount = premium_after_fixed - allocation_fee

        if month <= inp.initial_units_months:
            initial_units += invested_amount
        else:
            accumulation_units += invested_amount

        balance_before_growth = initial_units + accumulation_units
        gross_return = balance_before_growth * effective_returns[:, month_index]
        initial_share = np.divide(
            initial_units,
            balance_before_growth,
            out=np.zeros_like(initial_units),
            where=balance_before_growth > 0,
        )

        initial_units += gross_return * initial_share
        accumulation_units += gross_return * (1.0 - initial_share)

        expense_recovery_fee = np.minimum(
            np.maximum(initial_units, 0.0) * expense_recovery_monthly,
            np.maximum(initial_units, 0.0),
        )
        initial_units -= expense_recovery_fee

        balances[:, month_index] = initial_units + accumulation_units
        total_invested += invested_amount
        total_fee_drag += fixed_fee + allocation_fee + expense_recovery_fee

    return balances, total_premiums, total_invested, total_fee_drag, effective_returns


def _unit_linked_crisis_scenarios(
    inp: UnitLinkedMonteCarloInput,
    total_premiums: float,
) -> list[MonteCarloCrisisScenario]:
    if not inp.monthly_return_dates:
        return [
            MonteCarloCrisisScenario(label=label, start_year=year, status="insufficient_history")
            for year, label in CRISIS_SCENARIOS
        ]

    source_returns = np.asarray([_to_float(value) for value in inp.monthly_returns], dtype=np.float64)
    dates = [_normalize_month(value) for value in inp.monthly_return_dates]
    admin_fee_monthly = _to_float(inp.admin_fee_annual_pct) / 12.0
    holding_tax = _to_float(inp.holding_tax)
    years = inp.months / 12.0
    scenarios: list[MonteCarloCrisisScenario] = []

    for start_year, label in CRISIS_SCENARIOS:
        start_index = next(
            (index for index, date in enumerate(dates) if date.startswith(f"{start_year}-")),
            None,
        )
        if start_index is None:
            scenarios.append(
                MonteCarloCrisisScenario(label=label, start_year=start_year, status="insufficient_history")
            )
            continue

        months_available = len(source_returns) - start_index
        if months_available < inp.months:
            scenarios.append(
                MonteCarloCrisisScenario(
                    label=label,
                    start_year=start_year,
                    status="insufficient_horizon",
                    start_date=dates[start_index],
                    months_available=months_available,
                )
            )
            continue

        scenario_returns = (
            source_returns[start_index : start_index + inp.months] - admin_fee_monthly
        ).astype(np.float64)
        balances, scenario_premiums, total_invested, _, _ = _simulate_unit_linked_paths(
            scenario_returns,
            inp,
        )
        path = balances[0]
        final_gross_value = float(path[-1])
        tax = max(0.0, final_gross_value - float(total_invested[0])) * holding_tax
        final_net_value = final_gross_value - tax
        cagr_net = (
            (max(final_net_value, 0.0) / scenario_premiums) ** (1.0 / years) - 1.0
            if scenario_premiums > 0 and years > 0
            else 0.0
        )

        scenarios.append(
            MonteCarloCrisisScenario(
                label=label,
                start_year=start_year,
                status="available",
                start_date=dates[start_index],
                months_available=months_available,
                final_net_value=final_net_value,
                cagr_net=float(cagr_net),
                max_drawdown=_max_drawdown_for_path(path),
                line=[
                    MonteCarloCrisisPoint(month=month + 1, value=float(value))
                    for month, value in enumerate(path)
                ],
            )
        )

    return scenarios


def simulate_unit_linked_monte_carlo(inp: UnitLinkedMonteCarloInput) -> UnitLinkedMonteCarloResult:
    sampled_returns = _bootstrap_monthly_returns(inp)
    admin_fee_monthly = _to_float(inp.admin_fee_annual_pct) / 12.0
    effective_returns: NDArray[np.float64] = (sampled_returns - admin_fee_monthly).astype(np.float64)

    balances, total_premiums, total_invested, total_fee_drag, effective_returns = _simulate_unit_linked_paths(
        effective_returns,
        inp,
    )
    if total_premiums <= 0:
        raise ValueError("total premiums must be > 0")

    final_gross_values = balances[:, -1]
    holding_tax = _to_float(inp.holding_tax)
    taxes = np.maximum(0.0, final_gross_values - total_invested) * holding_tax
    final_net_values = final_gross_values - taxes

    years = inp.months / 12.0
    cagr_values = np.power(
        np.maximum(final_net_values, 0.0) / total_premiums,
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

    return UnitLinkedMonteCarloResult(
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
        probability_of_loss=float(np.mean(final_net_values < total_premiums)),
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
        total_contributions_gross=total_premiums,
        total_contributions_net=float(np.median(total_invested)),
        total_fee_drag_median=float(np.median(total_fee_drag)),
        crisis_scenarios=_unit_linked_crisis_scenarios(inp, total_premiums),
    )
