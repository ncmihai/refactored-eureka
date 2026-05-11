from decimal import Decimal

from app.api.v1.comparator import ComparatorRequest, simulate


def _request(**overrides: Decimal | int) -> ComparatorRequest:
    data = {
        "principal": Decimal("5000"),
        "monthly_contribution": Decimal("200"),
        "months": 36,
        "deposit_annual_rate": Decimal("0.05"),
        "deposit_tax_rate": Decimal("0.10"),
        "etf_annual_return": Decimal("0.07"),
        "etf_ter": Decimal("0.0022"),
        "etf_broker_fee_pct": Decimal("0.001"),
        "etf_broker_fee_fixed": Decimal("0"),
        "ul_annual_return": Decimal("0.06"),
        "ul_fixed_insurance_fee": Decimal("13.5"),
        "ul_allocation_fee_low_pct": Decimal("0.05"),
        "ul_allocation_fee_high_pct": Decimal("0.025"),
        "ul_admin_fee_annual_pct": Decimal("0.0129"),
        "holding_tax": Decimal("0.10"),
    }
    data.update(overrides)
    return ComparatorRequest(**data)


def test_comparator_returns_three_series() -> None:
    result = simulate(_request())

    assert len(result.series) == 36
    assert result.deposit.final_value_net > 0
    assert result.etf.final_value_net > 0
    assert result.unit_linked.final_value_net > 0
    assert result.leader in {"deposit", "etf", "unit_linked"}


def test_comparator_uses_same_gross_cashflow() -> None:
    result = simulate(
        _request(
            principal=Decimal("1000"),
            monthly_contribution=Decimal("100"),
            months=12,
            ul_fixed_insurance_fee=Decimal("0"),
        )
    )
    expected = Decimal("1000") + Decimal("100") * Decimal("11")

    assert result.deposit.total_contributed == expected
    assert result.etf.total_contributed == expected
    assert result.unit_linked.total_contributed == expected
