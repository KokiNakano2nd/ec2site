def calculate_discount(subtotal: float, coupon) -> float:
    if coupon is None:
        return 0.0
    if coupon.discount_type == "percentage":
        return subtotal * coupon.discount_value / 100
    return min(coupon.discount_value, subtotal)


def calculate_total(subtotal: float, discount_amount: float) -> tuple[float, float, float]:
    discounted_subtotal = subtotal - discount_amount
    tax = discounted_subtotal * 0.1
    total_price = discounted_subtotal + tax
    return discounted_subtotal, tax, total_price
