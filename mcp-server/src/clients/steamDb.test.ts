import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { getAppDetails, getAppDetailsBatch } from "./steamDb.js";

function appDetailsResponse(appId: number, data: Record<string, unknown> | null, ok = true) {
  return {
    ok,
    status: ok ? 200 : 500,
    json: async () => ({ [String(appId)]: data ? { success: true, data } : { success: false } }),
  } as Response;
}

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("getAppDetails", () => {
  it("parses a base game's details, including its DLC list", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        appDetailsResponse(24010, {
          steam_appid: 24010,
          name: "Train Simulator World",
          type: "game",
          dlc: [1804510],
        })
      )
    );
    const details = await getAppDetails(24010);
    expect(details).toEqual({
      appid: 24010,
      name: "Train Simulator World",
      is_dlc: false,
      release_date: null,
      price: null,
      dlc_app_ids: [1804510],
    });
  });

  it("parses price_overview into the price field", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        appDetailsResponse(1804510, {
          steam_appid: 1804510,
          name: "Some DLC",
          type: "dlc",
          price_overview: {
            currency: "USD",
            initial_formatted: "$19.99",
            final_formatted: "$19.99",
            discount_percent: 0,
          },
        })
      )
    );
    const details = await getAppDetails(1804510);
    expect(details?.price).toEqual({
      currency: "USD",
      initial_formatted: "$19.99",
      final_formatted: "$19.99",
      discount_percent: 0,
    });
    expect(details?.is_dlc).toBe(true);
  });

  it("returns null when Steam has no listing for the app", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => appDetailsResponse(999999999, null))
    );
    expect(await getAppDetails(999999999)).toBeNull();
  });

  it("retries on 429 and succeeds if a later attempt returns 200", async () => {
    vi.useFakeTimers();
    let calls = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        calls++;
        if (calls < 2) return { ok: false, status: 429 } as Response;
        return appDetailsResponse(24010, {
          steam_appid: 24010,
          name: "Train Simulator World",
          type: "game",
        });
      })
    );

    const promise = getAppDetails(24010);
    await vi.runAllTimersAsync();
    const details = await promise;

    expect(calls).toBe(2);
    expect(details?.name).toBe("Train Simulator World");
    vi.useRealTimers();
  });

  it("throws after exhausting all retries on persistent 429s", async () => {
    vi.useFakeTimers();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: false, status: 429 }) as Response)
    );

    const promise = getAppDetails(24010);
    const assertion = expect(promise).rejects.toThrow(/429/);
    await vi.runAllTimersAsync();
    await assertion;
    vi.useRealTimers();
  });
});

describe("getAppDetailsBatch", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("fetches each app id and skips ones Steam doesn't recognize", async () => {
    vi.useFakeTimers();
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string | URL) => {
        const appId = new URL(url).searchParams.get("appids");
        if (appId === "111")
          return appDetailsResponse(111, { steam_appid: 111, name: "DLC One", type: "dlc" });
        return appDetailsResponse(222, null); // 222 has no listing
      })
    );

    const promise = getAppDetailsBatch([111, 222]);
    await vi.runAllTimersAsync();
    const results = await promise;

    expect(results).toHaveLength(1);
    expect(results[0].name).toBe("DLC One");
  });
});
