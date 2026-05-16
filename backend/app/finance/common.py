from decimal import Decimal


def tax_on_positive_gain(gain: Decimal, tax_rate: Decimal) -> Decimal:
    return gain * tax_rate if gain > 0 else Decimal("0")


def annualized_return(
    final_value: Decimal,
    total_contributed: Decimal,
    months: int,
) -> Decimal:
    if total_contributed <= 0 or months <= 0:
        return Decimal("0")

    years = Decimal(months) / Decimal("12")
    return (final_value / total_contributed) ** (Decimal("1") / years) - Decimal("1")
