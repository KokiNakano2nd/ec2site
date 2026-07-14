import { describe, expect, it } from "vitest";
import { calculateCartTotals } from "./cartTotals";

const items = [
  { quantity: 2, product: { price: 1000 } },
  { quantity: 1, product: { price: 500 } },
];

describe("calculateCartTotals", () => {
  it("calculates subtotal and tax without a coupon", () => {
    expect(calculateCartTotals(items, null)).toEqual({
      subtotal: 2500,
      discountAmount: 0,
      tax: 250,
      grandTotal: 2750,
    });
  });

  it("applies a percentage coupon", () => {
    const coupon = { discount_type: "percentage", discount_value: 10 };
    expect(calculateCartTotals(items, coupon)).toEqual({
      subtotal: 2500,
      discountAmount: 250,
      tax: 225,
      grandTotal: 2475,
    });
  });

  it("caps a fixed coupon at the subtotal", () => {
    const coupon = { discount_type: "fixed", discount_value: 3000 };
    expect(calculateCartTotals(items, coupon)).toEqual({
      subtotal: 2500,
      discountAmount: 2500,
      tax: 0,
      grandTotal: 0,
    });
  });
});
