import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../clients/cheapShark.js", () => ({
  lookupBySteamAppId: vi.fn(),
  getGameDetails: vi.fn(),
  getStoreNames: vi.fn(),
}));

import { lookupBySteamAppId, getGameDetails, getStoreNames } from "../clients/cheapShark.js";
import { priceHistoryHandler } from "./priceHistory.js";

function fakeKv() {
  const store = new Map<string, string>();
  return {
    get: vi.fn(async (key: string) => store.get(key) ?? null),
    put: vi.fn(async (key: string, value: string) => {
      store.set(key, value);
    }),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getStoreNames).mockResolvedValue({ "1": "Steam", "20": "GameBillet" });
});

describe("priceHistoryHandler", () => {
  it("returns app_not_tracked_by_cheapshark when CheapShark has no listing", async () => {
    vi.mocked(lookupBySteamAppId).mockResolvedValue(null);
    const result = await priceHistoryHandler({ app_id: 999999999 });
    const body = JSON.parse(result.content[0].text);
    expect(result.isError).toBe(true);
    expect(body.error).toBe("app_not_tracked_by_cheapshark");
  });

  it("gives an at-all-time-low verdict when current price is within 5% of it", async () => {
    vi.mocked(lookupBySteamAppId).mockResolvedValue({ gameId: "245837", cheapest: "5.00" });
    vi.mocked(getGameDetails).mockResolvedValue({
      title: "Some Game",
      cheapestPriceEver: { price: 4.98, date: 1767612101 },
      deals: [{ storeId: "20", price: 5.0, retailPrice: 29.99, savingsPercent: 83 }],
    });

    const result = await priceHistoryHandler({ app_id: 24010 });
    const body = JSON.parse(result.content[0].text);

    expect(body.verdict).toMatch(/good time to buy/i);
    expect(body.deals[0].store).toBe("GameBillet");
  });

  it("gives a wait-and-see verdict when current price is well above the all-time low", async () => {
    vi.mocked(lookupBySteamAppId).mockResolvedValue({ gameId: "245837", cheapest: "29.99" });
    vi.mocked(getGameDetails).mockResolvedValue({
      title: "Some Game",
      cheapestPriceEver: { price: 4.98, date: 1767612101 },
      deals: [{ storeId: "1", price: 29.99, retailPrice: 29.99, savingsPercent: 0 }],
    });

    const result = await priceHistoryHandler({ app_id: 24010 });
    const body = JSON.parse(result.content[0].text);

    expect(body.verdict).toMatch(/consider waiting/i);
  });

  it("handles no historical data gracefully instead of crashing", async () => {
    vi.mocked(lookupBySteamAppId).mockResolvedValue({ gameId: "1", cheapest: "9.99" });
    vi.mocked(getGameDetails).mockResolvedValue({
      title: "New Game",
      cheapestPriceEver: null,
      deals: [{ storeId: "1", price: 9.99, retailPrice: 9.99, savingsPercent: 0 }],
    });

    const result = await priceHistoryHandler({ app_id: 12345 });
    const body = JSON.parse(result.content[0].text);

    expect(body.all_time_low).toBeNull();
    expect(body.verdict).toMatch(/no historical/i);
  });

  it("caches the CheapShark lookup so a repeat call skips it", async () => {
    vi.mocked(lookupBySteamAppId).mockResolvedValue({ gameId: "245837", cheapest: "5.00" });
    vi.mocked(getGameDetails).mockResolvedValue({
      title: "Some Game",
      cheapestPriceEver: { price: 4.98, date: 1767612101 },
      deals: [],
    });
    const kv = fakeKv();

    await priceHistoryHandler({ app_id: 24010 }, kv as never);
    await priceHistoryHandler({ app_id: 24010 }, kv as never);

    expect(lookupBySteamAppId).toHaveBeenCalledTimes(1);
  });
});
