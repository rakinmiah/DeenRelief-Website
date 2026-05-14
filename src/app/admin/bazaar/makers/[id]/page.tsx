import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdminSession } from "@/lib/admin-session";
import {
  countProductsByMakerId,
  fetchAdminMakerById,
} from "@/lib/bazaar-catalog";
import { updateMakerAction } from "@/app/admin/bazaar/actions";
import MakerFormFields from "../MakerFormFields";
import DeleteMakerClient from "./DeleteMakerClient";

export const metadata: Metadata = {
  title: "Edit maker | Bazaar Admin",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function EditMakerPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdminSession();
  const { id } = await params;
  const sp = await searchParams;
  const justSaved = sp.saved === "1";

  const maker = await fetchAdminMakerById(id);
  if (!maker) notFound();

  // Product count drives the delete UX: the DB's ON DELETE RESTRICT
  // would reject the delete anyway, but checking up-front lets us
  // hide the danger zone entirely and show a "reassign first" panel.
  const productCount = await countProductsByMakerId(maker.id);

  // Bind the maker id into the action so the form's `action={…}` only
  // needs the FormData. updateMakerAction is a server action so the
  // .bind() result is also a server action.
  const action = updateMakerAction.bind(null, id);

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
          Edit maker
        </h1>
        <p className="text-charcoal/50 text-[11px] mt-1 font-mono break-all">
          DB id: {maker.id}
        </p>
      </div>

      {justSaved && (
        <p className="mb-4 px-4 py-2 rounded-lg bg-green/10 border border-green/30 text-green-dark text-sm">
          Saved.
        </p>
      )}

      <form action={action} className="bg-white border border-charcoal/10 rounded-2xl p-6">
        <MakerFormFields
          initial={{
            name: maker.name,
            country: maker.country,
            region: maker.region,
            photoUrl: maker.photoUrl,
            story: maker.story,
            quote: maker.quote ?? null,
            isActive: maker.isActive,
          }}
        />
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
            Save changes
          </button>
        </div>
      </form>

      {/* Danger zone — permanent delete. Sits below the main form so
          it's deliberate to scroll to. When the maker still has
          products the panel switches to a "reassign first" message
          instead of exposing the delete button. */}
      <div className="mt-10">
        <DeleteMakerClient
          makerId={maker.id}
          makerName={maker.name}
          productCount={productCount}
        />
      </div>
    </main>
  );
}
