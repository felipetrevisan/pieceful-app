import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { Elysia } from "elysia";
import { fetchWithTimeout } from "./security";

const schema = "pieceful";
const signatureToleranceSeconds = 5 * 60;

interface RevenueCatEvent {
  id?: string;
  type?: string;
  app_user_id?: string;
  product_id?: string;
  environment?: string;
  purchased_at_ms?: number;
  expiration_at_ms?: number | null;
  event_timestamp_ms?: number;
}

function configuration() {
  const url = Bun.env.SUPABASE_URL?.replace(/\/$/, "");
  const key = Bun.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase RevenueCat ledger is not configured.");
  return { url, key };
}

async function database<T>(path: string, init: RequestInit = {}) {
  const { url, key } = configuration();
  const response = await fetchWithTimeout(`${url}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      Accept: "application/json",
      "Accept-Profile": schema,
      "Content-Profile": schema,
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...init.headers,
    },
  });
  if (!response.ok) throw new Error((await response.text()) || "RevenueCat ledger failed.");
  if (response.status === 204) return null as T;
  return (await response.json()) as T;
}

export function verifyRevenueCatSignature(
  rawBody: string,
  signatureHeader: string,
  secret: string,
) {
  const parts = Object.fromEntries(
    signatureHeader.split(",").flatMap((part) => {
      const separator = part.indexOf("=");
      return separator > 0
        ? [[part.slice(0, separator).trim(), part.slice(separator + 1).trim()]]
        : [];
    }),
  );
  const timestamp = Number(parts.t);
  const supplied = parts.v1;
  if (!Number.isFinite(timestamp) || !supplied || !/^[a-f0-9]{64}$/i.test(supplied)) return false;
  if (Math.abs(Date.now() / 1000 - timestamp) > signatureToleranceSeconds) return false;
  const expected = createHmac("sha256", secret).update(`${timestamp}.${rawBody}`).digest("hex");
  const left = Buffer.from(expected, "hex");
  const right = Buffer.from(supplied, "hex");
  return left.length === right.length && timingSafeEqual(left, right);
}

function activeEvent(type: string) {
  return [
    "INITIAL_PURCHASE",
    "RENEWAL",
    "NON_RENEWING_PURCHASE",
    "UNCANCELLATION",
    "PRODUCT_CHANGE",
  ].includes(type);
}

function inactiveEvent(type: string) {
  return ["EXPIRATION", "REFUND", "SUBSCRIPTION_PAUSED"].includes(type);
}

async function processEvent(event: RevenueCatEvent, rawBody: string) {
  if (!event.id || !event.type) throw new Error("invalid_revenuecat_event");
  const active = activeEvent(event.type) ? true : inactiveEvent(event.type) ? false : null;
  await database<boolean>("rpc/process_revenuecat_event", {
    method: "POST",
    body: JSON.stringify({
      p_event_id: event.id,
      p_event_type: event.type,
      p_app_user_id: event.app_user_id ?? null,
      p_product_id: event.product_id ?? null,
      p_event_environment: event.environment ?? null,
      p_payload_hash: createHash("sha256").update(rawBody).digest("hex"),
      p_entitlement_active: active,
      p_purchased_at: event.purchased_at_ms ? new Date(event.purchased_at_ms).toISOString() : null,
      p_expires_at: event.expiration_at_ms ? new Date(event.expiration_at_ms).toISOString() : null,
      p_event_at: event.event_timestamp_ms
        ? new Date(event.event_timestamp_ms).toISOString()
        : new Date().toISOString(),
    }),
  });
}

export const revenueCatRoutes = new Elysia({ prefix: "/api/webhooks" }).post(
  "/revenuecat",
  async ({ body, headers, set }) => {
    const rawBody = body as string;
    const secret = Bun.env.REVENUECAT_WEBHOOK_SIGNING_SECRET;
    const expectedAuthorization = Bun.env.REVENUECAT_WEBHOOK_AUTHORIZATION;
    if (
      !secret ||
      !expectedAuthorization ||
      !headers["x-revenuecat-webhook-signature"] ||
      !verifyRevenueCatSignature(rawBody, headers["x-revenuecat-webhook-signature"], secret) ||
      headers.authorization !== expectedAuthorization
    ) {
      set.status = 401;
      return { ok: false };
    }
    let event: RevenueCatEvent;
    try {
      event = (JSON.parse(rawBody) as { event?: RevenueCatEvent }).event ?? {};
    } catch {
      set.status = 400;
      return { ok: false };
    }
    await processEvent(event, rawBody);
    return { ok: true };
  },
  { parse: "text" },
);
