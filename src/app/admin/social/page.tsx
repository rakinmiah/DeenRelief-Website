import type { Metadata } from "next";
import Link from "next/link";
import { requireAdminSession } from "@/lib/admin-session";
import { CAMPAIGNS } from "@/lib/campaigns";
import {
  formatTimeRemaining,
  getActiveSpotlight,
} from "@/lib/now-spotlight";
import {
  getBannerConfig,
  getFeaturedCampaign,
} from "@/lib/site-config";

export const metadata: Metadata = {
  title: "Social | Deen Relief Admin",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/**
 * /admin/social — overview dashboard for the Social Operations Platform.
 *
 * Shows the current state of each controllable surface — banner,
 * spotlight, featured campaign, short links — at a glance, with
 * "Manage" links to each tool's full page. Accessible to both
 * 'admin' and 'social' roles.
 *
 * Future phases will add First Response, per-post performance, etc.
 * as new cards on this same dashboard.
 */
export default async function AdminSocialLandingPage() {
  const session = await requireAdminSession();

  // Parallel reads — none depends on another.
  const [banner, spotlight, featured] = await Promise.all([
    getBannerConfig(),
    getActiveSpotlight(),
    getFeaturedCampaign(),
  ]);

  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
      <div className="mb-8 md:mb-10">
        <span className="block text-[11px] font-bold tracking-[0.18em] uppercase text-amber-dark mb-2">
          Social Operations
        </span>
        <h1 className="text-3xl md:text-4xl font-heading font-bold text-charcoal mb-2 tracking-[-0.01em]">
          Welcome{session.email ? `, ${session.email.split("@")[0]}` : ""}
        </h1>
        <p className="text-charcoal/70 text-[15px] leading-relaxed max-w-2xl">
          Tactical controls for the public site — change what donors land on
          without a dev cycle. Signed in as{" "}
          <span className="font-semibold text-charcoal">{session.role}</span>
          {session.role === "social"
            ? " — social tools only, no donor data."
            : " — full admin access via the nav above."}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
        {/* ─── /now spotlight ─── */}
        <DashboardCard
          title="/now spotlight"
          href="/admin/social/spotlight"
          status={spotlight ? "active" : "available"}
          statusLabel={
            spotlight
              ? `Live — ${formatTimeRemaining(spotlight.msRemaining)} left`
              : "Available"
          }
        >
          {spotlight ? (
            <>
              <span className="font-semibold text-charcoal">
                {spotlight.campaignLabel}
              </span>
              <span className="block text-[12px] text-charcoal/60 font-mono mt-1">
                /now → {spotlight.destinationPath}
              </span>
            </>
          ) : (
            "Point deenrelief.org/now at the campaign page for whatever you're posting about. Auto-resets to the homepage after a few days."
          )}
        </DashboardCard>

        {/* ─── Site banner ─── */}
        <DashboardCard
          title="Site banner"
          href="/admin/social/banner"
          status={banner.active ? "active" : "available"}
          statusLabel={banner.active ? "Live" : "Off"}
        >
          {banner.active && banner.message ? (
            <>
              <span className="text-charcoal/80">
                &ldquo;{banner.message}&rdquo;
              </span>
              <span className="block text-[12px] text-charcoal/50 mt-1 capitalize">
                {banner.theme} · {banner.dismissible ? "dismissible" : "sticky"}
              </span>
            </>
          ) : (
            "A thin bar at the top of every public page. Use it for urgent appeals or short announcements."
          )}
        </DashboardCard>

        {/* ─── Featured campaign ─── */}
        <DashboardCard
          title="Featured campaign"
          href="/admin/social/featured"
          status={featured ? "active" : "available"}
          statusLabel={featured ? "Set" : "Not set"}
        >
          {featured ? (
            <span className="font-semibold text-charcoal">
              {CAMPAIGNS[featured]}
            </span>
          ) : (
            "Set the campaign Deen Relief is actively pushing — surfaces on the homepage and /donate."
          )}
        </DashboardCard>

        {/* ─── Short links ─── */}
        <DashboardCard
          title="Short links"
          href="/admin/social/links"
          status="available"
          statusLabel="Available"
        >
          Branded URLs like deenrelief.org/r/q that redirect to the right
          campaign page with attribution baked in.
        </DashboardCard>

        {/* ─── Coming soon ─── */}
        <DashboardCard
          title="QR generator"
          href="/admin/social/qr"
          status="available"
          statusLabel="Available"
        >
          Brand-styled QR codes for any campaign link — drop into Stories,
          Reels, posters.
        </DashboardCard>

        <DashboardCard
          title="First Response"
          href="/admin/social/first-response"
          status="active"
          statusLabel="Live · launch-packet drafting"
        >
          Crisis intelligence + AI-drafted launch packets. GDACS / USGS /
          ReliefWeb feeds, multi-factor priority scoring, push alerts on
          high-priority events. Click any event to draft a full launch
          packet (page copy, donation tiers, social posts, email, press
          release) in the Deen Relief voice via Claude.
        </DashboardCard>

        <DashboardCard
          title="Per-post performance"
          href="/admin/social/performance"
          status="available"
          statusLabel="Available"
        >
          Which posts actually raised money — not which got likes. Log a
          post, pick the short link you put in it, and the dashboard
          shows clicks + donations + £ raised end-to-end.
        </DashboardCard>

        <DashboardCard
          title="Media library"
          href="/admin/social/media-library"
          status="available"
          statusLabel="Available"
        >
          DR&apos;s sorted photo inventory. Upload once, Claude auto-tags
          on the way in, and the launch-packet generator pulls relevant
          imagery into carousel slides automatically. Pure-typography
          slides become photo-backed slides when matching media exists.
        </DashboardCard>

        <DashboardCard
          title="Brand assets"
          href="/admin/social/brand-assets"
          status="available"
          statusLabel="Available"
        >
          Logo variants for the slide renderer. Upload your DR logo
          in light and dark colour versions (PNG/SVG with transparent
          backgrounds work best). The renderer auto-picks the right
          variant per slide context — green logo on cream chips,
          white logo on dark green chips.
        </DashboardCard>
      </div>
    </main>
  );
}

/** Status pill colours per state. */
function statusClasses(status: "active" | "available" | "soon"): string {
  if (status === "active") return "text-green-dark bg-green-light/70";
  if (status === "available") return "text-amber-dark bg-amber-light";
  return "text-charcoal/60 bg-charcoal/8";
}

/**
 * A single dashboard tile. When `href` is set the entire card is clickable
 * (linking through to the tool's full page). Without an href the card is
 * a coming-soon placeholder.
 */
function DashboardCard({
  title,
  href,
  status,
  statusLabel,
  children,
}: {
  title: string;
  href?: string;
  status: "active" | "available" | "soon";
  statusLabel: string;
  children: React.ReactNode;
}) {
  const baseClasses =
    "bg-white rounded-2xl border border-charcoal/10 p-5 md:p-6 block";
  const inner = (
    <>
      <div className="flex items-start justify-between gap-3 mb-2">
        <h2 className="text-charcoal font-heading font-semibold text-[17px] leading-tight">
          {title}
        </h2>
        <span
          className={`shrink-0 text-[10px] font-bold tracking-[0.1em] uppercase px-2 py-0.5 rounded-full ${statusClasses(status)}`}
        >
          {statusLabel}
        </span>
      </div>
      <div className="text-charcoal/70 text-sm leading-relaxed">{children}</div>
    </>
  );

  return href ? (
    <Link
      href={href}
      className={`${baseClasses} hover:border-charcoal/25 hover:shadow-sm transition-all`}
    >
      {inner}
    </Link>
  ) : (
    <div className={baseClasses}>{inner}</div>
  );
}
