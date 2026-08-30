import { describe, it, expect, vi, beforeEach } from "vitest";
import { resolveSteamId, getOwnedGames, SteamProfilePrivateError } from "./steamApi.js";

function jsonResponse(body: unknown, ok = true) {
  return { ok, status: ok ? 200 : 500, json: async () => body } as Response;
}

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("resolveSteamId", () => {
  it("passes a 17-digit SteamID64 straight through without calling the API", async () => {
    const fetchSpy = vi.spyOn(global, "fetch");
    const id = await resolveSteamId("key", "76561197979389611");
    expect(id).toBe("76561197979389611");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("resolves a vanity name via the Steam Web API", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonResponse({ response: { success: 1, steamid: "76561197979389611" } }))
    );
    const id = await resolveSteamId("key", "AckrosG");
    expect(id).toBe("76561197979389611");
  });

  it("throws with Steam's message when the vanity name can't be resolved", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonResponse({ response: { success: 42, message: "No match" } }))
    );
    await expect(resolveSteamId("key", "nonexistentuser")).rejects.toThrow("No match");
  });
});

describe("getOwnedGames", () => {
  it("returns the games array on success", async () => {
    const games = [{ appid: 24010, name: "Train Simulator World", playtime_forever: 120 }];
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonResponse({ response: { game_count: 1, games } }))
    );
    expect(await getOwnedGames("key", "76561197979389611")).toEqual(games);
  });

  it("throws SteamProfilePrivateError when the response has no games (private profile)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonResponse({ response: {} }))
    );
    await expect(getOwnedGames("key", "76561197979389611")).rejects.toBeInstanceOf(
      SteamProfilePrivateError
    );
  });

  it("throws SteamProfilePrivateError when game_count is 0", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonResponse({ response: { game_count: 0, games: [] } }))
    );
    await expect(getOwnedGames("key", "76561197979389611")).rejects.toBeInstanceOf(
      SteamProfilePrivateError
    );
  });

  it("throws a plain error when the HTTP request itself fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonResponse({}, false))
    );
    await expect(getOwnedGames("key", "76561197979389611")).rejects.toThrow(/GetOwnedGames failed/);
  });
});
