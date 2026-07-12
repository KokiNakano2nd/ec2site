import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const fetchAddressesMock = vi.fn();
const createAddressMock = vi.fn();
const deleteAddressMock = vi.fn();
const setDefaultAddressMock = vi.fn();
vi.mock("../api/addresses", () => ({
  fetchAddresses: (...args) => fetchAddressesMock(...args),
  createAddress: (...args) => createAddressMock(...args),
  deleteAddress: (...args) => deleteAddressMock(...args),
  setDefaultAddress: (...args) => setDefaultAddressMock(...args),
}));

const deleteAccountMock = vi.fn();
vi.mock("../api/auth", () => ({
  deleteAccount: (...args) => deleteAccountMock(...args),
}));

const useAuthMock = vi.fn();
vi.mock("../AuthContext", () => ({
  useAuth: () => useAuthMock(),
}));

import { ProfileView } from "./ProfileView";

const address = {
  id: 1, name: "山田太郎", postal_code: "100-0001", prefecture: "東京都", city: "千代田区",
  address_line1: "1-1-1", address_line2: "", phone: "", is_default: true,
};

describe("ProfileView", () => {
  const logout = vi.fn();

  beforeEach(() => {
    useAuthMock.mockReset().mockReturnValue({ user: { email: "user@example.com", is_admin: false }, token: "test-token", logout });
    fetchAddressesMock.mockReset().mockResolvedValue([address]);
    createAddressMock.mockReset();
    deleteAddressMock.mockReset();
    setDefaultAddressMock.mockReset();
    deleteAccountMock.mockReset();
    logout.mockReset();
  });

  it("renders addresses from fetchAddresses", async () => {
    render(<ProfileView showToast={vi.fn()} onAccountDeleted={vi.fn()} />);
    expect(await screen.findByText("山田太郎")).toBeInTheDocument();
  });

  it("creates an address via createAddress", async () => {
    const user = userEvent.setup();
    const newAddress = { id: 2, name: "鈴木一郎", postal_code: "200-0002", prefecture: "大阪府", city: "大阪市", address_line1: "2-2-2", address_line2: "", phone: "", is_default: false };
    createAddressMock.mockResolvedValue(newAddress);
    render(<ProfileView showToast={vi.fn()} onAccountDeleted={vi.fn()} />);

    await screen.findByText("山田太郎");
    await user.click(screen.getByText("+ 住所を追加"));

    await user.type(screen.getByPlaceholderText("山田 太郎"), "鈴木一郎");
    await user.type(screen.getByPlaceholderText("000-0000"), "200-0002");
    await user.type(screen.getByPlaceholderText("東京都"), "大阪府");
    await user.type(screen.getByPlaceholderText("渋谷区"), "大阪市");
    await user.type(screen.getByPlaceholderText("1-2-3 ○○ビル"), "2-2-2");

    await user.click(screen.getByText("保存する"));

    expect(createAddressMock).toHaveBeenCalled();
    expect(await screen.findByText("鈴木一郎")).toBeInTheDocument();
  });

  it("deletes the account after confirming in the danger-zone modal", async () => {
    const user = userEvent.setup();
    deleteAccountMock.mockResolvedValue();
    const onAccountDeleted = vi.fn();
    const { container } = render(<ProfileView showToast={vi.fn()} onAccountDeleted={onAccountDeleted} />);

    await screen.findByText("山田太郎");
    await user.click(screen.getByText("退会する"));

    expect(await screen.findByText("本当に退会しますか？")).toBeInTheDocument();
    const passwordInput = container.querySelector('input[type="password"]');
    await user.type(passwordInput, "mypassword");
    await user.click(screen.getByText("退会を実行する"));

    await waitFor(() => expect(deleteAccountMock).toHaveBeenCalledWith("test-token", "mypassword"));
    expect(logout).toHaveBeenCalled();
    expect(onAccountDeleted).toHaveBeenCalled();
  });
});
