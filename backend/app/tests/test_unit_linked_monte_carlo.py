from dataclasses import replace
from decimal import Decimal

import pytest

from app.finance.unit_linked import UnitLinkedMonteCarloInput, simulate_unit_linked_monte_carlo

RETURNS = [
    Decimal("0.02"),
    Decimal("-0.01"),
    Decimal("0.015"),
    Decimal("0.005"),
    Decimal("-0.02"),
    Decimal("0.03"),
    Decimal("0.01"),
    Decimal("-0.005"),
    Decimal("0.012"),
    Decimal("0.018"),
    Decimal("-0.015"),
    Decimal("0.022"),
]


def _monthly_dates(start_year: int, start_month: int, count: int) -> list[str]:
    dates: list[str] = []
    year = start_year
    month = start_month
    for _ in range(count):
        dates.append(f"{year:04d}-{month:02d}")
        month += 1
        if month == 13:
            month = 1
            year += 1
    return dates


def _base_input(seed: int | None = 42) -> UnitLinkedMonteCarloInput:
    return UnitLinkedMonteCarloInput(
        initial_contribution=Decimal("1000"),
        monthly_premium=Decimal("300"),
        months=60,
        monthly_returns=RETURNS,
        allocation_fee_low_pct=Decimal("0.05"),
        allocation_fee_high_pct=Decimal("0.025"),
        allocation_threshold=Decimal("6000"),
        fixed_insurance_fee=Decimal("13.5"),
        initial_units_months=24,
        initial_expense_recovery_annual_pct=Decimal("0.03"),
        admin_fee_annual_pct=Decimal("0.0129"),
        holding_tax=Decimal("0.10"),
        iterations=500,
        block_size=6,
        seed=seed,
        target_value=Decimal("25000"),
    )


def test_unit_linked_monte_carlo_output_shape() -> None:
    result = simulate_unit_linked_monte_carlo(_base_input())

    assert len(result.percentiles) == 60
    assert result.iterations == 500
    assert result.block_size == 6
    assert result.months == 60
    assert result.final_distribution.p10 <= result.final_distribution.p50
    assert result.final_distribution.p50 <= result.final_distribution.p90
    assert result.total_fee_drag_median > 0


def test_unit_linked_monte_carlo_seed_is_deterministic() -> None:
    first = simulate_unit_linked_monte_carlo(_base_input(seed=7))
    second = simulate_unit_linked_monte_carlo(_base_input(seed=7))

    assert first.final_distribution == second.final_distribution
    assert first.probability_of_loss == second.probability_of_loss
    assert first.percentiles[12] == second.percentiles[12]


def test_unit_linked_monte_carlo_percentiles_are_monotonic() -> None:
    result = simulate_unit_linked_monte_carlo(_base_input())

    for row in result.percentiles:
        assert row.p10 <= row.p25 <= row.p50 <= row.p75 <= row.p90


def test_unit_linked_monte_carlo_probabilities_are_bounded() -> None:
    result = simulate_unit_linked_monte_carlo(_base_input())

    assert 0 <= result.probability_of_loss <= 1
    assert result.probability_target_reached is not None
    assert 0 <= result.probability_target_reached <= 1


def test_unit_linked_monte_carlo_fee_drag_exceeds_zero_with_fees() -> None:
    result = simulate_unit_linked_monte_carlo(_base_input())

    expected_premiums = Decimal("1000") + Decimal("300") * Decimal("60")
    assert result.total_contributions_gross == pytest.approx(float(expected_premiums))
    assert result.total_contributions_net < result.total_contributions_gross
    assert result.total_fee_drag_median > 0


def test_unit_linked_monte_carlo_crisis_fallback_without_dates() -> None:
    result = simulate_unit_linked_monte_carlo(_base_input())

    assert {item.status for item in result.crisis_scenarios} == {"insufficient_history"}


def test_unit_linked_monte_carlo_crisis_available_when_history_allows() -> None:
    returns = (RETURNS * 20)[:180]
    inp = replace(
        _base_input(),
        months=24,
        monthly_returns=returns,
        monthly_return_dates=_monthly_dates(1928, 1, len(returns)),
    )

    result = simulate_unit_linked_monte_carlo(inp)
    scenario_1929 = next(item for item in result.crisis_scenarios if item.start_year == 1929)

    assert scenario_1929.status == "available"
    assert scenario_1929.start_date == "1929-01"
    assert scenario_1929.final_net_value is not None
    assert scenario_1929.cagr_net is not None
    assert scenario_1929.max_drawdown is not None
    assert len(scenario_1929.line) == 24
