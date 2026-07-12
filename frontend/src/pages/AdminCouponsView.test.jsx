import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const fetchAdminCouponsMock = vi.fn();
const createAdminCouponMock = vi.fn();
const toggleAdminCouponMock = vi.fn();
const deleteAdminCouponMock = vi.fn();
vi.mock("../api/coupons", () => ({
  fetchAdminCoupons: (...args) => fetchAdminCouponsMock(...args),
  createAdminCoupon: (...args) => createAdminCouponMock(...args),
  toggleAdminCoupon: (...args) => toggleAdminCouponMock(...args),
  deleteAdminCoupon: (...args) => deleteAdminCouponMock(...args),
}));

const useAuthMock = vi.fn();
vi.mock("../AuthContext", () => ({
  useAuth: () => useAuthMock(),
}));

import { AdminCouponsView } from "./AdminCouponsView";

const coupon = {
  id: 1, code: "SUMMER10", discount_type: "percentage", discount_value: 10,
  used_count: 2, max_uses: 100, is_active: true, created_at: "2026-01-01T00:00:00Z",
};

describe("AdminCouponsView", () => {
  beforeEach(() => {
    useAuthMock.mockReset().mockReturnValue({ token: "admin-token" });
    fetchAdminCouponsMock.mockReset().mockResolvedValue([coupon]);
    createAdminCouponMock.mockReset();
    toggleAdminCouponMock.mockReset();
    deleteAdminCouponMock.mockReset();
  });

  it("renders coupons from fetchAdminCoupons", async () => {
    render(<AdminCouponsView showToast={vi.fn()} />);
    expect(await screen.findByText("SUMMER10")).toBeInTheDocument();
  });

  it("creates a coupon via createAdminCoupon", async () => {
    const user = userEvent.setup();
    const created = { ...coupon, id: 2, code: "WELCOME10", used_count: 0 };
    createAdminCouponMock.mockResolvedValue(created);
    render(<AdminCouponsView showToast={vi.fn()} />);

    await screen.findByText("SUMMER10");
    await user.click(screen.getByText("+ クーポンを作成"));
    await user.type(screen.getByPlaceholderText("SUMMER10"), "welcome10");
    await user.type(screen.getByPlaceholderText("10"), "10");
    await user.click(screen.getByText("作成する"));

    expect(createAdminCouponMock).toHaveBeenCalledWith("admin-token", expect.objectContaining({ code: "WELCOME10" }));
    expect(await screen.findByText("WELCOME10")).toBeInTheDocument();
  });

  it("toggles a coupon via toggleAdminCoupon", async () => {
    const user = userEvent.setup();
    toggleAdminCouponMock.mockResolvedValue({ ...coupon, is_active: false });
    render(<AdminCouponsView showToast={vi.fn()} />);

    await screen.findByText("SUMMER10");
    await user.click(screen.getByText("無効化"));

    expect(toggleAdminCouponMock).toHaveBeenCalledWith("admin-token", 1);
    expect(await screen.findByText("有効化")).toBeInTheDocument();
  });

  it("deletes a coupon via deleteAdminCoupon", async () => {
    const user = userEvent.setup();
    deleteAdminCouponMock.mockResolvedValue();
    render(<AdminCouponsView showToast={vi.fn()} />);

    await screen.findByText("SUMMER10");
    await user.click(screen.getByText("削除"));

    expect(deleteAdminCouponMock).toHaveBeenCalledWith("admin-token", 1);
    await waitFor(() => expect(screen.queryByText("SUMMER10")).not.toBeInTheDocument());
  });
});
