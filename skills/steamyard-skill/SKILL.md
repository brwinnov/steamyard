---
name: steamyard-skill
description: Reasoning framework for Steam game/DLC ownership and pricing questions — when to check owned status, how to judge if a price is good, and whether to buy now or wait for a sale. Trigger when the user mentions a Steam game or DLC by name, asks "do I own this," "is this worth buying now," "should I wait for a sale," or references AllKeyShop/SteamDB/reseller pricing for a PC game.
---

# STEAMYARD Skill

Teaches an AI assistant (Claude, Copilot, Cursor, etc.) how to reason correctly about Steam game libraries, DLC, and pricing decisions — with or without a connected `steamyard-mcp` server.

---

## 1. Core Principles

1. **Never assume ownership.** If MCP tools are available, check owned status before recommending a purchase. If not available, ask the user or clearly flag the assumption.
2. **Never recommend unofficial/grey-market key sources.** Reseller price comparisons should stick to reputable, ToS-compliant marketplaces (AllKeyShop as a comparison engine, official storefronts, Fanatical, GOG). Do not suggest unlicensed key resellers with no accountability.
3. **Region and currency matter.** EU prices are typically VAT-inclusive; US prices are pre-tax. Always state which region a price applies to.
4. **DLC pricing behaves differently from base game pricing.** Treat new DLC (<30 days old) as very unlikely to discount — don't reflexively tell the user to "wait for a sale" on day-one releases.

---

## 2. Steam Sale Calendar (Rule of Thumb)

Use this to estimate "should I wait" without needing live data:

| Sale Window | Approx. Timing | Typical Discount Range |
|---|---|---|
| Spring Sale | March | 10-33% |
| Summer Sale | Late June–July | 15-50% (biggest of the year) |
| Autumn Sale | November | 10-30% |
| Winter Sale | Late Dec–early Jan | 15-40% |
| Publisher-specific sales | Varies | 10-25% |

**New DLC (<30 days):** rarely included in the very next seasonal sale unless it launches right before one. Advise waiting for the *second* sale window after release for the best discount, not the first.

---

## 3. Decision Framework: "Buy Now or Wait?"

Walk through in this order:

1. **Is it needed for imminent content (review, video, stream)?** → Buy now regardless of price; deadline value > discount value.
2. **Is it brand new (<30 days)?** → Default to "wait," unless a launch bundle/discount is already active.
3. **Is a seasonal sale within ~4 weeks?** → Recommend waiting.
4. **Has it historically discounted 20%+ within 2 months of release?** (if price-history data available) → Wait.
5. **Otherwise** → Compare current price across official store + reseller comparison and give a straight recommendation with the reasoning shown, not just a verdict.

---

## 4. Data Interpretation Notes

- **SteamDB "all-time low"** is a strong anchor — always mention it if available, so the user can judge if a current price is actually good.
- **Reseller prices below ~40% of MSRP on very new titles are a red flag** — likely restricted regions, non-stackable, or grey-market. Flag this rather than presenting it uncritically.
- **Bundle pricing** (e.g., "Route + Loco bundle") can sometimes beat buying DLC separately even after individual discounts — always check if a bundle exists before recommending piecemeal purchases.

---

## 5. Communication Style for This Domain

- Give a clear **verdict first** ("Wait — likely to drop ~15-20% within 6 weeks"), then the reasoning, not the other way around.
- Always state **currency/region** explicitly.
- When comparing resellers, present as a table: source, price, notes (stackable/non-stackable, region lock, seller rating if known).
- Flag **subscription-service overlap** — e.g., if the DLC's base game is already included in Xbox/EA Play or similar, mention it, since the user may already have access another way.

---

## 6. Example Interaction

**User:** "Should I get the new Hennessey Railway DLC for Train Sim World now or wait?"

**Good response pattern:**
> Hennessey Railway released Sept 12, 2026 at €19.99 — it's brand new, so I wouldn't expect a discount for at least 4-6 weeks. If you're not filming with it immediately, the next seasonal sale (likely within ~2 months) has historically brought similar Train Sim World routes down 15-20%. If you need it for imminent content, buy now; otherwise, wait.

**Avoid:**
> "You should always wait for Steam sales to buy games." *(too generic, ignores content-deadline reasoning and DLC-specific discount timing)*

---

## 7. Tooling Notes (If MCP Connected)

When the `steamyard-mcp` server is available, prefer live tool calls over the rules of thumb in Section 2-3:

- `get-owned-games` / `get-game-dlc` → confirm ownership before any purchase discussion
- `compare-dlc-prices` → use instead of guessing reseller pricing
- `price-history` → use instead of the generic sale calendar in Section 2

If no MCP is connected, fall back to the static rules above and clearly tell the user the advice is based on general patterns, not live pricing.
