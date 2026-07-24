const localNetworkOrigin =
  /^https?:\/\/(?:localhost|127\.0\.0\.1|\[::1\]|10(?:\.\d{1,3}){3}|192\.168(?:\.\d{1,3}){2}|172\.(?:1[6-9]|2\d|3[01])(?:\.\d{1,3}){2})(?::\d+)?$/;

export function normalizeOrigin(value: string) {
  const candidate = value.trim();
  if (!candidate) return "";

  try {
    return new URL(candidate).origin;
  } catch {
    return candidate.replace(/\/+$/, "");
  }
}

export function configuredWebOrigins(value?: string) {
  return (value ?? "http://localhost:3000").split(",").map(normalizeOrigin).filter(Boolean);
}

export function isAllowedWebOrigin(origin: string, configuredOrigins: string[]) {
  const normalized = normalizeOrigin(origin);
  return configuredOrigins.includes(normalized) || localNetworkOrigin.test(normalized);
}
