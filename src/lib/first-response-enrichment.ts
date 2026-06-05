/**
 * Crisis enrichment — for the SAME crisis the SMM is building a post about,
 * pull the recent, relevant FULL situation reports from ReliefWeb so the
 * content extraction has far more authoritative material to mine than the
 * single detecting signal.
 *
 * Cost / safety shape (confirmed with the user):
 *   • FREE source — the same ReliefWeb v2 API + approved appname we already
 *     use; this just retrieves the per-crisis depth we don't currently fetch
 *     (broader formats, full bodies). No new service, no new credential.
 *   • LAZY — only called on a content-extraction cache MISS (i.e. the first
 *     time the SMM opens a deck for an event), so most detected alerts never
 *     trigger a fetch. Re-opens are cache hits and skip this entirely.
 *   • RELEVANT — hard country pin (primary_country.iso3) + recency window +
 *     a relevance query built from the event's own keywords, ranked by
 *     ReliefWeb's score. A RELATIVE relevance gate drops reports much weaker
 *     than the best match, and the exact report the event came from is
 *     de-duped out. If nothing matches → we add NOTHING (the original event
 *     stays the sole source) rather than pad with off-topic material.
 *   • CAPPED — each body truncated + a hard total character cap, so the extra
 *     input tokens (and therefore cost) can never run away.
 */

import type { EmergencyEvent } from "./first-response";

const RELIEFWEB_REPORTS_URL = "https://api.reliefweb.int/v2/reports";
const UA = "DeenReliefSocial/1.0 (https://deenrelief.org; tech@deenrelief.org)";

const RECENCY_DAYS = 60; // only reports from the current crisis window
const MAX_REPORTS = 5; // breadth over depth — many sources, capped
const PER_REPORT_CHARS = 3000; // ~480 words of each report's lead
const TOTAL_CHAR_CAP = 14000; // hard token guard across all reports
const RELATIVE_SCORE_FLOOR = 0.35; // keep reports ≥35% as relevant as the best

/** DR's coverage countries: stored alpha-2 → ReliefWeb's ISO 3166-1 alpha-3. */
const ALPHA2_TO_ISO3: Record<string, string> = {
  PS: "pse",
  BD: "bgd",
  GB: "gbr",
  PK: "pak",
  SY: "syr",
  IN: "ind",
  AF: "afg",
  YE: "yem",
  SD: "sdn",
  SO: "som",
  EG: "egy",
  TR: "tur",
  ID: "idn",
  MA: "mar",
  IR: "irn",
  IQ: "irq",
  JO: "jor",
  LB: "lbn",
  MM: "mmr",
};

function iso3For(countryIso: string | null): string | null {
  if (!countryIso) return null;
  const a2 = countryIso.split("-")[0]?.trim().toUpperCase() ?? "";
  return ALPHA2_TO_ISO3[a2] ?? null;
}

export interface EnrichedReport {
  title: string;
  source: string; // agency shortname(s), e.g. "OCHA", "MSF"
  date: string; // YYYY-MM-DD
  url: string;
  body: string; // truncated
}

/** A report's citation metadata (no body) — for the "researched from" line. */
export type EnrichmentSource = Omit<EnrichedReport, "body">;

export interface CrisisContext {
  reports: EnrichedReport[];
  /** Citation metadata for each report used — surfaced to the SMM. */
  sources: EnrichmentSource[];
  /** Pre-formatted block to append to the extraction prompt (empty if none). */
  brief: string;
}

const EMPTY: CrisisContext = { reports: [], sources: [], brief: "" };

/** Relevance query from the event's own subject — title + type + region. */
function buildQueryString(event: EmergencyEvent): string {
  const stop = new Set([
    "the", "and", "for", "with", "report", "situation", "update",
    "humanitarian", "from", "into", "over", "amid", "after", "latest",
  ]);
  const terms = `${event.title} ${event.eventType ?? ""} ${event.region ?? ""}`
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 4 && !stop.has(w));
  return [...new Set(terms)].slice(0, 8).join(" ");
}

type RwItem = {
  score?: number;
  fields?: {
    title?: string;
    body?: string;
    url?: string;
    date?: { created?: string };
    source?: { shortname?: string }[];
  };
};

/**
 * Fetch recent, relevant ReliefWeb reports for the crisis behind `event`.
 * Always resolves (never throws) — on any error / no match it returns an
 * empty context so extraction simply proceeds on the original event alone.
 */
export async function fetchCrisisContext(
  event: EmergencyEvent
): Promise<CrisisContext> {
  const iso3 = iso3For(event.countryIso);
  if (!iso3) return EMPTY; // can't country-pin → don't risk off-topic enrichment

  const appname = (process.env.RELIEFWEB_APPNAME ?? "DRRelief-Charity-456").trim();
  const cutoff = new Date(Date.now() - RECENCY_DAYS * 86_400_000).toISOString();
  const query = buildQueryString(event);

  const requestBody: Record<string, unknown> = {
    limit: 10,
    fields: {
      include: [
        "title",
        "body",
        "url",
        "date.created",
        "source.shortname",
      ],
    },
    filter: {
      operator: "AND",
      conditions: [
        { field: "primary_country.iso3", value: iso3 },
        { field: "date.created", value: { from: cutoff } },
      ],
    },
  };
  if (query) {
    requestBody.query = { value: query, fields: ["title", "body"], operator: "OR" };
    requestBody.sort = ["score:desc", "date.created:desc"];
  } else {
    requestBody.sort = ["date.created:desc"];
  }

  let json: { data?: RwItem[] };
  try {
    const res = await fetch(
      `${RELIEFWEB_REPORTS_URL}?appname=${encodeURIComponent(appname)}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "User-Agent": UA,
        },
        body: JSON.stringify(requestBody),
        cache: "no-store",
        signal: AbortSignal.timeout(12_000),
      }
    );
    if (!res.ok) {
      console.warn(`[crisis-enrichment] ReliefWeb HTTP ${res.status}`);
      return EMPTY;
    }
    json = (await res.json()) as { data?: RwItem[] };
  } catch (err) {
    console.error("[crisis-enrichment] fetch failed:", err);
    return EMPTY;
  }

  const items = json.data ?? [];
  if (items.length === 0) return EMPTY;

  // Relative relevance gate: drop reports much weaker than the best match
  // (robust to ReliefWeb's un-normalised score scale). Only when we queried.
  const topScore = query ? Math.max(...items.map((i) => i.score ?? 0)) : 0;
  const floor = topScore * RELATIVE_SCORE_FLOOR;

  // De-dupe out the report the event itself came from.
  const eventTitle = (event.title || "").trim().toLowerCase();
  const eventUrl = (event.sourceUrl || "").trim().toLowerCase();

  const reports: EnrichedReport[] = [];
  let total = 0;
  for (const item of items) {
    const f = item.fields ?? {};
    const title = (f.title ?? "").trim();
    const text = (f.body ?? "").trim();
    if (!title || !text) continue;
    if (query && (item.score ?? 0) < floor) continue;
    if (title.toLowerCase() === eventTitle) continue;
    if (eventUrl && (f.url ?? "").trim().toLowerCase() === eventUrl) continue;

    const source =
      (f.source ?? [])
        .map((s) => s.shortname)
        .filter(Boolean)
        .join(", ") || "ReliefWeb";
    const date = (f.date?.created ?? "").slice(0, 10);
    const trimmed =
      text.length > PER_REPORT_CHARS
        ? text.slice(0, PER_REPORT_CHARS) + "…"
        : text;
    if (total + trimmed.length > TOTAL_CHAR_CAP) break;
    total += trimmed.length;
    reports.push({ title, source, date, url: f.url ?? "", body: trimmed });
    if (reports.length >= MAX_REPORTS) break;
  }

  if (reports.length === 0) return EMPTY;

  const brief = reports
    .map(
      (r, i) =>
        `--- Related report ${i + 1} · ${r.source} · ${r.date} ---\n${r.title}\n${r.body}`
    )
    .join("\n\n");

  const sources: EnrichmentSource[] = reports.map(({ title, source, date, url }) => ({
    title,
    source,
    date,
    url,
  }));

  return { reports, sources, brief };
}
