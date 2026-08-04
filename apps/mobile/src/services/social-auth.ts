import * as Sentry from "@sentry/react-native";
import * as WebBrowser from "expo-web-browser";
import { supabase } from "@/services/supabase";

export const NATIVE_AUTH_CALLBACK =
  process.env.EXPO_PUBLIC_AUTH_CALLBACK_URL ?? "pieceful://auth/callback";
const OAUTH_TIMEOUT_MS = 90_000;
const handledOAuthCallbacks = new Map<string, Promise<void>>();

// Call once, after Sentry.init(), so the report actually reaches Sentry
// instead of being dropped by a client that isn't ready yet.
export function reportInsecureAuthCallbackIfNeeded() {
  if (
    process.env.EXPO_PUBLIC_APP_ENV !== "production" ||
    NATIVE_AUTH_CALLBACK.startsWith("https://")
  )
    return;
  // The custom pieceful:// scheme is a local-development fallback (see
  // .env.example): any app registering the same scheme can intercept or
  // replay the callback URL. PKCE keeps this from yielding a session, but a
  // shipped build should use the configured Universal/App Link instead.
  Sentry.captureMessage(
    "Production build is using the pieceful:// OAuth fallback instead of an HTTPS callback URL. Set EXPO_PUBLIC_AUTH_CALLBACK_URL to the configured Universal/App Link.",
    "warning",
  );
}

export function isNativeAuthCallback(url: string) {
  try {
    const callback = new URL(url);
    const expected = new URL(NATIVE_AUTH_CALLBACK);
    return (
      callback.protocol === expected.protocol &&
      callback.host === expected.host &&
      callback.pathname.replace(/\/$/, "") === expected.pathname.replace(/\/$/, "")
    );
  } catch {
    return false;
  }
}

export function completeOAuthCallback(url: string) {
  if (!isNativeAuthCallback(url)) return Promise.reject(new Error("AUTH_CALLBACK_FAILED"));
  const existing = handledOAuthCallbacks.get(url);
  if (existing) return existing;
  const completion = (async () => {
    if (!supabase) throw new Error("Supabase environment variables are not configured.");
    const { data: current } = await supabase.auth.getSession();
    if (current.session) return;

    const callback = new URL(url);
    const callbackErrorCode =
      callback.searchParams.get("error_code") ?? callback.searchParams.get("error");
    const callbackError = callback.searchParams.get("error_description");
    if (callbackErrorCode || callbackError)
      throw new Error(callbackErrorCode ?? callbackError ?? "AUTH_CALLBACK_FAILED");

    const code = callback.searchParams.get("code");
    if (code) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) throw error;
      return;
    }
    throw new Error("OAuth did not return a PKCE authorization code.");
  })();
  handledOAuthCallbacks.set(url, completion);
  void completion.finally(() => handledOAuthCallbacks.delete(url));
  return completion;
}

export async function openAuthSession(url: string, redirectTo: string) {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      WebBrowser.openAuthSessionAsync(url, redirectTo),
      new Promise<never>((_resolve, reject) => {
        timeout = setTimeout(() => reject(new Error("AUTH_TIMEOUT")), OAUTH_TIMEOUT_MS);
      }),
    ]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}
