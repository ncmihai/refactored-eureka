"""Teste de paritate cu Instrumentarul Excel — foaia "Credit".

Valorile de referință sunt extrase direct din xlsx-ul existent.
Toleranța: 0.01 unități monedă.
"""

from decimal import Decimal

import pytest

from app.finance.credit import CreditInput, PrepaymentMode, simulate_credit

TOL = Decimal("0.01")


def _close(a: Decimal, b: float | Decimal, tol: Decimal = TOL) -> bool:
    return abs(a - Decimal(str(b))) <= tol


@pytest.fixture
def excel_credit_input() -> CreditInput:
    """Parametrii exacți ai foii Credit din Instrumentar."""
    return CreditInput(
        principal=Decimal("60000"),
        months=120,
        annual_rate_initial=Decimal("0.049"),
        annual_rate_after=Decimal("0.0776"),
        revision_month=36,
        monthly_fee=Decimal("0"),
        grace_months=0,
        monthly_prepayment=Decimal("0"),
        prepayment_mode=PrepaymentMode.REDUCE_PERIOD,
    )


def test_annuity_month_1(excel_credit_input: CreditInput) -> None:
    result = simulate_credit(excel_credit_input)
    assert _close(result.schedule[0].annuity, 633.4643728310591)


def test_closing_balance_month_1(excel_credit_input: CreditInput) -> None:
    result = simulate_credit(excel_credit_input)
    assert _close(result.schedule[0].closing_balance, 59611.53562716894)


def test_month_2_values(excel_credit_input: CreditInput) -> None:
    result = simulate_credit(excel_credit_input)
    row = result.schedule[1]
    assert _close(row.opening_balance, 59611.53562716894)
    assert _close(row.annuity, 633.4643728310591)
    assert _close(row.principal_paid, 390.05060235345263)
    assert _close(row.interest_paid, 243.4137704776065)
    assert _close(row.closing_balance, 59221.48502481548)


def test_annuity_after_rate_revision(excel_credit_input: CreditInput) -> None:
    """La luna 37 (după revizuire) Excel-ul arată noua anuitate 695.5178376065892."""
    result = simulate_credit(excel_credit_input)
    new_annuity = result.schedule[36].annuity
    assert _close(new_annuity, 695.5178376065892)


def test_credit_closes_in_120_months(excel_credit_input: CreditInput) -> None:
    result = simulate_credit(excel_credit_input)
    assert result.months_to_close == 120
    assert abs(result.schedule[-1].closing_balance) < TOL


def test_no_prepayment_total_principal_equals_initial(excel_credit_input: CreditInput) -> None:
    """Invariant: suma principalelor rambursate = principal inițial."""
    result = simulate_credit(excel_credit_input)
    total_principal = sum(row.principal_paid for row in result.schedule)
    assert _close(total_principal, excel_credit_input.principal)
