// Wraps IsThereAnyDeal's public v2/v3 API (https://docs.isthereanydeal.com/) for cross-retailer
// price comparison. ITAD's own tracked shop list (Steam, Fanatical, GOG, GreenManGaming, Humble,
// Epic, etc.) supersedes what the original plan called "AllKeyShop" — AllKeyShop itself is a
// price-comparison site, not a first-party retailer, and has no public API of its own.

const ITAD_API_BASE = "https://api.isthereanydeal.com";

interface Money {
  amount: number;
  currency: string;
}

export interface ItadDeal {
  shop: { id: number; name: string };
  price: Money;
  regular: Money;
  cut: number;
  storeLow: Money;
  url: string;
}

export interface ItadPrices {
  itadId: string;
  historyLow: { all: Money; y1: Money; m3: Money };
  deals: ItadDeal[];
}

/** Resolves a Steam app_id to ITAD's internal game id. Returns null if ITAD has no listing. */
export async function lookupItadId(apiKey: string, appId: number): Promise<string | null> {
  const url = new URL(`${ITAD_API_BASE}/games/lookup/v1`);
  url.searchParams.set("key", apiKey);
  url.searchParams.set("appid", String(appId));

  const res = await fetch(url);
  if (!res.ok) throw new Error(`IsThereAnyDeal lookup failed for app_id ${appId}: ${res.status}`);

  const data = (await res.json()) as { found: boolean; game?: { id: string } };
  return data.found && data.game ? data.game.id : null;
}

/** Fetches current cross-retailer prices + historical-low windows for an ITAD game id. */
export async function getCurrentPrices(
  apiKey: string,
  itadId: string,
  country = "US"
): Promise<ItadPrices | null> {
  const url = new URL(`${ITAD_API_BASE}/games/prices/v3`);
  url.searchParams.set("key", apiKey);
  url.searchParams.set("country", country);

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify([itadId]),
  });
  if (!res.ok) throw new Error(`IsThereAnyDeal prices lookup failed for ${itadId}: ${res.status}`);

  const data = (await res.json()) as Array<{
    id: string;
    historyLow: { all: Money; y1: Money; m3: Money };
    deals: ItadDeal[];
  }>;

  const entry = data.find((d) => d.id === itadId);
  if (!entry) return null;

  return { itadId: entry.id, historyLow: entry.historyLow, deals: entry.deals };
}
