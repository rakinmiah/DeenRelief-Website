import Link from "next/link";
import { BLOG_SECTIONS, type BlogSectionSlug } from "@/lib/blog-sections";

/**
 * Section navigation for the blog: Islamic Knowledge · Who We Are ·
 * Latest, plus a link back to the /blog hub. Plain links (each section is
 * its own page), so it works as a server component with no client JS.
 * `active` highlights the current tab.
 */
export default function BlogTabs({ active }: { active: BlogSectionSlug }) {
  const tabs: { key: BlogSectionSlug | "home"; label: string; href: string }[] = [
    { key: "home", label: "← Blog", href: "/blog" },
    ...BLOG_SECTIONS.map((s) => ({ key: s.slug, label: s.label, href: `/blog/${s.slug}` })),
  ];
  return (
    <nav aria-label="Blog sections" className="flex flex-wrap gap-2">
      {tabs.map((t) => {
        const isActive = t.key === active;
        return (
          <Link
            key={t.key}
            href={t.href}
            aria-current={isActive ? "page" : undefined}
            className={
              isActive
                ? "px-4 py-2 rounded-full text-sm font-semibold bg-green text-white"
                : "px-4 py-2 rounded-full text-sm font-medium text-charcoal/70 bg-white border border-charcoal/10 hover:border-green/40 hover:text-charcoal transition-colors"
            }
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
