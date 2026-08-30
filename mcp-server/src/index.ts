import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { getOwnedGamesInputSchema, getOwnedGamesHandler } from "./tools/getOwnedGames.js";
import { getGameDlcInputSchema, getGameDlcHandler } from "./tools/getGameDlc.js";

export interface Env {
  STEAM_API_KEY: string;
  MCP_AUTH_TOKEN: string;
  STEAMYARD_CACHE?: KVNamespace;
}

// Manual constant-time comparison (rather than node:crypto's timingSafeEqual, which would pull
// in @types/node and conflict with @cloudflare/workers-types' own global declarations) so a
// wrong-but-close guess doesn't leak timing info about how many leading characters matched.
function timingSafeStringEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

function isAuthorized(request: Request, env: Env): boolean {
  if (!env.MCP_AUTH_TOKEN) return false; // fail closed if the secret isn't configured

  const header = request.headers.get("Authorization");
  if (!header?.startsWith("Bearer ")) return false;

  return timingSafeStringEqual(header.slice("Bearer ".length), env.MCP_AUTH_TOKEN);
}

function createServer(env: Env): McpServer {
  const server = new McpServer({ name: "steamyard-mcp", version: "0.1.0" });

  server.registerTool(
    "get-owned-games",
    {
      description: "Look up a public Steam profile's owned games and playtime.",
      inputSchema: getOwnedGamesInputSchema,
    },
    (input) => getOwnedGamesHandler(input, env.STEAM_API_KEY, env.STEAMYARD_CACHE)
  );

  server.registerTool(
    "get-game-dlc",
    {
      description:
        "List a Steam game's DLC with release date and current price, optionally flagging each as owned/unowned for a given Steam profile.",
      inputSchema: getGameDlcInputSchema,
    },
    (input) => getGameDlcHandler(input, env.STEAM_API_KEY, env.STEAMYARD_CACHE)
  );

  return server;
}

export default {
  async fetch(request: Request, env: Env, _ctx: ExecutionContext): Promise<Response> {
    if (!env.STEAM_API_KEY) {
      return new Response(
        "Missing STEAM_API_KEY secret. Run: npx wrangler secret put STEAM_API_KEY",
        { status: 500 }
      );
    }

    const url = new URL(request.url);
    if (url.pathname !== "/mcp") {
      return new Response("Not found. The MCP endpoint is /mcp.", { status: 404 });
    }

    if (!isAuthorized(request, env)) {
      return new Response("Unauthorized. Pass Authorization: Bearer <token>.", { status: 401 });
    }

    // Stateless mode: a fresh server + transport per request. Fine for tool calls that don't
    // need multi-turn session state (ours don't) and keeps the Worker simple/scalable.
    const server = createServer(env);
    const transport = new WebStandardStreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
    });
    await server.connect(transport);
    return transport.handleRequest(request);
  },
} satisfies ExportedHandler<Env>;
