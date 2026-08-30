// Thin KV cache helper. Every call is a no-op when `kv` is undefined, so tools work fine
// without the STEAMYARD_CACHE binding — caching is a performance/rate-limit safeguard, not
// a correctness requirement.

export async function getCached<T>(kv: KVNamespace | undefined, key: string): Promise<T | null> {
  if (!kv) return null;
  const raw = await kv.get(key);
  return raw ? (JSON.parse(raw) as T) : null;
}

export async function setCached(
  kv: KVNamespace | undefined,
  key: string,
  value: unknown,
  ttlSeconds: number
): Promise<void> {
  if (!kv) return;
  await kv.put(key, JSON.stringify(value), { expirationTtl: ttlSeconds });
}
