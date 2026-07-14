import { afterEach, describe, expect, it, vi } from "vitest";

import { ApiError, apiFetch } from "./client";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("apiFetch", () => {
  it("sends JSON, bearer token, and the abort signal", async () => {
    const signal = new AbortController().signal;
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(apiFetch("/items", { method: "POST", token: "token", body: { id: 1 }, signal })).resolves.toEqual({
      ok: true,
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:8000/items",
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer token" },
        body: JSON.stringify({ id: 1 }),
        signal,
      }),
    );
  });

  it("throws a structured ApiError for a JSON error response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ detail: "invalid" }), {
          status: 422,
          headers: { "Content-Type": "application/json" },
        }),
      ),
    );

    await expect(apiFetch("/items")).rejects.toMatchObject({
      name: "ApiError",
      message: "invalid",
      status: 422,
      detail: "invalid",
    });
  });

  it("uses the fallback message for a non-JSON error response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("bad gateway", { status: 502 })));

    const error = await apiFetch("/items", { errorMessage: "temporary failure" }).catch((caught) => caught);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ message: "temporary failure", status: 502, detail: undefined });
  });

  it("returns undefined for a 204 response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 204 })));

    await expect(apiFetch("/items")).resolves.toBeUndefined();
  });

  it("preserves AbortError without converting it", async () => {
    const abortError = new DOMException("aborted", "AbortError");
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(abortError));

    await expect(apiFetch("/items")).rejects.toBe(abortError);
  });
});
