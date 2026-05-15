from dataclasses import replace
from decimal import Decimal

import pytest

from app.finance.investitii import MonteCarloInput, simulate_investitie_monte_carlo

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


def _base_input(seed: int | None = 42) -> MonteCarloInput:
    return MonteCarloInput(
        principal=Decimal("10000"),
        months=60,
        monthly_contribution=Decimal("300"),
        monthly_returns=RETURNS,
        ter=Decimal("0.002"),
        broker_fee_pct=Decimal("0.001"),
        broker_fee_fixed=Decimal("1"),
        holding_tax=Decimal("0.10"),
        iterations=500,
        block_size=6,
        seed=seed,
        target_value=Decimal("40000"),
    )


def test_monte_carlo_output_shape() -> None:
    result = simulate_investitie_monte_carlo(_base_input())

    assert len(result.percentiles) == 60
    assert result.iterations == 500
    assert result.block_size == 6
    assert result.months == 60
    assert result.final_distribution.p10 <= result.final_distribution.p50
    assert result.final_distribution.p50 <= result.final_distribution.p90


def test_monte_carlo_seed_is_deterministic() -> None:
    first = simulate_investitie_monte_carlo(_base_input(seed=7))
    second = simulate_investitie_monte_carlo(_base_input(seed=7))

    assert first.final_distribution == second.final_distribution
    assert first.probability_of_loss == second.probability_of_loss
    assert first.percentiles[12] == second.percentiles[12]


def test_monte_carlo_different_seed_changes_distribution() -> None:
    first = simulate_investitie_monte_carlo(_base_input(seed=7))
    second = simulate_investitie_monte_carlo(_base_input(seed=8))

    assert first.final_distribution != second.final_distribution


def test_monthly_percentiles_are_monotonic() -> None:
    result = simulate_investitie_monte_carlo(_base_input())

    for row in result.percentiles:
        assert row.p10 <= row.p25 <= row.p50 <= row.p75 <= row.p90


def test_probabilities_are_bounded() -> None:
    result = simulate_investitie_monte_carlo(_base_input())

    assert 0 <= result.probability_of_loss <= 1
    assert result.probability_target_reached is not None
    assert 0 <= result.probability_target_reached <= 1


def test_contributions_and_fees_match_cashflow() -> None:
    inp = _base_input()
    result = simulate_investitie_monte_carlo(inp)

    expected_gross = Decimal("10000") + Decimal("300") * Decimal(inp.months - 1)
    expected_principal_fee = Decimal("10000") * Decimal("0.001") + Decimal("1")
    expected_monthly_fee = Decimal("300") * Decimal("0.001") + Decimal("1")
    expected_fees = expected_principal_fee + expected_monthly_fee * Decimal(inp.months - 1)

    assert result.total_contributions_gross == pytest.approx(float(expected_gross))
    assert result.total_broker_fees == pytest.approx(float(expected_fees))
    assert result.total_contributions_net == pytest.approx(float(expected_gross - expected_fees))


def test_no_target_returns_none_probability() -> None:
    inp = _base_input()
    inp = replace(inp, target_value=None)

    result = simulate_investitie_monte_carlo(inp)
    assert result.probability_target_reached is None


def test_rejects_empty_returns() -> None:
    inp = MonteCarloInput(
        principal=Decimal("1000"),
        months=12,
        monthly_returns=[],
        iterations=10,
    )

    with pytest.raises(ValueError, match="monthly_returns"):
        simulate_investitie_monte_carlo(inp)


def test_short_history_clamps_block_size() -> None:
    inp = MonteCarloInput(
        principal=Decimal("1000"),
        months=12,
        monthly_returns=[Decimal("0.01"), Decimal("-0.01"), Decimal("0.02")],
        iterations=50,
        block_size=12,
        seed=1,
    )

    result = simulate_investitie_monte_carlo(inp)
    assert result.block_size == 3


def test_crisis_scenarios_return_available_lines_when_history_allows() -> None:
    returns = (RETURNS * 20)[:180]
    inp = MonteCarloInput(
        principal=Decimal("1000"),
        months=24,
        monthly_contribution=Decimal("100"),
        monthly_returns=returns,
        monthly_return_dates=_monthly_dates(1928, 1, len(returns)),
        iterations=50,
        block_size=6,
        seed=1,
    )

    result = simulate_investitie_monte_carlo(inp)
    scenario_1929 = next(item for item in result.crisis_scenarios if item.start_year == 1929)

    assert scenario_1929.status == "available"
    assert scenario_1929.start_date == "1929-01"
    assert scenario_1929.final_net_value is not None
    assert scenario_1929.cagr_net is not None
    assert scenario_1929.max_drawdown is not None
    assert len(scenario_1929.line) == 24


def test_crisis_scenarios_report_missing_dates() -> None:
    inp = MonteCarloInput(
        principal=Decimal("1000"),
        months=12,
        monthly_returns=RETURNS,
        iterations=50,
        block_size=6,
        seed=1,
    )

    result = simulate_investitie_monte_carlo(inp)

    assert {item.status for item in result.crisis_scenarios} == {"insufficient_history"}


def test_crisis_scenarios_report_insufficient_horizon() -> None:
    returns = (RETURNS * 3)[:30]
    inp = MonteCarloInput(
        principal=Decimal("1000"),
        months=24,
        monthly_returns=returns,
        monthly_return_dates=_monthly_dates(2022, 1, len(returns)),
        iterations=50,
        block_size=6,
        seed=1,
    )

    result = simulate_investitie_monte_carlo(inp)
    scenario_2022 = next(item for item in result.crisis_scenarios if item.start_year == 2022)
    assert scenario_2022.status == "available"

    inp_longer_than_history = replace(inp, months=36)
    result_longer = simulate_investitie_monte_carlo(inp_longer_than_history)
    scenario_2022_longer = next(
        item for item in result_longer.crisis_scenarios if item.start_year == 2022
    )

    assert scenario_2022_longer.status == "insufficient_horizon"
    assert scenario_2022_longer.months_available == 30
