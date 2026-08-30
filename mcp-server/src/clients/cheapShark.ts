// Wraps CheapShark's public API (https://apidocs.cheapshark.com/) for historical-low pricing.
// No API key needed, but CheapShark rejects requests with a missing/generic User-Agent (a real
// 403 observed during development, not documented anywhere at the time) — every request here
// sends a descriptive one, per their ask.

const CHEAPSHARK_API_BASE = "https://www.cheapshark.com/api/1.0";
const USER_AGENT = "steamyard-mcp/0.1 (+https://github.com/brwinnov/steamyard)";

export interface CheapSharkLookup {
  gameId: string;
  cheapest: string;
}

export interface CheapSharkDeal {
  storeId: string;
  price: number;
  retailPrice: number;
  savingsPercent: number;
}

export interface CheapSharkGameDetails {
  title: string;
  cheapestPriceEver: { price: number; date: number } | null;
  deals: CheapSharkDeal[];
}

function cheapSharkFetch(path: string, params: Record<string, string>): Promise<Response> {
  const url = new URL(`${CHEAPSHARK_API_BASE}${path}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return fetch(url, { headers: { "User-Agent": USER_AGENT } });
}

/** Resolves a Steam app_id to CheapShark's internal game id. Returns null if untracked. */
export async function lookupBySteamAppId(appId: number): Promise<CheapSharkLookup | null> {
  const res = await cheapSharkFetch("/games", { steamAppID: String(appId) });
  if (!res.ok) throw new Error(`CheapShark lookup failed for app_id ${appId}: ${res.status}`);

  const data = (await res.json()) as Array<{ gameID: string; cheapest: string }>;
  if (!data.length) return null;
  return { gameId: data[0].gameID, cheapest: data[0].cheapest };
}

/** Fetches a game's all-time-low price and current deals across stores by CheapShark game id. */
export async function getGameDetails(gameId: string): Promise<CheapSharkGameDetails> {
  const res = await cheapSharkFetch("/games", { id: gameId });
  if (!res.ok) throw new Error(`CheapShark game details failed for ${gameId}: ${res.status}`);

  const data = (await res.json()) as {
    info: { title: string };
    cheapestPriceEver?: { price: string; date: number };
    deals: Array<{ storeID: string; price: string; retailPrice: string; savings: string }>;
  };

  return {
    title: data.info.title,
    cheapestPriceEver: data.cheapestPriceEver
      ? { price: Number(data.cheapestPriceEver.price), date: data.cheapestPriceEver.date }
      : null,
    deals: data.deals.map((d) => ({
      storeId: d.storeID,
      price: Number(d.price),
      retailPrice: Number(d.retailPrice),
      savingsPercent: Number(d.savings),
    })),
  };
}

/** Fetches the storeID -> store name map (e.g. "1" -> "Steam"). Changes rarely; cache long-term. */
export async function getStoreNames(): Promise<Record<string, string>> {
  const res = await cheapSharkFetch("/stores", {});
  if (!res.ok) throw new Error(`CheapShark stores lookup failed: ${res.status}`);

  const data = (await res.json()) as Array<{ storeID: string; storeName: string }>;
  return Object.fromEntries(data.map((s) => [s.storeID, s.storeName]));
}
