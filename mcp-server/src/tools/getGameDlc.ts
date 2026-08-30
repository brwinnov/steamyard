import { z } from "zod";
import { getAppDetails, getAppDetailsBatch } from "../clients/steamDb.js";
import { getOwnedGames, resolveSteamId, SteamProfilePrivateError } from "../clients/steamApi.js";

export const getGameDlcInputSchema = {
  app_id: z.number().int().positive().describe("The base game's Steam app_id, e.g. 24010 for Train Simulator World."),
  steam_id: z
    .string()
    .optional()
    .describe("Optional 64-bit SteamID64 or vanity name. When provided, each DLC is flagged owned/unowned."),
};

export async function getGameDlcHandler({
  app_id,
  steam_id,
}: {
  app_id: number;
  steam_id?: string;
}, apiKey: string) {
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

  let ownedAppIds: Set<number> | null = null;
  let ownershipError: string | null = null;

  if (steam_id) {
    try {
      const resolvedId = await resolveSteamId(apiKey, steam_id);
      const owned = await getOwnedGames(apiKey, resolvedId);
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
