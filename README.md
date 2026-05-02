DeenRelief

## Operations

### Google Ads Conversion Upload (CSV)

Parallel pathway to the API-based OCI cron at `/api/cron/google-ads-oci`. The
API path needs an approved developer token + MCC, which we don't have yet.
This CSV path lets Google Ads poll a public-but-token-protected URL on a
schedule and ingest conversions itself. Same Smart Bidding signal, no
developer token required.

The two pathways run independently — they use separate state columns
(`csv_*` vs. `google_ads_*`), so flipping between them never causes
double-uploads.

**Endpoint:** `https://deenrelief.org/api/google-ads-csv-export?token=...`

**Token generation (one-time):**

```bash
openssl rand -hex 32
```

Set the result as `GOOGLE_ADS_CSV_TOKEN` in Vercel's project env vars
(Production + Preview). Then update the `token=<<REPLACE_...>>` placeholder
inside `vercel.json` with the same value — Vercel cron URLs can't reference
env vars, so this has to be a literal substitution. Anyone holding the
token can pull conversion data; treat it like a service-role secret.

**Wiring it to Google Ads:**

1. Conversions UI: Tools → Goals → Conversions → New conversion action →
   Upload from clicks. Name it exactly `Donation Completed - Server` (the
   route emits this string in the CSV's `Conversion Name` column; mismatch
   = silent reject).
2. Schedule the upload: Tools → Data manager → Uploads → Schedules →
   New schedule → Click conversions → paste the URL above (with `token=`
   filled in, no `phase` — defaults to `fetch`).
3. **Schedule recommendation:** hourly during launch / Qurbani peak
   (May 10–28, 2026), then daily from June onward.

**Coexistence with GA4 → Google Ads conversion link:**

This CSV upload runs in parallel with the GA4-imported `Donation Completed`
conversion. In the Google Ads UI, only ONE of the two should be marked
**Primary** for any given campaign — recommend GA4 import as Primary
(client-side, faster signal) and the CSV as Secondary (server-side,
ground-truth audit trail). Smart Bidding only learns from Primary.

**Two-phase commit (internal):**

Google's scheduled fetch is one-way — they don't tell us "ingestion succeeded
for rows X, Y, Z." So:

- `?phase=fetch` (default): Google polls, we serve the CSV and stamp
  `csv_served_at` on every row included. Served rows drop out of the next
  fetch.
- `?phase=commit`: hourly Vercel cron at `:15` past the hour. Promotes rows
  whose `csv_served_at` is older than 6h (Google's processing window) to
  `csv_uploaded_at`. Defensively resets rows stuck in "served" state for
  more than 24h so they re-enter the queue on the next fetch.

**GCLID expiry:** Google rejects GCLIDs older than 90 days. We filter at 85
to stay well clear of the boundary — older donations silently drop out of
the export.

**Smoke-test locally:**

```bash
# Substitute with your local GOOGLE_ADS_CSV_TOKEN value
curl -s "http://localhost:3000/api/google-ads-csv-export?token=YOUR_TOKEN" | head -20

# Expected:
# Parameters:TimeZone=Europe/London
# Google Click ID,Conversion Name,Conversion Time,Conversion Value,Conversion Currency,Email
# Cj0KCQjw...,Donation Completed - Server,2026-05-15 14:23:11+0100,50.00,GBP,a3f5...
```

Wrong token returns `404 Not Found` (deliberate — we don't advertise that
the endpoint exists).

**Validate the CSV before pointing Google at it:**

Google Ads UI → Tools → Data manager → Uploads → drag the CSV file into the
manual upload tool. If Google reports row errors, the format is wrong
somewhere — most common cause is the timezone offset (must be `+0100`, not
`+01:00`).
