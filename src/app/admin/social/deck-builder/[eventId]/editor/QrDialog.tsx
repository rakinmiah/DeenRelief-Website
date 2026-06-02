"use client";

/**
 * QrDialog — generate a "scan to donate" QR code for a chosen campaign and
 * drop it onto the current slide. The QR points at the campaign's public
 * landing page (which always exists) with UTM tags so scans are attributable.
 * Rendered client-side via the `qrcode` lib (same one the standalone QR
 * generator uses), so the result is a PNG data URL we can insert as an image
 * layer — it survives both the canvas and the Satori PNG export.
 */

import { useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import { CAMPAIGNS, type CampaignSlug } from "@/lib/campaigns";

// Mirrors CAMPAIGN_LANDING_PATHS in src/lib/short-links.ts. Kept inline so this
// client component doesn't pull the server-side short-links module (Supabase
// helpers) into the browser bundle.
const LANDING: Record<CampaignSlug, string> = {
  palestine: "/palestine",
  "cancer-care": "/cancer-care",
  "orphan-sponsorship": "/orphan-sponsorship",
  "build-a-school": "/build-a-school",
  "clean-water": "/clean-water",
  "uk-homeless": "/uk-homeless",
  zakat: "/zakat",
  sadaqah: "/sadaqah",
  qurbani: "/qurbani",
  general: "/donate",
};

const SLUGS = Object.keys(CAMPAIGNS) as CampaignSlug[];

function campaignUrl(slug: CampaignSlug): string {
  const base = (process.env.NEXT_PUBLIC_SITE_URL || "https://deenrelief.org").replace(/\/$/, "");
  return `${base}${LANDING[slug]}?utm_source=qr&utm_medium=social&utm_campaign=${slug}`;
}

export default function QrDialog({
  onInsert,
  onClose,
}: {
  onInsert: (dataUrl: string, label: string) => void;
  onClose: () => void;
}) {
  const [slug, setSlug] = useState<CampaignSlug>(SLUGS[0]!);
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const url = useMemo(() => campaignUrl(slug), [slug]);

  useEffect(() => {
    let cancelled = false;
    setDataUrl(null);
    QRCode.toDataURL(url, {
      width: 512,
      margin: 1,
      errorCorrectionLevel: "H",
      color: { dark: "#163827", light: "#FFFFFF" },
    })
      .then((d) => {
        if (!cancelled) setDataUrl(d);
      })
      .catch(() => {
        if (!cancelled) setDataUrl(null);
      });
    return () => {
      cancelled = true;
    };
  }, [url]);

  return (
    <div className="fixed inset-0 z-[60] bg-charcoal/40 grid place-items-center p-6" onMouseDown={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-5" onMouseDown={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-heading font-semibold text-charcoal text-lg">Donate QR code</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-charcoal/40 hover:text-charcoal text-[20px] leading-none"
          >
            ×
          </button>
        </div>

        <label className="block text-[12px] font-medium text-charcoal/55 mb-1.5">Links to campaign</label>
        <select
          value={slug}
          onChange={(e) => setSlug(e.target.value as CampaignSlug)}
          className="dr-input mb-4"
        >
          {SLUGS.map((s) => (
            <option key={s} value={s}>
              {CAMPAIGNS[s]}
            </option>
          ))}
        </select>

        <div className="grid place-items-center rounded-xl bg-charcoal/[0.03] ring-1 ring-charcoal/8 p-4 mb-2">
          {dataUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={dataUrl} alt="QR preview" width={180} height={180} className="rounded-md" />
          ) : (
            <div className="w-[180px] h-[180px] grid place-items-center text-[12px] text-charcoal/40">Generating…</div>
          )}
        </div>
        <p className="text-[11px] text-charcoal/45 break-all mb-4">{url}</p>

        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-2 rounded-lg text-[13px] font-medium text-charcoal/60 hover:bg-charcoal/5"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!dataUrl}
            onClick={() => dataUrl && onInsert(dataUrl, `QR · ${CAMPAIGNS[slug]}`)}
            className="px-4 py-2 rounded-lg bg-green text-white text-[13px] font-semibold hover:bg-green-dark disabled:opacity-50 transition-colors"
          >
            Add to slide
          </button>
        </div>
      </div>
    </div>
  );
}
