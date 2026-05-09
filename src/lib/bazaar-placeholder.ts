/**
 * Placeholder fixture data for the Bazaar mockup.
 *
 * Every field here is a stand-in. When the client confirms the launch:
 *   1. Real product photography replaces the `primaryImage` and
 *      `galleryImages` fields (we already have placeholder paths that
 *      match the public/images/* asset structure).
 *   2. Real maker names, photos, and stories replace the maker block.
 *   3. Real prices, weights, and stock counts replace the placeholder
 *      figures used here for layout-testing.
 *   4. The export shape is unchanged — components consume Product[] and
 *      don't care whether it's loaded from this file or Supabase.
 *
 * Pricing strategy embedded in these placeholders:
 *   - Premium positioning, NOT cheapest. Story commands £60-£90 abayas,
 *     not £25 fast-fashion. The makers receive far more than commercial
 *     rates, and the brand carries that premium honestly.
 *   - All pence-denominated to avoid float rounding.
 *
 * Maker name convention:
 *   First name + last initial (e.g. "Khadija R.") — protects privacy,
 *   fits on the parcel tag, still feels personal.
 */

import type { Product } from "./bazaar-types";

/** Placeholder image paths. Real photoshoot output drops in here. */
const PLACEHOLDER_IMAGE_BASE = "/images/bazaar-placeholder";

export const PLACEHOLDER_PRODUCTS: Product[] = [
  {
    id: "p_001",
    slug: "the-sylhet-abaya",
    name: "The Sylhet Abaya",
    tagline: "Hand-stitched cotton-blend, designed for everyday modesty",
    description:
      "A flowing, breathable abaya cut from a soft cotton-rayon blend that drapes beautifully and holds its shape through the day.\n\nEach piece is hand-finished in Sylhet, Bangladesh — the side seams, the cuffs, and the discreet pocket lining are all sewn one stitch at a time. The fabric is sourced from a small mill in Narayanganj that pays its weavers above the regional minimum wage.\n\nDesigned for school runs, work, the masjid, and everywhere in between.",
    category: "abaya",
    pricePence: 7900,
    sku: "DR-ABY-001",
    weightGrams: 480,
    primaryImage: `${PLACEHOLDER_IMAGE_BASE}/abaya-1.webp`,
    galleryImages: [
      `${PLACEHOLDER_IMAGE_BASE}/abaya-1.webp`,
      `${PLACEHOLDER_IMAGE_BASE}/abaya-2.webp`,
      `${PLACEHOLDER_IMAGE_BASE}/abaya-3.webp`,
    ],
    variants: [
      { id: "v_001_s", size: "Small (52)", sku: "DR-ABY-001-S", stockCount: 1 },
      { id: "v_001_m", size: "Medium (54)", sku: "DR-ABY-001-M", stockCount: 2 },
      { id: "v_001_l", size: "Large (56)", sku: "DR-ABY-001-L", stockCount: 1 },
    ],
    sizingGuide:
      "<p>Our abayas run true to UK Muslim sizing. Choose by length:</p><ul><li><strong>Small (52\")</strong> — fits 5'0\" – 5'3\"</li><li><strong>Medium (54\")</strong> — fits 5'4\" – 5'7\"</li><li><strong>Large (56\")</strong> — fits 5'8\" – 5'11\"</li></ul><p>Sleeve length is generous; cuffs can be folded back for shorter arms.</p>",
    careInstructions: [
      "Cold machine wash on a gentle cycle",
      "Hang to dry in shade — direct sunlight may fade the dye",
      "Iron on medium with the garment turned inside out",
    ],
    materials: "70% cotton, 30% rayon, dyed with low-impact dyes in Narayanganj",
    maker: {
      name: "Khadija R.",
      country: "Bangladesh",
      region: "Sylhet",
      photoUrl: `${PLACEHOLDER_IMAGE_BASE}/maker-khadija.webp`,
      story:
        "Khadija is 32 and lives with her three children in a two-room flat in Sylhet. She learned to sew from her mother and has been making clothes for her neighbourhood for over a decade. Before joining Deen Relief Bazaar, she earned about £40 a month doing piecework for a local market trader. Each abaya she makes for us pays roughly four times that — enough that her oldest daughter is now back in school full-time.",
      quote:
        "I sew them like I sew for my own family. If a stitch is loose I do it again.",
    },
    stockCount: 4,
    lowStockThreshold: 2,
    isActive: true,
  },
  {
    id: "p_002",
    slug: "the-anatolia-thobe",
    name: "The Anatolia Thobe",
    tagline: "A relaxed everyday thobe woven near Adana",
    description:
      "A medium-weight thobe in soft beige cotton — ideal for prayer, Jumu'ah, and warm summer afternoons.\n\nWoven and tailored in a small workshop in Adana, Turkey, by a team of three brothers who have been making clothes since their father opened the shop in 1991. The cuffs and collar are reinforced with a contrast stitch that's invisible from the front but adds years to the lifespan.",
    category: "thobe",
    pricePence: 6900,
    sku: "DR-THB-001",
    weightGrams: 420,
    primaryImage: `${PLACEHOLDER_IMAGE_BASE}/thobe-1.webp`,
    galleryImages: [
      `${PLACEHOLDER_IMAGE_BASE}/thobe-1.webp`,
      `${PLACEHOLDER_IMAGE_BASE}/thobe-2.webp`,
    ],
    variants: [
      { id: "v_002_m", size: "Medium", sku: "DR-THB-001-M", stockCount: 2 },
      { id: "v_002_l", size: "Large", sku: "DR-THB-001-L", stockCount: 2 },
      { id: "v_002_xl", size: "X-Large", sku: "DR-THB-001-XL", stockCount: 1 },
    ],
    sizingGuide:
      "<p>Our thobes are cut for a relaxed fit. If you're between sizes, size down for a sharper silhouette or stay true for ease of movement during salah.</p>",
    careInstructions: [
      "Cold machine wash, gentle cycle",
      "Tumble dry low or hang dry",
      "Iron on medium — the cuffs benefit from a crisp press",
    ],
    materials: "100% mid-weight Turkish cotton",
    maker: {
      name: "Mehmet T.",
      country: "Turkey",
      region: "Adana",
      photoUrl: `${PLACEHOLDER_IMAGE_BASE}/maker-mehmet.webp`,
      story:
        "Mehmet runs the workshop with his two younger brothers, Mustafa and Yusuf. The shop has been in the family since 1991. They moved to making thobes for Deen Relief Bazaar after the regional textile crisis pushed several of their commercial buyers to closer in 2024. The Bazaar order keeps two of the looms running full-time and pays for Yusuf's daughter's secondary school fees.",
    },
    stockCount: 5,
    lowStockThreshold: 2,
    isActive: true,
  },
  {
    id: "p_003",
    slug: "the-dhaka-prayer-mat",
    name: "The Dhaka Prayer Mat",
    tagline: "A handwoven prayer mat with a quiet, dignified pattern",
    description:
      "A traditional handwoven prayer mat in deep forest green, with a geometric border pattern inspired by Mughal-era tilework. The pile is soft underfoot but firm enough to hold sujood comfortably without bunching.\n\nWoven on traditional looms in a women's cooperative outside Dhaka. Each mat takes one weaver about a day and a half to complete.",
    category: "prayer-mat",
    pricePence: 4500,
    sku: "DR-MAT-001",
    weightGrams: 600,
    primaryImage: `${PLACEHOLDER_IMAGE_BASE}/mat-1.webp`,
    galleryImages: [
      `${PLACEHOLDER_IMAGE_BASE}/mat-1.webp`,
      `${PLACEHOLDER_IMAGE_BASE}/mat-2.webp`,
    ],
    variants: [],
    careInstructions: [
      "Vacuum gently with a soft brush attachment",
      "Spot-clean spills immediately with a damp cloth",
      "Do not machine wash — the pile will mat",
    ],
    materials: "Cotton-acrylic blend, woven on traditional looms",
    maker: {
      name: "Fatima S. & the Dhaka Co-op",
      country: "Bangladesh",
      region: "Dhaka",
      photoUrl: `${PLACEHOLDER_IMAGE_BASE}/maker-fatima.webp`,
      story:
        "Fatima is one of nine women in a small cooperative in a village forty minutes outside Dhaka. The co-op was founded in 2019 by a local schoolteacher who wanted to give the village's widows a way to earn from home. They share two looms and rotate shifts so that every member contributes to every order. Each mat carries a small fabric tag stitched by hand with the cooperative's name.",
      quote:
        "When I weave I am thinking about the person who will pray on it. I make du'a for them.",
    },
    stockCount: 6,
    lowStockThreshold: 2,
    isActive: true,
  },
  {
    id: "p_004",
    slug: "the-silk-hijab",
    name: "The Silk Hijab",
    tagline: "Lightweight, breathable, and easy to drape",
    description:
      "A square silk-blend hijab with a fine hand-rolled hem. Available in five colours — neutral cream, deep navy, soft sage, burnt rose, and charcoal.\n\nBlock-printed and finished in Sylhet by the same team that makes our abayas. The hand-rolled hem takes about twenty minutes per scarf.",
    category: "hijab",
    pricePence: 2500,
    sku: "DR-HIJ-001",
    weightGrams: 90,
    primaryImage: `${PLACEHOLDER_IMAGE_BASE}/hijab-1.webp`,
    galleryImages: [
      `${PLACEHOLDER_IMAGE_BASE}/hijab-1.webp`,
      `${PLACEHOLDER_IMAGE_BASE}/hijab-2.webp`,
    ],
    variants: [
      { id: "v_004_cream", colour: "Cream", sku: "DR-HIJ-001-CR", stockCount: 3 },
      { id: "v_004_navy", colour: "Navy", sku: "DR-HIJ-001-NV", stockCount: 3 },
      { id: "v_004_sage", colour: "Sage", sku: "DR-HIJ-001-SG", stockCount: 2 },
    ],
    careInstructions: [
      "Hand wash cold, lay flat to dry",
      "Iron on low through a cotton cloth",
    ],
    materials: "60% silk, 40% viscose, hand-rolled hem",
    maker: {
      name: "Khadija R. & team",
      country: "Bangladesh",
      region: "Sylhet",
      photoUrl: `${PLACEHOLDER_IMAGE_BASE}/maker-khadija.webp`,
      story:
        "Made by the same Sylhet team that produces our abayas. Each hijab is hand-rolled and finished by Khadija or one of three women she has trained over the past year.",
    },
    stockCount: 8,
    lowStockThreshold: 3,
    isActive: true,
  },
  {
    id: "p_005",
    slug: "the-adana-tasbih",
    name: "The Adana Tasbih",
    tagline: "Hand-carved olive wood, 99 beads",
    description:
      "A traditional 99-bead tasbih hand-carved from a single piece of Anatolian olive wood. Each bead is sanded by hand to a soft matte finish; the tassel is finished with a brass cap and a simple silk cord.\n\nMade by Yusuf in his workshop in Adana, who has been carving tasbih since he was twelve.",
    category: "tasbih",
    pricePence: 1800,
    sku: "DR-TSB-001",
    weightGrams: 60,
    primaryImage: `${PLACEHOLDER_IMAGE_BASE}/tasbih-1.webp`,
    galleryImages: [
      `${PLACEHOLDER_IMAGE_BASE}/tasbih-1.webp`,
    ],
    variants: [],
    careInstructions: [
      "Wipe with a soft dry cloth",
      "Avoid water — the wood will warp",
      "A drop of olive oil once a year keeps the colour deep",
    ],
    materials: "Anatolian olive wood, brass cap, silk cord",
    maker: {
      name: "Yusuf H.",
      country: "Turkey",
      region: "Adana",
      photoUrl: `${PLACEHOLDER_IMAGE_BASE}/maker-yusuf.webp`,
      story:
        "Yusuf is 58 and learned wood-carving from his grandfather. He works from a small workshop attached to his home. His son helps with the sanding on weekends. Each tasbih takes about two hours from raw block to finished piece.",
    },
    stockCount: 12,
    lowStockThreshold: 4,
    isActive: true,
  },
  {
    id: "p_006",
    slug: "the-embroidered-quran-cover",
    name: "The Embroidered Qur'an Cover",
    tagline: "A protective cover with traditional Sylheti embroidery",
    description:
      "A padded velvet cover designed to fit a standard medium-sized Mushaf. The embroidery — a subtle floral pattern in gold thread — is done entirely by hand.\n\nMade by Aisha in Sylhet, who specialises in fine embroidery work that's been passed down in her family for three generations.",
    category: "quran-cover",
    pricePence: 3500,
    sku: "DR-QRN-001",
    weightGrams: 180,
    primaryImage: `${PLACEHOLDER_IMAGE_BASE}/quran-cover-1.webp`,
    galleryImages: [`${PLACEHOLDER_IMAGE_BASE}/quran-cover-1.webp`],
    variants: [
      { id: "v_006_navy", colour: "Deep Navy", sku: "DR-QRN-001-NV", stockCount: 3 },
      { id: "v_006_burgundy", colour: "Burgundy", sku: "DR-QRN-001-BG", stockCount: 2 },
    ],
    careInstructions: [
      "Spot-clean only with a slightly damp cloth",
      "Do not machine wash",
      "Store flat, away from direct sunlight",
    ],
    materials: "Cotton velvet outer, padded lining, hand-embroidered gold thread",
    maker: {
      name: "Aisha M.",
      country: "Bangladesh",
      region: "Sylhet",
      photoUrl: `${PLACEHOLDER_IMAGE_BASE}/maker-aisha.webp`,
      story:
        "Aisha is 47 and has been doing embroidery work since she was nine, learning from her mother and grandmother. Her work was previously sold without attribution through a wholesale buyer in Dhaka. Working directly with Deen Relief Bazaar, she now earns three times what she did before, and her daughter — also a skilled embroiderer — has joined her workshop.",
    },
    stockCount: 5,
    lowStockThreshold: 2,
    isActive: true,
  },
  {
    id: "p_007",
    slug: "the-knit-kufi",
    name: "The Knit Kufi",
    tagline: "A simple, well-made prayer cap",
    description:
      "A breathable open-weave kufi knit from soft cotton yarn. The crown is finished with a fine crochet pattern that lets air through during long prayer sessions in summer.\n\nKnit in a small home workshop in Sylhet by a team of four women who knit while their children are in school.",
    category: "kufi",
    pricePence: 1500,
    sku: "DR-KUF-001",
    weightGrams: 50,
    primaryImage: `${PLACEHOLDER_IMAGE_BASE}/kufi-1.webp`,
    galleryImages: [`${PLACEHOLDER_IMAGE_BASE}/kufi-1.webp`],
    variants: [
      { id: "v_007_cream", colour: "Cream", sku: "DR-KUF-001-CR", stockCount: 4 },
      { id: "v_007_charcoal", colour: "Charcoal", sku: "DR-KUF-001-CH", stockCount: 4 },
    ],
    careInstructions: [
      "Hand wash cold, reshape while damp",
      "Lay flat to dry",
    ],
    materials: "100% combed cotton yarn",
    maker: {
      name: "The Sylhet knitting circle",
      country: "Bangladesh",
      region: "Sylhet",
      photoUrl: `${PLACEHOLDER_IMAGE_BASE}/maker-knitting-circle.webp`,
      story:
        "A group of four neighbours who decided to start knitting together in 2023 after their husbands' factory shifts were cut. They now meet three afternoons a week in one of their homes. Each kufi is signed on the inner band by the woman who made it.",
    },
    stockCount: 8,
    lowStockThreshold: 3,
    isActive: true,
  },
  {
    id: "p_008",
    slug: "the-childrens-prayer-set",
    name: "The Children's Prayer Set",
    tagline: "A small kufi and matching mini prayer mat for ages 4-8",
    description:
      "A scaled-down prayer set designed for young children just beginning to pray with their families. Includes a small soft kufi and a mini prayer mat in a matching colour. Comes wrapped in a cotton drawstring bag with the child's name embroidered on (free, on request at checkout).\n\nThoughtfully sized so a child can carry the set themselves to the masjid.",
    category: "kids",
    pricePence: 4000,
    sku: "DR-KID-001",
    weightGrams: 250,
    primaryImage: `${PLACEHOLDER_IMAGE_BASE}/kids-1.webp`,
    galleryImages: [`${PLACEHOLDER_IMAGE_BASE}/kids-1.webp`],
    variants: [
      { id: "v_008_blue", colour: "Soft Blue", sku: "DR-KID-001-BL", stockCount: 3 },
      { id: "v_008_green", colour: "Sage Green", sku: "DR-KID-001-SG", stockCount: 3 },
    ],
    careInstructions: [
      "Hand wash cold for the kufi and bag",
      "Spot-clean the mat",
    ],
    materials: "100% cotton kufi and bag, cotton-acrylic mat",
    maker: {
      name: "The Sylhet women's collective",
      country: "Bangladesh",
      region: "Sylhet",
      photoUrl: `${PLACEHOLDER_IMAGE_BASE}/maker-collective.webp`,
      story:
        "A collaborative product. The kufi is knit by the Sylhet knitting circle, the mat by Fatima's Dhaka co-op, and the drawstring bag is sewn by Khadija's team. A small piece of every Deen Relief Bazaar in one set.",
    },
    stockCount: 6,
    lowStockThreshold: 2,
    isActive: true,
  },
];

export function findProductBySlug(slug: string): Product | undefined {
  return PLACEHOLDER_PRODUCTS.find((p) => p.slug === slug);
}

export function findProductById(id: string): Product | undefined {
  return PLACEHOLDER_PRODUCTS.find((p) => p.id === id);
}

/**
 * Resolve a Product + variant pair to its effective unit price in pence.
 * Falls back to the parent product price when the variant doesn't override.
 */
export function resolveUnitPricePence(
  product: Product,
  variantId?: string
): number {
  if (!variantId) return product.pricePence;
  const variant = product.variants.find((v) => v.id === variantId);
  return variant?.pricePence ?? product.pricePence;
}
