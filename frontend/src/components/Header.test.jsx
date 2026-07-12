import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const useAuthMock = vi.fn();
vi.mock("../AuthContext", () => ({
  useAuth: () => useAuthMock(),
}));

import { Header } from "./Header";

describe("Header", () => {
  it("shows login/register buttons when logged out", () => {
    useAuthMock.mockReturnValue({ user: null, logout: vi.fn() });
    render(<Header onNavigate={vi.fn()} />);
    expect(screen.getByText("ログイン")).toBeInTheDocument();
    expect(screen.getByText("新規登録")).toBeInTheDocument();
    expect(screen.queryByText("ログアウト")).not.toBeInTheDocument();
  });

  it("shows nav links but no admin links for a non-admin user", () => {
    useAuthMock.mockReturnValue({ user: { email: "user@example.com", is_admin: false }, logout: vi.fn() });
    render(<Header onNavigate={vi.fn()} />);
    expect(screen.getByText("商品一覧")).toBeInTheDocument();
    expect(screen.getByText("注文履歴")).toBeInTheDocument();
    expect(screen.getByText("ログアウト")).toBeInTheDocument();
    expect(screen.queryByText("商品管理")).not.toBeInTheDocument();
    expect(screen.queryByText("ダッシュボード")).not.toBeInTheDocument();
  });

  it("shows admin-only links for an admin user", () => {
    useAuthMock.mockReturnValue({ user: { email: "admin@example.com", is_admin: true }, logout: vi.fn() });
    render(<Header onNavigate={vi.fn()} />);
    expect(screen.getByText("ダッシュボード")).toBeInTheDocument();
    expect(screen.getByText("商品管理")).toBeInTheDocument();
    expect(screen.getByText("注文管理")).toBeInTheDocument();
    expect(screen.getByText("クーポン")).toBeInTheDocument();
  });

  it("calls logout when logout button is clicked", async () => {
    const user = userEvent.setup();
    const logout = vi.fn();
    useAuthMock.mockReturnValue({ user: { email: "user@example.com", is_admin: false }, logout });
    render(<Header onNavigate={vi.fn()} />);
    await user.click(screen.getByText("ログアウト"));
    expect(logout).toHaveBeenCalled();
  });
});
