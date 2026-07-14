export function calculateCartTotals(items, coupon) {
  const subtotal = items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const discountAmount = coupon
    ? coupon.discount_type === "percentage"
      ? subtotal * coupon.discount_value / 100
      : Math.min(coupon.discount_value, subtotal)
    : 0;
  const discountedSubtotal = subtotal - discountAmount;
  const tax = discountedSubtotal * 0.1;
  return {
    subtotal,
    discountAmount,
    tax,
    grandTotal: discountedSubtotal + tax,
  };
}
