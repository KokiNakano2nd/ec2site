import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

const fetchAnalyticsSummaryMock = vi.fn();
const fetchCategorySalesMock = vi.fn();
const fetchSalesByDateMock = vi.fn();
const fetchTopProductsMock = vi.fn();
vi.mock("../api/analytics", () => ({
  fetchAnalyticsSummary: (...args) => fetchAnalyticsSummaryMock(...args),
  fetchCategorySales: (...args) => fetchCategorySalesMock(...args),
  fetchSalesByDate: (...args) => fetchSalesByDateMock(...args),
  fetchTopProducts: (...args) => fetchTopProductsMock(...args),
}));

const fetchLowStockProductsMock = vi.fn();
vi.mock("../api/admin", () => ({
  fetchLowStockProducts: (...args) => fetchLowStockProductsMock(...args),
}));

const fetchLowRemainingUsesCouponsMock = vi.fn();
vi.mock("../api/coupons", () => ({
  fetchLowRemainingUsesCoupons: (...args) => fetchLowRemainingUsesCouponsMock(...args),
}));

const useAuthMock = vi.fn();
vi.mock("../AuthContext", () => ({
  useAuth: () => useAuthMock(),
}));

import { AdminDashboardView } from "./AdminDashboardView";

describe("AdminDashboardView", () => {
  beforeEach(() => {
    useAuthMock.mockReset().mockReturnValue({ token: "admin-token" });
    fetchAnalyticsSummaryMock.mockReset().mockResolvedValue({
      total_revenue: 123456, order_count: 42, avg_order: 2939, user_count: 17,
    });
    // Empty chart data: this keeps the assertions focused on KPI text values
    // rather than recharts/ResponsiveContainer internals, which are flaky in jsdom.
    fetchSalesByDateMock.mockReset().mockResolvedValue([]);
    fetchTopProductsMock.mockReset().mockResolvedValue([]);
    fetchCategorySalesMock.mockReset().mockResolvedValue([]);
    fetchLowStockProductsMock.mockReset().mockResolvedValue([]);
    fetchLowRemainingUsesCouponsMock.mockReset().mockResolvedValue([]);
  });

  it("renders KPI values from the analytics summary", async () => {
    render(<AdminDashboardView />);

    expect(await screen.findByText("¥123,456")).toBeInTheDocument();
    expect(screen.getByText("42件")).toBeInTheDocument();
    expect(screen.getByText("¥2,939")).toBeInTheDocument();
    expect(screen.getByText("17人")).toBeInTheDocument();
  });

  it("shows a no-data message when there is no chart data", async () => {
    render(<AdminDashboardView />);
    expect(await screen.findByText("注文データがまだありません。")).toBeInTheDocument();
  });

  it("shows a no-alert message when there are no low-stock products", async () => {
    render(<AdminDashboardView />);
    expect(await screen.findByText("現在低在庫の商品はありません")).toBeInTheDocument();
  });

  it("lists low-stock products when there are any", async () => {
    fetchLowStockProductsMock.mockReset().mockResolvedValue([
      { id: 1, name: "低在庫商品", stock: 2, low_stock_threshold: 5 },
    ]);
    render(<AdminDashboardView />);
    expect(await screen.findByText("低在庫商品")).toBeInTheDocument();
    expect(screen.getByText("在庫 2 / しきい値 5")).toBeInTheDocument();
  });

  it("shows a no-alert message when there are no low-remaining-uses coupons", async () => {
    render(<AdminDashboardView />);
    expect(await screen.findByText("残数僅少のクーポンはありません")).toBeInTheDocument();
  });

  it("lists low-remaining-uses coupons when there are any", async () => {
    fetchLowRemainingUsesCouponsMock.mockReset().mockResolvedValue([
      { id: 1, code: "SUMMER10", max_uses: 10, used_count: 8, low_remaining_uses_threshold: 5 },
    ]);
    render(<AdminDashboardView />);
    expect(await screen.findByText("SUMMER10")).toBeInTheDocument();
    expect(screen.getByText("残り 2 回 / しきい値 5")).toBeInTheDocument();
  });
});
