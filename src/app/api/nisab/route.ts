import { NextResponse } from "next/server";

// Islamic nisab thresholds
const GOLD_NISAB_GRAMS = 87.48;
const SILVER_NISAB_GRAMS = 612.36;
const TROY_OZ_TO_GRAMS = 31.1035;

// Cache response for 6 hours
export const revalidate = 21600;

export async function GET() {
  try {
    // Fetch gold (XAU) and silver (XAG) prices in GBP
    // fawazahmed0/currency-api: free, no key, updated daily, CDN-backed
    const [goldRes, silverRes] = await Promise.all([
      fetch(
        "https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/xau.json",
        { next: { revalidate: 21600 } }
      ),
      fetch(
        "https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/xag.json",
        { next: { revalidate: 21600 } }
      ),
    ]);

    if (!goldRes.ok || !silverRes.ok) {
      throw new Error("Currency API request failed");
    }

    const goldData = await goldRes.json();
    const silverData = await silverRes.json();

    // Prices are per troy ounce in GBP
    const goldPerOz = goldData?.xau?.gbp;
    const silverPerOz = silverData?.xag?.gbp;

    if (!goldPerOz || !silverPerOz) {
      throw new Error("Missing price data from API");
    }

    // Convert to per-gram
    const goldPerGram = goldPerOz / TROY_OZ_TO_GRAMS;
    const silverPerGram = silverPerOz / TROY_OZ_TO_GRAMS;

    const goldNisab = Math.round(goldPerGram * GOLD_NISAB_GRAMS * 100) / 100;
    const silverNisab =
      Math.round(silverPerGram * SILVER_NISAB_GRAMS * 100) / 100;

    return NextResponse.json({
      gold: { pricePerGram: Math.round(goldPerGram * 100) / 100, nisab: goldNisab },
      silver: { pricePerGram: Math.round(silverPerGram * 100) / 100, nisab: silverNisab },
      updatedAt: goldData.date ?? new Date().toISOString(),
    });
  } catch (error) {
    console.error("Nisab fetch error:", error);

    // Fallback with approximate values (April 2026 estimates)
    return NextResponse.json({
      gold: { pricePerGram: 113, nisab: 9885 },
      silver: { pricePerGram: 1.82, nisab: 1114 },
      updatedAt: null,
      fallback: true,
    });
  }
}
