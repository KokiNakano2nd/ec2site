import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const fetchProductByIdMock = vi.fn();
const fetchRecommendationsMock = vi.fn();
vi.mock("../api/products", () => ({
  fetchProductById: (...args) => fetchProductByIdMock(...args),
  fetchRecommendations: (...args) => fetchRecommendationsMock(...args),
}));

const addToCartMock = vi.fn();
vi.mock("../api/cart", () => ({
  addToCart: (...args) => addToCartMock(...args),
}));

const fetchReviewsMock = vi.fn();
const postReviewMock = vi.fn();
vi.mock("../api/reviews", () => ({
  fetchReviews: (...args) => fetchReviewsMock(...args),
  postReview: (...args) => postReviewMock(...args),
}));

const useAuthMock = vi.fn();
vi.mock("../AuthContext", () => ({
  useAuth: () => useAuthMock(),
}));

import { ProductDetail } from "./ProductDetail";

const product = {
  id: 1,
  name: "テスト商品",
  description: "テスト説明",
  price: 5000,
  stock: 10,
  image_url: "https://example.com/img.png",
  images: [],
};

describe("ProductDetail", () => {
  beforeEach(() => {
    fetchProductByIdMock.mockReset().mockResolvedValue(product);
    fetchRecommendationsMock.mockReset().mockResolvedValue([]);
    fetchReviewsMock.mockReset().mockResolvedValue([]);
    addToCartMock.mockReset();
    useAuthMock.mockReset().mockReturnValue({ token: "test-token" });
  });

  it("renders the product from fetchProductById", async () => {
    render(<ProductDetail productId={1} onBack={vi.fn()} onNavigateLogin={vi.fn()} showToast={vi.fn()} onToggleFav={vi.fn()} onSelect={vi.fn()} />);
    expect(await screen.findByText("テスト商品")).toBeInTheDocument();
    expect(screen.getByText("テスト説明")).toBeInTheDocument();
  });

  it("calls addToCart and showToast when adding to cart", async () => {
    const user = userEvent.setup();
    addToCartMock.mockResolvedValue({});
    const showToast = vi.fn();
    render(<ProductDetail productId={1} onBack={vi.fn()} onNavigateLogin={vi.fn()} showToast={showToast} onToggleFav={vi.fn()} onSelect={vi.fn()} />);

    await screen.findByText("テスト商品");
    await user.click(screen.getByText("カートに入れる"));

    expect(addToCartMock).toHaveBeenCalledWith("test-token", 1, 1);
    expect(showToast).toHaveBeenCalledWith("カートに追加しました");
  });

  it("calls onToggleFav when the favorite button is clicked", async () => {
    const user = userEvent.setup();
    const onToggleFav = vi.fn();
    render(<ProductDetail productId={1} onBack={vi.fn()} onNavigateLogin={vi.fn()} showToast={vi.fn()} onToggleFav={onToggleFav} onSelect={vi.fn()} />);

    await screen.findByText("テスト商品");
    await user.click(screen.getByText("🤍 お気に入りに追加"));

    expect(onToggleFav).toHaveBeenCalledWith(1);
  });
});
