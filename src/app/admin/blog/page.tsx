import Link from "next/link";
import type { Metadata } from "next";
import { requireBlogAccess } from "@/lib/admin-session";
import { listPosts, type AdminBlogPost, type BlogStatus } from "@/lib/blog-admin";
import { createDraftAction } from "./actions";

export const metadata: Metadata = { title: "Blog | Deen Relief Admin" };
export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<BlogStatus, string> = {
  draft: "Draft",
  in_review: "In review",
  published: "Published",
  archived: "Archived",
};
const STATUS_STYLE: Record<BlogStatus, string> = {
  draft: "bg-grey-light text-grey",
  in_review: "bg-amber-light text-amber-dark",
  published: "bg-green-light text-green",
  archived: "bg-red-50 text-red-600",
};

function formatWhen(iso: string): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function PostRow({ post, showAuthor }: { post: AdminBlogPost; showAuthor: boolean }) {
  return (
    <Link
      href={`/admin/blog/${post.id}`}
      className="flex items-center gap-4 px-4 py-3.5 hover:bg-cream transition-colors"
    >
      <div className="flex-1 min-w-0">
        <p className="font-medium text-charcoal truncate">
          {post.title || <span className="text-grey/60 italic">Untitled draft</span>}
        </p>
        <p className="text-xs text-grey/70 truncate">
          {post.category && <span>{post.category} · </span>}
          {showAuthor && (
            <span>{post.authorName || post.authorEmail} · </span>
          )}
          Updated {formatWhen(post.updatedAt)}
        </p>
      </div>
      <span
        className={`shrink-0 text-[10px] font-bold tracking-wide uppercase px-2 py-1 rounded-full ${STATUS_STYLE[post.status]}`}
      >
        {STATUS_LABEL[post.status]}
      </span>
    </Link>
  );
}

export default async function BlogAdminPage() {
  const session = await requireBlogAccess();
  const isAdmin = session.role === "admin";

  const posts = await listPosts(
    isAdmin ? {} : { authorEmail: session.email }
  );

  const needsReview = posts.filter((p) => p.status === "in_review");
  const active = posts.filter((p) => p.status !== "archived");
  const archived = posts.filter((p) => p.status === "archived");

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex items-center justify-between gap-3 mb-1">
        <h1 className="text-2xl font-heading font-bold text-charcoal">Blog</h1>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <Link
              href="/admin/blog/writers"
              className="px-3.5 py-2 text-sm rounded-lg border border-charcoal/15 text-charcoal hover:border-green hover:text-green transition-colors"
            >
              Writers
            </Link>
          )}
          <form action={createDraftAction}>
            <button
              type="submit"
              className="px-4 py-2 text-sm rounded-lg bg-green text-white font-medium hover:bg-green-dark transition-colors"
            >
              + New post
            </button>
          </form>
        </div>
      </div>
      <p className="text-sm text-grey mb-7">
        {isAdmin
          ? "Review submissions, publish posts, and manage your writers."
          : "Write posts and submit them for review. An editor publishes them."}
      </p>

      {/* Admin review queue */}
      {isAdmin && needsReview.length > 0 && (
        <section className="mb-7">
          <h2 className="text-xs font-bold uppercase tracking-wide text-amber-dark mb-2">
            Needs review ({needsReview.length})
          </h2>
          <div className="rounded-xl border border-amber/40 bg-amber-light/30 divide-y divide-amber/20 overflow-hidden">
            {needsReview.map((p) => (
              <PostRow key={p.id} post={p} showAuthor={isAdmin} />
            ))}
          </div>
        </section>
      )}

      {/* All active posts */}
      <section>
        <h2 className="text-xs font-bold uppercase tracking-wide text-grey mb-2">
          {isAdmin ? "All posts" : "Your posts"}
        </h2>
        {active.length === 0 ? (
          <div className="rounded-xl border border-dashed border-charcoal/15 px-4 py-10 text-center text-grey">
            No posts yet. Click <span className="font-medium">“New post”</span> to start writing.
          </div>
        ) : (
          <div className="rounded-xl border border-charcoal/10 divide-y divide-charcoal/8 overflow-hidden bg-white">
            {active.map((p) => (
              <PostRow key={p.id} post={p} showAuthor={isAdmin} />
            ))}
          </div>
        )}
      </section>

      {/* Archived (collapsed) */}
      {archived.length > 0 && (
        <details className="mt-7">
          <summary className="cursor-pointer text-xs font-bold uppercase tracking-wide text-grey/70 hover:text-grey">
            Archived ({archived.length})
          </summary>
          <div className="rounded-xl border border-charcoal/10 divide-y divide-charcoal/8 overflow-hidden bg-white mt-2 opacity-75">
            {archived.map((p) => (
              <PostRow key={p.id} post={p} showAuthor={isAdmin} />
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
