import { z } from "zod";
import { lookupItadId, getCurrentPrices } from "../clients/isThereAnyDeal.js";
import { getCached, setCached } from "../lib/cache.js";

export const compareDlcPricesInputSchema = {
  app_id: z
    .number()
    .int()
    .positive()
    .describe("The Steam app_id for a game or DLC, e.g. 24010 for Train Simulator World."),
  country: z
    .string()
    .length(2)
    .optional()
    .describe(
      'Two-letter country code for currency/pricing region, e.g. "US" or "DE". Defaults to "US".'
    ),
};

const ITAD_ID_CACHE_TTL_SECONDS = 7 * 24 * 60 * 60; // ~7d — app_id -> ITAD id rarely changes
const ITAD_PRICES_CACHE_TTL_SECONDS = 60 * 60; // ~1h — prices/deals change during sales

export async function compareDlcPricesHandler(
  { app_id, country = "US" }: { app_id: number; country?: string },
  itadApiKey: string | undefined,
  kv?: KVNamespace
) {
  if (!itadApiKey) {
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify({
            error: "itad_not_configured",
            message: "Reseller price comparison requires an ITAD_API_KEY secret to be set.",
          }),
        },
      ],
      isError: true,
    };
  }

  const idCacheKey = `itad-id:${app_id}`;
  let itadId = await getCached<string>(kv, idCacheKey);
  if (!itadId) {
    const found = await lookupItadId(itadApiKey, app_id);
    if (!found) {
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({ error: "app_not_found_on_itad", app_id }),
          },
        ],
        isError: true,
      };
    }
    itadId = found;
    await setCached(kv, idCacheKey, itadId, ITAD_ID_CACHE_TTL_SECONDS);
  }

  const pricesCacheKey = `itad-prices:${itadId}:${country}`;
  let prices = await getCached<Awaited<ReturnType<typeof getCurrentPrices>>>(kv, pricesCacheKey);
  if (!prices) {
    prices = await getCurrentPrices(itadApiKey, itadId, country);
    if (prices) await setCached(kv, pricesCacheKey, prices, ITAD_PRICES_CACHE_TTL_SECONDS);
  }

  if (!prices) {
    return {
      content: [
        { type: "text" as const, text: JSON.stringify({ error: "no_current_prices", app_id }) },
      ],
      isError: true,
    };
  }

  const sortedDeals = [...prices.deals].sort((a, b) => a.price.amount - b.price.amount);

  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(
          {
            app_id,
            country,
            history_low: prices.historyLow,
            prices: sortedDeals.map((d) => ({
              store: d.shop.name,
              price: d.price,
              regular_price: d.regular,
              discount_percent: d.cut,
              store_low: d.storeLow,
              url: d.url,
            })),
          },
          null,
          2
        ),
      },
    ],
  };
}
