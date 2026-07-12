import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const fetchProductsMock = vi.fn();
const addProductImageMock = vi.fn();
const deleteProductImageMock = vi.fn();
vi.mock("../api/products", () => ({
  fetchProducts: (...args) => fetchProductsMock(...args),
  addProductImage: (...args) => addProductImageMock(...args),
  deleteProductImage: (...args) => deleteProductImageMock(...args),
}));

const createProductMock = vi.fn();
const updateProductMock = vi.fn();
const deleteProductMock = vi.fn();
vi.mock("../api/admin", () => ({
  createProduct: (...args) => createProductMock(...args),
  updateProduct: (...args) => updateProductMock(...args),
  deleteProduct: (...args) => deleteProductMock(...args),
}));

const useAuthMock = vi.fn();
vi.mock("../AuthContext", () => ({
  useAuth: () => useAuthMock(),
}));

import { AdminProductsView } from "./AdminProductsView";

const product = { id: 1, name: "既存商品", description: "説明", price: 1000, stock: 5, image_url: "https://example.com/img.png", low_stock_threshold: null, images: [] };

describe("AdminProductsView", () => {
  beforeEach(() => {
    useAuthMock.mockReset().mockReturnValue({ token: "admin-token" });
    fetchProductsMock.mockReset().mockResolvedValue([product]);
    createProductMock.mockReset();
    updateProductMock.mockReset();
    deleteProductMock.mockReset();
  });

  it("renders products from fetchProducts", async () => {
    render(<AdminProductsView showToast={vi.fn()} />);
    expect(await screen.findByText("既存商品")).toBeInTheDocument();
  });

  it("creates a product via createProduct", async () => {
    const user = userEvent.setup();
    const created = { id: 2, name: "新商品", description: "新しい説明", price: 2000, stock: 10, image_url: "", images: [] };
    createProductMock.mockResolvedValue(created);
    render(<AdminProductsView showToast={vi.fn()} />);

    await screen.findByText("既存商品");
    await user.click(screen.getByText("+ 新規商品を追加"));
    await user.type(screen.getByPlaceholderText("商品名"), "新商品");
    await user.type(screen.getByPlaceholderText("商品の説明"), "新しい説明");
    const priceInputs = screen.getAllByPlaceholderText("0");
    await user.type(priceInputs[0], "2000");
    await user.type(priceInputs[1], "10");
    await user.click(screen.getByText("作成する"));

    expect(createProductMock).toHaveBeenCalled();
    expect(await screen.findByText("新商品")).toBeInTheDocument();
  });

  it("updates a product via updateProduct", async () => {
    const user = userEvent.setup();
    updateProductMock.mockResolvedValue({ ...product, name: "更新商品" });
    render(<AdminProductsView showToast={vi.fn()} />);

    await screen.findByText("既存商品");
    await user.click(screen.getByText("編集"));
    const nameInput = screen.getByDisplayValue("既存商品");
    await user.clear(nameInput);
    await user.type(nameInput, "更新商品");
    await user.click(screen.getByText("保存"));

    expect(updateProductMock).toHaveBeenCalledWith("admin-token", 1, expect.objectContaining({ name: "更新商品" }));
    expect(await screen.findByText("更新商品")).toBeInTheDocument();
  });

  it("shows a low-stock badge when stock is at or below the threshold", async () => {
    fetchProductsMock.mockReset().mockResolvedValue([
      { ...product, id: 3, name: "低在庫商品", stock: 2, low_stock_threshold: 5 },
    ]);
    render(<AdminProductsView showToast={vi.fn()} />);

    await screen.findByText("低在庫商品");
    expect(screen.getByText("低在庫")).toBeInTheDocument();
  });

  it("does not show a low-stock badge when threshold is unset", async () => {
    render(<AdminProductsView showToast={vi.fn()} />);

    await screen.findByText("既存商品");
    expect(screen.queryByText("低在庫")).not.toBeInTheDocument();
  });

  it("deletes a product via deleteProduct", async () => {
    const user = userEvent.setup();
    deleteProductMock.mockResolvedValue();
    render(<AdminProductsView showToast={vi.fn()} />);

    await screen.findByText("既存商品");
    await user.click(screen.getByText("削除"));

    expect(deleteProductMock).toHaveBeenCalledWith("admin-token", 1);
    await waitFor(() => expect(screen.queryByText("既存商品")).not.toBeInTheDocument());
  });
});
