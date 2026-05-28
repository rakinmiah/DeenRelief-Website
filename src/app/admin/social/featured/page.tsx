import type { Metadata } from "next";
import Link from "next/link";
import { requireAdminSession } from "@/lib/admin-session";
import { getFeaturedCampaign } from "@/lib/site-config";
import FeaturedPicker from "./FeaturedPicker";

export const metadata: Metadata = {
  title: "Featured campaign | Deen Relief Admin",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function FeaturedCampaignPage() {
  await requireAdminSession();
  const current = await getFeaturedCampaign();

  return (
    <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
      <div className="mb-6 md:mb-8">
        <Link
          href="/admin/social"
          className="inline-block text-[12px] font-semibold uppercase tracking-[0.1em] text-amber-dark mb-2 hover:text-amber-darker"
        >
          ← Social tools
        </Link>
        <h1 className="text-3xl md:text-4xl font-heading font-bold text-charcoal tracking-[-0.01em]">
          Featured campaign
        </h1>
        <p className="text-charcoal/70 text-[15px] leading-relaxed mt-2 max-w-2xl">
          Set the campaign Deen Relief is actively pushing this week — appears
          as a hero tile on the homepage and is pre-selected on{" "}
          <span className="font-mono">/donate</span>. The actual public-side
          rendering of this is wired in Phase 1d (landing page UX
          refinements); for now this just stores the choice.
        </p>
      </div>

      <FeaturedPicker initial={current} />
    </main>
  );
}
