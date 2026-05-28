import type { Metadata } from "next";
import Link from "next/link";
import { requireAdminSession } from "@/lib/admin-session";
import {
  formatTimeRemaining,
  getActiveSpotlight,
  getSpotlightHistory,
} from "@/lib/now-spotlight";
import SpotlightControls from "./SpotlightControls";

export const metadata: Metadata = {
  title: "/now spotlight | Deen Relief Admin",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/**
 * /admin/social/spotlight — manage where deenrelief.org/now redirects.
 *
 *   - Active spotlight card at the top (campaign, time remaining,
 *     who set it). Hidden when /now is pointing at the homepage.
 *   - Interactive controls (SpotlightControls client component) —
 *     duration picker + per-campaign Spotlight buttons + Extend/Reset
 *     for the active spotlight.
 *   - History strip of the last 10 spotlights so the SMM can see
 *     what's been highlighted recently.
 */
export default async function SpotlightPage() {
  await requireAdminSession();

  const [active, history] = await Promise.all([
    getActiveSpotlight(),
    getSpotlightHistory(10),
  ]);

  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
      <div className="mb-6 md:mb-8">
        <Link
          href="/admin/social"
          className="inline-block text-[12px] font-semibold uppercase tracking-[0.1em] text-amber-dark mb-2 hover:text-amber-darker"
        >
          ← Social tools
        </Link>
        <h1 className="text-3xl md:text-4xl font-heading font-bold text-charcoal tracking-[-0.01em]">
          /now spotlight
        </h1>
        <p className="text-charcoal/70 text-[15px] leading-relaxed mt-2 max-w-2xl">
          <span className="font-mono text-charcoal">deenrelief.org/now</span> redirects to whichever campaign is spotlighted here.
          When no spotlight is active, it falls back to the homepage. Use this
          for the campaign you&apos;re posting about today — donors tap your
          bio link and land straight on the right page.
        </p>
      </div>

      {/* ─── Active spotlight card ─── */}
      {active ? (
        <section className="mb-8 bg-charcoal text-white rounded-2xl p-5 md:p-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <span className="block text-[11px] font-bold tracking-[0.18em] uppercase text-amber-light mb-1.5">
                Currently spotlighted
              </span>
              <h2 className="text-2xl md:text-3xl font-heading font-bold leading-tight">
                {active.campaignLabel}
              </h2>
              <p className="text-white/70 text-sm mt-1 font-mono">
                /now → {active.destinationPath}
              </p>
            </div>
            <div className="text-right">
              <span className="block text-[11px] font-bold tracking-[0.18em] uppercase text-amber-light mb-1">
                Resets in
              </span>
              <span className="text-2xl md:text-3xl font-heading font-bold tracking-tight">
                {formatTimeRemaining(active.msRemaining)}
              </span>
            </div>
          </div>
          <p className="text-white/60 text-[12px] mt-3">
            Set by {active.spotlightedByEmail ?? "—"} on{" "}
            {active.spotlightedAt.toLocaleString("en-GB", {
              day: "numeric",
              month: "short",
              hour: "2-digit",
              minute: "2-digit",
            })}
            . Expires{" "}
            {active.expiresAt.toLocaleString("en-GB", {
              day: "numeric",
              month: "short",
              hour: "2-digit",
              minute: "2-digit",
            })}
            .
          </p>
        </section>
      ) : (
        <section className="mb-8 bg-cream border border-charcoal/10 rounded-2xl p-5 md:p-6">
          <span className="block text-[11px] font-bold tracking-[0.18em] uppercase text-charcoal/50 mb-1.5">
            No active spotlight
          </span>
          <p className="text-charcoal/80 text-[15px]">
            <span className="font-mono">/now</span> is currently redirecting to the homepage.
          </p>
        </section>
      )}

      {/* ─── Controls ─── */}
      <SpotlightControls hasActive={!!active} />

      {/* ─── History ─── */}
      {history.length > 0 && (
        <section className="mt-10">
          <h3 className="text-charcoal font-heading font-semibold text-[15px] mb-3">
            Recent spotlights
          </h3>
          <div className="bg-white border border-charcoal/10 rounded-2xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[11px] font-bold uppercase tracking-[0.08em] text-charcoal/50 bg-charcoal/[0.02]">
                  <th className="text-left px-5 py-3">Campaign</th>
                  <th className="text-left px-5 py-3">Source</th>
                  <th className="text-left px-5 py-3">Set by</th>
                  <th className="text-left px-5 py-3">Set at</th>
                  <th className="text-left px-5 py-3">Ended</th>
                </tr>
              </thead>
              <tbody>
                {history.map((row) => (
                  <tr
                    key={row.id}
                    className="border-t border-charcoal/5"
                  >
                    <td className="px-5 py-3 text-charcoal font-semibold">
                      {row.campaignLabel}
                    </td>
                    <td className="px-5 py-3 text-[12px] text-charcoal/70">
                      {row.socialPostId ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-[0.08em] uppercase bg-amber-light text-amber-dark">
                          From post
                          {row.socialPostTitle ? (
                            <span
                              className="ml-1 normal-case font-medium tracking-normal text-amber-dark/80 max-w-[160px] truncate"
                              title={row.socialPostTitle}
                            >
                              · {row.socialPostTitle}
                            </span>
                          ) : null}
                        </span>
                      ) : (
                        <span className="text-charcoal/40">Manual</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-charcoal/70 text-[13px]">
                      {row.spotlightedByEmail ?? "—"}
                    </td>
                    <td className="px-5 py-3 text-charcoal/70 text-[13px] whitespace-nowrap">
                      {row.spotlightedAt.toLocaleString("en-GB", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="px-5 py-3 text-[12px]">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold tracking-[0.08em] uppercase ${
                          row.endedReason === "active"
                            ? "bg-green-light text-green-dark"
                            : "bg-charcoal/5 text-charcoal/60"
                        }`}
                      >
                        {row.endedReason === "active"
                          ? "Active"
                          : row.endedReason === "manual_reset"
                            ? "Reset"
                            : row.endedReason === "superseded"
                              ? "Superseded"
                              : "Expired"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </main>
  );
}
