import type { Metadata } from "next";
import { requireRoleAdmin } from "@/lib/admin-session";
import { CAMPAIGNS } from "@/lib/campaigns";
import { PageHeader } from "@/components/admin/ui";
import IssueReceiptClient from "./IssueReceiptClient";

export const metadata: Metadata = {
  title: "Issue a receipt | Deen Relief Admin",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/**
 * Issue a Deen Relief receipt for a past / offline donation — e.g. a
 * donor who gave on the old website and never received one. Sends a
 * receipt-only email + PDF; creates no donation record.
 */
export default async function IssueReceiptPage() {
  await requireRoleAdmin();
  const campaigns = Object.entries(CAMPAIGNS).map(([slug, label]) => ({
    slug,
    label,
  }));

  return (
    <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <PageHeader
        backHref="/admin/donations"
        backLabel="Donations"
        eyebrow="Income"
        title="Issue a receipt"
        description="Email a Deen Relief receipt for a past or offline donation (e.g. a gift made on the old website). This sends a receipt + PDF only — it does NOT create a donation record and won't affect your income, recurring, or Gift Aid totals."
      />
      <IssueReceiptClient campaigns={campaigns} />
    </main>
  );
}
