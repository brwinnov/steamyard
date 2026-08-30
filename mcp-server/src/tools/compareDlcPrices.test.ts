import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../clients/isThereAnyDeal.js", () => ({
  lookupItadId: vi.fn(),
  getCurrentPrices: vi.fn(),
}));

import { lookupItadId, getCurrentPrices } from "../clients/isThereAnyDeal.js";
import { compareDlcPricesHandler } from "./compareDlcPrices.js";

function fakeKv() {
  const store = new Map<string, string>();
  return {
    get: vi.fn(async (key: string) => store.get(key) ?? null),
    put: vi.fn(async (key: string, value: string) => {
      store.set(key, value);
    }),
  };
}

const historyLow = {
  all: { amount: 4.92, currency: "USD" },
  y1: { amount: 4.92, currency: "USD" },
  m3: { amount: 5.16, currency: "USD" },
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("compareDlcPricesHandler", () => {
  it("returns itad_not_configured when no ITAD API key is set", async () => {
    const result = await compareDlcPricesHandler({ app_id: 24010 }, undefined);
    const body = JSON.parse(result.content[0].text);
    expect(result.isError).toBe(true);
    expect(body.error).toBe("itad_not_configured");
  });

  it("returns app_not_found_on_itad when ITAD has no listing", async () => {
    vi.mocked(lookupItadId).mockResolvedValue(null);
    const result = await compareDlcPricesHandler({ app_id: 999999999 }, "itad-key");
    const body = JSON.parse(result.content[0].text);
    expect(result.isError).toBe(true);
    expect(body.error).toBe("app_not_found_on_itad");
  });

  it("returns prices sorted cheapest-first, with history-low data", async () => {
    vi.mocked(lookupItadId).mockResolvedValue("abc-123");
    vi.mocked(getCurrentPrices).mockResolvedValue({
      itadId: "abc-123",
      historyLow,
      deals: [
        {
          shop: { id: 61, name: "Steam" },
          price: { amount: 29.99, currency: "USD" },
          regular: { amount: 29.99, currency: "USD" },
          cut: 0,
          storeLow: { amount: 4.99, currency: "USD" },
          url: "https://itad.link/steam",
        },
        {
          shop: { id: 65, name: "JoyBuggy" },
          price: { amount: 5.85, currency: "USD" },
          regular: { amount: 29.99, currency: "USD" },
          cut: 80,
          storeLow: { amount: 5.85, currency: "USD" },
          url: "https://itad.link/joybuggy",
        },
      ],
    });

    const result = await compareDlcPricesHandler({ app_id: 24010 }, "itad-key");
    const body = JSON.parse(result.content[0].text);

    expect(body.history_low).toEqual(historyLow);
    expect(body.prices[0].store).toBe("JoyBuggy"); // cheapest first
    expect(body.prices[1].store).toBe("Steam");
  });

  it("caches the ITAD id lookup so a repeat call skips it", async () => {
    vi.mocked(lookupItadId).mockResolvedValue("abc-123");
    vi.mocked(getCurrentPrices).mockResolvedValue({ itadId: "abc-123", historyLow, deals: [] });
    const kv = fakeKv();

    await compareDlcPricesHandler({ app_id: 24010 }, "itad-key", kv as never);
    await compareDlcPricesHandler({ app_id: 24010 }, "itad-key", kv as never);

    expect(lookupItadId).toHaveBeenCalledTimes(1);
  });
});
