#!/usr/bin/env node
/**
 * Deen Relief weekly growth report — pulls Search Console + GA4 (+ Google
 * Ads via the GA4↔Ads link) using the local gcloud Application Default
 * Credentials. Read-only scopes, no keys on disk.
 *
 * Usage:  node scripts/growth-report.mjs
 * Needs:  one-time `gcloud auth application-default login` on this machine
 *         with analytics.readonly + webmasters.readonly scopes (already done
 *         for rakin.rifat.miah@gmail.com — shared with the JDH Gas report).
 *
 * Prints a markdown report to stdout: last 7 COMPLETE days vs the 7 before
 * (both ranges end 3 days ago because GSC data lags ~2 days), plus a
 * 28-day donations/ads context block since weekly donation volume is small.
 *
 * Google Ads figures come through the GA4 Data API's advertiser metrics
 * (the Ads account is linked to GA4) — no Ads developer token needed. When
 * the Ads API dev token lands (see src/lib/google-ads.ts), a GAQL section
 * with search terms + quality data can be added.
 */
import { execSync } from "node:child_process";

const GSC_SITE = "sc-domain:deenrelief.org";
const GA4_PROPERTY = "524785471";
const GCLOUD = "/opt/homebrew/share/google-cloud-sdk/bin/gcloud";

// Donation-funnel events tracked on the site (src/lib/analytics.ts).
const KEY_EVENTS = ["purchase", "form_start", "donation_funnel_step"];

const TOKEN = execSync(`${GCLOUD} auth application-default print-access-token`, {
  encoding: "utf8",
}).trim();

async function api(url, body) {
  const res = await fetch(url, {
    method: body ? "POST" : "GET",
    headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`${url} → ${res.status}: ${await res.text()}`);
  return res.json();
}

// GSC data lags ~2 days; report on the last 7 complete days vs the 7 before.
const day = (offset) => {
  const d = new Date();
  d.setDate(d.getDate() - offset);
  return d.toISOString().slice(0, 10);
};
const CUR = { startDate: day(9), endDate: day(3) };
const PREV = { startDate: day(16), endDate: day(10) };
const MONTH = { startDate: day(30), endDate: day(3) };

async function gsc(range, dimensions, extra = {}) {
  const data = await api(
    `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(GSC_SITE)}/searchAnalytics/query`,
    { ...range, dimensions, rowLimit: 25, ...extra },
  );
  return data.rows ?? [];
}

async function ga4(range, dimensions, metrics, extra = {}) {
  const data = await api(
    `https://analyticsdata.googleapis.com/v1beta/properties/${GA4_PROPERTY}:runReport`,
    {
      dateRanges: [range],
      dimensions: dimensions.map((name) => ({ name })),
      metrics: metrics.map((name) => ({ name })),
      limit: 25,
      ...extra,
    },
  );
  return data.rows ?? [];
}

const num = (v) => Number(v ?? 0);
const gbp = (v) => `£${num(v).toFixed(2).replace(/\.00$/, "")}`;
const pct = (cur, prev) =>
  prev === 0 ? (cur > 0 ? "new" : "—") : `${cur >= prev ? "+" : ""}${Math.round(((cur - prev) / prev) * 100)}%`;
const dim = (r, i = 0) => r.dimensionValues?.[i]?.value ?? "";
const met = (r, i = 0) => num(r.metricValues?.[i]?.value);

const [curTotal, prevTotal, topQueries, topPages, prevPages] = await Promise.all([
  gsc(CUR, []),
  gsc(PREV, []),
  gsc(CUR, ["query"]),
  gsc(CUR, ["page"]),
  gsc(PREV, ["page"]),
]);

const [curEvents, prevEvents, curTraffic, prevTraffic, curChannels, monthDonations, monthAds] =
  await Promise.all([
    ga4(CUR, ["eventName"], ["eventCount"]),
    ga4(PREV, ["eventName"], ["eventCount"]),
    ga4(CUR, [], ["sessions", "totalUsers", "purchaseRevenue"]),
    ga4(PREV, [], ["sessions", "totalUsers", "purchaseRevenue"]),
    ga4(CUR, ["sessionDefaultChannelGroup"], ["sessions", "keyEvents"]),
    ga4(MONTH, [], ["eventCount", "purchaseRevenue"], {
      dimensionFilter: {
        filter: { fieldName: "eventName", stringFilter: { value: "purchase" } },
      },
    }),
    ga4(MONTH, ["sessionGoogleAdsCampaignName"], [
      "advertiserAdCost",
      "advertiserAdClicks",
      "advertiserAdImpressions",
      "purchaseRevenue",
    ]),
  ]);

const evCount = (rows, name) => met(rows.find((r) => dim(r) === name) ?? {});

const ct = curTotal[0] ?? {};
const pt = prevTotal[0] ?? {};
const tr = curTraffic[0] ?? {};
const ptr = prevTraffic[0] ?? {};

console.log(`# Deen Relief growth report — ${CUR.startDate} → ${CUR.endDate}`);
console.log(
  `(vs previous week ${PREV.startDate} → ${PREV.endDate}; GSC lags ~2 days, so ranges end ${day(3)})\n`,
);

console.log(`## Search (Google Search Console)`);
console.log(`- Clicks: ${num(ct.clicks)} (${pct(num(ct.clicks), num(pt.clicks))})`);
console.log(`- Impressions: ${num(ct.impressions)} (${pct(num(ct.impressions), num(pt.impressions))})`);
console.log(`\n### Top queries`);
for (const r of topQueries.slice(0, 15)) {
  console.log(
    `- "${r.keys[0]}" — ${r.clicks} clicks / ${r.impressions} impr / avg pos ${r.position.toFixed(1)}`,
  );
}
console.log(`\n### Pages earning impressions`);
const prevByPage = Object.fromEntries(prevPages.map((r) => [r.keys[0], r]));
for (const r of topPages.slice(0, 15)) {
  const prev = prevByPage[r.keys[0]];
  console.log(
    `- ${r.keys[0].replace("https://deenrelief.org", "") || "/"} — ${r.clicks} clicks / ${r.impressions} impr (impr ${pct(r.impressions, num(prev?.impressions))})`,
  );
}

console.log(`\n## Traffic & donations (GA4)`);
console.log(
  `- Sessions: ${met(tr, 0)} (${pct(met(tr, 0), met(ptr, 0))}) · Users: ${met(tr, 1)}`,
);
console.log(
  `- Donation revenue: ${gbp(met(tr, 2))} (prev week ${gbp(met(ptr, 2))})`,
);
for (const name of KEY_EVENTS) {
  console.log(`- ${name}: ${evCount(curEvents, name)} (${pct(evCount(curEvents, name), evCount(prevEvents, name))})`);
}

console.log(`\n### Sessions by channel`);
for (const r of curChannels) {
  console.log(`- ${dim(r)} — ${met(r, 0)} sessions · ${met(r, 1)} key events`);
}

console.log(`\n## Last 28 days context (${MONTH.startDate} → ${MONTH.endDate})`);
const md = monthDonations[0] ?? {};
console.log(`- Donations: ${met(md, 0)} totalling ${gbp(met(md, 1))}`);

console.log(`\n### Google Ads (via GA4 link)`);
const adRows = monthAds.filter((r) => dim(r) && dim(r) !== "(not set)");
if (adRows.length === 0) {
  console.log(`- No ad traffic recorded in the window.`);
} else {
  for (const r of adRows) {
    const cost = met(r, 0);
    const revenue = met(r, 3);
    const roas = cost > 0 ? ` · ROAS ${(revenue / cost).toFixed(2)}` : "";
    console.log(
      `- ${dim(r)} — spend ${gbp(cost)} · ${met(r, 1)} clicks · ${met(r, 2)} impr · revenue ${gbp(revenue)}${roas}`,
    );
  }
}
