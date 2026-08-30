# Roadmap

STEAMYARD ships in phases, each one a complete, usable increment rather than a partial build-ahead.

| Phase | Deliverable | Status |
|---|---|---|
| **Phase 0** | `steamyard-skill` — standalone reasoning skill, usable with or without the MCP server | ✅ Done |
| **Phase 1** | MCP server: `get-owned-games` + `get-game-dlc`, real Steam data, no reseller pricing | ✅ Done — this repo |
| **Phase 2** | Reseller price comparison (IsThereAnyDeal) + historical-low data (CheapShark) | Planned |
| **Phase 3** | Watchlist + price-drop alerts (Discord/email/in-chat) | Planned |
| **Phase 4** | Plugin wrapper for one-click install (Claude Code / Claude.ai) | Planned |
| **Phase 5** | ProtonDB / PCGamingWiki enrichment (Linux/Steam Deck compatibility, DRM info) | Optional polish |

## Phase 2 — Reseller Pricing (next up)

- `compare-dlc-prices` tool: prices across Steam / AllKeyShop / Fanatical / GOG via IsThereAnyDeal's public API
- `price-history` tool: historical low, typical discount %, and a "buy now vs. wait" verdict via CheapShark
- Cache both behind the same KV-based approach used for owned-games lookups, since both APIs have free-tier rate limits
- No scraping — IsThereAnyDeal and CheapShark are both legitimate public APIs; SteamDB and AllKeyShop themselves are never scraped directly

## Phase 3 — Watchlist

- `watchlist-add` / `watchlist-check` tools, keyed by `app_id` + optional `target_price`
- Open question (unresolved): alert delivery channel — Discord webhook, email, or Claude Tag reminder. Needs a decision before this phase starts.

## Phase 4 — Plugin Wrapper

- Bundle the MCP server + skill + slash commands (`/steamyard-check`, `/steamyard-watchlist`) into a Claude Code/Claude.ai plugin manifest
- Only worth doing once Phase 2–3 are stable — no point packaging a moving target

## Non-Goals

- Scraping SteamDB or AllKeyShop directly — both lack public APIs by design; respecting that rather than working around it
- Grey-market/unofficial key reseller integration — see `steamyard-skill`'s core principles
- Folding into CTRL-ALT-PLAY's codebase — STEAMYARD stays a standalone, independently installable MCP so it's reusable outside that project
