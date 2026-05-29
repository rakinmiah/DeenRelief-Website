import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { requireSponsorshipAccess } from "@/lib/admin-session";
import {
  getOrphanById,
  getUpdateById,
  listUpdateMedia,
} from "@/lib/sponsorship-admin";
import UpdateEditor from "@/components/admin/UpdateEditor";

export const metadata: Metadata = {
  title: "Edit update | Deen Relief Admin",
};
export const dynamic = "force-dynamic";

export default async function UpdateEditPage({
  params,
}: {
  params: Promise<{ id: string; updateId: string }>;
}) {
  await requireSponsorshipAccess();
  const { id, updateId } = await params;
  const [orphan, update] = await Promise.all([
    getOrphanById(id),
    getUpdateById(updateId),
  ]);
  if (!orphan || !update || update.orphanId !== id) notFound();
  const media = await listUpdateMedia(updateId);

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      <Link
        href={`/admin/sponsorship/orphans/${id}`}
        className="text-sm text-grey hover:text-charcoal transition-colors"
      >
        ← {orphan.displayName || "Profile"}
      </Link>
      <h1 className="mt-3 text-2xl font-heading font-bold text-charcoal">
        Update
      </h1>
      <p className="text-sm text-grey mb-6">
        Write the update and attach photos or videos. Media is stored in a
        private bucket and only shown to this child&apos;s sponsors. Publish
        when it&apos;s ready for them to see.
      </p>
      <UpdateEditor orphanId={id} update={update} initialMedia={media} />
    </div>
  );
}
