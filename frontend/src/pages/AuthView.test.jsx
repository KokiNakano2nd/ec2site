import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const loginMock = vi.fn();
vi.mock("../AuthContext", () => ({
  useAuth: () => ({ login: loginMock }),
}));

const registerMock = vi.fn();
vi.mock("../api/auth", () => ({
  register: (...args) => registerMock(...args),
}));

import { AuthView } from "./AuthView";

describe("AuthView", () => {
  beforeEach(() => {
    loginMock.mockReset();
    registerMock.mockReset();
  });

  it("registers successfully and calls onSuccess", async () => {
    const user = userEvent.setup();
    registerMock.mockResolvedValue({ id: 1, email: "new@example.com" });
    loginMock.mockResolvedValue();
    const onSuccess = vi.fn();
    render(<AuthView initialMode="register" onSuccess={onSuccess} onToggle={vi.fn()} />);

    await user.type(screen.getByPlaceholderText("example@email.com"), "new@example.com");
    await user.type(screen.getByPlaceholderText("6文字以上"), "password123");
    await user.click(screen.getByRole("button", { name: "アカウントを作成" }));

    expect(registerMock).toHaveBeenCalledWith("new@example.com", "password123");
    expect(loginMock).toHaveBeenCalledWith("new@example.com", "password123");
    expect(onSuccess).toHaveBeenCalled();
  });

  it("shows an error message when registration fails", async () => {
    const user = userEvent.setup();
    registerMock.mockRejectedValue(new Error("既に登録されています"));
    render(<AuthView initialMode="register" onSuccess={vi.fn()} onToggle={vi.fn()} />);

    await user.type(screen.getByPlaceholderText("example@email.com"), "dup@example.com");
    await user.type(screen.getByPlaceholderText("6文字以上"), "password123");
    await user.click(screen.getByRole("button", { name: "アカウントを作成" }));

    expect(await screen.findByText("既に登録されています")).toBeInTheDocument();
  });

  it("calls onToggle when switching modes", async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();
    render(<AuthView initialMode="login" onSuccess={vi.fn()} onToggle={onToggle} />);

    await user.click(screen.getByText("新規登録"));
    expect(onToggle).toHaveBeenCalledWith("register");
  });
});
