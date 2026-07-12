import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FavoritesView } from "./FavoritesView";

const favItems = [
  { product: { id: 1, name: "お気に入り商品", description: "説明", price: 2000, stock: 5, image_url: "https://example.com/img.png" } },
];

describe("FavoritesView", () => {
  it("shows an empty state when there are no favorites", () => {
    render(<FavoritesView favItems={[]} onToggleFav={vi.fn()} onSelect={vi.fn()} />);
    expect(screen.getByText("お気に入りに追加した商品はありません")).toBeInTheDocument();
  });

  it("renders the favItems prop directly", () => {
    render(<FavoritesView favItems={favItems} onToggleFav={vi.fn()} onSelect={vi.fn()} />);
    expect(screen.getByText("お気に入り商品")).toBeInTheDocument();
  });

  it("calls onToggleFav when clicking the remove button", async () => {
    const user = userEvent.setup();
    const onToggleFav = vi.fn();
    render(<FavoritesView favItems={favItems} onToggleFav={onToggleFav} onSelect={vi.fn()} />);

    await user.click(screen.getByText("❤️"));
    expect(onToggleFav).toHaveBeenCalledWith(1);
  });

  it("calls onSelect when clicking the product card", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<FavoritesView favItems={favItems} onToggleFav={vi.fn()} onSelect={onSelect} />);

    await user.click(screen.getByText("お気に入り商品"));
    expect(onSelect).toHaveBeenCalledWith(1);
  });
});
