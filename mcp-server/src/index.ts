import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { getOwnedGamesInputSchema, getOwnedGamesHandler } from "./tools/getOwnedGames.js";
import { getGameDlcInputSchema, getGameDlcHandler } from "./tools/getGameDlc.js";

export interface Env {
  STEAM_API_KEY: string;
  // STEAMYARD_CACHE?: KVNamespace; // uncomment once bound in wrangler.jsonc
}

function createServer(env: Env): McpServer {
  const server = new McpServer({ name: "steamyard-mcp", version: "0.1.0" });

  server.registerTool(
    "get-owned-games",
    {
      description: "Look up a public Steam profile's owned games and playtime.",
      inputSchema: getOwnedGamesInputSchema,
    },
    (input) => getOwnedGamesHandler(input, env.STEAM_API_KEY)
  );

  server.registerTool(
    "get-game-dlc",
    {
      description:
        "List a Steam game's DLC with release date and current price, optionally flagging each as owned/unowned for a given Steam profile.",
      inputSchema: getGameDlcInputSchema,
    },
    (input) => getGameDlcHandler(input, env.STEAM_API_KEY)
  );

  return server;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
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

    // Stateless mode: a fresh server + transport per request. Fine for tool calls that don't
    // need multi-turn session state (ours don't) and keeps the Worker simple/scalable.
    const server = createServer(env);
    const transport = new WebStandardStreamableHTTPServerTransport({ sessionIdGenerator: undefined });
    await server.connect(transport);
    return transport.handleRequest(request);
  },
} satisfies ExportedHandler<Env>;
