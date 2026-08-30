import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../clients/steamApi.js", async () => {
  const actual =
    await vi.importActual<typeof import("../clients/steamApi.js")>("../clients/steamApi.js");
  return {
    ...actual,
    resolveSteamId: vi.fn(),
    getOwnedGames: vi.fn(),
  };
});

import { resolveSteamId, getOwnedGames, SteamProfilePrivateError } from "../clients/steamApi.js";
import { getOwnedGamesHandler } from "./getOwnedGames.js";

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
});

describe("getOwnedGamesHandler", () => {
  it("returns the owned games list on success", async () => {
    vi.mocked(resolveSteamId).mockResolvedValue("76561197979389611");
    vi.mocked(getOwnedGames).mockResolvedValue([
      { appid: 24010, name: "Train Simulator World", playtime_forever: 120 },
    ]);

    const result = await getOwnedGamesHandler({ steam_id: "AckrosG" }, "api-key");
    const body = JSON.parse(result.content[0].text);

    expect(body.steam_id).toBe("76561197979389611");
    expect(body.game_count).toBe(1);
    expect(body.games[0]).toEqual({
      app_id: 24010,
      name: "Train Simulator World",
      playtime_forever_minutes: 120,
    });
  });

  it("returns a clear profile_private_or_empty error instead of throwing", async () => {
    vi.mocked(resolveSteamId).mockResolvedValue("76561197979389611");
    vi.mocked(getOwnedGames).mockRejectedValue(new SteamProfilePrivateError("76561197979389611"));

    const result = await getOwnedGamesHandler({ steam_id: "AckrosG" }, "api-key");
    const body = JSON.parse(result.content[0].text);

    expect(result.isError).toBe(true);
    expect(body.error).toBe("profile_private_or_empty");
  });

  it("uses the KV cache on a repeat lookup instead of calling the Steam API again", async () => {
    vi.mocked(resolveSteamId).mockResolvedValue("76561197979389611");
    vi.mocked(getOwnedGames).mockResolvedValue([
      { appid: 10, name: "Counter-Strike", playtime_forever: 0 },
    ]);
    const kv = fakeKv();

    await getOwnedGamesHandler({ steam_id: "AckrosG" }, "api-key", kv as never);
    await getOwnedGamesHandler({ steam_id: "AckrosG" }, "api-key", kv as never);

    expect(getOwnedGames).toHaveBeenCalledTimes(1);
  });
});
