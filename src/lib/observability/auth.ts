/**
 * Observability API auth (Sprint 57 — Observability).
 *
 * Gates the read-only dashboard APIs with the existing CRON_SECRET bearer token
 * (same pattern as the cron route). Fail-closed: if CRON_SECRET is not set, or
 * the header does not match, access is denied. No new secret introduced.
 */

/** True when the request carries `Authorization: Bearer <CRON_SECRET>`. */
export function isObservabilityAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret || secret.trim() === "") return false; // fail closed
  return request.headers.get("authorization") === `Bearer ${secret}`;
}
