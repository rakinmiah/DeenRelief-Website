import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { getAllPosts } from "@/lib/blog";
import JsonLd from "@/components/JsonLd";
import BreadcrumbSchema from "@/components/BreadcrumbSchema";
import BlogTabs from "@/components/blog/BlogTabs";
import { BlogGrid } from "@/components/blog/BlogList";

// Statically generated; on-demand revalidation fires when a post is
// published/unpublished. This is a safety-net refresh interval.
export const revalidate = 300;

export default async function BlogPage() {
  const posts = await getAllPosts();

  const blogListSchema = {
    "@context": "https://schema.org",
    "@type": "Blog",
    name: "Deen Relief Blog",
    url: "https://deenrelief.org/blog",
    description: "Islamic knowledge guides on Zakat, Sadaqah, and charitable giving.",
    publisher: {
      "@type": "Organization",
      name: "Deen Relief",
      url: "https://deenrelief.org",
    },
    blogPost: posts.map((post) => ({
      "@type": "BlogPosting",
      headline: post.title,
      description: post.description,
      url: `https://deenrelief.org/blog/${post.slug}`,
      datePublished: post.date,
    })),
  };

  return (
    <>
      <BreadcrumbSchema items={[{ name: "Blog", href: "/blog" }]} />
      <JsonLd data={blogListSchema} />
      <Header />

      <main id="main-content" className="flex-1">
        {/* Hero */}
        <section className="bg-cream pt-24 md:pt-32 pb-14 md:pb-18">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl">
              <span className="inline-block text-[11px] font-bold tracking-[0.1em] uppercase text-green mb-3">
                Blog
              </span>
              <h1 className="text-[1.75rem] sm:text-[2.25rem] lg:text-[2.5rem] leading-[1.18] font-heading font-bold text-charcoal mb-4 tracking-[-0.02em]">
                Islamic Knowledge &amp; Guides
              </h1>
              <p className="text-grey text-base sm:text-[1.0625rem] leading-[1.7]">
                Islamic knowledge, who we are, and the latest from Deen Relief —
                giving you the knowledge and confidence to give well.
              </p>
            </div>

            {/* Section tabs */}
            <div className="mt-8">
              <BlogTabs active="all" />
            </div>
          </div>
        </section>

        {/* Posts Grid */}
        <section className="py-16 md:py-24 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <BlogGrid posts={posts} emptyText="No posts yet. Check back soon." />
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
