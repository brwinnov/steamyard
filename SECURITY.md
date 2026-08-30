# Security Policy

## Reporting a Vulnerability

This is a small, independently-maintained project. If you find a security issue, please open a
GitHub issue on this repo, or contact the maintainer directly if the issue involves exposed
credentials or another sensitive matter you'd rather not post publicly. There's no formal SLA,
but real vulnerabilities will be prioritized over feature work.

## Secrets Handling

- `STEAM_API_KEY`, `MCP_AUTH_TOKEN`, and `ITAD_API_KEY` must never be committed to this repo.
  - Local development: `mcp-server/.dev.vars` (gitignored, never tracked)
  - Deployed Worker: `npx wrangler secret put <NAME>` (stored encrypted by Cloudflare, not in code or `wrangler.jsonc`)
- Note: IsThereAnyDeal's dashboard also offers OAuth Client ID/Secret credentials — this project
  doesn't use those (they're only needed for endpoints acting on behalf of a specific ITAD user
  account, which nothing here does). Only the plain API key is used.
- If any secret is ever accidentally committed, treat it as compromised: regenerate it (Steam key
  at https://steamcommunity.com/dev/apikey; ITAD key via https://isthereanydeal.com/apps/my/;
  auth token via `openssl rand -hex 32`), set the new value with `wrangler secret put` again, then
  scrub the old one from git history (contact the maintainer — this needs a force-push and isn't
  done casually on a public repo).

## Dependency Hygiene

See [`AUDIT.md`](AUDIT.md) for the record of dependency issues found and fixed so far (notably: an
unnecessary crypto-wallet dependency chain pulled in transitively, since removed). Before adding
a new dependency to `mcp-server/package.json`, check its transitive tree
(`npm ls <package>` after a trial install) for anything unexpected, and run `npm audit`.

## Authentication

The deployed `/mcp` endpoint requires a bearer token: every request must carry
`Authorization: Bearer <MCP_AUTH_TOKEN>` or it's rejected with `401` before any tool code runs
(see `src/index.ts`'s `isAuthorized`). The comparison is constant-time to avoid leaking how many
leading characters of a guessed token matched.

This is a single shared secret, not per-caller credentials — anyone holding the token can call any
tool, and each call still spends the deployed instance's `STEAM_API_KEY` and `ITAD_API_KEY` quota.
That's an acceptable tradeoff for a personal/small-scale deployment, but isn't sufficient if this
is ever opened up to multiple independent users (e.g. the Phase 4 plugin wrapper) — that would
need per-caller tokens or a proper auth provider (e.g. Cloudflare Access) instead of one shared
secret.

## Data Sources

All external API calls are to public, ToS-compliant endpoints (official Steam Web API, official
Steam Store API, IsThereAnyDeal, CheapShark). This project does not scrape SteamDB or AllKeyShop,
and does not recommend unofficial/grey-market key resellers — see
`skills/steamyard-skill/SKILL.md` §1 for the reasoning behind that boundary.
