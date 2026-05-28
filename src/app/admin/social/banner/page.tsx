import type { Metadata } from "next";
import Link from "next/link";
import { requireAdminSession } from "@/lib/admin-session";
import { getBannerConfig } from "@/lib/site-config";
import BannerForm from "./BannerForm";

export const metadata: Metadata = {
  title: "Site banner | Deen Relief Admin",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function BannerEditorPage() {
  await requireAdminSession();
  const current = await getBannerConfig();

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
          Site banner
        </h1>
        <p className="text-charcoal/70 text-[15px] leading-relaxed mt-2 max-w-2xl">
          A thin bar at the top of every public page. Use it for urgent
          appeals (Gaza emergency, Bangladesh floods) or short campaign
          announcements. Off-switch is the toggle at the top of the form.
        </p>
      </div>

      <BannerForm initial={current} />
    </main>
  );
}
