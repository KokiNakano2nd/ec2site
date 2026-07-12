import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const fetchAddressesMock = vi.fn();
vi.mock("../api/addresses", () => ({
  fetchAddresses: (...args) => fetchAddressesMock(...args),
}));

const fetchCartMock = vi.fn();
const updateCartItemMock = vi.fn();
const removeCartItemMock = vi.fn();
vi.mock("../api/cart", () => ({
  fetchCart: (...args) => fetchCartMock(...args),
  updateCartItem: (...args) => updateCartItemMock(...args),
  removeCartItem: (...args) => removeCartItemMock(...args),
}));

const validateCouponMock = vi.fn();
vi.mock("../api/coupons", () => ({
  validateCoupon: (...args) => validateCouponMock(...args),
}));

const createOrderMock = vi.fn();
vi.mock("../api/orders", () => ({
  createOrder: (...args) => createOrderMock(...args),
}));

const fetchConfigMock = vi.fn();
const createCheckoutSessionMock = vi.fn();
vi.mock("../api/payment", () => ({
  fetchConfig: (...args) => fetchConfigMock(...args),
  createCheckoutSession: (...args) => createCheckoutSessionMock(...args),
}));

const useAuthMock = vi.fn();
vi.mock("../AuthContext", () => ({
  useAuth: () => useAuthMock(),
}));

import { CartView } from "./CartView";

const cartItem = {
  id: 1,
  quantity: 2,
  product: { id: 10, name: "カート商品", price: 1000, image_url: "https://example.com/img.png" },
};

describe("CartView", () => {
  beforeEach(() => {
    useAuthMock.mockReset().mockReturnValue({ token: "test-token" });
    fetchCartMock.mockReset().mockResolvedValue([cartItem]);
    fetchAddressesMock.mockReset().mockResolvedValue([]);
    fetchConfigMock.mockReset().mockResolvedValue({ stripe_enabled: false });
    updateCartItemMock.mockReset();
    removeCartItemMock.mockReset();
    validateCouponMock.mockReset();
    createOrderMock.mockReset();
  });

  it("renders cart items from fetchCart", async () => {
    render(<CartView onOrderComplete={vi.fn()} showToast={vi.fn()} />);
    expect(await screen.findByText("カート商品")).toBeInTheDocument();
  });

  it("calls updateCartItem on quantity change", async () => {
    const user = userEvent.setup();
    updateCartItemMock.mockResolvedValue({ ...cartItem, quantity: 3 });
    render(<CartView onOrderComplete={vi.fn()} showToast={vi.fn()} />);

    await screen.findByText("カート商品");
    const plusButtons = screen.getAllByText("+");
    await user.click(plusButtons[0]);

    expect(updateCartItemMock).toHaveBeenCalledWith("test-token", 1, 3);
  });

  it("applies a valid coupon and shows the discount", async () => {
    const user = userEvent.setup();
    validateCouponMock.mockResolvedValue({ code: "WELCOME10", discount_type: "percentage", discount_value: 10 });
    render(<CartView onOrderComplete={vi.fn()} showToast={vi.fn()} />);

    await screen.findByText("カート商品");
    await user.type(screen.getByPlaceholderText("コードを入力"), "welcome10");
    await user.click(screen.getByText("適用"));

    expect(await screen.findByText(/WELCOME10/)).toBeInTheDocument();
    expect(screen.getByText("割引")).toBeInTheDocument();
  });

  it("shows an error for an invalid coupon", async () => {
    const user = userEvent.setup();
    validateCouponMock.mockRejectedValue(new Error("クーポンが無効です"));
    render(<CartView onOrderComplete={vi.fn()} showToast={vi.fn()} />);

    await screen.findByText("カート商品");
    await user.type(screen.getByPlaceholderText("コードを入力"), "BADCODE");
    await user.click(screen.getByText("適用"));

    expect(await screen.findByText("クーポンが無効です")).toBeInTheDocument();
  });

  it("places an order and calls onOrderComplete", async () => {
    const user = userEvent.setup();
    createOrderMock.mockResolvedValue({ id: 99 });
    const onOrderComplete = vi.fn();
    const showToast = vi.fn();
    render(<CartView onOrderComplete={onOrderComplete} showToast={showToast} />);

    await screen.findByText("カート商品");
    await user.click(screen.getByText("注文を確定する →"));

    await waitFor(() => expect(createOrderMock).toHaveBeenCalledWith("test-token", null));
    expect(onOrderComplete).toHaveBeenCalled();
    expect(showToast).toHaveBeenCalledWith("ご注文ありがとうございます！");
  });
});
