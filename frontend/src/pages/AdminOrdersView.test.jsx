import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const fetchAdminOrdersMock = vi.fn();
const updateOrderStatusMock = vi.fn();
const resolveOrderReturnMock = vi.fn();
vi.mock("../api/admin", () => ({
  fetchAdminOrders: (...args) => fetchAdminOrdersMock(...args),
  updateOrderStatus: (...args) => updateOrderStatusMock(...args),
  resolveOrderReturn: (...args) => resolveOrderReturnMock(...args),
}));

const useAuthMock = vi.fn();
vi.mock("../AuthContext", () => ({
  useAuth: () => useAuthMock(),
}));

import { AdminOrdersView } from "./AdminOrdersView";

function makeOrder(overrides) {
  return {
    id: 1,
    user_email: "user@example.com",
    created_at: "2026-01-01T00:00:00Z",
    status: "pending",
    total_price: 5000,
    return_reason: null,
    ...overrides,
  };
}

describe("AdminOrdersView", () => {
  beforeEach(() => {
    useAuthMock.mockReset().mockReturnValue({ token: "admin-token" });
    fetchAdminOrdersMock.mockReset();
    updateOrderStatusMock.mockReset();
    resolveOrderReturnMock.mockReset();
  });

  it("renders orders from fetchAdminOrders", async () => {
    fetchAdminOrdersMock.mockResolvedValue([makeOrder()]);
    render(<AdminOrdersView showToast={vi.fn()} />);
    expect(await screen.findByText("#1")).toBeInTheDocument();
    expect(screen.getByText("user@example.com")).toBeInTheDocument();
  });

  it("calls updateOrderStatus when changing the status select", async () => {
    const user = userEvent.setup();
    fetchAdminOrdersMock.mockResolvedValue([makeOrder()]);
    updateOrderStatusMock.mockResolvedValue(makeOrder({ status: "processing" }));
    render(<AdminOrdersView showToast={vi.fn()} />);

    await screen.findByText("#1");
    const select = screen.getByDisplayValue("受付中");
    await user.selectOptions(select, "processing");

    expect(updateOrderStatusMock).toHaveBeenCalledWith("admin-token", 1, "processing");
  });

  it("approves a return-requested order via resolveOrderReturn", async () => {
    const user = userEvent.setup();
    fetchAdminOrdersMock.mockResolvedValue([makeOrder({ status: "return_requested", return_reason: "サイズ違い" })]);
    resolveOrderReturnMock.mockResolvedValue(makeOrder({ status: "returned" }));
    render(<AdminOrdersView showToast={vi.fn()} />);

    await screen.findByText("#1");
    await user.click(screen.getByText("承認"));

    expect(resolveOrderReturnMock).toHaveBeenCalledWith("admin-token", 1, "approve");
  });

  it("rejects a return-requested order via resolveOrderReturn", async () => {
    const user = userEvent.setup();
    fetchAdminOrdersMock.mockResolvedValue([makeOrder({ status: "return_requested", return_reason: "サイズ違い" })]);
    resolveOrderReturnMock.mockResolvedValue(makeOrder({ status: "shipped" }));
    render(<AdminOrdersView showToast={vi.fn()} />);

    await screen.findByText("#1");
    await user.click(screen.getByText("却下"));

    expect(resolveOrderReturnMock).toHaveBeenCalledWith("admin-token", 1, "reject");
  });
});
