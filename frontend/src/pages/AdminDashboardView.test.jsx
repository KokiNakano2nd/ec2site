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
});
