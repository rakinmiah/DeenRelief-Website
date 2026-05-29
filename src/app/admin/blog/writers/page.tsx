import Link from "next/link";
import type { Metadata } from "next";
import { requireRoleAdmin } from "@/lib/admin-session";
import { listWriters } from "@/lib/blog-admin";
import WritersClient from "./WritersClient";

export const metadata: Metadata = { title: "Writers | Deen Relief Admin" };
export const dynamic = "force-dynamic";

export default async function WritersPage() {
  // Admin-only — writers themselves can't manage the roster.
  await requireRoleAdmin();
  const writers = await listWriters();

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
      <Link
        href="/admin/blog"
        className="text-sm text-grey hover:text-green transition-colors"
      >
        ← Back to blog
      </Link>
      <h1 className="text-2xl font-heading font-bold text-charcoal mt-3 mb-1">
        Writers
      </h1>
      <p className="text-sm text-grey mb-7">
        Add a writer here, then share the writer passphrase with them. They
        sign in at <span className="font-mono text-charcoal">/admin/login</span>{" "}
        with their own email + that passphrase, and can write and submit posts
        for your review.
      </p>
      <WritersClient initialWriters={writers} />
    </div>
  );
}
