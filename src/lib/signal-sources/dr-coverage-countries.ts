/**
 * Single source of truth for which ISO 3166-1 alpha-2 country codes
 * the First Response signal-source ingesters treat as "DR-relevant".
 *
 * Events from countries OUTSIDE this set are dropped at ingest time —
 * they never reach the emergency_events table. This complements the
 * dashboard read-filter (Phase 3g) by also cutting noise at the data-
 * model level: the DB only contains events DR might plausibly act on
 * (now or via expansion).
 *
 * Membership:
 *   • DR direct coverage today — PS, BD, GB
 *   • Adjacent diaspora-relevant — PK, SY, IN, AF, YE, SD, SO, EG, TR,
 *     ID, MA, IR, IQ, JO, LB, MM (mostly Muslim-majority geographies
 *     with significant UK diaspora ties)
 *
 * To expand: add the ISO-2 code here AND seed a coverage_map row.
 * Without the coverage_map row, the events will ingest but score 0
 * and stay hidden from the dashboard via Phase 3g's read filter.
 */
export const DR_INGEST_COUNTRIES_ISO2 = new Set<string>([
  // Direct coverage
  "PS",
  "BD",
  "GB",
  // Diaspora-adjacent / potential expansion
  "PK",
  "SY",
  "IN",
  "AF",
  "YE",
  "SD",
  "SO",
  "EG",
  "TR",
  "ID",
  "MA",
  "IR",
  "IQ",
  "JO",
  "LB",
  "MM",
]);

/**
 * Is this country in our ingest set? Handles GB-BRT subdivision
 * suffixes (so 'GB-BRT' matches via the 'GB' base code) without
 * the caller having to strip the suffix first.
 */
export function isIngestCountry(iso2: string | null | undefined): boolean {
  if (!iso2) return false;
  const base = iso2.split("-")[0]?.toUpperCase() ?? "";
  return DR_INGEST_COUNTRIES_ISO2.has(base);
}
