import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdminSession } from "@/lib/admin-session";
import { getMediaById } from "@/lib/media-library";
import EditForm from "./EditForm";

export const metadata: Metadata = {
  title: "Edit media | Deen Relief Admin",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function MediaDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdminSession();
  const { id } = await params;
  const item = await getMediaById(id);
  if (!item) notFound();

  return (
    <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
      <div className="mb-6">
        <Link
          href="/admin/social/media-library"
          className="inline-block text-[12px] font-semibold uppercase tracking-[0.1em] text-amber-dark mb-2 hover:text-amber-darker"
        >
          ← Media library
        </Link>
        <h1 className="text-2xl md:text-3xl font-heading font-bold text-charcoal tracking-[-0.01em]">
          {item.caption ?? "Untitled media"}
        </h1>
        <p className="text-charcoal/55 text-[12px] mt-1">
          Uploaded{" "}
          {item.uploadedAt.toLocaleString("en-GB", {
            day: "numeric",
            month: "short",
            year: "numeric",
          })}{" "}
          by {item.uploadedByEmail ?? "—"}
        </p>
      </div>
      <EditForm item={item} />
    </main>
  );
}
