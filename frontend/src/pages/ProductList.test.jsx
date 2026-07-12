import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const fetchProductsMock = vi.fn();
vi.mock("../api/products", () => ({
  fetchProducts: (...args) => fetchProductsMock(...args),
}));

import { ProductList } from "./ProductList";

function makeProducts(n) {
  return Array.from({ length: n }, (_, i) => ({
    id: i + 1,
    name: `商品${i + 1}`,
    description: `説明${i + 1}`,
    price: 1000 * (i + 1),
    stock: 10,
    image_url: "https://example.com/img.png",
  }));
}

describe("ProductList", () => {
  beforeEach(() => {
    fetchProductsMock.mockReset();
  });

  it("renders products from fetchProducts", async () => {
    fetchProductsMock.mockResolvedValue(makeProducts(3));
    render(<ProductList onSelect={vi.fn()} onToggleFav={vi.fn()} />);

    expect(await screen.findByText("商品1")).toBeInTheDocument();
    expect(screen.getByText("商品2")).toBeInTheDocument();
    expect(screen.getByText("商品3")).toBeInTheDocument();
  });

  it("filters the currently loaded products by typing in the search box", async () => {
    const user = userEvent.setup();
    fetchProductsMock.mockResolvedValue(makeProducts(3));
    render(<ProductList onSelect={vi.fn()} onToggleFav={vi.fn()} />);

    await screen.findByText("商品1");
    await user.type(screen.getByPlaceholderText("商品名・説明で検索..."), "商品2");

    expect(screen.queryByText("商品1")).not.toBeInTheDocument();
    expect(screen.getByText("商品2")).toBeInTheDocument();
  });

  it("paginates products across pages", async () => {
    const user = userEvent.setup();
    fetchProductsMock.mockResolvedValue(makeProducts(8)); // PAGE_SIZE = 6
    render(<ProductList onSelect={vi.fn()} onToggleFav={vi.fn()} />);

    await screen.findByText("商品1");
    expect(screen.getByText("商品6")).toBeInTheDocument();
    expect(screen.queryByText("商品7")).not.toBeInTheDocument();

    await user.click(screen.getByText("次へ →"));

    await waitFor(() => {
      expect(screen.getByText("商品7")).toBeInTheDocument();
    });
    expect(screen.queryByText("商品1")).not.toBeInTheDocument();
  });
});
