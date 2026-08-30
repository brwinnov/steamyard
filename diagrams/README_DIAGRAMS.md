# SteamYard Documentation Diagrams

This folder contains visual documentation diagrams for the SteamYard MCP server. All diagrams are self-contained HTML files that can be opened in any modern browser.

## Diagrams

### 1. System Architecture (`steamyard_system_architecture.html`)
**Purpose:** Shows how SteamYard fits into the broader ecosystem

- Three client types (Claude Desktop, Claude Code, other clients) connecting to the MCP server
- The central MCP server routing requests
- Three external APIs that provide data (Steam, ITAD, CheapShark)
- Cloudflare Workers deployment details

**Use when:** Explaining to stakeholders what SteamYard is, how clients interact with it, and what data it provides.

---

### 2. API Tools (`steamyard_api_tools.html`)
**Purpose:** Documents the four available MCP tools and their responsibilities

- `get-owned-games` — lists games owned by a user (Steam API)
- `get-game-dlc` — finds DLC available for a game (Steam API)
- `compare-dlc-prices` — compares DLC prices across storefronts (ITAD)
- `price-history` — shows historical price trends (ITAD)

Each tool card includes the API endpoint it queries and what data it returns.

**Use when:** Developers need to understand which tool to use for a specific data need, or when writing tool documentation.

---

### 3. Data Flow (`steamyard_data_flow.html`)
**Purpose:** Shows the step-by-step flow of a single request through the system

1. **Client request** — POST /mcp with bearer token
2. **Auth check** — Validate token against MCP_AUTH_TOKEN
3. **Route to tool** — Match endpoint to one of the four tools
4. **Check cache** — Look up result in local cache
5. **Query API** (if cache miss) — Make external HTTP call with retry logic
6. **Response JSON** — Return structured result to client

Each step includes details about what happens, error handling, and caching behavior.

**Use when:** Debugging request failures, understanding performance bottlenecks, or onboarding new developers to the architecture.

---

### 4. Deployment (`steamyard_deployment.html`)
**Purpose:** Explains how SteamYard is deployed and where secrets are stored

- Cloudflare Workers edge runtime handling requests
- Custom domain routing (`steamyard-mcp.ackros.gg`)
- Encrypted KV store containing API keys and MCP auth token
- Outbound connections to Steam, ITAD, and CheapShark APIs

Includes details about scaling, timeouts, and the Wrangler deployment process.

**Use when:** Setting up a new deployment, understanding infrastructure decisions, or troubleshooting connectivity issues.

---

## How to Use These Files

1. **Open in browser:** All diagrams are standalone HTML files. Simply open them in Chrome, Firefox, Safari, or Edge.
2. **Interactive elements:** Hover over diagram nodes to see highlights; some boxes are clickable and suggest follow-up questions.
3. **Print:** Use your browser's print dialog (Ctrl+P / Cmd+P) to save as PDF or print to paper. Light backgrounds print well.
4. **Share:** Send the HTML file directly to teammates — no dependencies or network calls needed.

## When to Add More Diagrams

Consider adding diagrams for:
- Phase 3 (Watchlist feature) once the alert channel is decided
- Common failure scenarios and recovery flows
- Capacity planning under high load
- Integration examples for new client types

## Related Documentation

- `workspace/README.md` — Setup and tools
- `workspace/AUDIT.md` — Known issues and fixes
- `workspace/SECURITY.md` — Secrets handling and auth model
- `workspace/CONTRIBUTING.md` — Development conventions

---

**Generated:** 2026-08-30  
**Format:** HTML (standalone, no external dependencies)  
**Viewable in:** All modern browsers  
