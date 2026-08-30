# Roadmap

STEAMYARD ships in phases, each one a complete, usable increment rather than a partial build-ahead.

| Phase | Deliverable | Status |
|---|---|---|
| **Phase 0** | `steamyard-skill` — standalone reasoning skill, usable with or without the MCP server | ✅ Done |
| **Phase 1** | MCP server: `get-owned-games` + `get-game-dlc`, real Steam data, no reseller pricing | ✅ Done — this repo |
| **Phase 2** | Reseller price comparison (IsThereAnyDeal) + historical-low data (CheapShark) | ✅ Done — this repo |
| **Phase 3** | Watchlist + price-drop alerts (Discord/email/in-chat) | Planned |
| **Phase 4** | Plugin wrapper for one-click install (Claude Code / Claude.ai) | Planned |
| **Phase 5** | ProtonDB / PCGamingWiki enrichment (Linux/Steam Deck compatibility, DRM info) | Optional polish |

## Phase 2 — Reseller Pricing ✅

- `compare-dlc-prices` tool: current price across every retailer IsThereAnyDeal tracks (Steam,
  Fanatical, GOG, GreenManGaming, Humble, Epic, and more), plus all-time/1yr/3mo historical-low
  windows. Requires an `ITAD_API_KEY` secret; degrades to a clear `itad_not_configured` error
  rather than failing silently if unset.
- `price-history` tool: all-time-low price + date via CheapShark, plus a plain-language
  buy-now-vs-wait verdict comparing the current price against it. No API key needed, but
  CheapShark requires a descriptive `User-Agent` header — see `AUDIT.md` §4.
- Both cached via the same KV approach as Phase 1's owned-games/DLC lookups, with TTLs tuned per
  data type (ITAD id lookups ~7d since they rarely change, current prices ~1h, CheapShark store
  names ~24h)
- No scraping — IsThereAnyDeal and CheapShark are both legitimate public APIs. Note: ITAD's own
  tracked shop list supersedes what this doc originally called "AllKeyShop" — AllKeyShop is a
  price-comparison site, not a first-party retailer, and has no public API of its own; SteamDB and
  AllKeyShop are never scraped directly.

## Phase 3 — Watchlist (next up)

- `watchlist-add` / `watchlist-check` tools, keyed by `app_id` + optional `target_price`
- Open question (unresolved): alert delivery channel — Discord webhook, email, or Claude Tag reminder. Needs a decision before this phase starts.

## Phase 4 — Plugin Wrapper

- Bundle the MCP server + skill + slash commands (`/steamyard-check`, `/steamyard-watchlist`) into a Claude Code/Claude.ai plugin manifest
- Only worth doing once Phase 2–3 are stable — no point packaging a moving target

## Non-Goals

- Scraping SteamDB or AllKeyShop directly — both lack public APIs by design; respecting that rather than working around it
- Grey-market/unofficial key reseller integration — see `steamyard-skill`'s core principles
- Folding into CTRL-ALT-PLAY's codebase — STEAMYARD stays a standalone, independently installable MCP so it's reusable outside that project
