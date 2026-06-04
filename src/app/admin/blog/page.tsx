import Link from "next/link";
import type { Metadata } from "next";
import { requireBlogAccess } from "@/lib/admin-session";
import { listPosts, type AdminBlogPost } from "@/lib/blog-admin";
import { PageHeader, Button, StatusBadge } from "@/components/admin/ui";
import { createDraftAction } from "./actions";

export const metadata: Metadata = { title: "Blog | Deen Relief Admin" };
export const dynamic = "force-dynamic";

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
      <StatusBadge domain="blog" status={post.status} className="shrink-0" />
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
      <PageHeader
        title="Blog"
        description={
          isAdmin
            ? "Review submissions, publish posts, and manage your writers."
            : "Write posts and submit them for review. An editor publishes them."
        }
        actions={
          <>
            {isAdmin && (
              <Button href="/admin/blog/writers" variant="outline" size="sm">
                Writers
              </Button>
            )}
            <form action={createDraftAction}>
              <Button type="submit" variant="secondary" size="sm">
                + New post
              </Button>
            </form>
          </>
        }
      />

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
