# 🚂 STEAMYARD — Project Plan

**Codename:** `STEAMYARD`
**Tagline:** *"Where your Steam library meets the sidings — know what you own, what's new, and what's worth the wait."*

Alt codenames considered: `STEAM-GAUGE`, `TRACKSIDE`, `DLC-DECK`, `BACKLOG.exe`, `ALT-STEAM`
**Chosen: STEAMYARD** — a railway yard where trains (Steam library entries) are stored, sorted, and dispatched. Doubles as a pun on "Steam" the platform. Fits Ackros's train-sim content niche and pairs naturally with the CTRL-ALT-PLAY brand family.

---

## 1. Problem Statement

Ackros (and gaming creators generally) routinely need to answer, mid-workflow:
- "Do I already own this DLC?"
- "What's new for this game since I last checked?"
- "Is this a good time to buy, or will it be cheaper in 4-6 weeks?"
- "Where's it cheapest right now — Steam, AllKeyShop, Fanatical?"

Today this is manual: tab-switching between Steam library, AllKeyShop, SteamDB, and memory. STEAMYARD automates it.

---

## 2. What We're Actually Building — Three Layers

### Layer 1: MCP Server (`steamyard-mcp`)
The engine. A Model Context Protocol server exposing tools an AI (Claude, etc.) can call directly in conversation.

### Layer 2: Skill Folder (`skills/steamyard-skill/SKILL.md`)
The brain. A skill is a **folder** containing a file literally named `SKILL.md` — the folder name (`steamyard-skill`) is the unique identifier, not the filename, since every skill's file is always called `SKILL.md`. Teaches any AI assistant (Claude, Copilot, Cursor, etc.) *how* to reason about Steam/DLC data — even without the MCP tools installed, or as a companion to them.

### Layer 3: Plugin Wrapper (`steamyard-plugin`) — optional, later
The delivery mechanism. Bundles the MCP server + skill + a couple of slash commands (`/steamyard-check`, `/steamyard-watchlist`) into a one-click install for Claude Code / Claude.ai.

---

## 3. MCP vs Plugin vs Skill — Cheat Sheet

| | MCP Server | Plugin | Skill (.md) |
|---|---|---|---|
| **Is it code?** | Yes (runs, calls APIs) | Yes (packaging/config) | No (pure markdown) |
| **What it does** | Provides live data via tool calls | Bundles tools+skills+commands for install | Teaches reasoning/context |
| **Works without the others?** | Yes, standalone | No, wraps other things | Yes, standalone |
| **Where it lives** | Hosted server (Cloudflare Worker, etc.) | Plugin marketplace/catalog | Repo file, read directly |
| **Reusable across AI tools?** | Yes, if MCP-compliant client | Claude-specific mostly | Yes — any AI that reads markdown |

**Build order recommendation:** Skill first (fast, zero infra, immediately useful) → MCP server second (real value-add) → Plugin last (nice-to-have distribution polish).

---

## 4. Data Sources (No Scraping Required)

| Source | Data | API | Cost |
|---|---|---|---|
| **Steam WebAPI** (official) | Owned games, playtime, owned DLC | Public, needs user Steam ID + API key | Free |
| **SteamDB** | Full DLC catalog, release dates, Steam pricing | Public endpoints | Free |
| **IsThereAnyDeal** | Cross-retailer prices (Steam, AllKeyShop, Fanatical, GOG, etc.) | Public API | Free tier |
| **CheapShark** | Historical price data, "is this a real low?" | Public API | Free |
| **PCGamingWiki** (optional) | DRM info, mod support | Public API | Free |
| **ProtonDB** (optional, Phase 3) | Linux/Steam Deck compatibility | Public API | Free |

No Apify, no scraping, no ToS risk — everything above is a legitimate public API.

---

## 5. MCP Tool Definitions (Phase 1 MVP)

```
steamyard:get-owned-games
  → Input: steam_id
  → Output: list of owned games + playtime

steamyard:get-game-dlc
  → Input: app_id
  → Output: all DLC for game, owned/unowned flag, Steam price, release date

steamyard:compare-dlc-prices
  → Input: app_id (or dlc_id)
  → Output: prices across Steam / AllKeyShop / Fanatical / GOG via IsThereAnyDeal

steamyard:price-history
  → Input: app_id or dlc_id
  → Output: historical low, typical discount %, "is now a good time" verdict

steamyard:watchlist-add / watchlist-check
  → Input: app_id, target_price (optional)
  → Output: tracked item, alert when price drops below target
```

### Example Output

```json
{
  "game": "Train Sim World",
  "app_id": 24010,
  "new_dlc": [
    {
      "name": "Route: Hennessey Railway",
      "release_date": "2026-09-12",
      "steam_price": "€19.99",
      "owned": false,
      "reseller_prices": {
        "allkeyshop": "€15-17 (typical sale range)",
        "fanatical": "check bundles"
      },
      "price_history": {
        "avg_discount": "15-20%",
        "first_sale_typical": "4-6 weeks post-launch",
        "recommendation": "WAIT — historically drops within 6 weeks"
      }
    }
  ]
}
```

---

## 6. STEAM-skills.md — Purpose & Draft Outline

A companion skill file (separate deliverable, drafted alongside this plan) that any AI assistant can read to reason correctly about Steam/DLC questions — with or without the MCP tools present. Covers:

1. When to check "owned vs new" before recommending a purchase
2. How to interpret Steam discount patterns (typical DLC discount timing, seasonal sales calendar — Summer/Autumn/Winter sales)
3. Rule of thumb: new DLC rarely discounts in first 30 days; wait for first seasonal sale unless day-one bundle pricing applies
4. How to cross-reference reseller prices without recommending grey-market/unofficial key sources
5. Region/currency awareness (EU VAT-inclusive pricing vs US)

*(Full draft: see `skills/steamyard-skill/SKILL.md`.)*

---

## 7. Tech Stack

| Component | Choice | Why |
|---|---|---|
| MCP Server Runtime | Cloudflare Workers | Cheap, fast cold-start, matches your CTRL-ALT-PLAY infra plans |
| Data caching | Cloudflare KV or D1 | Avoid hammering free-tier APIs, cache DLC/price data for ~6-24h |
| Steam Auth | Steam OpenID (optional, for private library) or public Steam ID lookup | Public profiles don't need OAuth |
| Skill file | Plain markdown, versioned in repo | Works everywhere, zero infra |
| Plugin packaging | Claude Plugin manifest (later) | One-click install once MCP is stable |

---

## 8. Roadmap

| Phase | Deliverable | Effort | Priority |
|---|---|---|---|
| **Phase 0** | `STEAM-skills.md` published, usable standalone | ~1 day | Do now |
| **Phase 1** | MCP server: owned games + DLC list + Steam pricing | ~1-2 weeks | After CTRL-ALT-PLAY MVP ships |
| **Phase 2** | Add IsThereAnyDeal + CheapShark (price compare + history) | ~1 week | Phase 1 follow-up |
| **Phase 3** | Watchlist + price-drop alerts (Discord/email) | ~1 week | Optional |
| **Phase 4** | Plugin wrapper for one-click install | ~2-3 days | Nice-to-have |
| **Phase 5** | ProtonDB / PCGamingWiki enrichment | ~2-3 days | Optional polish |

---

## 9. Relationship to CTRL-ALT-PLAY

**Decision: keep STEAMYARD as its own repo/MCP**, not baked into CTRL-ALT-PLAY's codebase — but:
- Cross-link it as a "creator tools" feature/page on CTRL-ALT-PLAY
- Reuse the Game Pass subscription calculator's Cloudflare Worker patterns/infra
- Both can share a coupon/price-alert Discord or notification pipe later

This keeps CTRL-ALT-PLAY focused on its core (site/community) while STEAMYARD stays a clean, publishable, open-source MCP that other creators/devs can install independently — good for your visibility as a builder too.

---

## 10. Repo Structure (Proposed)

```
steamyard/
├── mcp-server/
│   ├── src/
│   │   ├── tools/
│   │   │   ├── getOwnedGames.ts
│   │   │   ├── getGameDlc.ts
│   │   │   ├── comparePrices.ts
│   │   │   └── priceHistory.ts
│   │   ├── clients/
│   │   │   ├── steamApi.ts
│   │   │   ├── steamDb.ts
│   │   │   ├── isThereAnyDeal.ts
│   │   │   └── cheapShark.ts
│   │   └── index.ts
│   ├── wrangler.toml
│   └── package.json
├── skills/
│   └── steamyard-skill/
│       └── SKILL.md
├── plugin/
│   └── manifest.json  (Phase 4)
└── README.md
```

**Note on skill structure:** a skill is a *folder*, not a loose file — the filename inside is always `SKILL.md`, so the folder name (`steamyard-skill`) is what makes it unique and discoverable. For Claude Code specifically, this folder is placed at `.claude/skills/steamyard-skill/` at the repo root (project-level, committed to git) so everyone who clones the repo gets it automatically.

---

## 11. Open Questions

- Does the user need to authenticate their own Steam ID, or just paste a public profile URL? *(Public profile lookup is simplest for MVP — no OAuth needed.)*
- Rate limits on free tiers (IsThereAnyDeal, CheapShark) — need caching strategy from day one.
- Should watchlist alerts go to Discord, email, or in-Claude reminders (via Claude Tag)?

---

## 12. Next Action

1. Draft and finalize `STEAM-skills.md` (this session's second deliverable)
2. Stand up a minimal Cloudflare Worker with just `get-owned-games` + `get-game-dlc` as a proof of concept
3. Test end-to-end with Train Simulator World as the pilot game
4. Decide Plugin vs standalone MCP distribution once proof of concept works
