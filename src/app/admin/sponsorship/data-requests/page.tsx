import Link from "next/link";
import type { Metadata } from "next";
import { requireSponsorshipAccess } from "@/lib/admin-session";
import { listDataRequests } from "@/lib/sponsorship-admin";
import DataRequestsClient from "@/components/admin/DataRequestsClient";

export const metadata: Metadata = {
  title: "Data requests | Deen Relief Admin",
};
export const dynamic = "force-dynamic";

export default async function DataRequestsPage() {
  await requireSponsorshipAccess();
  const requests = await listDataRequests();
  const pending = requests.filter((r) => r.status === "pending");
  const handled = requests.filter((r) => r.status !== "pending");

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      <Link
        href="/admin/sponsorship"
        className="text-sm text-grey hover:text-charcoal transition-colors"
      >
        ← Sponsorship
      </Link>
      <h1 className="mt-3 text-2xl font-heading font-bold text-charcoal">
        Data requests
      </h1>
      <p className="text-sm text-grey mb-6">
        Subject-access (export) and erasure requests raised by sponsors under
        UK GDPR. Erasure deletes the sponsor&apos;s account and all personal
        data we hold about them; the children&apos;s records are charity-owned
        and are not affected.
      </p>
      <DataRequestsClient pending={pending} handled={handled} />
    </div>
  );
}
