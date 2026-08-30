import { z } from "zod";
import { getOwnedGames as fetchOwnedGames, resolveSteamId, SteamProfilePrivateError } from "../clients/steamApi.js";

export const getOwnedGamesInputSchema = {
  steam_id: z
    .string()
    .describe("A 64-bit SteamID64, or a vanity profile name (the part after /id/ in a steamcommunity.com profile URL)."),
};

export async function getOwnedGamesHandler(
  { steam_id }: { steam_id: string },
  apiKey: string
) {
  try {
    const resolvedId = await resolveSteamId(apiKey, steam_id);
    const games = await fetchOwnedGames(apiKey, resolvedId);

    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(
            {
              steam_id: resolvedId,
              game_count: games.length,
              games: games.map((g) => ({
                app_id: g.appid,
                name: g.name,
                playtime_forever_minutes: g.playtime_forever,
              })),
            },
            null,
            2
          ),
        },
      ],
    };
  } catch (err) {
    if (err instanceof SteamProfilePrivateError) {
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({
              error: "profile_private_or_empty",
              message:
                "This Steam profile is private, has no games, or its game list is hidden. Ask the user to set their profile/game details to Public in Steam privacy settings, or verify the SteamID.",
              steam_id,
            }),
          },
        ],
        isError: true,
      };
    }
    throw err;
  }
}
