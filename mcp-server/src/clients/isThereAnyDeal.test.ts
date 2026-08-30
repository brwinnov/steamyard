import { describe, it, expect, vi, beforeEach } from "vitest";
import { lookupItadId, getCurrentPrices } from "./isThereAnyDeal.js";

function jsonResponse(body: unknown, ok = true) {
  return { ok, status: ok ? 200 : 500, json: async () => body } as Response;
}

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("lookupItadId", () => {
  it("returns the ITAD game id when found", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonResponse({ found: true, game: { id: "abc-123" } }))
    );
    expect(await lookupItadId("key", 24010)).toBe("abc-123");
  });

  it("returns null when ITAD has no listing", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonResponse({ found: false }))
    );
    expect(await lookupItadId("key", 999999999)).toBeNull();
  });

  it("throws when the HTTP request fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonResponse({}, false))
    );
    await expect(lookupItadId("key", 24010)).rejects.toThrow(/lookup failed/);
  });
});

describe("getCurrentPrices", () => {
  const historyLow = {
    all: { amount: 4.92, currency: "USD" },
    y1: { amount: 4.92, currency: "USD" },
    m3: { amount: 5.16, currency: "USD" },
  };
  const deal = {
    shop: { id: 61, name: "Steam" },
    price: { amount: 29.99, currency: "USD" },
    regular: { amount: 29.99, currency: "USD" },
    cut: 0,
    storeLow: { amount: 4.99, currency: "USD" },
    url: "https://itad.link/x",
  };

  it("returns history-low and deals for the given ITAD id", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonResponse([{ id: "abc-123", historyLow, deals: [deal] }]))
    );
    const result = await getCurrentPrices("key", "abc-123");
    expect(result?.historyLow).toEqual(historyLow);
    expect(result?.deals).toEqual([deal]);
  });

  it("returns null when the response doesn't include the requested id", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonResponse([]))
    );
    expect(await getCurrentPrices("key", "missing-id")).toBeNull();
  });

  it("throws when the HTTP request fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonResponse({}, false))
    );
    await expect(getCurrentPrices("key", "abc-123")).rejects.toThrow(/prices lookup failed/);
  });
});
