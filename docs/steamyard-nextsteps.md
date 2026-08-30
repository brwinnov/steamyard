# STEAMYARD — Claude Code Handoff Brief

**Read this first, then read `STEAMYARD-plan.md` and `STEAM-skills.md` in this same folder for full context.**

This file is the actionable next-steps brief. The plan.md is the "why," this is the "do."

---

## Where We Left Off

Planning is done (see `STEAMYARD-plan.md` for full detail). Nothing has been coded yet. This is a fresh repo at `G:\projects\steamyard` containing only:

```
steamyard/
├── STEAMYARD-plan.md
├── steamyard-plan.html
├── steamyard-nextsteps.md   ← this file
└── skills/
    └── steamyard-skill/
        └── SKILL.md          ← already complete, do not rewrite
```

**Note:** the skill file is DONE. It already lives at `skills/steamyard-skill/SKILL.md` with correct YAML frontmatter (`name: steamyard-skill`). It does not need to be authored or moved — this session's work is the MCP server only.

**Goal for this session:** Stand up the Phase 1 MVP — a working MCP server exposing two tools, deployed as a Cloudflare Worker, tested against one real game (Train Simulator World, Steam app_id `24010`).

---

## Immediate Task List (In Order)

### 1. Scaffold the repo structure
`skills/steamyard-skill/SKILL.md` already exists — leave it untouched. Create the remaining structure proposed in `STEAMYARD-plan.md` Section 10:

```
steamyard/
├── mcp-server/
│   ├── src/
│   │   ├── tools/
│   │   │   ├── getOwnedGames.ts
│   │   │   └── getGameDlc.ts
│   │   ├── clients/
│   │   │   ├── steamApi.ts
│   │   │   └── steamDb.ts
│   │   └── index.ts
│   ├── wrangler.toml
│   ├── package.json
│   └── tsconfig.json
├── skills/
│   └── steamyard-skill/
│       └── SKILL.md           (already exists — do not touch)
└── README.md
```

Optional but recommended: also symlink or copy this folder to `.claude/skills/steamyard-skill/` at the repo root so Claude Code auto-loads it as a project-level skill for anyone who clones the repo.

### 2. Set up Cloudflare Worker + MCP scaffolding
- Use `wrangler init` or the official MCP server starter template if one exists for Cloudflare Workers (check for `@cloudflare/workers-mcp` or similar — verify current package name, don't assume)
- Confirm TypeScript config, local dev via `wrangler dev`
- Get a "hello world" tool responding before wiring real data

### 3. Build Tool 1: `get-owned-games`
- Input: `steam_id` (public 64-bit Steam ID, or accept a vanity profile URL and resolve it)
- Calls Steam WebAPI: `ISteamUser/GetOwnedGames/v1/` — requires a free Steam Web API key (user needs to generate one at https://steamcommunity.com/dev/apikey and store it as a Worker secret, NOT hardcoded)
- Output: list of `{ app_id, name, playtime_forever }`
- Handle the case where a profile is private (API returns empty/no access) — return a clear error, don't fail silently

### 4. Build Tool 2: `get-game-dlc`
- Input: `app_id`
- Fetch DLC list + pricing. Two options to evaluate:
  - **Option A:** Steam Store API (`store.steampowered.com/api/appdetails?appids={id}`) — public, no key needed, includes `dlc` array and pricing for the base app, but DLC pricing may need a follow-up call per DLC app_id
  - **Option B:** SteamDB — check whether they have a documented public API vs. requiring page parsing; if no clean API, don't scrape SteamDB directly (matches the "no scraping" principle in the plan) — fall back to Option A only for Phase 1
- Output: array of `{ dlc_app_id, name, release_date, price, owned: boolean }` — cross-reference `owned` against Tool 1's output if a steam_id was provided

### 5. Wire owned-status cross-referencing
- If both `steam_id` and `app_id` are provided together, the DLC tool should mark each DLC as owned/unowned by checking against the user's owned games list
- Cache the owned-games lookup briefly (Cloudflare KV, ~1 hour TTL) so repeated DLC checks for the same session don't re-hit the Steam API every time

### 6. Test end-to-end
- Pilot game: **Train Simulator World**, app_id `24010`
- Run both tools against it, confirm real output, sanity-check against what's actually on the Steam store page manually

### 7. Write the README
- Setup instructions (Steam API key generation, wrangler secrets, local dev command, deploy command)
- Tool documentation (inputs/outputs for both tools)
- Note explicitly: Phase 2 (IsThereAnyDeal, CheapShark, price history) is NOT in this session's scope — don't build ahead of the plan

---

## Explicit Constraints / Things to NOT Do This Session

- ❌ Don't build the reseller price comparison yet (IsThereAnyDeal/CheapShark) — that's Phase 2
- ❌ Don't build the watchlist/alerts feature — that's Phase 3
- ❌ Don't build the Plugin wrapper — that's Phase 4
- ❌ Don't scrape SteamDB or AllKeyShop directly — public APIs only, per the no-scraping principle in the plan
- ❌ Don't hardcode the Steam API key anywhere — use Wrangler secrets
- ❌ Don't assume the MCP/Cloudflare Workers integration package name — verify current docs, package names for MCP-on-Workers tooling may have changed

---

## Open Questions to Resolve During Build (flagged in plan.md Section 11)

1. Public Steam ID lookup vs OAuth — confirm public profile + API key is sufficient for MVP (it should be, per the plan)
2. Rate limits on Steam's free API — check current documented limits, build in basic caching regardless
3. Error handling UX for private profiles — decide on the exact error message returned to the calling AI

---

## Definition of Done for This Session

- [ ] Repo structure matches Section 10 of the plan
- [ ] Cloudflare Worker deploys locally via `wrangler dev` without errors
- [ ] `get-owned-games` returns real data for a test public Steam profile
- [ ] `get-game-dlc` returns real DLC data for app_id `24010` (Train Simulator World)
- [ ] Owned/unowned cross-referencing works when both inputs are supplied
- [ ] README documents setup + both tools
- [ ] Nothing from Phase 2-4 has been started

---

## Reference

Full context, tool specs, data source list, and roadmap: see `STEAMYARD-plan.md` in this same folder.
Domain reasoning for pricing/DLC decisions (not needed for this coding session, but keep in the repo): `STEAM-skills.md`.
