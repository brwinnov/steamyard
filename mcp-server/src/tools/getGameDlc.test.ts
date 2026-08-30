import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../clients/steamDb.js", () => ({
  getAppDetails: vi.fn(),
  getAppDetailsBatch: vi.fn(),
}));
vi.mock("../clients/steamApi.js", async () => {
  const actual =
    await vi.importActual<typeof import("../clients/steamApi.js")>("../clients/steamApi.js");
  return {
    ...actual,
    resolveSteamId: vi.fn(),
    getOwnedGames: vi.fn(),
  };
});

import { getAppDetails, getAppDetailsBatch } from "../clients/steamDb.js";
import { resolveSteamId, getOwnedGames, SteamProfilePrivateError } from "../clients/steamApi.js";
import { getGameDlcHandler } from "./getGameDlc.js";

function fakeKv() {
  const store = new Map<string, string>();
  return {
    get: vi.fn(async (key: string) => store.get(key) ?? null),
    put: vi.fn(async (key: string, value: string) => {
      store.set(key, value);
    }),
  };
}

const baseGame = {
  appid: 24010,
  name: "Train Simulator World",
  is_dlc: false,
  release_date: "2016-01-01",
  price: null,
  dlc_app_ids: [1804510],
};

const dlc = {
  appid: 1804510,
  name: "Hennessey Railway",
  is_dlc: true,
  release_date: "2026-09-12",
  price: {
    currency: "USD",
    initial_formatted: "$19.99",
    final_formatted: "$19.99",
    discount_percent: 0,
  },
  dlc_app_ids: [],
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getGameDlcHandler", () => {
  it("returns app_not_found when Steam has no listing for the base app_id", async () => {
    vi.mocked(getAppDetails).mockResolvedValue(null);

    const result = await getGameDlcHandler({ app_id: 999999999 }, "api-key");
    const body = JSON.parse(result.content[0].text);

    expect(result.isError).toBe(true);
    expect(body.error).toBe("app_not_found");
  });

  it("returns DLC with owned: null when no steam_id is supplied", async () => {
    vi.mocked(getAppDetails).mockResolvedValue(baseGame);
    vi.mocked(getAppDetailsBatch).mockResolvedValue([dlc]);

    const result = await getGameDlcHandler({ app_id: 24010 }, "api-key");
    const body = JSON.parse(result.content[0].text);

    expect(body.ownership_check).toBe("not_requested");
    expect(body.dlc[0].owned).toBeNull();
  });

  it("flags DLC as owned/unowned when a steam_id is supplied", async () => {
    vi.mocked(getAppDetails).mockResolvedValue(baseGame);
    vi.mocked(getAppDetailsBatch).mockResolvedValue([dlc]);
    vi.mocked(resolveSteamId).mockResolvedValue("76561197979389611");
    vi.mocked(getOwnedGames).mockResolvedValue([
      { appid: 1804510, name: "Hennessey Railway", playtime_forever: 0 },
    ]);

    const result = await getGameDlcHandler({ app_id: 24010, steam_id: "AckrosG" }, "api-key");
    const body = JSON.parse(result.content[0].text);

    expect(body.ownership_check).toBe("ok");
    expect(body.dlc[0].owned).toBe(true);
  });

  it("reports profile_private_or_empty as the ownership_check without failing the whole call", async () => {
    vi.mocked(getAppDetails).mockResolvedValue(baseGame);
    vi.mocked(getAppDetailsBatch).mockResolvedValue([dlc]);
    vi.mocked(resolveSteamId).mockResolvedValue("76561197979389611");
    vi.mocked(getOwnedGames).mockRejectedValue(new SteamProfilePrivateError("76561197979389611"));

    const result = await getGameDlcHandler({ app_id: 24010, steam_id: "AckrosG" }, "api-key");
    const body = JSON.parse(result.content[0].text);

    expect(result.isError).toBeUndefined();
    expect(body.ownership_check).toBe("profile_private_or_empty");
    expect(body.dlc[0].owned).toBeNull();
  });

  it("caches the base+DLC catalog so a repeat lookup skips the Store API", async () => {
    vi.mocked(getAppDetails).mockResolvedValue(baseGame);
    vi.mocked(getAppDetailsBatch).mockResolvedValue([dlc]);
    const kv = fakeKv();

    await getGameDlcHandler({ app_id: 24010 }, "api-key", kv as never);
    await getGameDlcHandler({ app_id: 24010 }, "api-key", kv as never);

    expect(getAppDetails).toHaveBeenCalledTimes(1);
  });
});
