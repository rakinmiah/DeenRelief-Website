import type { Metadata } from "next";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import BreadcrumbSchema from "@/components/BreadcrumbSchema";

const title = "Zakat Calculator Methodology | Deen Relief";
const description =
  "How the Deen Relief Zakat calculator works — nisab thresholds, asset category rules, liabilities, and the cautious default approach. Planning tool only — consult your scholar.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/zakat/methodology" },
  openGraph: {
    title,
    description,
    images: [
      {
        url: "/images/zakat-hero.webp",
        alt: "Deen Relief programmes reach families across multiple regions",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    site: "@deenrelief",
    title,
    description,
    images: ["/images/zakat-hero.webp"],
  },
};

/**
 * /zakat/methodology — Zakat calculator methodology disclosure.
 *
 * Phase 2 scaffold. Sections that make fiqh-specific claims are
 * marked [Pending scholarly review] until the v2 work cycle adds
 * a named UK scholar reviewer. Donor-facing pages should not
 * publish unsubstantiated fiqh claims under the Deen Relief name.
 *
 * Once a scholar is engaged: replace [Pending scholarly review]
 * markers with their attribution, expand each per-madhab section
 * with their validated rule statements, and then enable the
 * madhab-override UI in ZakatCalculator.tsx.
 */
export default function ZakatMethodologyPage() {
  return (
    <>
      <BreadcrumbSchema
        items={[
          { name: "Pay Zakat", href: "/zakat" },
          { name: "Calculator Methodology", href: "/zakat/methodology" },
        ]}
      />
      <Header />

      <main id="main-content" className="flex-1">
        {/* Hero */}
        <section className="bg-cream pt-24 pb-12 md:pt-32 md:pb-16">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
            <p className="text-[11px] font-bold tracking-[0.12em] uppercase text-green mb-3">
              Calculator Methodology
            </p>
            <h1 className="text-3xl sm:text-4xl lg:text-[2.75rem] font-heading font-bold text-charcoal leading-tight mb-4">
              How our Zakat calculator works
            </h1>
            <p className="text-grey text-base sm:text-[1.0625rem] leading-[1.7]">
              The methodology behind our Zakat calculator — what&apos;s
              included, what&apos;s exempt, and how net Zakatable wealth is
              compared against nisab. A planning tool, not a religious
              ruling. Consult your scholar for complex cases.
            </p>
          </div>
        </section>

        <section className="bg-white py-12 md:py-16">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
            {/* 1. Introduction */}
            <Block heading="1. Introduction" headingId="introduction">
              <p>
                This calculator provides a structured way for UK donors to
                estimate their annual Zakat across cash, gold, silver,
                investments, business assets, property, and liabilities. It
                is a planning tool — not a fatwa, not a substitute for
                scholarly advice on complex cases.
              </p>
              <p>
                Zakat is paid annually on net wealth that has remained above
                the nisab threshold for one full lunar year (a hawl). This
                calculator computes net Zakatable wealth at the moment you
                use it; the question of whether your wealth has been above
                nisab for a full hawl is a question for you and your scholar.
              </p>
            </Block>

            {/* 2. Nisab */}
            <Block heading="2. How nisab is calculated" headingId="nisab">
              <p>
                Two nisab thresholds exist in the Sunnah, derived from gold
                and silver:
              </p>
              <ul>
                <li>
                  <strong>Silver nisab</strong> — 612.36g of silver
                </li>
                <li>
                  <strong>Gold nisab</strong> — 87.48g of gold
                </li>
              </ul>
              <p>
                The calculator multiplies these gram thresholds by the
                current GBP spot price of XAU (gold) or XAG (silver) sourced
                from a public commodity API, refreshed every six hours. When
                the API is unreachable, the calculator falls back to recent
                approximate values and surfaces a &ldquo;Approximate
                values&rdquo; suffix on the price line.
              </p>
              <p>
                <strong>Default: Silver.</strong> Most contemporary UK Zakat
                calculators default to the silver nisab because silver has
                fallen further in value relative to gold over time, making
                silver the lower threshold today. Defaulting to silver means
                more donors qualify to pay Zakat — the cautious position
                from a fulfilment-of-obligation standpoint. Donors who
                follow the gold-nisab position can switch using the toggle
                on the calculator.
              </p>
            </Block>

            {/* 3. Asset categories */}
            <Block heading="3. Asset category rules" headingId="categories">
              <p>
                The calculator covers seven categories. Each one rolls up a
                set of related inputs into a per-category subtotal that
                feeds the overall Zakatable-wealth figure.
              </p>

              <SubBlock heading="Cash and savings">
                <p>
                  Money held in bank accounts, physical cash, money owed to
                  you that you reasonably expect to be repaid, and foreign
                  currency holdings (entered as GBP equivalent). Cash is the
                  one category where there is no madhab variation — the full
                  amount is Zakatable.
                </p>
              </SubBlock>

              <SubBlock heading="Gold and silver">
                <p>
                  Coins, bars, and jewelry can be entered either by weight
                  (with the calculator applying the live spot price) or by
                  current market value. The calculator includes all gold and
                  silver as the cautious default.
                </p>
                <p className="text-charcoal/55 text-[14px] italic">
                  [Pending scholarly review] Some madhabs exempt regularly-
                  worn jewelry. The current calculator does not apply this
                  exemption automatically — donors who follow Maliki,
                  Shafi&apos;i, or Hanbali positions on jewelry should
                  consult their scholar and adjust their final figure. The
                  v2 calculator will add a per-madhab exemption toggle once
                  a named scholar has reviewed the rule application.
                </p>
              </SubBlock>

              <SubBlock heading="Investments">
                <p>
                  Stocks and shares are valued at current market value.
                  Pensions are entered at their current value as a cautious
                  default. Cryptocurrency is entered as current GBP value at
                  the time of calculation.
                </p>
                <p className="text-charcoal/55 text-[14px] italic">
                  [Pending scholarly review] Pension Zakatability varies by
                  pension type and madhab — SIPPs, employer DC schemes,
                  employer DB schemes, and annuities are treated differently
                  in different scholarly opinions. The current calculator
                  does not break pensions into sub-types; donors with
                  complex pension structures should consult their scholar.
                  The v2 calculator will add a pension-type sub-selector
                  with per-type rules once scholarly review is complete.
                </p>
                <p className="text-charcoal/55 text-[14px] italic">
                  [Pending scholarly review] Cryptocurrency Zakat treatment
                  is contested across contemporary scholarship. The
                  calculator includes crypto as a cautious default; some
                  scholars treat crypto differently. Consult your scholar
                  for guidance specific to your situation.
                </p>
              </SubBlock>

              <SubBlock heading="Business assets">
                <p>
                  Inventory held for sale (stock-in-trade), cash held in
                  business accounts, and money customers owe your business
                  that you reasonably expect to be paid. Inventory is valued
                  at current market value as the cautious default.
                </p>
                <p className="text-charcoal/55 text-[14px] italic">
                  [Pending scholarly review] Some scholars value
                  stock-in-trade at original cost rather than current
                  market. The v2 calculator will add a valuation toggle
                  once scholarly review confirms which positions to expose.
                </p>
              </SubBlock>

              <SubBlock heading="Property">
                <p>
                  Cash held from rental income is Zakatable. The capital
                  value of investment property is not Zakatable. Land held
                  with intent to sell is Zakatable at current market value;
                  land held for personal use is not. Your primary residence
                  is exempt regardless of value.
                </p>
              </SubBlock>
            </Block>

            {/* 4. Liabilities */}
            <Block heading="4. Liabilities" headingId="liabilities">
              <p>
                Three liability inputs are deductible against your total
                Zakatable assets:
              </p>
              <ul>
                <li>
                  <strong>Immediate debts due</strong> — debts due now or
                  within the next month (credit cards, bills due, personal
                  debts).
                </li>
                <li>
                  <strong>Long-term debt — next month&apos;s payment only</strong>
                  {" "}— the next single monthly payment on long-term debts
                  like mortgages, car finance, and student loans.
                </li>
                <li>
                  <strong>Tax owed</strong> — tax that is due but not yet
                  paid (e.g. self-assessment liability).
                </li>
              </ul>
              <p>
                <strong>Liabilities cannot exceed assets</strong> — Zakat is
                never negative. If your liabilities are greater than your
                Zakatable assets, the calculator caps the deduction at the
                asset total and reports £0 net Zakatable wealth.
              </p>
              <p className="text-charcoal/55 text-[14px] italic">
                [Pending scholarly review] The &ldquo;next month&apos;s
                payment&rdquo; rule for long-term debts reflects one
                contemporary position. Other positions allow no deduction
                for long-term debts, or allow deduction of all instalments
                due within the Zakat year, or take other approaches. Donors
                who follow a different position should consult their scholar
                and adjust their final figure.
              </p>
            </Block>

            {/* 5. Disclaimer */}
            <Block heading="5. Disclaimer" headingId="disclaimer">
              <p>
                This calculator is a guide based on cautious default
                assumptions. It is not a religious ruling. Deen Relief is a
                charity, not a religious authority — we provide this tool to
                help our donors fulfil their Zakat obligation accurately,
                not to issue fatawa.
              </p>
              <p>
                For complex cases — particularly involving business
                structures, multi-currency holdings, unusual asset classes,
                or pension types we do not currently break out — consult
                your scholar. If the calculator&apos;s cautious default
                produces a figure higher than your madhab&apos;s ruling
                requires, you may pay the lower figure your scholar
                identifies as your true obligation.
              </p>
            </Block>

            {/* 6. Scholarly attribution */}
            <Block heading="6. Scholarly attribution" headingId="attribution">
              <p>
                Methodology aligned with established positions from
                authoritative Islamic finance references.
              </p>
              <p className="text-charcoal/55 text-[14px] italic">
                [Pending scholarly review] Phase-2 work to identify a named
                UK scholar reviewer and add their attribution and
                credentials. Until that work is complete, this calculator
                should be understood as a planning tool whose category
                structure follows established conventions but whose specific
                rule applications have not been validated by a named
                authority on behalf of Deen Relief.
              </p>
            </Block>

            {/* 7. Contact */}
            <Block heading="7. Contact" headingId="contact">
              <p>
                Have a question about your Zakat calculation? Email us at{" "}
                <a
                  href="mailto:info@deenrelief.org"
                  className="font-semibold text-green hover:text-green-dark underline underline-offset-2"
                >
                  info@deenrelief.org
                </a>
                .
              </p>
            </Block>

            {/* Back to calculator */}
            <div className="pt-8 border-t border-charcoal/10">
              <Link
                href="/zakat#zakat-form"
                className="inline-flex items-center gap-2 font-semibold text-green hover:text-green-dark"
              >
                Back to the Zakat calculator
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2.5}
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
                  />
                </svg>
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}

function Block({
  heading,
  headingId,
  children,
}: {
  heading: string;
  headingId: string;
  children: React.ReactNode;
}) {
  return (
    <section id={headingId} className="scroll-mt-24">
      <h2 className="text-2xl sm:text-[1.75rem] font-heading font-bold text-charcoal leading-tight mb-4">
        {heading}
      </h2>
      <div className="space-y-4 text-grey text-[15px] sm:text-base leading-[1.75] [&_p]:text-grey [&_strong]:text-charcoal [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:space-y-1 [&_li]:text-grey [&_a]:font-semibold">
        {children}
      </div>
    </section>
  );
}

function SubBlock({
  heading,
  children,
}: {
  heading: string;
  children: React.ReactNode;
}) {
  return (
    <div className="pt-2">
      <h3 className="text-[1.0625rem] sm:text-lg font-heading font-semibold text-charcoal mb-2">
        {heading}
      </h3>
      <div className="space-y-3">{children}</div>
    </div>
  );
}
