// Thin wrapper around the official Steam Web API (ISteamUser).
// Docs: https://steamcommunity.com/dev

const STEAM_WEB_API_BASE = "https://api.steampowered.com";

export interface OwnedGame {
  appid: number;
  name: string;
  playtime_forever: number;
}

export class SteamProfilePrivateError extends Error {
  constructor(steamId: string) {
    super(`Steam profile ${steamId} is private, has no games, or does not exist.`);
    this.name = "SteamProfilePrivateError";
  }
}

/** Resolves a vanity profile URL (e.g. "ackros") to a 64-bit SteamID. Passes numeric IDs through untouched. */
export async function resolveSteamId(apiKey: string, idOrVanity: string): Promise<string> {
  if (/^\d{17}$/.test(idOrVanity)) return idOrVanity;

  const url = new URL(`${STEAM_WEB_API_BASE}/ISteamUser/ResolveVanityURL/v1/`);
  url.searchParams.set("key", apiKey);
  url.searchParams.set("vanityurl", idOrVanity);

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Steam vanity URL lookup failed: ${res.status}`);

  const data = (await res.json()) as {
    response: { success: number; steamid?: string; message?: string };
  };

  if (data.response.success !== 1 || !data.response.steamid) {
    throw new Error(data.response.message ?? `Could not resolve Steam vanity URL "${idOrVanity}"`);
  }

  return data.response.steamid;
}

/** Fetches a public profile's owned games. Throws SteamProfilePrivateError if the profile is private/empty. */
export async function getOwnedGames(apiKey: string, steamId: string): Promise<OwnedGame[]> {
  const url = new URL(`${STEAM_WEB_API_BASE}/IPlayerService/GetOwnedGames/v1/`);
  url.searchParams.set("key", apiKey);
  url.searchParams.set("steamid", steamId);
  url.searchParams.set("include_appinfo", "1");
  url.searchParams.set("format", "json");

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Steam GetOwnedGames failed: ${res.status}`);

  const data = (await res.json()) as {
    response: { game_count?: number; games?: OwnedGame[] };
  };

  // A private (or nonexistent) profile comes back as an empty object, not an error.
  if (!data.response.games || data.response.game_count === 0) {
    throw new SteamProfilePrivateError(steamId);
  }

  return data.response.games;
}
