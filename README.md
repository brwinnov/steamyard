# STEAMYARD

*"Where your Steam library meets the sidings — know what you own, what's new, and what's worth the wait."*

STEAMYARD is an MCP (Model Context Protocol) server + companion skill that lets an AI assistant answer, live:
- Do I already own this DLC?
- What's new for this game since I last checked?
- Is now a good time to buy, or will it be cheaper in 4-6 weeks?

**Status: Phase 1 MVP scaffold.** Two tools, real Steam data, no reseller price comparison yet (that's Phase 2).

---

## Repo Layout

```
steamyard/
├── mcp-server/              # Cloudflare Worker exposing the MCP tools
│   └── src/
│       ├── tools/           # get-owned-games, get-game-dlc
│       ├── clients/         # Steam Web API + Steam Store API wrappers
│       └── index.ts         # MCP server entry point
├── skills/
│   └── steamyard-skill/     # Standalone reasoning skill (works with or without the MCP)
└── .claude/skills/          # Mirror of the skill, auto-loaded by Claude Code
```

## Tools

### `get-owned-games`
- **Input:** `steam_id` — a 64-bit SteamID64, or a vanity profile name
- **Output:** owned games with app_id, name, and playtime
- Returns a clear `profile_private_or_empty` error if the profile isn't public — never fails silently

### `get-game-dlc`
- **Input:** `app_id` (required), `steam_id` (optional)
- **Output:** all DLC for the game — name, release date, current price — cross-referenced against owned status when `steam_id` is supplied
- Uses the official Steam Store API (`store.steampowered.com/api/appdetails`) — no SteamDB scraping

---

## Setup

### 1. Get a Steam Web API key
Generate one (free) at https://steamcommunity.com/dev/apikey — requires a Steam account with a domain name entered (any placeholder domain works for personal use).

### 2. Install dependencies
```bash
cd mcp-server
npm install
```

### 3. Set the API key as a Worker secret — never hardcode it
```bash
npx wrangler secret put STEAM_API_KEY
```
For local dev, instead create `mcp-server/.dev.vars` (already gitignored):
```
STEAM_API_KEY=your_key_here
```

### 4. Run locally
```bash
npm run dev
```

Test with the MCP Inspector in another terminal:
```bash
npx @modelcontextprotocol/inspector@latest
```
Connect it to the local Worker URL printed by `wrangler dev` (path `/mcp`).

Suggested pilot game: **Train Simulator World**, app_id `24010`.

### 5. Deploy
```bash
npm run deploy
```

---

## Explicitly Out of Scope for This Phase
- Reseller price comparison (IsThereAnyDeal / CheapShark) — Phase 2
- Watchlist / price-drop alerts — Phase 3
- Plugin wrapper for one-click install — Phase 4
- Any scraping of SteamDB or AllKeyShop — public APIs only
