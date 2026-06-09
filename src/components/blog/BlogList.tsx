import Link from "next/link";
import type { BlogPostMeta } from "@/lib/blog";
import { sectionForCategory } from "@/lib/blog-sections";

/**
 * Shared blog card + grid. Used by the /blog overview and each section
 * page so the listing looks identical everywhere. The pill always shows
 * the post's SECTION (resolved from its category), so legacy values
 * render consistently as one of the three sections.
 */
export function BlogCard({ post }: { post: BlogPostMeta }) {
  const section = sectionForCategory(post.category);
  return (
    <Link
      href={`/blog/${post.slug}`}
      className="group bg-white border border-charcoal/5 rounded-2xl overflow-hidden hover:shadow-md hover:-translate-y-1 transition-all duration-200"
    >
      <div className="p-5 pb-0">
        <div className="mb-3">
          <span className="text-[10px] font-bold tracking-[0.08em] uppercase text-green bg-green-light px-2.5 py-0.5 rounded-full">
            {section.label}
          </span>
        </div>
        <h2 className="font-heading font-bold text-lg text-charcoal mb-2 group-hover:text-green transition-colors duration-200 leading-snug">
          {post.title}
        </h2>
        <p className="text-grey text-sm leading-relaxed mb-4">{post.description}</p>
      </div>
      <div className="px-5 pb-5">
        <span className="text-green text-sm font-medium inline-flex items-center gap-1 group-hover:gap-2 transition-all duration-200">
          Read article
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
          </svg>
        </span>
      </div>
    </Link>
  );
}

export function BlogGrid({
  posts,
  emptyText = "No posts here yet. Check back soon.",
}: {
  posts: BlogPostMeta[];
  emptyText?: string;
}) {
  if (posts.length === 0) {
    return <p className="text-grey text-center">{emptyText}</p>;
  }
  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {posts.map((post) => (
        <BlogCard key={post.slug} post={post} />
      ))}
    </div>
  );
}
