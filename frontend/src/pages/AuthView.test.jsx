import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const loginMock = vi.fn();
vi.mock("../AuthContext", () => ({
  useAuth: () => ({ login: loginMock }),
}));

const registerMock = vi.fn();
const requestPasswordResetMock = vi.fn();
const confirmPasswordResetMock = vi.fn();
vi.mock("../api/auth", () => ({
  register: (...args) => registerMock(...args),
  requestPasswordReset: (...args) => requestPasswordResetMock(...args),
  confirmPasswordReset: (...args) => confirmPasswordResetMock(...args),
}));

import { AuthView } from "./AuthView";

describe("AuthView", () => {
  beforeEach(() => {
    loginMock.mockReset();
    registerMock.mockReset();
    requestPasswordResetMock.mockReset();
    confirmPasswordResetMock.mockReset();
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

  it("navigates to password reset request via the forgot-password link", async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();
    render(<AuthView initialMode="login" onSuccess={vi.fn()} onToggle={onToggle} />);

    await user.click(screen.getByText("パスワードをお忘れですか?"));
    expect(onToggle).toHaveBeenCalledWith("password-reset-request");
  });

  it("requests a password reset and shows the completion message", async () => {
    const user = userEvent.setup();
    requestPasswordResetMock.mockResolvedValue();
    render(<AuthView initialMode="password-reset-request" onSuccess={vi.fn()} onToggle={vi.fn()} />);

    await user.type(screen.getByPlaceholderText("example@email.com"), "someone@example.com");
    await user.click(screen.getByRole("button", { name: "送信する" }));

    expect(requestPasswordResetMock).toHaveBeenCalledWith("someone@example.com");
    expect(await screen.findByText(/メールを送信しました/)).toBeInTheDocument();
  });

  it("confirms a password reset with the provided token and shows success", async () => {
    const user = userEvent.setup();
    confirmPasswordResetMock.mockResolvedValue();
    render(
      <AuthView
        initialMode="password-reset-confirm"
        resetToken="abc-token"
        onSuccess={vi.fn()}
        onToggle={vi.fn()}
      />
    );

    await user.type(screen.getByPlaceholderText("6文字以上"), "new-password-456");
    await user.click(screen.getByRole("button", { name: "パスワードを更新する" }));

    expect(confirmPasswordResetMock).toHaveBeenCalledWith("abc-token", "new-password-456");
    expect(await screen.findByText("パスワードを更新しました")).toBeInTheDocument();
  });

  it("shows an error when the reset token is invalid", async () => {
    const user = userEvent.setup();
    confirmPasswordResetMock.mockRejectedValue(new Error("リンクが無効です。再度お手続きください"));
    render(
      <AuthView
        initialMode="password-reset-confirm"
        resetToken="bad-token"
        onSuccess={vi.fn()}
        onToggle={vi.fn()}
      />
    );

    await user.type(screen.getByPlaceholderText("6文字以上"), "new-password-456");
    await user.click(screen.getByRole("button", { name: "パスワードを更新する" }));

    expect(await screen.findByText("リンクが無効です。再度お手続きください")).toBeInTheDocument();
  });
});
