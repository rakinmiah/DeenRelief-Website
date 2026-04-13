import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Button from "@/components/Button";
import { getPostBySlug, getAllSlugs } from "@/lib/blog";
import { compileMDX } from "next-mdx-remote/rsc";
import { useMDXComponents } from "@/components/mdx-components";
import JsonLd from "@/components/JsonLd";

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
    openGraph: {
      title: post.title,
      description: post.description,
      type: "article",
      publishedTime: post.date,
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

export default async function BlogPostPage({ params }: PageProps) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) notFound();

  const { content } = await compileMDX({
    source: post.content,
    options: { parseFrontmatter: false },
    components: useMDXComponents({}),
  });

  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.description,
    datePublished: post.date,
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

            <div className="mb-4">
              <span className="text-[10px] font-bold tracking-[0.08em] uppercase text-green bg-green-light px-2.5 py-0.5 rounded-full">
                {post.category}
              </span>
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

        {/* Donate CTA */}
        <section className="py-10 md:py-12 bg-green-dark">
          <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <p className="text-white/55 text-sm mb-3">
              Found this helpful? Your generosity reaches families who need it most.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Button variant="primary" href="/zakat">
                Pay Zakat
              </Button>
              <Button variant="outline" href="/sadaqah">
                Give Sadaqah
              </Button>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
