# Contributing

## Dev Setup

```bash
cd mcp-server
npm install
```

Create `mcp-server/.dev.vars` with your own Steam Web API key, a generated auth token, and
(optionally) an IsThereAnyDeal API key (see `README.md` §Setup) — never commit this file, it's
already gitignored.

```bash
npm run dev        # local Worker via wrangler
npm run typecheck   # tsc --noEmit
npm test            # vitest run — unit tests for tools/clients/cache/auth
npm run lint        # eslint .
npm run format      # prettier --write .
```

Test tool calls with the MCP Inspector:
```bash
npx @modelcontextprotocol/inspector@latest
```
Paste your `MCP_AUTH_TOKEN` into the Inspector's **Bearer Token** field when connecting.

## Conventions

- **TypeScript strict mode** — `tsconfig.json` has `strict`, `noUnusedLocals`, and
  `noUnusedParameters` on. Keep it that way.
- **No scraping** — every data source must be a documented, public, ToS-compliant API. If a
  source (like SteamDB or AllKeyShop) doesn't have one, it's out of scope until it does — see
  `ROADMAP.md`'s Non-Goals.
- **Verify a third-party API's real behavior before building on it, don't trust docs at face
  value** — this project has twice found real API behavior diverging from what's documented
  (Steam Store's undocumented rate limit, CheapShark's undocumented User-Agent requirement — see
  `AUDIT.md` §2 and §4). Test against the live endpoint during development.
- **Never hardcode secrets** — API keys go through Wrangler secrets (`.dev.vars` locally,
  `wrangler secret put` when deployed), never in source or `wrangler.jsonc`.
- **Fail loud, not silent** — if an upstream API returns something ambiguous (like Steam's
  empty-object response for a private profile), surface a clear typed error rather than an
  empty/default result. See `AUDIT.md` §3 for why this matters here specifically.
- Check `AUDIT.md` before adding a dependency — a convenience package is not worth an unaudited
  transitive tree (see `AUDIT.md` §1 for a concrete example of this going wrong).
- **Tests use mocked network calls, not live Steam requests** — `vi.stubGlobal("fetch", ...)` /
  `vi.mock` on the client modules, so the suite runs fast and doesn't depend on Steam's rate
  limits or your API key. Add coverage this way for new tools/clients rather than skipping tests
  because "it needs a real API call."

## Scope Discipline

This project ships in phases (`ROADMAP.md`). Please don't build ahead of the current phase in a
PR — e.g. reseller price comparison (Phase 2) shouldn't land bundled with a Phase 1 bugfix. Keep
PRs scoped to one phase or one fix at a time.

## Pull Requests

- Keep them focused — one logical change per PR
- Update `README.md`/`ROADMAP.md` if the change affects setup steps or the phase plan
- No formal CI yet; run `npm run typecheck`, `npm test`, and `npm run lint` locally before
  submitting
