"""Teste de paritate pentru motorul de Depozit Bancar (foaia „Termen Scurt").

Fără foaie Excel fizică — verificăm paritate cu formulele închise
(compound cu impozit lunar, simplu la scadență). Toleranță: 0.01 unități monedă.
"""

from decimal import Decimal

import pytest

from app.finance.depozit import (
    CapitalizationMode,
    DepozitInput,
    simulate_depozit,
)

TOL = Decimal("0.01")


def _close(a: Decimal, b: float | Decimal, tol: Decimal = TOL) -> bool:
    return abs(a - Decimal(str(b))) <= tol


# ---------- Capitalizare lunară ----------


def test_monthly_compound_no_contribution_closed_form() -> None:
    """balance_N = P × (1 + r_net)^N unde r_net = r/12 × (1-tax)."""
    inp = DepozitInput(
        principal=Decimal("10000"),
        months=12,
        annual_rate=Decimal("0.06"),
        monthly_contribution=Decimal("0"),
        tax_rate=Decimal("0.10"),
        capitalization=CapitalizationMode.MONTHLY,
    )
    result = simulate_depozit(inp)

    r_net = inp.annual_rate / Decimal("12") * (Decimal("1") - inp.tax_rate)
    expected = inp.principal * (Decimal("1") + r_net) ** inp.months
    assert _close(result.final_balance, expected)


def test_monthly_compound_with_contribution_closed_form() -> None:
    """cu C în lunile 2..N: balance_N = P×(1+r)^N + C×(1+r)×((1+r)^(N-1)-1)/r."""
    inp = DepozitInput(
        principal=Decimal("5000"),
        months=24,
        annual_rate=Decimal("0.05"),
        monthly_contribution=Decimal("200"),
        tax_rate=Decimal("0.10"),
        capitalization=CapitalizationMode.MONTHLY,
    )
    result = simulate_depozit(inp)

    r = inp.annual_rate / Decimal("12") * (Decimal("1") - inp.tax_rate)
    n = inp.months
    factor = (Decimal("1") + r) ** n
    annuity_sum = (Decimal("1") + r) * ((Decimal("1") + r) ** (n - 1) - Decimal("1")) / r
    expected = inp.principal * factor + inp.monthly_contribution * annuity_sum
    assert _close(result.final_balance, expected)


def test_monthly_mode_row_invariant() -> None:
    """Pentru fiecare rând: closing = opening + contribution + net_interest."""
    inp = DepozitInput(
        principal=Decimal("10000"),
        months=12,
        annual_rate=Decimal("0.06"),
        monthly_contribution=Decimal("100"),
        tax_rate=Decimal("0.10"),
        capitalization=CapitalizationMode.MONTHLY,
    )
    result = simulate_depozit(inp)
    for row in result.schedule:
        computed = row.opening_balance + row.contribution + row.net_interest
        assert _close(row.closing_balance, computed), f"mismatch la luna {row.month}"


def test_monthly_tax_equals_gross_times_rate() -> None:
    """În mod lunar: total_tax == total_gross × tax_rate (exact pe Decimal)."""
    inp = DepozitInput(
        principal=Decimal("15000"),
        months=18,
        annual_rate=Decimal("0.055"),
        monthly_contribution=Decimal("0"),
        tax_rate=Decimal("0.10"),
        capitalization=CapitalizationMode.MONTHLY,
    )
    result = simulate_depozit(inp)
    assert _close(result.total_tax, result.total_gross_interest * inp.tax_rate)


def test_total_net_equals_gross_minus_tax() -> None:
    inp = DepozitInput(
        principal=Decimal("8000"),
        months=12,
        annual_rate=Decimal("0.06"),
        tax_rate=Decimal("0.10"),
        capitalization=CapitalizationMode.MONTHLY,
    )
    result = simulate_depozit(inp)
    assert _close(
        result.total_net_interest,
        result.total_gross_interest - result.total_tax,
    )


# ---------- Capitalizare la scadență ----------


def test_at_maturity_simple_interest_closed_form() -> None:
    """Mod simplu: dobândă_brută = P × r × t; impozit o singură dată la final."""
    inp = DepozitInput(
        principal=Decimal("10000"),
        months=12,
        annual_rate=Decimal("0.05"),
        monthly_contribution=Decimal("0"),
        tax_rate=Decimal("0.10"),
        capitalization=CapitalizationMode.AT_MATURITY,
    )
    result = simulate_depozit(inp)

    years = Decimal(inp.months) / Decimal("12")
    gross = inp.principal * inp.annual_rate * years
    net = gross * (Decimal("1") - inp.tax_rate)
    expected_final = inp.principal + net

    assert _close(result.total_gross_interest, gross)
    assert _close(result.total_tax, gross * inp.tax_rate)
    assert _close(result.final_balance, expected_final)


def test_at_maturity_tax_applied_only_in_last_row() -> None:
    inp = DepozitInput(
        principal=Decimal("5000"),
        months=6,
        annual_rate=Decimal("0.04"),
        tax_rate=Decimal("0.10"),
        capitalization=CapitalizationMode.AT_MATURITY,
    )
    result = simulate_depozit(inp)
    for row in result.schedule[:-1]:
        assert row.tax == Decimal("0"), f"tax neașteptat la luna {row.month}"
        assert row.net_interest == Decimal("0")
    last = result.schedule[-1]
    assert last.tax > Decimal("0")


# ---------- Edge cases ----------


def test_zero_rate_balance_equals_contributions() -> None:
    """Cu dobândă 0: sold final = principal + (months-1) × contribuție (luna 1 nu are contribuție)."""
    inp = DepozitInput(
        principal=Decimal("1000"),
        months=12,
        annual_rate=Decimal("0"),
        monthly_contribution=Decimal("50"),
        tax_rate=Decimal("0.10"),
        capitalization=CapitalizationMode.MONTHLY,
    )
    result = simulate_depozit(inp)
    expected = inp.principal + inp.monthly_contribution * Decimal(inp.months - 1)
    assert _close(result.final_balance, expected)
    assert result.total_gross_interest == Decimal("0")
    assert result.total_tax == Decimal("0")


def test_schedule_length_equals_months() -> None:
    inp = DepozitInput(
        principal=Decimal("1000"),
        months=36,
        annual_rate=Decimal("0.03"),
        capitalization=CapitalizationMode.MONTHLY,
    )
    result = simulate_depozit(inp)
    assert len(result.schedule) == inp.months


def test_month_1_has_no_contribution() -> None:
    """Convenția motorului: contribuția începe din luna 2."""
    inp = DepozitInput(
        principal=Decimal("1000"),
        months=6,
        annual_rate=Decimal("0.05"),
        monthly_contribution=Decimal("100"),
        capitalization=CapitalizationMode.MONTHLY,
    )
    result = simulate_depozit(inp)
    assert result.schedule[0].contribution == Decimal("0")
    for row in result.schedule[1:]:
        assert row.contribution == Decimal("100")


def test_total_contributions_matches_sum() -> None:
    inp = DepozitInput(
        principal=Decimal("2000"),
        months=24,
        annual_rate=Decimal("0.04"),
        monthly_contribution=Decimal("150"),
        capitalization=CapitalizationMode.MONTHLY,
    )
    result = simulate_depozit(inp)
    expected = inp.principal + inp.monthly_contribution * Decimal(inp.months - 1)
    assert _close(result.total_contributions, expected)


def test_effective_yield_matches_definition() -> None:
    """y_eff = (FV / contribuții_totale)^(1/ani) - 1."""
    inp = DepozitInput(
        principal=Decimal("10000"),
        months=24,
        annual_rate=Decimal("0.06"),
        tax_rate=Decimal("0.10"),
        capitalization=CapitalizationMode.MONTHLY,
    )
    result = simulate_depozit(inp)
    years = Decimal(inp.months) / Decimal("12")
    expected = (result.final_balance / result.total_contributions) ** (Decimal("1") / years) - Decimal(
        "1"
    )
    assert _close(result.effective_annual_yield_net, expected, tol=Decimal("0.0001"))


@pytest.mark.parametrize("months", [3, 6, 12, 24, 36, 60])
def test_monthly_compound_parity_across_horizons(months: int) -> None:
    """Formula închisă pentru diferite orizonturi; fără contribuții."""
    inp = DepozitInput(
        principal=Decimal("10000"),
        months=months,
        annual_rate=Decimal("0.05"),
        tax_rate=Decimal("0.10"),
        capitalization=CapitalizationMode.MONTHLY,
    )
    result = simulate_depozit(inp)
    r_net = inp.annual_rate / Decimal("12") * (Decimal("1") - inp.tax_rate)
    expected = inp.principal * (Decimal("1") + r_net) ** months
    assert _close(result.final_balance, expected)
