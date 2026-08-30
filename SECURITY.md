# Security Policy

## Reporting a Vulnerability

This is a small, independently-maintained project. If you find a security issue, please open a
GitHub issue on this repo, or contact the maintainer directly if the issue involves exposed
credentials or another sensitive matter you'd rather not post publicly. There's no formal SLA,
but real vulnerabilities will be prioritized over feature work.

## Secrets Handling

- The Steam Web API key (`STEAM_API_KEY`) must never be committed to this repo.
  - Local development: `mcp-server/.dev.vars` (gitignored, never tracked)
  - Deployed Worker: `npx wrangler secret put STEAM_API_KEY` (stored encrypted by Cloudflare, not in code or `wrangler.jsonc`)
- If a key is ever accidentally committed, treat it as compromised: revoke/regenerate it at
  https://steamcommunity.com/dev/apikey immediately, then scrub it from git history (contact the
  maintainer — this needs a force-push and isn't done casually on a public repo).

## Dependency Hygiene

See [`AUDIT.md`](AUDIT.md) for the record of dependency issues found and fixed so far (notably: an
unnecessary crypto-wallet dependency chain pulled in transitively, since removed). Before adding
a new dependency to `mcp-server/package.json`, check its transitive tree
(`npm ls <package>` after a trial install) for anything unexpected, and run `npm audit`.

## Data Sources

All external API calls are to public, ToS-compliant endpoints (official Steam Web API, official
Steam Store API). This project does not scrape SteamDB or AllKeyShop, and does not recommend
unofficial/grey-market key resellers — see `skills/steamyard-skill/SKILL.md` §1 for the reasoning
behind that boundary.
