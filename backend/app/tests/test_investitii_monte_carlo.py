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
