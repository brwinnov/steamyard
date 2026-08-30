// Despite the filename (kept to match STEAMYARD-plan.md's proposed structure), this wraps the
// official Steam Store API — NOT steamdb.info. Per the plan's "no scraping" principle, SteamDB
// itself has no documented public API, so Phase 1 uses store.steampowered.com/api/appdetails
// for DLC listings + pricing instead.

const STEAM_STORE_API_BASE = "https://store.steampowered.com/api/appdetails";

export interface AppDetails {
  appid: number;
  name: string;
  is_dlc: boolean;
  release_date: string | null;
  price: {
    currency: string;
    initial_formatted: string;
    final_formatted: string;
    discount_percent: number;
  } | null; // null for free/unreleased/region-unavailable apps
  dlc_app_ids: number[];
}

/**
 * Fetches store metadata for a single app (game or DLC). Returns null if Steam has no listing
 * for it. Retries once on 429 — the Store API's rate limit is tight and easy to trip even for
 * a handful of sequential calls (observed during testing), so a single request being throttled
 * isn't worth failing the whole DLC lookup over.
 */
export async function getAppDetails(appId: number, region = "us"): Promise<AppDetails | null> {
  const url = new URL(STEAM_STORE_API_BASE);
  url.searchParams.set("appids", String(appId));
  url.searchParams.set("cc", region);
  url.searchParams.set("l", "english");

  let res = await fetch(url);
  for (let attempt = 0; res.status === 429 && attempt < 3; attempt++) {
    await new Promise((resolve) => setTimeout(resolve, 3000 * (attempt + 1)));
    res = await fetch(url);
  }
  if (!res.ok) throw new Error(`Steam Store appdetails failed for ${appId}: ${res.status}`);

  const data = (await res.json()) as Record<
    string,
    { success: boolean; data?: Record<string, unknown> }
  >;

  const entry = data[String(appId)];
  if (!entry?.success || !entry.data) return null;

  const d = entry.data as {
    steam_appid: number;
    name: string;
    type: string;
    release_date?: { coming_soon: boolean; date: string };
    price_overview?: {
      currency: string;
      initial_formatted: string;
      final_formatted: string;
      discount_percent: number;
    };
    dlc?: number[];
  };

  return {
    appid: d.steam_appid,
    name: d.name,
    is_dlc: d.type === "dlc",
    release_date: d.release_date && !d.release_date.coming_soon ? d.release_date.date : null,
    price: d.price_overview
      ? {
          currency: d.price_overview.currency,
          initial_formatted: d.price_overview.initial_formatted || d.price_overview.final_formatted,
          final_formatted: d.price_overview.final_formatted,
          discount_percent: d.price_overview.discount_percent,
        }
      : null,
    dlc_app_ids: d.dlc ?? [],
  };
}

/**
 * Fetches details for a batch of app IDs sequentially with a delay between each, to stay under
 * the Store API's undocumented (but tight — observed 429s within a handful of rapid calls)
 * rate limit. Fine for a handful of DLC per game; revisit with proper queuing/caching (see
 * README's caching note) if a game has a very large DLC catalog.
 */
export async function getAppDetailsBatch(appIds: number[], region = "us"): Promise<AppDetails[]> {
  const results: AppDetails[] = [];
  for (const appId of appIds) {
    const details = await getAppDetails(appId, region);
    if (details) results.push(details);
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  return results;
}
