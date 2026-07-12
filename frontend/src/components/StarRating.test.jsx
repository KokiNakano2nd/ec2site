import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StarRating } from "./StarRating";

describe("StarRating", () => {
  it("renders 5 stars by default", () => {
    render(<StarRating value={3} />);
    expect(screen.getAllByText("★")).toHaveLength(5);
  });

  it("calls onChange with the clicked star number", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<StarRating value={0} onChange={onChange} />);
    const stars = screen.getAllByText("★");
    await user.click(stars[3]);
    expect(onChange).toHaveBeenCalledWith(4);
  });

  it("does not call onChange when readonly", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<StarRating value={2} onChange={onChange} readonly />);
    const stars = screen.getAllByText("★");
    await user.click(stars[4]);
    expect(onChange).not.toHaveBeenCalled();
  });
});
