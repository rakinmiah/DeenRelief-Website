import type { Metadata } from "next";
import Link from "next/link";
import { requireAdminSession } from "@/lib/admin-session";
import { createMakerAction } from "@/app/admin/bazaar/actions";
import MakerFormFields from "../MakerFormFields";

export const metadata: Metadata = {
  title: "New maker | Bazaar Admin",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function NewMakerPage() {
  await requireAdminSession();

  return (
    <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <Link
          href="/admin/bazaar/makers"
          className="text-charcoal/60 hover:text-charcoal text-xs uppercase tracking-[0.1em] font-bold transition-colors"
        >
          ← All makers
        </Link>
        <h1 className="text-charcoal font-heading font-bold text-2xl sm:text-3xl mt-1">
          New maker
        </h1>
      </div>

      <form action={createMakerAction} className="bg-white border border-charcoal/10 rounded-2xl p-6">
        <MakerFormFields />
        <div className="mt-6 flex justify-end gap-3">
          <Link
            href="/admin/bazaar/makers"
            className="px-4 py-2 rounded-full bg-white border border-charcoal/15 text-charcoal text-sm font-medium hover:bg-cream transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            className="px-5 py-2 rounded-full bg-charcoal text-white text-sm font-semibold hover:bg-charcoal/90 transition-colors"
          >
            Create maker
          </button>
        </div>
      </form>
    </main>
  );
}
