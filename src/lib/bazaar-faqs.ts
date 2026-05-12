/**
 * FAQ data for the bazaar pages — one curated set per page, plus
 * a dynamic per-product builder.
 *
 * Why on every page (not just one site-wide FAQ):
 *   1. SEO — Google's FAQPage rich result needs the Q&A to MATCH
 *      what's visible on the page. Per-page FAQs are page-relevant,
 *      so each page gets its own JSON-LD without duplicating
 *      content across URLs (which Google deduplicates anyway).
 *   2. Customer trust — the question someone has on the product
 *      page ("will it shrink?") is different from the question on
 *      the makers page ("are they paid fairly?"). Letting each
 *      page answer the questions it actually invites converts
 *      better than a generic FAQ page.
 *
 * Answer voice: plain, specific, slightly under-promising. We say
 * "2-4 working days" not "fast shipping"; "14 days from delivery"
 * not "easy returns". The premise of the brand is honesty, and
 * vague answers in a FAQ block hurt that.
 *
 * Links: every FAQ that mentions another page links to it
 * (returns, shipping, our-promise, contact). The cross-page link
 * cluster is small but tight — internal-link credit and lower
 * bounce.
 */

import { BAZAAR_SUPPORT_EMAIL } from "@/lib/bazaar-config";
import type { Product } from "@/lib/bazaar-types";

export interface BazaarFaqLink {
  href: string;
  label: string;
}

export interface BazaarFaq {
  /** Stable id used in analytics and React keys. Letters + hyphens. */
  id: string;
  question: string;
  /** Plain text — use \n\n for paragraph breaks (the accordion
   *  renders with whitespace-pre-line). Used in FAQPage JSON-LD
   *  too, so keep it scannable. */
  answer: string;
  /** Optional CTAs rendered below the answer. */
  links?: BazaarFaqLink[];
}

export type BazaarFaqPage =
  | "landing"
  | "product"
  | "makers"
  | "promise"
  | "returns"
  | "shipping"
  | "sizing"
  | "contact";

// ─────────────────────────────────────────────────────────────────
// Schema.org FAQPage helper
// ─────────────────────────────────────────────────────────────────

/**
 * Build the JSON-LD FAQPage object Google parses for rich results.
 * Pass the same `faqs` array used to render the accordion — the
 * answer text and visible content must match (Google's policy).
 */
export function buildBazaarFaqSchema(
  faqs: BazaarFaq[]
): Record<string, unknown> {
  return {
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
  };
}

// ─────────────────────────────────────────────────────────────────
// Per-page FAQs
// ─────────────────────────────────────────────────────────────────

/** /bazaar — the catalog landing page. Broad questions a first
 *  visitor would have before clicking into a product. */
export const BAZAAR_LANDING_FAQS: BazaarFaq[] = [
  {
    id: "who-makes-products",
    question: "Who actually makes the products?",
    answer:
      "Named individuals and small workshops we work with directly — currently five makers in Sylhet and Dhaka (Bangladesh) and Adana (Turkey). Every product page names the person who made it, where they work, and how they got there.",
    links: [
      {
        href: "/bazaar/about-our-makers",
        label: "Meet our makers",
      },
    ],
  },
  {
    id: "where-money-goes",
    question: "Where does my money actually go?",
    answer:
      "Each order is split between maker payment (3-4× the regional commercial rate), materials, freight, fulfilment, Stripe fees, and a surplus that funds our charity programmes — orphan sponsorship in Bangladesh, cancer care in Adana, and emergency relief. Our Promise page has the full breakdown.",
    links: [
      {
        href: "/bazaar/our-promise",
        label: "Read Our Promise",
      },
    ],
  },
  {
    id: "shop-or-charity",
    question: "Is this part of the charity or a separate company?",
    answer:
      "The Bazaar trades directly through Deen Relief Charity under HMRC's small-trading exemption for charities. Trading income is recorded and reported separately to our Charity Commission filings, but every penny of surplus stays inside the charity.",
  },
  {
    id: "how-long-to-ship",
    question: "How long until my order is dispatched?",
    answer:
      "We pack and ship within 2 working days. From there, Royal Mail Tracked 48 delivers in 2-4 working days, so most UK orders arrive within a week of being placed. You'll get a tracking number by email the moment your parcel leaves us.",
    links: [
      {
        href: "/bazaar/shipping",
        label: "Shipping detail",
      },
    ],
  },
  {
    id: "outside-uk",
    question: "Do you ship outside the UK?",
    answer:
      "Not yet — UK addresses only at launch. We'll add international shipping once the volume is steady enough to justify the customs paperwork. If you're outside the UK and want to be notified when it opens, email us.",
    links: [
      {
        href: `mailto:${BAZAAR_SUPPORT_EMAIL}`,
        label: `Email ${BAZAAR_SUPPORT_EMAIL}`,
      },
    ],
  },
  {
    id: "payment-methods",
    question: "Can I pay with Apple Pay or Google Pay?",
    answer:
      "Yes. Checkout is hosted by Stripe and accepts Apple Pay, Google Pay, all major debit/credit cards, and Klarna where eligible. Your card details never touch our servers.",
  },
  {
    id: "why-prices-higher",
    question:
      "Why are prices higher than mainstream alternatives?",
    answer:
      "Because the maker actually gets paid. A high-street £25 abaya is made in a factory paying ~£40/month wages. Our £79 abaya is made by Khadija in Sylhet who earns roughly 4× the regional rate per piece — and the surplus funds our charity programmes. Same garment, very different supply chain.",
  },
  {
    id: "returns-policy",
    question: "What's your returns policy?",
    answer:
      "14 days from delivery for a full refund. If the issue is ours (damaged, wrong item, defect), we pay return shipping. If the issue is fit or preference, you cover return postage. Personalised items can't be returned unless faulty.",
    links: [
      {
        href: "/bazaar/returns",
        label: "Full returns policy",
      },
    ],
  },
];

/** /bazaar/about-our-makers — questions about the supply chain. */
export const BAZAAR_MAKERS_FAQS: BazaarFaq[] = [
  {
    id: "maker-selection",
    question: "How do you choose the makers?",
    answer:
      "Through existing relationships in the regions where Deen Relief already runs charity programmes. Our team in Sylhet and Adana introduced us to makers who were already producing high-quality work but selling through intermediaries who kept the margin. We took out the intermediary and bought direct.",
  },
  {
    id: "maker-pay-rate",
    question: "How much of each sale goes to the maker?",
    answer:
      "Roughly 3-4× the regional commercial rate per piece. The exact percentage of each sale varies by product (materials are a bigger share of the £18 tasbih than the £79 abaya), but every maker is paid above the local minimum wage equivalent for the time spent.",
  },
  {
    id: "paid-before-or-after",
    question: "Are makers paid before or after the products sell?",
    answer:
      "Before. We pay when production is complete — not when the product sells in the shop. We carry the inventory risk so they don't have to.",
  },
  {
    id: "first-name-initial",
    question:
      "Why do you only show first names and initials?",
    answer:
      "Privacy. Most of our makers live in small communities where being identifiable on a Western charity website carries some social cost and zero benefit to them. First-name-plus-initial gives customers a real human to attach to without exposing the maker to anything they didn't sign up for.",
  },
  {
    id: "custom-commission",
    question: "Can I commission a custom piece?",
    answer:
      "Not directly through the shop, but if you have a specific request (a bespoke embroidery design, a colour outside the standard range), email us — we'll ask whichever maker would be best placed and come back with a quote and lead time.",
    links: [
      {
        href: `mailto:${BAZAAR_SUPPORT_EMAIL}`,
        label: `Email ${BAZAAR_SUPPORT_EMAIL}`,
      },
    ],
  },
  {
    id: "fair-wages",
    question: "Are these really fair wages by local standards?",
    answer:
      "Yes — meaningfully above the local commercial rate, but we don't claim it's transformative on its own. What it does is keep school fees paid and weekends with the family possible. We publish an annual breakdown showing total maker payments alongside total revenue so it's verifiable.",
  },
];

/** /bazaar/our-promise — questions about the charity/commerce model. */
export const BAZAAR_OUR_PROMISE_FAQS: BazaarFaq[] = [
  {
    id: "small-trading-exemption",
    question: "What's the HMRC small-trading exemption?",
    answer:
      "It's the rule that lets a registered charity run a small non-primary-purpose trade (like a shop) without paying corporation tax on the profit, provided the trade stays under specified thresholds. We trade under this exemption so the surplus flows directly into the charity rather than being filtered through a separate trading company.",
  },
  {
    id: "financial-breakdown",
    question: "Can I see the financial breakdown?",
    answer:
      "We publish an annual breakdown showing total bazaar revenue, total maker payments, materials and fulfilment costs, and the surplus contributed to charity programmes. Trustees sign off before publication. Our Charity Commission filings include the trading income as a separate line.",
  },
  {
    id: "charity-commission-regulated",
    question: "Is the Bazaar regulated by the Charity Commission?",
    answer:
      "Yes — because it operates inside Deen Relief Charity (registered number on our Charity Commission profile). All trading income, surplus allocation, and trustee oversight is reported the same way as our donation income.",
  },
  {
    id: "income-separation",
    question:
      "How do you separate bazaar income from donation income?",
    answer:
      "Internally, every bazaar transaction is tagged so it shows up in a separate revenue stream from donations. Externally, our Charity Commission annual return reports the two streams on different lines. The accountant signs off on both quarterly.",
  },
  {
    id: "future-of-bazaar",
    question:
      "Will the Bazaar always run through the charity?",
    answer:
      "If volume grows past the HMRC threshold, we'd move trading into a wholly-owned trading subsidiary that gift-aids profits back to the charity. The customer experience wouldn't change. We're not there yet — for now, ancillary trading under the charity is the cleanest setup.",
  },
];

/** /bazaar/returns — additional questions beyond what the prose covers. */
export const BAZAAR_RETURNS_FAQS: BazaarFaq[] = [
  {
    id: "exchange-not-refund",
    question:
      "Can I exchange for a different size instead of a refund?",
    answer:
      "Direct swaps aren't automatic — return the original and place a new order for the correct size. If you email us first we'll reserve the size you want so it doesn't sell out while your return is in transit.",
    links: [
      {
        href: `mailto:${BAZAAR_SUPPORT_EMAIL}`,
        label: `Email ${BAZAAR_SUPPORT_EMAIL}`,
      },
    ],
  },
  {
    id: "damaged-on-arrival",
    question: "What if the item arrives damaged?",
    answer:
      "Email us within 48 hours of delivery with photos of the damage and your order number. We send a prepaid Royal Mail label and either resend (if we have stock) or refund the full amount including original shipping.",
  },
  {
    id: "refund-bank-timing",
    question:
      "How long does the refund take to land in my account?",
    answer:
      "Once we receive and inspect the return, we issue the refund within one working day. Stripe then takes 5-10 working days to settle into your bank, depending on your card provider.",
  },
  {
    id: "personalised-items",
    question: "Can I return personalised items?",
    answer:
      "Only if they're faulty. Bespoke items (custom embroidery, monogrammed pieces) are made specifically for you, so the standard 14-day cooling-off period doesn't apply unless there's a defect. UK Consumer Contracts Regulations explicitly carve this out.",
  },
  {
    id: "sale-items",
    question: "What about items I bought on sale?",
    answer:
      "Sale items follow the same 14-day window. The refund is the price you actually paid, not the original RRP.",
  },
];

/** /bazaar/sizing-guide — questions about the recommender and
 *  how the fit works in practice. */
export const BAZAAR_SIZING_FAQS: BazaarFaq[] = [
  {
    id: "between-sizes",
    question: "What if the recommender says I'm between sizes?",
    answer:
      "Pick by what you'll wear it for. If most of your wear is daily / prayer, size up for ease of movement during salah and layering season-to-season. If it's primarily for formal occasions, true-to-size gives a sharper silhouette. The 14-day returns window means you can try one and exchange if it's not right.",
    links: [
      { href: "/bazaar/returns", label: "Returns policy" },
    ],
  },
  {
    id: "pregnancy-fit",
    question:
      "Will the abaya fit through pregnancy?",
    answer:
      "Tick the pregnancy / nursing box in the recommender — we size up automatically to give bust and waist comfortable room through the first and second trimesters. By the third trimester you may want to size up again, or pick a piece designed specifically for maternity. Email us if you'd like a recommendation for your stage.",
    links: [
      {
        href: `mailto:${BAZAAR_SUPPORT_EMAIL}`,
        label: `Email ${BAZAAR_SUPPORT_EMAIL}`,
      },
    ],
  },
  {
    id: "vs-uk-sizes",
    question: "How does this fit compared to UK high-street sizes?",
    answer:
      "Our Small ≈ UK 8–12, Medium ≈ UK 12–16, Large ≈ UK 16–20+. The cut is deliberately loose, so people at the upper end of a band often find true-to-size comfortable rather than tight. If you usually wear a UK 14, our Medium is the right starting point.",
  },
  {
    id: "taller-than-largest",
    question:
      "I'm taller than 5'11\" / 180 cm. Will the Large fit?",
    answer:
      "It will sit higher above the ankle than the cut intends — anywhere from 2 to 6 cm depending on your exact height. Some customers like that for everyday wear; others prefer the floor-skimming length. We can ask the maker for a custom longer batch (60\" length) — email us with your height and we'll come back with a quote and lead time.",
    links: [
      {
        href: `mailto:${BAZAAR_SUPPORT_EMAIL}`,
        label: `Email about a custom longer abaya`,
      },
    ],
  },
  {
    id: "measure-bust-correctly",
    question: "What's the right way to measure my bust?",
    answer:
      "Wearing a light layer (a t-shirt or thin cardigan, not a thick jumper), wrap a soft tape around the fullest part of your bust — usually across the nipple line. Keep the tape level all the way around your back. Snug, not tight: you should be able to slide a finger underneath comfortably.",
  },
  {
    id: "shrinkage-after-wash",
    question:
      "Will the abaya shrink after washing?",
    answer:
      "We pre-shrink the fabric at the workshop before cutting, and the care instructions are designed to keep the finished garment stable. If you follow them (cold wash, gentle cycle, hang or low-tumble dry), expected shrinkage is well under 2% — usually unnoticeable.",
  },
];

/** /bazaar/shipping — beyond the prose. */
export const BAZAAR_SHIPPING_FAQS: BazaarFaq[] = [
  {
    id: "faster-shipping",
    question: "Can I get faster shipping than 2-4 days?",
    answer:
      "At checkout you can upgrade from Royal Mail Tracked 48 (2-4 days) to Tracked 24 (1-2 days) for an extra £1. We don't currently offer next-day delivery, but contact us before ordering if it's urgent and we'll see what we can arrange.",
  },
  {
    id: "tracking-number",
    question: "Will I get a tracking number?",
    answer:
      "Yes — both Tracked 48 and Tracked 24 include a Royal Mail tracking number. We email the number the moment your parcel leaves us, with a one-click link to the Royal Mail tracking page.",
  },
  {
    id: "parcel-not-arrived",
    question:
      "What if my parcel hasn't arrived after the estimated date?",
    answer:
      "Check the tracking link first — Royal Mail occasionally holds parcels at a delivery office for collection or attempts redelivery. If it's been more than 10 working days from dispatch with no tracking update, email us with your order number and we'll either resend or refund (your choice).",
    links: [
      {
        href: `mailto:${BAZAAR_SUPPORT_EMAIL}`,
        label: `Email ${BAZAAR_SUPPORT_EMAIL}`,
      },
    ],
  },
  {
    id: "po-bfpo",
    question:
      "Do you ship to PO Boxes or BFPO addresses?",
    answer:
      "Yes to both. Enter the PO Box or BFPO address at checkout exactly as Royal Mail would expect it. Delivery times to BFPO can be longer than the standard estimate.",
  },
  {
    id: "change-address",
    question:
      "Can I change my delivery address after ordering?",
    answer:
      "If your order hasn't shipped yet, reply to your order confirmation email within the next few hours and we'll update it before dispatch. Once Royal Mail has the parcel, we can't reroute — you'd need to contact Royal Mail directly for redirection.",
  },
];

/** /bazaar/contact — questions a customer is likely to have
 *  *before* filling in the form. The aim is to deflect the
 *  most common "where's my order / how do I return" questions
 *  to the dedicated policy pages, leaving the form for things
 *  that genuinely need a human reply. */
export const BAZAAR_CONTACT_FAQS: BazaarFaq[] = [
  {
    id: "response-time",
    question: "How fast will you reply?",
    answer:
      "Most messages get a response within one working day (Monday–Friday). Weekend and bank-holiday messages land in the inbox first thing the next working day.",
  },
  {
    id: "wheres-my-order",
    question: "Where is my order?",
    answer:
      "Once we ship, you'll get a separate email with a Royal Mail tracking number. Tracked 48 takes 2–4 working days; Tracked 24 takes 1–2. If you've passed the estimate with no movement on the tracking page, message us with your order number and we'll chase it.",
    links: [
      { href: "/bazaar/shipping", label: "Shipping policy" },
    ],
  },
  {
    id: "how-to-return",
    question: "How do I return something?",
    answer:
      "You have 14 days from delivery. Email us first so we can confirm the return and send a prepaid label if the issue is ours (damaged, defective, wrong item). Full step-by-step on the returns page.",
    links: [
      { href: "/bazaar/returns", label: "Returns policy" },
    ],
  },
  {
    id: "sizing-help",
    question: "I'm not sure which size to pick — can you help?",
    answer:
      "Yes — message us your usual size in a brand you know fits, your height, and the piece you're looking at. We measure everything by hand and can usually tell you within an hour or two whether to size up or down. The sizing guide also has a quick recommender.",
    links: [
      { href: "/bazaar/sizing-guide", label: "Sizing guide" },
    ],
  },
  {
    id: "wholesale",
    question: "Do you do wholesale or bulk orders for mosques and schools?",
    answer:
      "We can sometimes accommodate larger orders (prayer mats for a masjid, modest uniforms for a school). Message us with quantities, timeline, and a delivery postcode and we'll come back with a quote and a realistic lead time.",
  },
  {
    id: "general-charity-question",
    question: "I have a question about Deen Relief's charity programmes, not the shop.",
    answer:
      "The main Deen Relief contact form is the right place — it routes to the programmes team. Same inbox underneath, but the form there has the fields they need.",
    links: [
      { href: "/contact", label: "Main charity contact" },
    ],
  },
];

// ─────────────────────────────────────────────────────────────────
// Per-product FAQs (dynamic)
// ─────────────────────────────────────────────────────────────────

/**
 * Build a tailored FAQ set for a single product detail page. The
 * questions adapt to:
 *   - whether the product has variants (sizing/colour selection)
 *   - whether it's clothing (washing care)
 *   - whether it's currently sold out (restock question)
 *
 * Common across all products: shipping, returns, who-made-this.
 * These are anchored by id so the FAQPage schema stays consistent
 * even as product attributes evolve.
 */
export function buildBazaarProductFaqs(product: Product): BazaarFaq[] {
  const faqs: BazaarFaq[] = [];

  const isClothing =
    product.category === "abaya" ||
    product.category === "thobe" ||
    product.category === "hijab" ||
    product.category === "kids";
  const hasVariants = product.variants.length > 0;
  const isLowStock = product.stockCount <= product.lowStockThreshold;
  const isSoldOut = product.stockCount === 0;

  if (hasVariants && product.sizingGuide) {
    faqs.push({
      id: "sizing",
      question: "How does the sizing run?",
      answer:
        "Our sizing guide above this section breaks down the dimensions for every variant. If you're between sizes, size up for ease of movement during salah or size down for a sharper silhouette. When in doubt, email us with your measurements and we'll point you at the right size.",
      links: [
        {
          href: `mailto:${BAZAAR_SUPPORT_EMAIL}`,
          label: `Email ${BAZAAR_SUPPORT_EMAIL}`,
        },
      ],
    });
  }

  if (isClothing) {
    faqs.push({
      id: "shrinkage",
      question: "Will it shrink after washing?",
      answer:
        "We pre-shrink the fabric at the workshop before cutting, and the care instructions are designed to keep the finished garment stable. If you follow them (cold wash, gentle cycle, hang or low-tumble), expected shrinkage is well under 2%.",
    });
  }

  faqs.push({
    id: "shipping-eta",
    question: "When will my order ship?",
    answer:
      "We pack and ship within 2 working days. Royal Mail Tracked 48 delivers in 2-4 working days from dispatch, or upgrade to Tracked 24 at checkout for 1-2 days. UK addresses only at the moment.",
    links: [
      { href: "/bazaar/shipping", label: "Full shipping policy" },
    ],
  });

  faqs.push({
    id: "returns",
    question: "Can I return it if it doesn't fit?",
    answer:
      "Yes — you have 14 days from delivery to return any item for a full refund. The item needs to come back unworn, unwashed, and with any tags attached. Return postage is on you unless the item is faulty.",
    links: [
      { href: "/bazaar/returns", label: "Returns policy" },
    ],
  });

  faqs.push({
    id: "who-made-this",
    question: `Who made this exactly?`,
    answer: `${product.maker.name}, ${product.maker.region}, ${product.maker.country}. Their story is in the "About the maker" block above. Every piece carries a small tag with their name.`,
    links: [
      { href: "/bazaar/about-our-makers", label: "Meet our makers" },
    ],
  });

  if (hasVariants && (isLowStock || isSoldOut)) {
    faqs.push({
      id: "restock",
      question:
        "Will my size come back if it sells out?",
      answer:
        "Most likely yes — we re-order from the maker in small batches. Each restock takes about 3-4 weeks from order to arrival. Email us if you want to be notified when your size is back; we keep a small wait-list per variant.",
      links: [
        {
          href: `mailto:${BAZAAR_SUPPORT_EMAIL}`,
          label: `Email ${BAZAAR_SUPPORT_EMAIL}`,
        },
      ],
    });
  }

  return faqs;
}
