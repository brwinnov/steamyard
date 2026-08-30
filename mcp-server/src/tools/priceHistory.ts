import { z } from "zod";
import { lookupBySteamAppId, getGameDetails, getStoreNames } from "../clients/cheapShark.js";
import { getCached, setCached } from "../lib/cache.js";

export const priceHistoryInputSchema = {
  app_id: z
    .number()
    .int()
    .positive()
    .describe("The Steam app_id for a game, e.g. 24010 for Train Simulator World."),
};

const LOOKUP_CACHE_TTL_SECONDS = 60 * 60; // ~1h
const DETAILS_CACHE_TTL_SECONDS = 60 * 60; // ~1h
const STORE_NAMES_CACHE_TTL_SECONDS = 24 * 60 * 60; // ~24h — store list changes rarely

// Thresholds are deliberately simple and stated alongside the numbers they're based on, per
// steamyard-skill's "verdict first, then reasoning, numbers shown" communication style.
function buildVerdict(currentCheapest: number, allTimeLow: number | null): string {
  if (allTimeLow === null) {
    return "No historical low data available for this game yet — can't assess against past prices.";
  }
  const ratio = currentCheapest / allTimeLow;
  if (ratio <= 1.05) {
    return `At or within 5% of its all-time low ($${allTimeLow.toFixed(2)}) — good time to buy.`;
  }
  if (ratio <= 1.25) {
    return `Within 25% of its all-time low ($${allTimeLow.toFixed(2)}) — a reasonable price, though it has gone a bit lower before.`;
  }
  return `Well above its all-time low ($${allTimeLow.toFixed(2)} vs. current $${currentCheapest.toFixed(2)}) — has historically dropped further; consider waiting unless you need it now.`;
}

export async function priceHistoryHandler({ app_id }: { app_id: number }, kv?: KVNamespace) {
  const lookupCacheKey = `cs-lookup:${app_id}`;
  let lookup = await getCached<Awaited<ReturnType<typeof lookupBySteamAppId>>>(kv, lookupCacheKey);
  if (lookup === null) {
    lookup = await lookupBySteamAppId(app_id);
    if (lookup) await setCached(kv, lookupCacheKey, lookup, LOOKUP_CACHE_TTL_SECONDS);
  }

  if (!lookup) {
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify({ error: "app_not_tracked_by_cheapshark", app_id }),
        },
      ],
      isError: true,
    };
  }

  const detailsCacheKey = `cs-details:${lookup.gameId}`;
  let details = await getCached<Awaited<ReturnType<typeof getGameDetails>>>(kv, detailsCacheKey);
  if (!details) {
    details = await getGameDetails(lookup.gameId);
    await setCached(kv, detailsCacheKey, details, DETAILS_CACHE_TTL_SECONDS);
  }

  let storeNames = await getCached<Record<string, string>>(kv, "cs-stores");
  if (!storeNames) {
    storeNames = await getStoreNames();
    await setCached(kv, "cs-stores", storeNames, STORE_NAMES_CACHE_TTL_SECONDS);
  }

  const cheapestDeal = [...details.deals].sort((a, b) => a.price - b.price)[0];
  const currentCheapest = cheapestDeal?.price ?? Number(lookup.cheapest);
  const allTimeLow = details.cheapestPriceEver?.price ?? null;

  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(
          {
            app_id,
            game: details.title,
            current_cheapest_price_usd: currentCheapest,
            all_time_low: details.cheapestPriceEver
              ? {
                  price_usd: details.cheapestPriceEver.price,
                  date: new Date(details.cheapestPriceEver.date * 1000).toISOString().slice(0, 10),
                }
              : null,
            verdict: buildVerdict(currentCheapest, allTimeLow),
            deals: details.deals.map((d) => ({
              store: storeNames?.[d.storeId] ?? `Store #${d.storeId}`,
              price_usd: d.price,
              retail_price_usd: d.retailPrice,
              savings_percent: d.savingsPercent,
            })),
          },
          null,
          2
        ),
      },
    ],
  };
}
