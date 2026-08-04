# Production security and operations runbook

## Before the first deployment

1. Create separate Supabase and RevenueCat projects for staging and production. Never reuse keys.
2. Enable leaked-password protection, email confirmation, refresh-token rotation and MFA in
   Supabase. Restrict dashboard membership and require MFA for every organization member.
3. Apply migrations with `supabase db push` only after CI has passed `supabase db reset` and
   `supabase test db`. Run Supabase Security Advisor afterward and resolve every error.
4. Create the Studio user, set `app_metadata.role` to `admin` using the Supabase dashboard or an
   isolated service-role operation, and enroll/verify a TOTP factor before exposing `/admin`.
5. Generate independent random values for the admin session, API rate limit, RevenueCat webhook
   Authorization and HMAC secrets. Store them in the deployment secret manager, not `.env` files in
   source control. Configure the webhook to send both headers and test it from RevenueCat.
6. Configure only the public RevenueCat SDK key in `EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY`.
   Secret RevenueCat API keys remain in the API and should have the minimum available permissions.
7. Set an HTTPS `EXPO_PUBLIC_AUTH_CALLBACK_URL`. Publish Apple Associated Domains and Android
   Digital Asset Links files containing the real Apple Team ID and Android release-certificate
   SHA-256. Add the exact callback to Supabase's redirect allow-list; keep the custom scheme for
   local development only.
8. Configure Sentry DSNs, environments and releases. Keep PII collection disabled. Alert on elevated
   API 5xx, `/ready` failures, crash-free-session regressions, failed RevenueCat deliveries, repeated
   admin login blocking and storage/database quota thresholds.

## Release gate

Run `bun install --frozen-lockfile`, `bun run doctor`, `bun run lint`, `bun run typecheck`,
`bun run test`, `bun run build`, and OSV Scanner. CI additionally rebuilds Supabase from zero, runs
pgTAP security assertions, CodeQL and Gitleaks. Protect `main`: require both workflows, at least one
review, resolved conversations, signed commits where practical, and disallow force pushes/deletion.

Smoke-test staging with two unrelated users: profile search, friend request/blocking, offline puzzle
sync, account deletion, invalid/oversized image upload, free/paid/level pack access, tampered pack
download, old app-version rejection, admin MFA/login/logout and a RevenueCat duplicate webhook.

## Backups and recovery

Enable Supabase Point-in-Time Recovery for production and retain independent scheduled logical
backups according to business requirements. Backups contain personal data: encrypt them, restrict
access, record every restore and delete expired copies. Quarterly, restore the latest backup into an
isolated project, run migrations and pgTAP tests, validate row counts and sample non-sensitive
records, then destroy the isolated project. Record recovery point/time achieved and remediation.

## Routine maintenance

The database schedules `pieceful.run_retention_maintenance()` daily through `pg_cron`. Monitor the
job and its table growth monthly. Review admin roles, Supabase members, deploy tokens, RevenueCat
keys and Sentry members quarterly; remove stale access immediately. Rotate secrets at least every
180 days and whenever exposure is suspected. Storage orphan cleanup must run server-side and compare
object paths to database references before deletion—never use a broad recursive delete.

## Incident response

1. Contain: disable the affected route/deployment, revoke the specific key/session, preserve audit
   and provider logs, and avoid deleting evidence.
2. Assess: determine affected identities, objects, time range and whether personal images, purchases
   or credentials were accessible. Use request IDs and hashed source fingerprints for correlation.
3. Eradicate: patch and test in staging, rotate affected service-role, RevenueCat, OAuth, Sentry and
   deployment credentials, revoke admin/user sessions, and redeploy from a reviewed commit.
4. Recover: verify `/health`, `/ready`, RLS tests, Storage privacy, purchase reconciliation and error
   rates. Increase monitoring until normal behavior is stable.
5. Notify: follow applicable LGPD, store/provider and contractual notification requirements. Do not
   place sensitive incident data in public issues. Document timeline, decisions and preventive work.

## Child privacy review

Before release, obtain legal/product review of age gating, parental consent where required, privacy
notice, ad configuration, analytics events and retention. Do not add ad identifiers, precise
location, contacts, free-form child profiling or personalized ads without a new privacy/security
review. Verify the Play Families and App Store Kids Category declarations match actual behavior.
