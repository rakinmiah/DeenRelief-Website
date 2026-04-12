import Image from "next/image";
import Header from "@/components/Header";
import Button from "@/components/Button";
import ProofTag from "@/components/ProofTag";
import Partners from "@/components/Partners";
import Newsletter from "@/components/Newsletter";
import Footer from "@/components/Footer";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About Us | Deen Relief",
  description:
    "Founded in 2013 by Shabek Ali in Brighton, Deen Relief has grown from local homeless outreach to delivering cancer care, emergency relief, and education across five countries.",
  openGraph: {
    title: "About Us | Deen Relief",
    description: "Founded in 2013 in Brighton. From local homeless outreach to cancer care, emergency relief, and education across five countries.",
    images: [{ url: "/images/gulucuk-team.webp", alt: "Deen Relief team at Gulucuk Evi" }],
  },
};

export default function AboutPage() {
  return (
    <>
      <Header />

      <main id="main-content" className="flex-1">
        {/* ─── 1. Page Hero ─── */}
        <section className="relative min-h-[45vh] md:min-h-[50vh] flex items-end mt-[60px] md:mt-[64px]">
          <div className="absolute inset-0 z-0">
            <Image
              src="/images/gulucuk-team.webp"
              alt="Deen Relief team members with children at the Gulucuk Evi care centre in Adana, Turkey"
              fill
              className="object-cover object-center"
              priority
            />
            <div
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(to right, rgba(26,26,46,0.93) 0%, rgba(26,26,46,0.88) 35%, rgba(26,26,46,0.62) 52%, rgba(26,26,46,0.20) 75%, rgba(26,26,46,0.06) 100%)",
              }}
            />
            <div
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(to top, rgba(26,26,46,0.45) 0%, transparent 45%)",
              }}
            />
          </div>

          <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full py-12 md:py-16 lg:py-20">
            <div className="max-w-[22rem] sm:max-w-[26rem] md:max-w-[28rem]">
              <h1
                className="text-[1.75rem] sm:text-[2.25rem] lg:text-[2.5rem] leading-[1.18] sm:leading-[1.14] lg:leading-[1.12] text-white font-heading font-bold mb-4 tracking-[-0.02em]"
              >
                Guided by Faith,{"\n"}Driven by Action
              </h1>
              <p className="text-[0.875rem] sm:text-[0.9375rem] text-white/65 mb-7 leading-[1.7] max-w-[24rem]">
                A UK-registered charity delivering cancer care, emergency
                relief, and long-term development across five countries —
                with no more than 10% spent on administration.
              </p>
              <Button variant="primary" href="/#donate">
                Donate Now
              </Button>
            </div>
          </div>

          <ProofTag location="Adana, Turkey" position="bottom-right" />
        </section>

        {/* ─── 2. Origin Story ─── */}
        <section className="py-16 md:py-24 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
              {/* Image */}
              <div className="relative rounded-2xl overflow-hidden aspect-[4/3]">
                <Image
                  src="/images/brighton-team.png"
                  alt="Deen Relief volunteers gathered at Brighton seafront for a community outreach event"
                  fill
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 50vw"
                />
                <ProofTag location="Brighton, UK" />
              </div>

              {/* Content */}
              <div>
                <span className="inline-block text-[11px] font-bold tracking-[0.1em] uppercase text-green mb-3">
                  Our Story
                </span>
                <h2 className="text-3xl sm:text-4xl font-heading font-bold text-charcoal leading-tight mb-4">
                  From Brighton&apos;s Streets to a Global Mission
                </h2>
                <p className="text-grey text-base sm:text-[1.0625rem] leading-[1.7] mb-4">
                  Deen Relief was established by founding trustee Shabek Ali
                  in 2013. The charity&apos;s first activity was assisting the
                  homeless community in Brighton &amp; Hove with hot meals and
                  essentials — work that continues to this very day.
                </p>
                <p className="text-grey text-base sm:text-[1.0625rem] leading-[1.7] mb-4">
                  From those grassroots beginnings on Brighton&apos;s streets,
                  Deen Relief has grown into an international charity
                  delivering aid across Africa, South Asia, and the Middle
                  East. Today we operate cancer care centres in Turkey,
                  deliver emergency relief in Gaza, sponsor orphans in
                  Bangladesh, and build schools and clean water systems for
                  communities with nothing.
                </p>
                <p className="text-grey text-base sm:text-[1.0625rem] leading-[1.7] mb-6">
                  What hasn&apos;t changed is our approach: personal service to
                  every donor and every beneficiary, full transparency about
                  where donations go, and the commitment to ensuring
                  assistance reaches the people it was intended for.
                </p>
                <Button variant="secondary" href="/#donate">
                  Support Our Work
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* ─── 3. What We Do ─── */}
        <section className="py-16 md:py-24 bg-cream">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {/* Header */}
            <div className="text-center max-w-2xl mx-auto mb-10">
              <span className="inline-block text-[11px] font-bold tracking-[0.1em] uppercase text-green mb-3">
                What We Do
              </span>
              <h2 className="text-3xl sm:text-4xl font-heading font-bold text-charcoal leading-tight mb-3">
                Delivering Real Change Where It&apos;s Needed
              </h2>
              <p className="text-grey text-base sm:text-[1.0625rem] leading-[1.7]">
                From cancer care centres in Turkey to classroom construction
                in Bangladesh — we focus on programmes that create lasting,
                measurable impact.
              </p>
            </div>

            {/* Programme Grid */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {[
                {
                  title: "Medical Support",
                  description:
                    "Funding cancer treatment, medical supplies, and family housing at our care centres in Adana, Turkey.",
                  icon: (
                    <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" />
                    </svg>
                  ),
                },
                {
                  title: "Education",
                  description:
                    "Building schools and providing learning tools for children in rural Bangladesh who would otherwise have no access.",
                  icon: (
                    <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.438 60.438 0 0 0-.491 6.347A48.62 48.62 0 0 1 12 20.904a48.62 48.62 0 0 1 8.232-4.41 60.46 60.46 0 0 0-.491-6.347m-15.482 0a50.636 50.636 0 0 0-2.658-.813A59.906 59.906 0 0 1 12 3.493a59.903 59.903 0 0 1 10.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.717 50.717 0 0 1 12 13.489a50.702 50.702 0 0 1 7.74-3.342M6.75 15a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm0 0v-3.675A55.378 55.378 0 0 1 12 8.443m-7.007 11.55A5.981 5.981 0 0 0 6.75 15.75v-1.5" />
                    </svg>
                  ),
                },
                {
                  title: "Emergency Relief",
                  description:
                    "Rapid response to crises — distributing food, water, shelter, and medical aid to displaced families in Gaza and beyond.",
                  icon: (
                    <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                    </svg>
                  ),
                },
                {
                  title: "Community Support",
                  description:
                    "Weekly hot meals and essentials for homeless communities in Brighton, plus orphan sponsorship and clean water programmes.",
                  icon: (
                    <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z" />
                    </svg>
                  ),
                },
              ].map((programme) => (
                <div
                  key={programme.title}
                  className="bg-white border border-charcoal/5 rounded-2xl p-6 text-center"
                >
                  <div className="w-12 h-12 rounded-xl bg-green/10 text-green flex items-center justify-center mx-auto mb-4">
                    {programme.icon}
                  </div>
                  <h3 className="font-heading font-bold text-[1.0625rem] text-charcoal mb-2">
                    {programme.title}
                  </h3>
                  <p className="text-grey/80 text-[0.8125rem] leading-[1.6]">
                    {programme.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── 4. Cancer Care Feature ─── */}
        <section className="py-16 md:py-24 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
              {/* Narrative (left) */}
              <div>
                <span className="inline-block text-[11px] font-bold tracking-[0.1em] uppercase text-green mb-3">
                  Our Flagship Programme
                </span>
                <h2 className="text-3xl sm:text-4xl font-heading font-bold text-charcoal leading-tight mb-4">
                  Gulucuk Evi — The House of Smiles
                </h2>
                <p className="text-grey text-base sm:text-[1.0625rem] leading-[1.7] mb-4">
                  In Adana, Turkey, we operate the Gulucuk Evi — a
                  dedicated care centre for Syrian and Gazan refugee
                  children undergoing cancer treatment. Many of these
                  families have fled conflict with nothing, and face the
                  impossible burden of funding their child&apos;s treatment
                  in a foreign country.
                </p>
                <p className="text-grey text-base sm:text-[1.0625rem] leading-[1.7] mb-4">
                  Working in partnership with Adana City Hospital and
                  Çukurova University Balcalı Hospital, we provide free
                  family housing near treatment centres, cover medical
                  costs, deliver culturally appropriate nutrition
                  programmes, and offer Islamic counselling and emotional
                  support throughout the treatment journey.
                </p>
                <p className="text-grey text-base sm:text-[1.0625rem] leading-[1.7] mb-6">
                  Our team visits every family personally. We sit with
                  them, eat with them, and walk alongside them through
                  every stage of their child&apos;s care. This is what
                  Proof &amp; Proximity means to us — we don&apos;t send
                  aid from a distance. We are in the room.
                </p>
                <Button variant="secondary" href="/#donate">
                  Support Our Cancer Care Centres
                </Button>
              </div>

              {/* Images (right) */}
              <div className="grid grid-cols-2 gap-3">
                <div className="relative rounded-2xl overflow-hidden aspect-[3/4]">
                  <Image
                    src="/images/cancer-care-selfie.webp"
                    alt="Deen Relief worker taking a selfie with a child undergoing cancer treatment in Adana"
                    fill
                    className="object-cover"
                    sizes="(max-width: 1024px) 50vw, 25vw"
                  />
                  <ProofTag location="Adana, Turkey" />
                </div>
                <div className="relative rounded-2xl overflow-hidden aspect-[3/4]">
                  <Image
                    src="/images/cancer-care-family.png"
                    alt="Deen Relief worker with a child at the care centre in Adana"
                    fill
                    className="object-cover object-[60%_30%]"
                    sizes="(max-width: 1024px) 50vw, 25vw"
                  />
                  <ProofTag location="Adana, Turkey" position="bottom-right" />
                </div>
                <div className="relative rounded-2xl overflow-hidden aspect-[2.2/1] col-span-2">
                  <Image
                    src="/images/cancer-care-housing.webp"
                    alt="Deen Relief worker sitting with a child in the family housing programme in Adana"
                    fill
                    className="object-cover object-[center_25%]"
                    sizes="(max-width: 1024px) 100vw, 50vw"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ─── 5. Our Values ─── */}
        <section className="py-16 md:py-24 bg-cream">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-10">
              <span className="inline-block text-[11px] font-bold tracking-[0.1em] uppercase text-green mb-3">
                Our Values
              </span>
              <h2 className="text-3xl sm:text-4xl font-heading font-bold text-charcoal leading-tight mb-3">
                What Guides Everything We Do
              </h2>
              <p className="text-grey text-base sm:text-[1.0625rem] leading-[1.7]">
                We do not differentiate our beneficiaries based on race,
                religion, gender, ethnicity, or any other attribute.
              </p>
            </div>

            <div className="grid sm:grid-cols-3 gap-6">
              {[
                {
                  title: "Integrity",
                  description:
                    "We are honest and transparent in our fundraising activities, and welcome any queries about how donations are used.",
                  icon: (
                    <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
                    </svg>
                  ),
                },
                {
                  title: "Commitment",
                  description:
                    "We dedicate ourselves to helping communities locally and internationally, raising awareness and delivering sustained programmes.",
                  icon: (
                    <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.362 5.214A8.252 8.252 0 0 1 12 21 8.25 8.25 0 0 1 6.038 7.047 8.287 8.287 0 0 0 9 9.601a8.983 8.983 0 0 1 3.361-6.867 8.21 8.21 0 0 0 3 2.48Z" />
                    </svg>
                  ),
                },
                {
                  title: "Humanity",
                  description:
                    "We care deeply for the people we aim to help, and for those who work with us. Every life has equal value.",
                  icon: (
                    <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" />
                    </svg>
                  ),
                },
              ].map((value) => (
                <div
                  key={value.title}
                  className="bg-white border border-charcoal/5 rounded-2xl p-6 text-center"
                >
                  <div className="w-12 h-12 rounded-xl bg-green/10 text-green flex items-center justify-center mx-auto mb-4">
                    {value.icon}
                  </div>
                  <h3 className="font-heading font-bold text-[1.0625rem] text-charcoal mb-2">
                    {value.title}
                  </h3>
                  <p className="text-grey/80 text-[0.8125rem] leading-[1.6]">
                    {value.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── 6. Governance & Transparency ─── */}
        <section className="py-16 md:py-24 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-10">
              <span className="inline-block text-[11px] font-bold tracking-[0.1em] uppercase text-green mb-3">
                Governance
              </span>
              <h2 className="text-3xl sm:text-4xl font-heading font-bold text-charcoal leading-tight mb-3">
                Transparent by Design
              </h2>
              <p className="text-grey text-base sm:text-[1.0625rem] leading-[1.7]">
                Deen Relief operates as a registered charitable trust and
                limited company in England and Wales, governed by a Deed of
                Trust.
              </p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
              {[
                { value: "1158608", label: "Charity Commission No." },
                { value: "08593822", label: "Companies House No." },
                { value: "2013", label: "Year Established" },
                { value: "≤10%", label: "Maximum Admin Costs" },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="text-center bg-green-light/40 border border-green/8 rounded-xl p-6 md:p-8"
                >
                  <p className="text-2xl md:text-3xl font-heading font-bold text-green-dark mb-2">
                    {stat.value}
                  </p>
                  <p className="text-charcoal/50 text-sm font-medium">
                    {stat.label}
                  </p>
                </div>
              ))}
            </div>

            {/* Transparency Statement */}
            <div className="bg-green-dark/90 rounded-xl p-7 md:p-10">
              <div className="max-w-2xl mx-auto text-center">
                <h3 className="text-xl sm:text-2xl font-heading font-bold text-white mb-3">
                  Your Donations, Accounted For
                </h3>
                <p className="text-white/70 text-[0.9375rem] mb-6 leading-[1.7]">
                  We commit to spending no more than 10% of income on
                  administration and running costs. Offline donations are
                  recorded and witnessed by management, with funds banked
                  promptly by trustees and full documentation maintained.
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-5 border-t border-white/10">
                  <a
                    href="https://register-of-charities.charitycommission.gov.uk/charity-search/-/charity-details/5049652"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-white/80 hover:text-white text-[0.8125rem] font-medium transition-colors duration-200"
                  >
                    View on Charity Commission
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                    </svg>
                  </a>
                  <span className="hidden sm:inline text-white/25">|</span>
                  <span className="text-white/45 text-[0.8125rem]">
                    Reg. charity 1158608
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ─── 7. Our Team ─── */}
        <section className="py-16 md:py-24 bg-cream">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-10">
              <span className="inline-block text-[11px] font-bold tracking-[0.1em] uppercase text-green mb-3">
                Our Team
              </span>
              <h2 className="text-3xl sm:text-4xl font-heading font-bold text-charcoal leading-tight mb-3">
                The People Behind Deen Relief
              </h2>
              <p className="text-grey text-base sm:text-[1.0625rem] leading-[1.7]">
                A dedicated team committed to making every pound count.
              </p>
            </div>

            <div className="grid sm:grid-cols-3 gap-6 max-w-3xl mx-auto">
              {[
                { name: "Shabek Ali", role: "Founder & Trustee", image: "/images/team/shabek-ali.jpg" },
                { name: "Uthman Jeewa", role: "Trustee", image: "/images/team/uthman-jeewa.jpg" },
                { name: "Halim Rashid", role: "Trustee", image: "/images/team/halim-rashid.webp" },
              ].map((member) => (
                <div
                  key={member.name}
                  className="bg-white border border-charcoal/5 rounded-2xl p-6 text-center"
                >
                  <div className="w-32 h-32 sm:w-36 sm:h-36 rounded-full overflow-hidden mx-auto mb-4">
                    <Image
                      src={member.image}
                      alt={member.name}
                      width={144}
                      height={144}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <h3 className="font-heading font-bold text-[1.0625rem] text-charcoal mb-1">
                    {member.name}
                  </h3>
                  <p className="text-grey/60 text-sm font-medium">
                    {member.role}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── 8. Partners ─── */}
        <Partners />

        {/* ─── 9. Newsletter ─── */}
        <Newsletter />
      </main>

      <Footer />
    </>
  );
}
