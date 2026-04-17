"""Teste de paritate pentru motorul Optimizare Credit (foaia „Optimizare credit").

Fără foaie Excel fizică — verificăm paritate pe invarianți matematici:
- Consistență cu motorul Credit (reutilizat pentru scenario A și base).
- Formula închisă pentru investiția paralelă (anuitate compusă lunar).
- Invarianți de recomandare + crossover.
"""

from decimal import Decimal

import pytest

from app.finance.credit import CreditInput, PrepaymentMode, simulate_credit
from app.finance.optimizare import OptimizareInput, simulate_optimizare

TOL = Decimal("0.01")


def _close(a: Decimal, b: float | Decimal, tol: Decimal = TOL) -> bool:
    return abs(a - Decimal(str(b))) <= tol


@pytest.fixture
def base_input() -> OptimizareInput:
    return OptimizareInput(
        principal=Decimal("60000"),
        months=120,
        annual_rate_initial=Decimal("0.049"),
        annual_rate_after=Decimal("0.0776"),
        revision_month=36,
        monthly_fee=Decimal("0"),
        grace_months=0,
        monthly_extra=Decimal("200"),
        investment_annual_return=Decimal("0.07"),
        investment_tax_rate=Decimal("0.10"),
    )


# ---------- Consistență cu motorul Credit ----------


def test_standard_monthly_payment_matches_base_credit(base_input: OptimizareInput) -> None:
    """Rata lunară standard = anuitate_lună_1 + comision_lună_1 din creditul fără extra."""
    result = simulate_optimizare(base_input)
    base = simulate_credit(
        CreditInput(
            principal=base_input.principal,
            months=base_input.months,
            annual_rate_initial=base_input.annual_rate_initial,
            annual_rate_after=base_input.annual_rate_after,
            revision_month=base_input.revision_month,
            monthly_fee=base_input.monthly_fee,
            grace_months=base_input.grace_months,
            monthly_prepayment=Decimal("0"),
            prepayment_mode=PrepaymentMode.REDUCE_PERIOD,
        )
    )
    expected = base.schedule[0].annuity + base.schedule[0].fee
    assert _close(result.standard_monthly_payment, expected)


def test_interest_saved_equals_base_minus_scenA(base_input: OptimizareInput) -> None:
    result = simulate_optimizare(base_input)
    base = simulate_credit(
        CreditInput(
            principal=base_input.principal,
            months=base_input.months,
            annual_rate_initial=base_input.annual_rate_initial,
            annual_rate_after=base_input.annual_rate_after,
            revision_month=base_input.revision_month,
            monthly_fee=base_input.monthly_fee,
            grace_months=base_input.grace_months,
            monthly_prepayment=Decimal("0"),
            prepayment_mode=PrepaymentMode.REDUCE_PERIOD,
        )
    )
    expected = base.total_interest - result.scenario_a_total_interest
    assert _close(result.interest_saved_by_prepay, expected)


def test_scenarioA_closes_earlier_with_extra(base_input: OptimizareInput) -> None:
    """Plățile anticipate trebuie să scurteze durata creditului."""
    result = simulate_optimizare(base_input)
    assert result.scenario_a_months_to_close < base_input.months


def test_zero_extra_makes_scenarios_equal() -> None:
    """Fără extra: A == base, scen_b_net = 0, recomandare = A."""
    inp = OptimizareInput(
        principal=Decimal("60000"),
        months=120,
        annual_rate_initial=Decimal("0.049"),
        annual_rate_after=Decimal("0.0776"),
        revision_month=36,
        monthly_extra=Decimal("0"),
        investment_annual_return=Decimal("0.07"),
        investment_tax_rate=Decimal("0.10"),
    )
    result = simulate_optimizare(inp)
    assert _close(result.interest_saved_by_prepay, Decimal("0"))
    assert _close(result.scenario_b_final_investment_net, Decimal("0"))
    assert result.recommended == "A"
    assert result.scenario_a_months_to_close == inp.months


# ---------- Paritate investiție paralelă (scenariu B) ----------


def test_scenarioB_net_matches_closed_form(base_input: OptimizareInput) -> None:
    """Investiție lunară cu capitalizare lunară: FV = C × ((1+r)^n - 1)/r;
    câștig = FV - C×n; impozit pe câștig; net = FV - tax."""
    result = simulate_optimizare(base_input)

    r = base_input.investment_annual_return / Decimal("12")
    n = base_input.months
    c = base_input.monthly_extra
    fv = c * (((Decimal("1") + r) ** n - Decimal("1")) / r)
    contrib = c * Decimal(n)
    gain = fv - contrib
    tax = gain * base_input.investment_tax_rate if gain > 0 else Decimal("0")
    expected_net = fv - tax

    assert _close(result.scenario_b_final_investment_net, expected_net, tol=Decimal("0.05"))


def test_scenarioB_zero_return_has_zero_gain() -> None:
    """Cu randament 0: FV = contribuții totale, câștig = 0, impozit = 0, net = FV."""
    inp = OptimizareInput(
        principal=Decimal("60000"),
        months=120,
        annual_rate_initial=Decimal("0.049"),
        monthly_extra=Decimal("200"),
        investment_annual_return=Decimal("0"),
        investment_tax_rate=Decimal("0.10"),
    )
    result = simulate_optimizare(inp)
    contrib = inp.monthly_extra * Decimal(inp.months)
    assert _close(result.scenario_b_final_investment_net, contrib)


# ---------- Invarianți de recomandare ----------


def test_recommendation_equals_B_when_gain_beats_saving(base_input: OptimizareInput) -> None:
    """Comparație apples-to-apples: câștig net (FV − contribuții − tax) vs dobândă economisită."""
    result = simulate_optimizare(base_input)
    if result.scenario_b_gain_net > result.interest_saved_by_prepay:
        assert result.recommended == "B"
    else:
        assert result.recommended == "A"


def test_gain_net_equals_final_investment_minus_contributions(base_input: OptimizareInput) -> None:
    """scen_b_gain_net = scen_b_final_investment_net − contribuții_totale."""
    result = simulate_optimizare(base_input)
    contributions = base_input.monthly_extra * Decimal(base_input.months)
    expected = result.scenario_b_final_investment_net - contributions
    assert _close(result.scenario_b_gain_net, expected)


def test_high_investment_return_favors_B() -> None:
    """La 15% /an (net după impozit ~13.5%), investiția bate dobânda de 4.9-7.76%."""
    inp = OptimizareInput(
        principal=Decimal("60000"),
        months=120,
        annual_rate_initial=Decimal("0.049"),
        annual_rate_after=Decimal("0.0776"),
        revision_month=36,
        monthly_extra=Decimal("200"),
        investment_annual_return=Decimal("0.15"),
        investment_tax_rate=Decimal("0.10"),
    )
    result = simulate_optimizare(inp)
    assert result.recommended == "B"


def test_high_credit_rate_low_invest_favors_A() -> None:
    """Credit scump (15%) + investiție slabă (2%) → dobândă economisită bate câștigul net al investiției."""
    inp = OptimizareInput(
        principal=Decimal("60000"),
        months=120,
        annual_rate_initial=Decimal("0.15"),
        annual_rate_after=None,
        revision_month=None,
        monthly_extra=Decimal("500"),
        investment_annual_return=Decimal("0.02"),
        investment_tax_rate=Decimal("0.10"),
    )
    result = simulate_optimizare(inp)
    assert result.recommended == "A"


# ---------- Invarianți de crossover ----------


def test_crossover_year_consistent_with_yearly_deltas(base_input: OptimizareInput) -> None:
    """crossover_year = primul an cu delta_b_minus_a > 0 (sau None dacă nu există)."""
    result = simulate_optimizare(base_input)
    first_positive = next(
        (yp.year for yp in result.yearly if yp.delta_b_minus_a > 0),
        None,
    )
    assert result.crossover_year == first_positive


def test_yearly_length_equals_ceil_months_over_12(base_input: OptimizareInput) -> None:
    result = simulate_optimizare(base_input)
    expected_years = (base_input.months + 11) // 12
    assert len(result.yearly) == expected_years


def test_delta_sign_matches_gain_minus_saving(base_input: OptimizareInput) -> None:
    """Pentru fiecare an: delta_b_minus_a = scen_b_gain_net − scen_a_interest_saved (apples-to-apples)."""
    result = simulate_optimizare(base_input)
    for yp in result.yearly:
        computed = yp.scenario_b_gain_net - yp.scenario_a_interest_saved
        assert _close(yp.delta_b_minus_a, computed)


@pytest.mark.parametrize("extra", [Decimal("100"), Decimal("500"), Decimal("1000")])
def test_more_extra_shortens_scenarioA(extra: Decimal) -> None:
    """Invariant monoton: plată anticipată mai mare → credit închis mai repede (sau egal)."""
    base_params = dict(
        principal=Decimal("60000"),
        months=120,
        annual_rate_initial=Decimal("0.049"),
        annual_rate_after=Decimal("0.0776"),
        revision_month=36,
        investment_annual_return=Decimal("0.07"),
        investment_tax_rate=Decimal("0.10"),
    )
    small = simulate_optimizare(OptimizareInput(**base_params, monthly_extra=extra))
    large = simulate_optimizare(
        OptimizareInput(**base_params, monthly_extra=extra + Decimal("200"))
    )
    assert large.scenario_a_months_to_close <= small.scenario_a_months_to_close
    assert large.interest_saved_by_prepay >= small.interest_saved_by_prepay
