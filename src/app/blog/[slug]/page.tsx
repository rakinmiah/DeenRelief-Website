import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Button from "@/components/Button";
import { getPostBySlug, getAllSlugs, getAllPosts } from "@/lib/blog";
import { blogFaqs } from "@/lib/blog-faqs";
import { compileMDX } from "next-mdx-remote/rsc";
import { useMDXComponents } from "@/components/mdx-components";
import JsonLd from "@/components/JsonLd";
import BreadcrumbSchema from "@/components/BreadcrumbSchema";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return getAllSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) return {};

  return {
    title: `${post.title} | Deen Relief`,
    description: post.description,
    alternates: { canonical: `/blog/${slug}` },
    other: { "article:modified_time": post.date },
    openGraph: {
      title: post.title,
      description: post.description,
      type: "article",
      publishedTime: post.date,
      modifiedTime: post.date,
      images: post.image ? [{ url: post.image, alt: post.title }] : [],
    },
    twitter: {
      card: "summary_large_image",
      site: "@deenrelief",
      title: post.title,
      description: post.description,
      images: post.image ? [post.image] : [],
    },
  };
}

/** Format ISO date to readable string: "10 April 2026" */
function formatDate(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default async function BlogPostPage({ params }: PageProps) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) notFound();

  const { content } = await compileMDX({
    source: post.content,
    options: { parseFrontmatter: false },
    components: useMDXComponents({}),
  });

  // Related posts: same category, excluding current post, max 3
  const allPosts = getAllPosts();
  const relatedPosts = allPosts
    .filter((p) => p.category === post.category && p.slug !== slug)
    .slice(0, 3);

  // If fewer than 3 in the same category, pad with other posts
  if (relatedPosts.length < 3) {
    const others = allPosts
      .filter((p) => p.slug !== slug && !relatedPosts.some((r) => r.slug === p.slug))
      .slice(0, 3 - relatedPosts.length);
    relatedPosts.push(...others);
  }

  // Category-aware CTA: Zakat posts lead with Zakat, Sadaqah posts lead with Sadaqah
  const isZakatPost = post.category === "Zakat";

  // Post-specific FAQs for rich results
  const faqs = blogFaqs[slug] ?? [];

  const faqSchema = faqs.length > 0 ? {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  } : null;

  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.description,
    datePublished: post.date,
    dateModified: post.date,
    author: {
      "@type": "Organization",
      name: "Deen Relief",
      url: "https://deenrelief.org",
    },
    publisher: {
      "@type": "Organization",
      name: "Deen Relief",
      logo: {
        "@type": "ImageObject",
        url: "https://deenrelief.org/images/logo.webp",
      },
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `https://deenrelief.org/blog/${slug}`,
    },
    image: post.image ? `https://deenrelief.org${post.image}` : undefined,
  };

  return (
    <>
      <JsonLd data={articleSchema} />
      {faqSchema && <JsonLd data={faqSchema} />}
      <BreadcrumbSchema items={[{ name: "Blog", href: "/blog" }, { name: post.title, href: `/blog/${slug}` }]} />
      <Header />

      <main id="main-content" className="flex-1">
        {/* Article Header */}
        <section className="bg-cream pt-24 md:pt-32 pb-10 md:pb-14">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
            <Link
              href="/blog"
              className="inline-flex items-center gap-1.5 text-sm text-grey hover:text-green transition-colors duration-200 mb-6"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
              </svg>
              Back to Blog
            </Link>

            <div className="flex items-center gap-3 mb-4">
              <span className="text-[10px] font-bold tracking-[0.08em] uppercase text-green bg-green-light px-2.5 py-0.5 rounded-full">
                {post.category}
              </span>
              <time
                dateTime={post.date}
                className="text-[13px] text-grey/60 font-medium"
              >
                {formatDate(post.date)}
              </time>
            </div>

            <h1 className="text-[1.75rem] sm:text-[2.25rem] lg:text-[2.5rem] leading-[1.18] font-heading font-bold text-charcoal tracking-[-0.02em]">
              {post.title}
            </h1>
          </div>
        </section>

        {/* Article Body */}
        <section className="py-16 md:py-24 bg-white">
          <article className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
            {content}
          </article>
        </section>

        {/* Post-specific FAQ — visible accordion + FAQPage schema for rich results */}
        {faqs.length > 0 && (
          <section className="py-12 md:py-16 bg-white border-t border-charcoal/5">
            <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
              <h2 className="text-2xl sm:text-3xl font-heading font-bold text-charcoal mb-6">
                Quick Answers
              </h2>
              <div className="divide-y divide-charcoal/8">
                {faqs.map((faq, i) => (
                  <details key={i} className="group py-4">
                    <summary className="flex items-center justify-between cursor-pointer list-none font-heading font-semibold text-[1.0625rem] text-charcoal pr-4 hover:text-green transition-colors duration-200">
                      {faq.question}
                      <svg
                        className="w-5 h-5 flex-shrink-0 text-charcoal/30 transition-transform duration-200 group-open:rotate-180"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={2}
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                      </svg>
                    </summary>
                    <p className="mt-3 text-grey text-base sm:text-[1.0625rem] leading-[1.7]">
                      {faq.answer}
                    </p>
                  </details>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Related Posts */}
        {relatedPosts.length > 0 && (
          <section className="py-12 md:py-16 bg-cream">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <h2 className="text-2xl sm:text-3xl font-heading font-bold text-charcoal text-center mb-8">
                Related Articles
              </h2>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
                {relatedPosts.map((related) => (
                  <Link
                    key={related.slug}
                    href={`/blog/${related.slug}`}
                    className="group bg-white border border-charcoal/5 rounded-2xl overflow-hidden hover:shadow-md hover:-translate-y-1 transition-all duration-200"
                  >
                    <div className="p-5 pb-0">
                      <div className="mb-3 flex items-center gap-2">
                        <span className="text-[10px] font-bold tracking-[0.08em] uppercase text-green bg-green-light px-2.5 py-0.5 rounded-full">
                          {related.category}
                        </span>
                        <time
                          dateTime={related.date}
                          className="text-[11px] text-grey/50"
                        >
                          {formatDate(related.date)}
                        </time>
                      </div>
                      <h3 className="font-heading font-bold text-lg text-charcoal mb-2 group-hover:text-green transition-colors duration-200 leading-snug">
                        {related.title}
                      </h3>
                      <p className="text-grey text-sm leading-relaxed mb-4">
                        {related.description}
                      </p>
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
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Donate CTA — category-aware: Zakat posts lead with Zakat, others with Sadaqah */}
        <section className="py-10 md:py-12 bg-green-dark">
          <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <p className="text-white/55 text-sm mb-3">
              Found this helpful? Your generosity reaches families who need it most.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              {isZakatPost ? (
                <>
                  <Button variant="primary" href="/zakat">
                    Pay Zakat
                  </Button>
                  <Button variant="outline" href="/sadaqah">
                    Give Sadaqah
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="primary" href="/sadaqah">
                    Give Sadaqah
                  </Button>
                  <Button variant="outline" href="/zakat">
                    Pay Zakat
                  </Button>
                </>
              )}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
