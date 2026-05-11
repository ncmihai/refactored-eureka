from decimal import Decimal

from app.finance.unit_linked import UnitLinkedInput, simulate_unit_linked


def test_unit_linked_schedule_length() -> None:
    result = simulate_unit_linked(
        UnitLinkedInput(
            initial_contribution=Decimal("1000"),
            monthly_premium=Decimal("300"),
            months=36,
        )
    )
    assert len(result.schedule) == 36


def test_zero_return_zero_variable_fee_tracks_invested_amount() -> None:
    inp = UnitLinkedInput(
        initial_contribution=Decimal("0"),
        monthly_premium=Decimal("100"),
        months=12,
        annual_return=Decimal("0"),
        allocation_fee_low_pct=Decimal("0"),
        allocation_fee_high_pct=Decimal("0"),
        fixed_insurance_fee=Decimal("0"),
        initial_expense_recovery_annual_pct=Decimal("0"),
        admin_fee_annual_pct=Decimal("0"),
        holding_tax=Decimal("0.10"),
    )
    result = simulate_unit_linked(inp)
    assert result.total_premiums == Decimal("1200")
    assert result.total_invested == Decimal("1200")
    assert result.net_value_final == Decimal("1200")
    assert result.tax == Decimal("0")


def test_fixed_and_allocation_fees_reduce_invested_amount() -> None:
    inp = UnitLinkedInput(
        initial_contribution=Decimal("0"),
        monthly_premium=Decimal("100"),
        months=1,
        annual_return=Decimal("0"),
        allocation_fee_low_pct=Decimal("0.05"),
        allocation_fee_high_pct=Decimal("0.025"),
        fixed_insurance_fee=Decimal("10"),
        initial_expense_recovery_annual_pct=Decimal("0"),
        admin_fee_annual_pct=Decimal("0"),
    )
    result = simulate_unit_linked(inp)
    assert result.total_fixed_fees == Decimal("10")
    assert result.total_allocation_fees == Decimal("4.50")
    assert result.total_invested == Decimal("85.50")
    assert result.gross_value_final == Decimal("85.50")


def test_expense_recovery_applies_only_to_initial_units() -> None:
    inp = UnitLinkedInput(
        initial_contribution=Decimal("0"),
        monthly_premium=Decimal("100"),
        months=3,
        annual_return=Decimal("0"),
        allocation_fee_low_pct=Decimal("0"),
        allocation_fee_high_pct=Decimal("0"),
        fixed_insurance_fee=Decimal("0"),
        initial_units_months=1,
        initial_expense_recovery_annual_pct=Decimal("0.12"),
        admin_fee_annual_pct=Decimal("0"),
    )
    result = simulate_unit_linked(inp)
    assert result.schedule[0].expense_recovery_fee == Decimal("1.00")
    assert result.schedule[1].accumulation_units_balance == Decimal("100")
    assert result.total_expense_recovery_fees > Decimal("1.00")


def test_tax_applies_only_on_positive_gain() -> None:
    inp = UnitLinkedInput(
        initial_contribution=Decimal("1000"),
        monthly_premium=Decimal("0"),
        months=12,
        annual_return=Decimal("0.12"),
        allocation_fee_low_pct=Decimal("0"),
        allocation_fee_high_pct=Decimal("0"),
        fixed_insurance_fee=Decimal("0"),
        initial_expense_recovery_annual_pct=Decimal("0"),
        admin_fee_annual_pct=Decimal("0"),
        holding_tax=Decimal("0.10"),
    )
    result = simulate_unit_linked(inp)
    assert result.tax > Decimal("0")
    assert result.net_value_final == result.gross_value_final - result.tax
