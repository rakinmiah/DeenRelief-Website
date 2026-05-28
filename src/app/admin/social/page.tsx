import type { Metadata } from "next";
import Link from "next/link";
import { requireAdminSession } from "@/lib/admin-session";

export const metadata: Metadata = {
  title: "Social | Deen Relief Admin",
  robots: { index: false, follow: false },
};

/**
 * /admin/social — landing page for the Social Operations section.
 *
 * Accessible to BOTH roles ('admin' and 'social') — admins can use the
 * social tools alongside everything else; the SMM lives here exclusively.
 *
 * This is a placeholder for Phase 0: roles + foundation only. The real
 * surface fills in across the next phases:
 *
 *   Phase 1a — Short links (generator + click stats)        → /admin/social/links
 *   Phase 1b — /now spotlight controls                       → /admin/social/spotlight
 *   Phase 1c — Campaign Command Center (banner, featured,    → /admin/social/banner
 *              match pots, approvals)                          /admin/social/featured
 *                                                              /admin/social/match-pots
 *                                                              /admin/social/approvals
 *   Phase 1e — QR generator utility                          → /admin/social/qr
 *   Phase 3+ — First Response intelligence                   → /admin/social/first-response
 *   Phase 5  — Per-post performance dashboard                → /admin/social/performance
 *
 * Until those land, this page acts as a roadmap so the SMM (and any
 * trustee) can see what's coming and where to look. Each card flips
 * from "Coming soon" to a real link as its phase ships.
 */
export default async function AdminSocialLandingPage() {
  const session = await requireAdminSession();

  const sections: {
    title: string;
    summary: string;
    status: string;
    href?: string;
  }[] = [
    {
      title: "Short links",
      summary:
        "Generate branded short URLs (deenrelief.org/r/q, /r/orphans-tiktok) for any social post. Tracks clicks + donations end-to-end.",
      status: "Available",
      href: "/admin/social/links",
    },
    {
      title: "/now spotlight",
      summary:
        "Point deenrelief.org/now at the campaign page for whatever you're posting about. Auto-resets to the homepage after 3 days.",
      status: "Coming in Phase 1",
    },
    {
      title: "Campaign Command Center",
      summary:
        "Site-wide banner, featured campaign on the homepage, live match pots — controls you can flip without a dev cycle.",
      status: "Coming in Phase 1",
    },
    {
      title: "QR generator",
      summary:
        "Brand-styled QR codes for any campaign link — drop into Stories, Reels, posters.",
      status: "Coming in Phase 1",
    },
    {
      title: "First Response",
      summary:
        "Crisis intelligence tailored to Deen Relief's actual campaigns and field regions. Auto-drafted launch packets, emergency launch button.",
      status: "Coming in Phase 3",
    },
    {
      title: "Per-post performance",
      summary:
        "Which posts actually raised money — not which got likes. Joins your social UTMs to the donations table.",
      status: "Coming in Phase 5",
    },
  ];

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
          This section is being built out across the next few weeks. Each card
          below will become live as its phase ships. You&apos;re signed in as{" "}
          <span className="font-semibold text-charcoal">{session.role}</span>
          {session.role === "social"
            ? " — social tools only, no donor data."
            : " — full access including donations + bazaar via the nav above."}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-5">
        {sections.map((section) => {
          const available = !!section.href;
          const card = (
            <>
              <div className="flex items-start justify-between gap-3 mb-2">
                <h2 className="text-charcoal font-heading font-semibold text-[17px] leading-tight">
                  {section.title}
                </h2>
                <span
                  className={`shrink-0 text-[10px] font-bold tracking-[0.1em] uppercase px-2 py-0.5 rounded-full ${
                    available
                      ? "text-green-dark bg-green-light/60"
                      : "text-amber-dark bg-amber-light"
                  }`}
                >
                  {section.status}
                </span>
              </div>
              <p className="text-charcoal/70 text-sm leading-relaxed">
                {section.summary}
              </p>
            </>
          );
          const baseClasses =
            "bg-white rounded-2xl border border-charcoal/10 p-5 md:p-6 block";
          return section.href ? (
            <Link
              key={section.title}
              href={section.href}
              className={`${baseClasses} hover:border-charcoal/25 hover:shadow-sm transition-all`}
            >
              {card}
            </Link>
          ) : (
            <div key={section.title} className={baseClasses}>
              {card}
            </div>
          );
        })}
      </div>
    </main>
  );
}
