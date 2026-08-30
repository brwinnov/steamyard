import { describe, it, expect, vi } from "vitest";
import { getCached, setCached } from "./cache.js";

function fakeKv(initial: Record<string, string> = {}) {
  const store = new Map(Object.entries(initial));
  return {
    get: vi.fn(async (key: string) => store.get(key) ?? null),
    put: vi.fn(async (key: string, value: string) => {
      store.set(key, value);
    }),
    store,
  };
}

describe("getCached", () => {
  it("returns null when no kv namespace is bound", async () => {
    expect(await getCached(undefined, "some-key")).toBeNull();
  });

  it("returns null on a cache miss", async () => {
    const kv = fakeKv();
    expect(await getCached(kv as never, "missing")).toBeNull();
    expect(kv.get).toHaveBeenCalledWith("missing");
  });

  it("returns the parsed value on a cache hit", async () => {
    const kv = fakeKv({ hit: JSON.stringify({ foo: "bar" }) });
    expect(await getCached(kv as never, "hit")).toEqual({ foo: "bar" });
  });
});

describe("setCached", () => {
  it("is a no-op when no kv namespace is bound", async () => {
    await expect(setCached(undefined, "key", { a: 1 }, 60)).resolves.toBeUndefined();
  });

  it("stores the JSON-serialized value with the given TTL", async () => {
    const kv = fakeKv();
    await setCached(kv as never, "key", { a: 1 }, 3600);
    expect(kv.put).toHaveBeenCalledWith("key", JSON.stringify({ a: 1 }), { expirationTtl: 3600 });
  });
});
