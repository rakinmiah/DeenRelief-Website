"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import {
  buildShortLinkUrl,
  CAMPAIGN_LANDING_PATHS,
} from "@/lib/short-links";
import { CAMPAIGNS, type CampaignSlug } from "@/lib/campaigns";

/**
 * Brand-styled QR code generator.
 *
 * Live preview that re-renders as the SMM edits the inputs.
 * Outputs PNG at the chosen size for download — pastes cleanly into
 * Canva, Photoshop, Stories, Reels covers, posters.
 *
 * Why client-side: QR generation is fast (<50ms for a 1024×1024
 * code), zero network round-trips means the preview is instant,
 * and the resulting blob downloads via the standard Blob → object
 * URL pattern with no server involvement.
 *
 * Style decisions:
 *   - Dark colour: brand charcoal (#1F2937 — matches the rest of
 *     the admin / public UI).
 *   - Light colour: pure white. Transparent doesn't work well for
 *     QR scanners and looks bad on coloured backgrounds.
 *   - Error-correction level: H (30%). This lets us safely overlay
 *     a small logo without the code becoming unscannable. Costs a
 *     few extra modules per code — fine at 256+ px sizes.
 */

const SHORT_LINK_PROMPTS = [
  { slug: "q", label: "Voice-friendly Qurbani link (/r/q)" },
  { slug: "orphans", label: "Orphan sponsorship (/r/orphans)" },
];

const SIZES = [
  { value: 512, label: "Medium — 512px", use: "Stories, Reels, IG posts" },
  { value: 1024, label: "Large — 1024px", use: "Print / posters / leaflets" },
  { value: 256, label: "Small — 256px", use: "Inline social embeds" },
];

const DR_DARK = "#1F2937"; // brand charcoal
const DR_LIGHT = "#FFFFFF";

function safeFilename(text: string): string {
  return (
    text
      .toLowerCase()
      .replace(/^https?:\/\//, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "qr"
  );
}

export default function QrGenerator() {
  const [text, setText] = useState<string>(buildShortLinkUrl("q"));
  const [size, setSize] = useState<number>(512);
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Regenerate the preview as inputs change. Preview always renders at
  // 512px regardless of the chosen download size — preview is purely
  // for visual confirmation; the download button re-renders at the
  // chosen size when clicked.
  //
  // The effect calls setState only inside async resolution callbacks
  // (the "external system synchronization" pattern the React lint rule
  // permits) — not synchronously in the effect body.
  useEffect(() => {
    let cancelled = false;
    const trimmed = text.trim();
    if (!trimmed) {
      // Empty input → no preview, no error. Schedule via microtask so
      // we don't setState synchronously inside the effect body.
      void Promise.resolve().then(() => {
        if (cancelled) return;
        setPreviewSrc(null);
        setError(null);
      });
      return () => {
        cancelled = true;
      };
    }
    QRCode.toDataURL(trimmed, {
      width: 512,
      margin: 2,
      errorCorrectionLevel: "H",
      color: { dark: DR_DARK, light: DR_LIGHT },
    })
      .then((url) => {
        if (cancelled) return;
        setPreviewSrc(url);
        setError(null);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(
          err instanceof Error ? err.message : "Could not generate the QR code."
        );
        setPreviewSrc(null);
      });
    return () => {
      cancelled = true;
    };
  }, [text]);

  async function handleDownload() {
    setError(null);
    const trimmed = text.trim();
    if (!trimmed) {
      setError("Enter a URL or text first.");
      return;
    }
    try {
      const dataUrl = await QRCode.toDataURL(trimmed, {
        width: size,
        margin: 2,
        errorCorrectionLevel: "H",
        color: { dark: DR_DARK, light: DR_LIGHT },
      });
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `deenrelief-qr-${safeFilename(trimmed)}-${size}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not generate the QR code."
      );
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* ─── Inputs ─── */}
      <div className="bg-white border border-charcoal/10 rounded-2xl p-5 md:p-6 space-y-5">
        {error && (
          <div
            role="alert"
            className="px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm"
          >
            {error}
          </div>
        )}

        <div>
          <label
            htmlFor="qr-text"
            className="block text-xs font-bold uppercase tracking-[0.1em] text-charcoal/60 mb-1.5"
          >
            URL or text
          </label>
          <textarea
            id="qr-text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={3}
            className="w-full px-3 py-3 rounded-xl bg-cream border border-charcoal/10 focus:border-charcoal/30 focus:outline-none focus:ring-2 focus:ring-charcoal/10 text-charcoal text-sm font-mono resize-none"
            spellCheck={false}
          />
        </div>

        {/* ─── Quick-pick: short links ─── */}
        <div>
          <span className="block text-xs font-bold uppercase tracking-[0.1em] text-charcoal/60 mb-2">
            Quick-pick a short link
          </span>
          <div className="flex flex-wrap gap-2">
            {SHORT_LINK_PROMPTS.map((p) => (
              <button
                key={p.slug}
                type="button"
                onClick={() => setText(buildShortLinkUrl(p.slug))}
                className="px-3 py-1.5 rounded-full text-[12px] font-semibold bg-cream text-charcoal/70 hover:text-charcoal hover:bg-charcoal/10 transition-colors"
                title={p.label}
              >
                /r/{p.slug}
              </button>
            ))}
          </div>
          <p className="mt-1.5 text-[11px] text-charcoal/50">
            Or grab any URL from the{" "}
            <a
              href="/admin/social/links"
              className="font-semibold underline underline-offset-2"
            >
              short links page
            </a>
            .
          </p>
        </div>

        {/* ─── Quick-pick: campaign pages ─── */}
        <div>
          <span className="block text-xs font-bold uppercase tracking-[0.1em] text-charcoal/60 mb-2">
            Or a campaign page
          </span>
          <select
            onChange={(e) => {
              if (!e.target.value) return;
              const slug = e.target.value as CampaignSlug;
              const base =
                process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ??
                "https://deenrelief.org";
              setText(
                `${base}${CAMPAIGN_LANDING_PATHS[slug]}?utm_source=qr&utm_medium=print&utm_campaign=${slug}`
              );
              // Reset to placeholder so the same value can be picked again.
              e.target.value = "";
            }}
            value=""
            className="w-full px-3 py-3 rounded-xl bg-cream border border-charcoal/10 focus:border-charcoal/30 focus:outline-none focus:ring-2 focus:ring-charcoal/10 text-charcoal text-sm"
          >
            <option value="">— pick a campaign —</option>
            {(Object.keys(CAMPAIGN_LANDING_PATHS) as CampaignSlug[]).map(
              (slug) => (
                <option key={slug} value={slug}>
                  {CAMPAIGNS[slug]}
                </option>
              )
            )}
          </select>
        </div>

        {/* ─── Size picker ─── */}
        <div>
          <span className="block text-xs font-bold uppercase tracking-[0.1em] text-charcoal/60 mb-2">
            Download size
          </span>
          <div className="space-y-2">
            {SIZES.map((s) => (
              <label
                key={s.value}
                className={`flex items-start gap-3 px-3 py-2.5 rounded-xl border cursor-pointer transition-colors ${
                  size === s.value
                    ? "border-charcoal/30 bg-cream"
                    : "border-charcoal/10 hover:bg-cream/60"
                }`}
              >
                <input
                  type="radio"
                  name="size"
                  value={s.value}
                  checked={size === s.value}
                  onChange={() => setSize(s.value)}
                  className="mt-1 w-4 h-4 accent-charcoal"
                />
                <div>
                  <span className="block text-charcoal font-semibold text-sm">
                    {s.label}
                  </span>
                  <span className="block text-charcoal/60 text-[12px]">
                    {s.use}
                  </span>
                </div>
              </label>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={handleDownload}
          disabled={!previewSrc}
          className="w-full px-5 py-3 rounded-full bg-charcoal text-white text-sm font-semibold hover:bg-charcoal/85 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Download PNG
        </button>
      </div>

      {/* ─── Preview ─── */}
      <div className="bg-white border border-charcoal/10 rounded-2xl p-5 md:p-6">
        <span className="block text-xs font-bold uppercase tracking-[0.1em] text-charcoal/60 mb-3">
          Preview
        </span>
        <div className="aspect-square w-full max-w-md mx-auto bg-cream rounded-xl flex items-center justify-center p-4">
          {previewSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={previewSrc}
              alt="QR code preview"
              className="w-full h-full object-contain"
            />
          ) : (
            <span className="text-charcoal/50 text-sm text-center px-4">
              Enter a URL to preview the QR code.
            </span>
          )}
        </div>
        <p className="mt-3 text-[12px] text-charcoal/50 text-center">
          Scan with any phone camera to test.
        </p>
      </div>
    </div>
  );
}
