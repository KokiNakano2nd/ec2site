import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const fetchOrdersMock = vi.fn();
const cancelOrderMock = vi.fn();
const requestOrderReturnMock = vi.fn();
vi.mock("../api/orders", () => ({
  fetchOrders: (...args) => fetchOrdersMock(...args),
  cancelOrder: (...args) => cancelOrderMock(...args),
  requestOrderReturn: (...args) => requestOrderReturnMock(...args),
}));

const useAuthMock = vi.fn();
vi.mock("../AuthContext", () => ({
  useAuth: () => useAuthMock(),
}));

import { OrderHistoryView } from "./OrderHistoryView";

function makeOrder(overrides) {
  return {
    id: 1,
    created_at: "2026-01-01T00:00:00Z",
    status: "pending",
    total_price: 3000,
    items: [{ id: 1, product: { name: "商品A" }, quantity: 1, price: 3000 }],
    ...overrides,
  };
}

describe("OrderHistoryView", () => {
  beforeEach(() => {
    useAuthMock.mockReset().mockReturnValue({ token: "test-token" });
    fetchOrdersMock.mockReset();
    cancelOrderMock.mockReset();
    requestOrderReturnMock.mockReset();
  });

  it("renders orders from fetchOrders", async () => {
    fetchOrdersMock.mockResolvedValue([makeOrder()]);
    render(<OrderHistoryView />);
    expect(await screen.findByText("注文 #1")).toBeInTheDocument();
    expect(screen.getByText("商品A")).toBeInTheDocument();
  });

  it("calls cancelOrder when cancelling a pending order", async () => {
    const user = userEvent.setup();
    fetchOrdersMock.mockResolvedValue([makeOrder({ status: "pending" })]);
    cancelOrderMock.mockResolvedValue(makeOrder({ status: "cancelled" }));
    render(<OrderHistoryView />);

    await screen.findByText("注文 #1");
    await user.click(screen.getByText("キャンセルする"));

    expect(cancelOrderMock).toHaveBeenCalledWith("test-token", 1);
    await waitFor(() => expect(screen.getByText("キャンセル済み")).toBeInTheDocument());
  });

  it("calls requestOrderReturn on a shipped order", async () => {
    const user = userEvent.setup();
    fetchOrdersMock.mockResolvedValue([makeOrder({ status: "shipped" })]);
    requestOrderReturnMock.mockResolvedValue(makeOrder({ status: "return_requested" }));
    render(<OrderHistoryView />);

    await screen.findByText("注文 #1");
    await user.type(screen.getByPlaceholderText("返品理由（任意）"), "サイズが合わない");
    await user.click(screen.getByText("返品を申請する"));

    expect(requestOrderReturnMock).toHaveBeenCalledWith("test-token", 1, "サイズが合わない");
    await waitFor(() => expect(screen.getByText("返品申請中")).toBeInTheDocument());
  });
});
