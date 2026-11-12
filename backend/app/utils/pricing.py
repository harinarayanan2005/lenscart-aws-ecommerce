from decimal import Decimal, ROUND_HALF_UP
from typing import Any


def to_decimal(val: float | int | str | Decimal) -> Decimal:
    if isinstance(val, Decimal):
        return val
    return Decimal(str(val)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def compute_final_price(price: float, discount_percent: float = 0.0) -> float:
    if price < 0:
        raise ValueError("Price cannot be negative")
    if discount_percent < 0 or discount_percent > 90:
        raise ValueError("Discount percent must be between 0 and 90")
    raw = Decimal(str(price)) * (Decimal("100") - Decimal(str(discount_percent))) / Decimal("100")
    return float(raw.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP))


def compute_cart_totals(items: list[dict[str, Any]]) -> dict[str, float]:
    """
    Authoritative backend calculation of cart/order totals.
    Never trusts frontend-supplied totals.
    Free shipping on orders >= $500, otherwise $19.99 flat insured courier fee.
    Tax calculated at 8.0% on discounted subtotal.
    """
    subtotal = Decimal("0.00")
    discount_total = Decimal("0.00")
    discounted_subtotal = Decimal("0.00")

    for item in items:
        qty = Decimal(str(item["quantity"]))
        unit_price = Decimal(str(item["unit_price"])).quantize(Decimal("0.01"))
        final_unit = Decimal(str(item["final_unit_price"])).quantize(Decimal("0.01"))

        line_sub = (unit_price * qty).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
        line_final = (final_unit * qty).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
        line_disc = (line_sub - line_final).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

        subtotal += line_sub
        discount_total += line_disc
        discounted_subtotal += line_final

    if discounted_subtotal == Decimal("0.00"):
        shipping_fee = Decimal("0.00")
    elif discounted_subtotal >= Decimal("500.00"):
        shipping_fee = Decimal("0.00")
    else:
        shipping_fee = Decimal("19.99")

    tax_amount = (discounted_subtotal * Decimal("0.08")).quantize(
        Decimal("0.01"), rounding=ROUND_HALF_UP
    )
    final_total = (discounted_subtotal + shipping_fee + tax_amount).quantize(
        Decimal("0.01"), rounding=ROUND_HALF_UP
    )

    return {
        "subtotal": float(subtotal),
        "discount_total": float(discount_total),
        "shipping_fee": float(shipping_fee),
        "tax_amount": float(tax_amount),
        "final_total": float(final_total),
    }


def decimal_to_native(obj: Any) -> Any:
    """Recursively converts DynamoDB Decimal instances into native int/float for JSON serialization."""
    if isinstance(obj, list):
        return [decimal_to_native(i) for i in obj]
    if isinstance(obj, dict):
        return {k: decimal_to_native(v) for k, v in obj.items()}
    if isinstance(obj, Decimal):
        if obj % 1 == 0:
            return int(obj)
        return float(obj)
    return obj


def float_to_decimal(obj: Any) -> Any:
    """Recursively converts Python floats into Decimal for DynamoDB storage."""
    if isinstance(obj, list):
        return [float_to_decimal(i) for i in obj]
    if isinstance(obj, dict):
        return {k: float_to_decimal(v) for k, v in obj.items()}
    if isinstance(obj, float):
        return Decimal(str(round(obj, 4)))
    return obj

