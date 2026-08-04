import { createHash, randomUUID } from "node:crypto";

const schema = "pieceful";

export function trustedClientAddress(headers: Record<string, string | undefined>) {
  const configuredHeader = Bun.env.TRUSTED_PROXY_IP_HEADER?.toLowerCase();
  const platformHeader = Bun.env.VERCEL
    ? "x-vercel-forwarded-for"
    : Bun.env.CLOUDFLARE
      ? "cf-connecting-ip"
      : configuredHeader;
  if (!platformHeader) return "unknown";
  return headers[platformHeader]?.split(",")[0]?.trim() || "unknown";
}

export function requestId(headers: Record<string, string | undefined>) {
  const supplied = headers["x-request-id"];
  return supplied && /^[A-Za-z0-9._-]{8,100}$/.test(supplied) ? supplied : randomUUID();
}

export function requestFingerprint(
  headers: Record<string, string | undefined>,
  identity = "anonymous",
) {
  const secret = Bun.env.API_RATE_LIMIT_SECRET ?? Bun.env.PIECEFUL_ADMIN_SESSION_SECRET ?? "";
  return createHash("sha256")
    .update(`${secret}:${trustedClientAddress(headers)}:${identity}`)
    .digest("hex");
}

export async function consumeRateLimit(
  headers: Record<string, string | undefined>,
  route: string,
  maximum: number,
  windowSeconds = 60,
  identity = "anonymous",
) {
  const url = Bun.env.SUPABASE_URL?.replace(/\/$/, "");
  const key = Bun.env.SUPABASE_SERVICE_ROLE_KEY;
  const secret = Bun.env.API_RATE_LIMIT_SECRET ?? Bun.env.PIECEFUL_ADMIN_SESSION_SECRET;
  if (!url || !key || !secret) return Bun.env.NODE_ENV !== "production";
  const response = await fetch(`${url}/rest/v1/rpc/consume_api_rate_limit`, {
    method: "POST",
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      "Content-Profile": schema,
      Accept: "application/json",
    },
    body: JSON.stringify({
      request_fingerprint: requestFingerprint(headers, identity),
      route_name: route,
      maximum_attempts: maximum,
      window_seconds: windowSeconds,
      block_seconds: Math.min(900, Math.max(60, windowSeconds)),
    }),
    signal: AbortSignal.timeout(3000),
  }).catch(() => null);
  if (!response?.ok) return Bun.env.NODE_ENV !== "production";
  return (await response.json()) === true;
}

export function fetchWithTimeout(
  input: string | URL | Request,
  init: RequestInit = {},
  timeoutMilliseconds = 8000,
) {
  return fetch(input, {
    ...init,
    signal: init.signal ?? AbortSignal.timeout(timeoutMilliseconds),
  });
}

interface CachedValue<T> {
  expiresAt: number;
  value: T;
}

export class TtlCache<T> {
  readonly #items = new Map<string, CachedValue<T>>();

  constructor(
    private readonly ttlMilliseconds: number,
    private readonly maximumItems = 200,
  ) {}

  get(key: string) {
    const item = this.#items.get(key);
    if (!item) return null;
    if (item.expiresAt <= Date.now()) {
      this.#items.delete(key);
      return null;
    }
    return item.value;
  }

  set(key: string, value: T) {
    if (this.#items.size >= this.maximumItems) {
      const oldest = this.#items.keys().next().value;
      if (oldest) this.#items.delete(oldest);
    }
    this.#items.set(key, { expiresAt: Date.now() + this.ttlMilliseconds, value });
  }
}

export class CircuitBreaker {
  #failures = 0;
  #openUntil = 0;

  constructor(
    private readonly maximumFailures = 3,
    private readonly cooldownMilliseconds = 30_000,
    private readonly now: () => number = Date.now,
  ) {}

  async run<T>(operation: () => Promise<T>) {
    if (this.#openUntil > this.now()) throw new Error("dependency_circuit_open");
    try {
      const result = await operation();
      this.#failures = 0;
      this.#openUntil = 0;
      return result;
    } catch (error) {
      this.#failures += 1;
      if (this.#failures >= this.maximumFailures) {
        this.#openUntil = this.now() + this.cooldownMilliseconds;
      }
      throw error;
    }
  }
}
