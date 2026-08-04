# Pieceful security model

## Trust boundaries

The mobile and web clients are untrusted. Supabase Auth establishes identity, row-level security
limits reads, and narrowly scoped `SECURITY DEFINER` RPCs validate every social, profile and puzzle
mutation. The service-role key, Unsplash key, RevenueCat secret and webhook secrets exist only in
the API runtime.

Personal puzzle rows and Storage objects are owner-only. Profile discovery exposes only safe fields
to the owner or accepted friends; a friend code is returned only for an exact code match. XP and
achievements are incrementally derived from validated puzzle data. Offline gameplay means this is
abuse-resistant, not a server-authoritative anti-cheat system.

## Images and paid content

Clients upload through authenticated API endpoints. The server checks decoded type, dimensions,
pixel count and quota, strips metadata, and re-encodes a full image plus thumbnail as WebP. Direct
Storage writes are revoked. Paid-pack objects are private and delivered through 15-minute signed
URLs only after level or RevenueCat entitlement verification. Downloads must match the server-side
SHA-256 digest, and packs can require a minimum app version.

## Administration and purchases

Pieceful Studio requires a Supabase user with `app_metadata.role = admin` and verified TOTP. Its
opaque cookie is HttpOnly, SameSite=Strict, eight-hour absolute and one-hour idle expiry. The API
rechecks the role, enforces an exact Origin, rate-limits attempts and writes an immutable-to-clients
audit trail.

RevenueCat webhooks require both the configured Authorization value and HMAC signature, accept only
fresh raw-body signatures, deduplicate event IDs and ignore older deliveries when newer entitlement
state already exists. Mobile entitlements with failed trusted verification are rejected.

## Privacy and telemetry

Logs omit query strings, bodies, tokens, email addresses and raw IPs. Sentry is opt-in through a DSN
and has `sendDefaultPii` disabled. Child-directed ad flags, a G rating and non-personalized rewarded
requests are enabled for child mode. Account deletion removes database records and private Storage
objects through a server-side RPC; local credentials and cached identity are then cleared.

Operational records have bounded retention: login/rate-limit records after seven to 30 days,
RevenueCat deliveries after 180 days, and audit/inactive-entitlement records after 400 days. User
puzzles are not expired automatically.

## Reporting

Report suspected vulnerabilities privately to the repository owner. Do not attach personal photos,
access tokens, passwords, purchase receipts or service-role keys. Follow
`docs/operations-security.md` for triage and key rotation.
