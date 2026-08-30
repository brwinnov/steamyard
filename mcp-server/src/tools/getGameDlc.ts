import { z } from "zod";
import { getAppDetails, getAppDetailsBatch, type AppDetails } from "../clients/steamDb.js";
import { getOwnedGames, resolveSteamId, SteamProfilePrivateError, type OwnedGame } from "../clients/steamApi.js";
import { getCached, setCached } from "../lib/cache.js";

export const getGameDlcInputSchema = {
  app_id: z.number().int().positive().describe("The base game's Steam app_id, e.g. 24010 for Train Simulator World."),
  steam_id: z
    .string()
    .optional()
    .describe("Optional 64-bit SteamID64 or vanity name. When provided, each DLC is flagged owned/unowned."),
};

// Catalog data (name/release date/price) changes slowly; owned-games data is cached separately
// with its own (shorter) TTL in getOwnedGames.ts.
const DLC_CATALOG_CACHE_TTL_SECONDS = 6 * 60 * 60; // ~6h
const OWNED_GAMES_CACHE_TTL_SECONDS = 60 * 60; // ~1h, matches getOwnedGames.ts

interface DlcCatalog {
  base: AppDetails;
  dlcDetails: AppDetails[];
}

export async function getGameDlcHandler({
  app_id,
  steam_id,
}: {
  app_id: number;
  steam_id?: string;
}, apiKey: string, kv?: KVNamespace) {
  const catalogCacheKey = `dlc-catalog:${app_id}`;
  let catalog = await getCached<DlcCatalog>(kv, catalogCacheKey);

  if (!catalog) {
    const base = await getAppDetails(app_id);
    if (!base) {
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({ error: "app_not_found", app_id }),
          },
        ],
        isError: true,
      };
    }
    const dlcDetails = base.dlc_app_ids.length ? await getAppDetailsBatch(base.dlc_app_ids) : [];
    catalog = { base, dlcDetails };
    await setCached(kv, catalogCacheKey, catalog, DLC_CATALOG_CACHE_TTL_SECONDS);
  }

  const { base, dlcDetails } = catalog;

  let ownedAppIds: Set<number> | null = null;
  let ownershipError: string | null = null;

  if (steam_id) {
    try {
      const resolvedId = await resolveSteamId(apiKey, steam_id);
      const ownedCacheKey = `owned-games:${resolvedId}`;
      let owned = await getCached<OwnedGame[]>(kv, ownedCacheKey);
      if (!owned) {
        owned = await getOwnedGames(apiKey, resolvedId);
        await setCached(kv, ownedCacheKey, owned, OWNED_GAMES_CACHE_TTL_SECONDS);
      }
      ownedAppIds = new Set(owned.map((g) => g.appid));
    } catch (err) {
      ownershipError =
        err instanceof SteamProfilePrivateError
          ? "profile_private_or_empty"
          : err instanceof Error
            ? err.message
            : "unknown_error";
    }
  }

  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(
          {
            game: base.name,
            app_id: base.appid,
            ownership_check: steam_id ? (ownershipError ?? "ok") : "not_requested",
            dlc: dlcDetails.map((d) => ({
              dlc_app_id: d.appid,
              name: d.name,
              release_date: d.release_date,
              price: d.price,
              owned: ownedAppIds ? ownedAppIds.has(d.appid) : null,
            })),
          },
          null,
          2
        ),
      },
    ],
  };
}
