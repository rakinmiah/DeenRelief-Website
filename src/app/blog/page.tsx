import Link from "next/link";
import Image from "next/image";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import JsonLd from "@/components/JsonLd";
import BreadcrumbSchema from "@/components/BreadcrumbSchema";
import { BLOG_SECTIONS } from "@/lib/blog-sections";

// Static hub page — the three sections are fixed, so this rarely changes.
export const revalidate = 3600;

export default function BlogPage() {
  const blogSchema = {
    "@context": "https://schema.org",
    "@type": "Blog",
    name: "Deen Relief Blog",
    url: "https://deenrelief.org/blog",
    description:
      "Islamic knowledge guides, who we are, and the latest from Deen Relief.",
    publisher: {
      "@type": "Organization",
      name: "Deen Relief",
      url: "https://deenrelief.org",
    },
  };

  return (
    <>
      <BreadcrumbSchema items={[{ name: "Blog", href: "/blog" }]} />
      <JsonLd data={blogSchema} />
      <Header />

      <main id="main-content" className="flex-1">
        {/* Hero */}
        <section className="bg-cream pt-24 md:pt-32 pb-12 md:pb-14">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl">
              <span className="inline-block text-[11px] font-bold tracking-[0.1em] uppercase text-green mb-3">
                Blog
              </span>
              <h1 className="text-[1.75rem] sm:text-[2.25rem] lg:text-[2.5rem] leading-[1.18] font-heading font-bold text-charcoal mb-4 tracking-[-0.02em]">
                Knowledge, impact &amp; updates
              </h1>
              <p className="text-grey text-base sm:text-[1.0625rem] leading-[1.7]">
                Explore Islamic giving guides, get to know who we are, and read the
                latest from the Deen Relief team. Choose where to start.
              </p>
            </div>
          </div>
        </section>

        {/* Three section cards */}
        <section className="py-12 md:py-20 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid md:grid-cols-3 gap-6 md:gap-7">
              {BLOG_SECTIONS.map((section) => (
                <Link
                  key={section.slug}
                  href={`/blog/${section.slug}`}
                  className="group bg-white border border-charcoal/8 rounded-2xl overflow-hidden hover:shadow-lg hover:-translate-y-1 transition-all duration-200 flex flex-col"
                >
                  {/* Image */}
                  <div className="relative aspect-[16/10] overflow-hidden bg-charcoal/5">
                    <Image
                      src={section.image}
                      alt={section.imageAlt}
                      fill
                      sizes="(max-width: 768px) 100vw, 33vw"
                      className="object-cover group-hover:scale-[1.04] transition-transform duration-300"
                    />
                  </div>

                  {/* Text */}
                  <div className="p-6 flex flex-col flex-1">
                    <h2 className="font-heading font-bold text-xl text-charcoal mb-2 group-hover:text-green transition-colors duration-200">
                      {section.title}
                    </h2>
                    <p className="text-grey text-sm leading-relaxed mb-5 flex-1">
                      {section.blurb}
                    </p>
                    <span className="text-green text-sm font-semibold inline-flex items-center gap-1 group-hover:gap-2 transition-all duration-200">
                      Explore {section.title}
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
      </main>

      <Footer />
    </>
  );
}
