import { describe, it, expect, vi, beforeEach } from "vitest";
import { lookupBySteamAppId, getGameDetails, getStoreNames } from "./cheapShark.js";

function jsonResponse(body: unknown, ok = true) {
  return { ok, status: ok ? 200 : 500, json: async () => body } as Response;
}

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("lookupBySteamAppId", () => {
  it("returns the CheapShark game id and cheapest price", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonResponse([{ gameID: "245837", cheapest: "5.96" }]))
    );
    expect(await lookupBySteamAppId(24010)).toEqual({ gameId: "245837", cheapest: "5.96" });
  });

  it("returns null when CheapShark doesn't track the app", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonResponse([]))
    );
    expect(await lookupBySteamAppId(999999999)).toBeNull();
  });

  it("sends a descriptive User-Agent header (CheapShark 403s without one)", async () => {
    const fetchSpy = vi.fn(async (_url: string | URL, _options?: RequestInit) => jsonResponse([]));
    vi.stubGlobal("fetch", fetchSpy);
    await lookupBySteamAppId(24010);
    const [, options] = fetchSpy.mock.calls[0];
    expect(options?.headers).toMatchObject({
      "User-Agent": expect.stringContaining("steamyard-mcp"),
    });
  });
});

describe("getGameDetails", () => {
  it("parses cheapestPriceEver and deals, converting string prices to numbers", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        jsonResponse({
          info: { title: "Train Simulator Classic" },
          cheapestPriceEver: { price: "4.98", date: 1767612101 },
          deals: [{ storeID: "1", price: "29.99", retailPrice: "29.99", savings: "0.000000" }],
        })
      )
    );
    const details = await getGameDetails("245837");
    expect(details.title).toBe("Train Simulator Classic");
    expect(details.cheapestPriceEver).toEqual({ price: 4.98, date: 1767612101 });
    expect(details.deals).toEqual([
      { storeId: "1", price: 29.99, retailPrice: 29.99, savingsPercent: 0 },
    ]);
  });

  it("returns null cheapestPriceEver when CheapShark has no historical data", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonResponse({ info: { title: "Some Game" }, deals: [] }))
    );
    const details = await getGameDetails("1");
    expect(details.cheapestPriceEver).toBeNull();
  });
});

describe("getStoreNames", () => {
  it("returns a storeID -> storeName map", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        jsonResponse([
          { storeID: "1", storeName: "Steam" },
          { storeID: "7", storeName: "GOG" },
        ])
      )
    );
    expect(await getStoreNames()).toEqual({ "1": "Steam", "7": "GOG" });
  });
});
