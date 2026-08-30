# Dependency & Reliability Audit

Findings from building and testing the Phase 1 MVP, kept here so future changes don't quietly
reintroduce the same issues.

## 1. Removed `agents` — unnecessary crypto-wallet dependency chain

**Finding:** the initial scaffold used Cloudflare's `agents` package (`agents/mcp/server`) for
its `createMcpHandler` convenience wrapper. That package transitively depends on `x402`
(Coinbase's HTTP 402 payments protocol) → `wagmi` → `@metamask/sdk` and
`@walletconnect/*` — a full Ethereum wallet-connection stack.

- **Before:** 646 packages installed, 28 vulnerabilities (3 low, 23 moderate, 2 high) reported by `npm audit`
- **After:** 131 packages, 0 vulnerabilities

**Why it mattered:** none of that dependency tree is reachable from this server's actual code
path — the tools here don't touch payments or wallets at all. It was pure transitive bloat that
also happened to widen the attack surface (28 known vulnerabilities in code that never runs).

**Fix:** dropped `agents` entirely. `@modelcontextprotocol/sdk` (v1.30.0+) now ships
`WebStandardStreamableHTTPServerTransport` directly — a Web Standards-compatible transport that
works on Cloudflare Workers without any Cloudflare-specific wrapper package. `src/index.ts`
constructs the `McpServer` and connects this transport per-request in stateless mode
(`sessionIdGenerator: undefined`).

**Takeaway for future changes:** before adding any dependency to `mcp-server/package.json`, check
`npm ls <package>` on anything with a deep or unfamiliar transitive tree before installing. A
convenience wrapper is not worth an unaudited dependency chain.

## 2. Steam Store API rate limiting is tighter than documented

**Finding:** `store.steampowered.com/api/appdetails` (used by `get-game-dlc` for DLC pricing) has
no officially documented rate limit, but returned `429` after only a handful of sequential
requests in testing — including, at one point, on a single isolated request from an IP that had
made prior calls minutes earlier. This confirms the open question flagged in the original
project plan ("rate limits on free tiers — need caching strategy from day one").

**Fix:** `src/clients/steamDb.ts` now retries a `429` up to 3 times with increasing backoff
(3s, 6s, 9s) before failing. `getAppDetailsBatch` also spaces sequential DLC lookups 1 second
apart rather than 150ms.

**Fixed:** a `STEAMYARD_CACHE` KV namespace is now bound in `wrangler.jsonc` and wired into both
tools via `src/lib/cache.ts`. `get-game-dlc` caches the base game + DLC catalog (name, release
date, price) per `app_id` for ~6h; `get-owned-games` caches a resolved SteamID's owned-games list
for ~1h, and `get-game-dlc` reuses that same cache entry when checking ownership. Verified
locally: a repeat `get-owned-games` call for the same profile returned identical data ~4x faster
(0.25s vs. 1.07s) on the cache hit. This was worth doing before Phase 2 adds two more external
APIs (IsThereAnyDeal, CheapShark) on top of an already-tight budget.

## 3. Private/hidden Steam profiles fail silently by default — handled explicitly

**Finding:** Steam's `GetOwnedGames` API doesn't return an HTTP error for a private or
hidden-game-list profile — it returns `200 OK` with an empty `response` object. Code that only
checks `res.ok` would silently report "0 games" instead of surfacing the real cause.

**Fix:** `src/clients/steamApi.ts` explicitly checks for a missing/empty `games` array and throws
a typed `SteamProfilePrivateError`, which `getOwnedGamesHandler` catches and turns into a clear
`profile_private_or_empty` tool error rather than a confusing empty result.

**Verified against real data:** tested against a profile with a public game list (933 games
returned correctly) and one with hidden game details (correctly reported as
`profile_private_or_empty`) — see commit history for the session this was validated in.
