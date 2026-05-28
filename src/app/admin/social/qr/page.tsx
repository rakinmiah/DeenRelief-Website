import type { Metadata } from "next";
import Link from "next/link";
import { requireAdminSession } from "@/lib/admin-session";
import QrGenerator from "./QrGenerator";

export const metadata: Metadata = {
  title: "QR generator | Deen Relief Admin",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/**
 * /admin/social/qr — brand-styled QR code generator.
 *
 * Quick utility for the SMM to drop QR codes into Story / Reel covers,
 * leaflets, mosque posters, anywhere a printed visual link saves a
 * step. Generates client-side via the `qrcode` package — no server
 * round-trip, instant preview.
 */
export default async function QrPage() {
  await requireAdminSession();
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
          QR generator
        </h1>
        <p className="text-charcoal/70 text-[15px] leading-relaxed mt-2 max-w-2xl">
          Paste any URL — a short link, a campaign page, anything — and
          download a brand-styled QR code in seconds. Use them on Story
          covers, Reel end-frames, printed leaflets, mosque flyers.
          Donors scan with any phone camera.
        </p>
      </div>

      <QrGenerator />

      <div className="mt-8 bg-cream border border-charcoal/10 rounded-2xl p-5 text-[13px] text-charcoal/70 leading-relaxed">
        <p>
          <span className="font-semibold text-charcoal">Tip —</span> for Story
          and Reel covers, place the QR somewhere donors can pause and scan
          (top-right is the convention). For printed media, use the Large
          (1024px) export so the code stays crisp at A4 size.
        </p>
      </div>
    </main>
  );
}
