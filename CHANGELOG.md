# Changelog

All notable changes to this project are documented here. Format loosely follows
[Keep a Changelog](https://keepachangelog.com/).

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
