import { describe, it, expect } from "vitest";
import worker, { type Env } from "./index.js";

const baseEnv: Env = { STEAM_API_KEY: "steam-key", MCP_AUTH_TOKEN: "correct-token" };

function initializeRequest(headers: Record<string, string> = {}) {
  return new Request("https://example.com/mcp", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
      ...headers,
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: "2025-06-18",
        capabilities: {},
        clientInfo: { name: "test", version: "1" },
      },
    }),
  });
}

describe("worker.fetch", () => {
  it("returns 500 when STEAM_API_KEY isn't configured", async () => {
    const res = await worker.fetch(
      initializeRequest({ Authorization: "Bearer correct-token" }),
      { ...baseEnv, STEAM_API_KEY: "" },
      {} as ExecutionContext
    );
    expect(res.status).toBe(500);
  });

  it("returns 404 for any path other than /mcp", async () => {
    const req = new Request("https://example.com/other");
    const res = await worker.fetch(req, baseEnv, {} as ExecutionContext);
    expect(res.status).toBe(404);
  });

  it("returns 401 when no Authorization header is sent", async () => {
    const res = await worker.fetch(initializeRequest(), baseEnv, {} as ExecutionContext);
    expect(res.status).toBe(401);
  });

  it("returns 401 when the token is wrong", async () => {
    const res = await worker.fetch(
      initializeRequest({ Authorization: "Bearer wrong-token" }),
      baseEnv,
      {} as ExecutionContext
    );
    expect(res.status).toBe(401);
  });

  it("returns 401 when MCP_AUTH_TOKEN isn't configured, even with a header sent", async () => {
    const res = await worker.fetch(
      initializeRequest({ Authorization: "Bearer anything" }),
      { ...baseEnv, MCP_AUTH_TOKEN: "" },
      {} as ExecutionContext
    );
    expect(res.status).toBe(401);
  });

  it("proceeds to the MCP handshake with the correct token", async () => {
    const res = await worker.fetch(
      initializeRequest({ Authorization: "Bearer correct-token" }),
      baseEnv,
      {} as ExecutionContext
    );
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toContain("steamyard-mcp");
  });
});
