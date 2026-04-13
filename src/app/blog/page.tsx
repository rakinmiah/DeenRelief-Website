import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { getAllPosts } from "@/lib/blog";

export default function BlogPage() {
  const posts = getAllPosts();

  return (
    <>
      <Header />

      <main id="main-content" className="flex-1">
        {/* Hero */}
        <section className="bg-cream pt-28 md:pt-32 pb-16 md:pb-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl">
              <span className="inline-block text-[11px] font-bold tracking-[0.1em] uppercase text-green mb-3">
                Blog
              </span>
              <h1 className="text-[1.75rem] sm:text-[2.25rem] lg:text-[2.5rem] leading-[1.18] font-heading font-bold text-charcoal mb-4 tracking-[-0.02em]">
                Islamic Knowledge &amp; Guides
              </h1>
              <p className="text-grey text-base sm:text-[1.0625rem] leading-[1.7]">
                Practical guides on Zakat, Sadaqah, and Islamic giving —
                helping you give with knowledge and confidence.
              </p>
            </div>
          </div>
        </section>

        {/* Posts Grid */}
        <section className="py-16 md:py-24 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {posts.length === 0 ? (
              <p className="text-grey text-center">
                No posts yet. Check back soon.
              </p>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {posts.map((post) => (
                  <Link
                    key={post.slug}
                    href={`/blog/${post.slug}`}
                    className="group bg-white border border-charcoal/5 rounded-2xl overflow-hidden hover:shadow-md hover:-translate-y-1 transition-all duration-200"
                  >
                    {/* Category + Date */}
                    <div className="p-5 pb-0">
                      <div className="mb-3">
                        <span className="text-[10px] font-bold tracking-[0.08em] uppercase text-green bg-green-light px-2.5 py-0.5 rounded-full">
                          {post.category}
                        </span>
                      </div>

                      {/* Title */}
                      <h2 className="font-heading font-bold text-lg text-charcoal mb-2 group-hover:text-green transition-colors duration-200 leading-snug">
                        {post.title}
                      </h2>

                      {/* Excerpt */}
                      <p className="text-grey text-sm leading-relaxed mb-4">
                        {post.description}
                      </p>
                    </div>

                    {/* Read link */}
                    <div className="px-5 pb-5">
                      <span className="text-green text-sm font-medium inline-flex items-center gap-1 group-hover:gap-2 transition-all duration-200">
                        Read article
                        <svg
                          className="w-3.5 h-3.5"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth={2}
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3"
                          />
                        </svg>
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
