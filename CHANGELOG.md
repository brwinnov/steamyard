# Changelog

All notable changes to this project are documented here. Format loosely follows
[Keep a Changelog](https://keepachangelog.com/).

## [Unreleased]

### Added — Phase 2
- `compare-dlc-prices` MCP tool — current price across every retailer IsThereAnyDeal tracks
  (Steam, Fanatical, GOG, GreenManGaming, Humble, Epic, and more), sorted cheapest-first, plus
  all-time/1yr/3mo historical-low windows. Requires `ITAD_API_KEY`; returns a clear
  `itad_not_configured` error rather than failing silently if unset.
- `price-history` MCP tool — all-time-low price + date via CheapShark, plus a plain-language
  buy-now-vs-wait verdict comparing the current cheapest price against it. No API key required.
- New clients: `src/clients/isThereAnyDeal.ts`, `src/clients/cheapShark.ts`
- KV caching for both new tools, same approach as Phase 1 (ITAD id lookups ~7d, current prices
  ~1h, CheapShark lookup/details ~1h, store names ~24h)
- 21 new tests (53 total) covering both new clients and tool handlers

### Fixed — Phase 2
- Discovered CheapShark rejects requests without a descriptive `User-Agent` header (not mentioned
  in commonly-referenced docs) — `cheapShark.ts` now always sends one, covered by a test that
  would catch a regression. See `AUDIT.md` §4.

## [0.2.0] — Deployed, secured, tested (Phase 1 polish)

### Added
- KV-backed caching (`STEAMYARD_CACHE` namespace) for both tools: `get-owned-games` caches a
  resolved SteamID's owned-games list for ~1h; `get-game-dlc` caches the base game + DLC catalog
  per `app_id` for ~6h and reuses the owned-games cache when checking ownership. Verified locally:
  a cache hit returned identical data ~4x faster than a cold call. See `AUDIT.md` §2.
- Bearer-token auth on the `/mcp` endpoint (`MCP_AUTH_TOKEN`) — every request must carry
  `Authorization: Bearer <token>` or gets a `401`, checked with a constant-time comparison.
  Verified against both local dev and the live deployment (missing/wrong token → 401, correct
  token → 200). A single shared secret, not per-caller credentials — see `SECURITY.md` for the
  tradeoff and what it isn't sufficient for yet.

### Deployed
- Live on Cloudflare Workers at a custom domain (`ackros.gg`) rather than the shared, account-wide
  `workers.dev` subdomain

### Repo
- Added `LICENSE` (MIT), `ROADMAP.md`, `AUDIT.md`, `SECURITY.md`, `CONTRIBUTING.md`
- Added a Vitest test suite (32 tests across the cache helper, both Steam API clients, both tool
  handlers, and the auth/routing layer in `index.ts`) — network calls are mocked, so the suite is
  fast and doesn't depend on Steam's rate limits
- Added ESLint (flat config, `typescript-eslint` recommended rules) and Prettier, matching what
  `SteamYard.code-workspace` already recommended as VS Code extensions

## [0.1.0] — Phase 1 MVP

### Added
- `get-owned-games` MCP tool — resolves a SteamID64 or vanity profile name, returns owned games
  with playtime; explicitly reports `profile_private_or_empty` rather than failing silently
- `get-game-dlc` MCP tool — lists a game's DLC with release date and current price via the
  official Steam Store API, cross-referenced against owned status when a Steam ID is supplied
- `steamyard-skill` — standalone reasoning skill for Steam ownership/pricing questions, usable
  with or without the MCP server connected
- Cloudflare Worker scaffold (`mcp-server/`) using `@modelcontextprotocol/sdk`'s
  `WebStandardStreamableHTTPServerTransport` in stateless mode

### Fixed
- Removed the `agents` package dependency, which transitively pulled in `x402` → `wagmi` →
  MetaMask/WalletConnect (646 packages, 28 vulnerabilities) despite none of it being used —
  replaced with the MCP SDK's own transport (131 packages, 0 vulnerabilities). See `AUDIT.md` §1.
- Added retry/backoff to the Steam Store API client after observing real `429` rate limiting
  during testing, tighter than documented. See `AUDIT.md` §2.
- Bumped `@cloudflare/workers-types` to v5 to match current `wrangler`'s peer dependency
  requirement.

### Verified
- `get-owned-games` tested end-to-end against a real public Steam profile (933 games returned,
  correct playtime data) and a real profile with hidden game details (correct
  `profile_private_or_empty` error, not a silent empty result)
- `get-game-dlc` code path confirmed correct against Train Simulator World (app_id `24010`); full
  live verification blocked only by a rate-limited test-environment IP, not a code issue
