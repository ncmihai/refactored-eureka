"""Teste de paritate pentru motorul de Investiții (SIP + TER + capital gains).

Verificăm paritate cu formulele închise:
- compound lump-sum (fără contribuții): FV = P × (1+r_net)^N
- SIP anuity-due (contribuții lunare din luna 2): ca depozit, cu r_net = (r-TER)/12
- impozit pe câștig: tax = max(0, gross_gain) × holding_tax
- CAGR net: (net_value / contrib_gross)^(1/years) - 1

Toleranță: 0.01 unități monedă (1 cent).
"""

from decimal import Decimal

import pytest

from app.finance.investitii import InvestitieInput, simulate_investitie

TOL = Decimal("0.01")


def _close(a: Decimal, b: float | Decimal, tol: Decimal = TOL) -> bool:
    return abs(a - Decimal(str(b))) <= tol


# ---------- Lump-sum (fără contribuții) ----------


def test_lump_sum_no_ter_no_fee_closed_form() -> None:
    """FV = P × (1 + r/12)^N, apoi tax pe câștig."""
    inp = InvestitieInput(
        principal=Decimal("10000"),
        months=120,
        monthly_contribution=Decimal("0"),
        annual_return=Decimal("0.07"),
        ter=Decimal("0"),
        holding_tax=Decimal("0.10"),
    )
    result = simulate_investitie(inp)

    r_m = inp.annual_return / Decimal("12")
    expected_gross = inp.principal * (Decimal("1") + r_m) ** inp.months
    expected_gain = expected_gross - inp.principal
    expected_tax = expected_gain * inp.holding_tax
    expected_net = expected_gross - expected_tax

    assert _close(result.gross_value_final, expected_gross)
    assert _close(result.tax, expected_tax)
    assert _close(result.net_value_final, expected_net)


def test_lump_sum_with_ter_reduces_return() -> None:
    """TER se scade din randament: r_effective = r - TER."""
    inp = InvestitieInput(
        principal=Decimal("10000"),
        months=60,
        annual_return=Decimal("0.08"),
        ter=Decimal("0.003"),
        holding_tax=Decimal("0.10"),
    )
    result = simulate_investitie(inp)

    r_eff = (inp.annual_return - inp.ter) / Decimal("12")
    expected_gross = inp.principal * (Decimal("1") + r_eff) ** inp.months
    assert _close(result.gross_value_final, expected_gross)
    assert _close(result.effective_annual_return, inp.annual_return - inp.ter)


def test_lump_sum_no_gain_no_tax() -> None:
    """Cu randament 0 și TER 0: gross = principal, tax = 0."""
    inp = InvestitieInput(
        principal=Decimal("5000"),
        months=24,
        annual_return=Decimal("0"),
        ter=Decimal("0"),
        holding_tax=Decimal("0.10"),
    )
    result = simulate_investitie(inp)
    assert _close(result.gross_value_final, 5000)
    assert result.tax == Decimal("0")
    assert _close(result.net_value_final, 5000)


# ---------- SIP (contribuție lunară) ----------


def test_sip_closed_form_no_ter_no_fee() -> None:
    """FV = P×(1+r)^N + C×(1+r)×((1+r)^(N-1)-1)/r (anuity cu plata în avans din luna 2).

    Aceeași formulă ca la depozit cu capitalizare lunară.
    """
    inp = InvestitieInput(
        principal=Decimal("5000"),
        months=60,
        monthly_contribution=Decimal("300"),
        annual_return=Decimal("0.07"),
        ter=Decimal("0"),
        holding_tax=Decimal("0.10"),
    )
    result = simulate_investitie(inp)

    r = inp.annual_return / Decimal("12")
    n = inp.months
    factor = (Decimal("1") + r) ** n
    annuity_sum = (Decimal("1") + r) * ((Decimal("1") + r) ** (n - 1) - Decimal("1")) / r
    expected_gross = inp.principal * factor + inp.monthly_contribution * annuity_sum
    assert _close(result.gross_value_final, expected_gross, tol=Decimal("0.05"))


def test_sip_schedule_length_equals_months() -> None:
    inp = InvestitieInput(
        principal=Decimal("1000"),
        months=36,
        monthly_contribution=Decimal("100"),
        annual_return=Decimal("0.06"),
    )
    result = simulate_investitie(inp)
    assert len(result.schedule) == inp.months


def test_sip_month_1_uses_principal_not_contribution() -> None:
    """Convenția motorului: luna 1 = principal; contribuția începe din luna 2."""
    inp = InvestitieInput(
        principal=Decimal("2000"),
        months=6,
        monthly_contribution=Decimal("200"),
        annual_return=Decimal("0.06"),
        ter=Decimal("0"),
    )
    result = simulate_investitie(inp)
    assert _close(result.schedule[0].contribution_gross, inp.principal)
    for row in result.schedule[1:]:
        assert _close(row.contribution_gross, inp.monthly_contribution)


def test_total_contributions_gross_matches_sum() -> None:
    inp = InvestitieInput(
        principal=Decimal("3000"),
        months=24,
        monthly_contribution=Decimal("150"),
        annual_return=Decimal("0.07"),
    )
    result = simulate_investitie(inp)
    expected = inp.principal + inp.monthly_contribution * Decimal(inp.months - 1)
    assert _close(result.total_contributions_gross, expected)


# ---------- Comisioane broker ----------


def test_broker_fee_pct_reduces_net_contribution() -> None:
    """Fee procentual: net = gross × (1 - pct)."""
    inp = InvestitieInput(
        principal=Decimal("10000"),
        months=12,
        monthly_contribution=Decimal("500"),
        annual_return=Decimal("0"),
        ter=Decimal("0"),
        broker_fee_pct=Decimal("0.002"),
        broker_fee_fixed=Decimal("0"),
        holding_tax=Decimal("0.10"),
    )
    result = simulate_investitie(inp)

    expected_fee_principal = inp.principal * inp.broker_fee_pct
    expected_fee_per_contrib = inp.monthly_contribution * inp.broker_fee_pct
    n_contribs = inp.months - 1
    expected_total_fees = expected_fee_principal + expected_fee_per_contrib * Decimal(n_contribs)
    assert _close(result.total_broker_fees, expected_total_fees)


def test_broker_fee_fixed_reduces_net_contribution() -> None:
    inp = InvestitieInput(
        principal=Decimal("1000"),
        months=12,
        monthly_contribution=Decimal("200"),
        annual_return=Decimal("0"),
        ter=Decimal("0"),
        broker_fee_pct=Decimal("0"),
        broker_fee_fixed=Decimal("1"),
        holding_tax=Decimal("0.10"),
    )
    result = simulate_investitie(inp)
    expected_fees = Decimal("1") * Decimal(inp.months)  # 1 EUR la fiecare tranzacție (inclusiv luna 1)
    assert _close(result.total_broker_fees, expected_fees)


# ---------- Impozit pe câștig ----------


def test_no_tax_when_no_gain() -> None:
    """Cu randament 0: tax = 0 chiar dacă holding_tax > 0."""
    inp = InvestitieInput(
        principal=Decimal("5000"),
        months=12,
        monthly_contribution=Decimal("100"),
        annual_return=Decimal("0"),
        ter=Decimal("0"),
        holding_tax=Decimal("0.10"),
    )
    result = simulate_investitie(inp)
    assert result.tax == Decimal("0")


def test_tax_equals_gain_times_holding_rate() -> None:
    inp = InvestitieInput(
        principal=Decimal("10000"),
        months=36,
        monthly_contribution=Decimal("0"),
        annual_return=Decimal("0.06"),
        ter=Decimal("0"),
        holding_tax=Decimal("0.10"),
    )
    result = simulate_investitie(inp)
    expected_tax = result.gross_gain * inp.holding_tax
    assert _close(result.tax, expected_tax)


def test_net_value_equals_gross_minus_tax() -> None:
    inp = InvestitieInput(
        principal=Decimal("8000"),
        months=48,
        monthly_contribution=Decimal("150"),
        annual_return=Decimal("0.07"),
        ter=Decimal("0.002"),
        holding_tax=Decimal("0.10"),
    )
    result = simulate_investitie(inp)
    assert _close(result.net_value_final, result.gross_value_final - result.tax)


# ---------- CAGR & invariante ----------


def test_cagr_net_matches_definition() -> None:
    """CAGR_net = (net_value / contrib_gross)^(1/ani) - 1."""
    inp = InvestitieInput(
        principal=Decimal("5000"),
        months=120,
        monthly_contribution=Decimal("200"),
        annual_return=Decimal("0.07"),
        ter=Decimal("0.002"),
        holding_tax=Decimal("0.10"),
    )
    result = simulate_investitie(inp)
    years = Decimal(inp.months) / Decimal("12")
    expected = (
        result.net_value_final / result.total_contributions_gross
    ) ** (Decimal("1") / years) - Decimal("1")
    assert _close(result.cagr_net, expected, tol=Decimal("0.0001"))


def test_net_gain_equals_net_value_minus_gross_contributions() -> None:
    inp = InvestitieInput(
        principal=Decimal("5000"),
        months=60,
        monthly_contribution=Decimal("100"),
        annual_return=Decimal("0.08"),
        ter=Decimal("0.002"),
        broker_fee_pct=Decimal("0.001"),
        holding_tax=Decimal("0.10"),
    )
    result = simulate_investitie(inp)
    expected = result.net_value_final - result.total_contributions_gross
    assert _close(result.net_gain, expected)


@pytest.mark.parametrize("months", [12, 24, 60, 120, 240])
def test_lump_sum_parity_across_horizons(months: int) -> None:
    """FV = P × (1 + r_eff/12)^N pentru diferite orizonturi, fără comisioane broker."""
    inp = InvestitieInput(
        principal=Decimal("10000"),
        months=months,
        monthly_contribution=Decimal("0"),
        annual_return=Decimal("0.07"),
        ter=Decimal("0.003"),
        holding_tax=Decimal("0.10"),
    )
    result = simulate_investitie(inp)
    r_eff = (inp.annual_return - inp.ter) / Decimal("12")
    expected = inp.principal * (Decimal("1") + r_eff) ** months
    assert _close(result.gross_value_final, expected, tol=Decimal("0.05"))
