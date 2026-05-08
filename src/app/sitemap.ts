import type { MetadataRoute } from "next";
import { getAllPosts } from "@/lib/blog";
import { cities } from "@/lib/cities";

const BASE_URL = "https://deenrelief.org";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date().toISOString();

  // Core pages — highest priority
  const core: MetadataRoute.Sitemap = [
    { url: BASE_URL, lastModified: now, changeFrequency: "weekly", priority: 1.0 },
    { url: `${BASE_URL}/our-work`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${BASE_URL}/about`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE_URL}/contact`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
  ];

  // Campaign & giving pages — high priority (drive donations)
  const campaigns: MetadataRoute.Sitemap = [
    "palestine",
    "cancer-care",
    "orphan-sponsorship",
    "build-a-school",
    "clean-water",
    "uk-homeless",
    "zakat",
    "sadaqah",
    "qurbani",
  ].map((slug) => ({
    url: `${BASE_URL}/${slug}`,
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: 0.9,
  }));

  // City prayer times
  const prayerCities: MetadataRoute.Sitemap = cities.map((city) => ({
    url: `${BASE_URL}/prayer-times/${city.slug}`,
    lastModified: now,
    changeFrequency: "daily" as const,
    priority: 0.7,
  }));

  // Blog
  const blogListing: MetadataRoute.Sitemap = [
    { url: `${BASE_URL}/blog`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
  ];

  const blogPosts: MetadataRoute.Sitemap = getAllPosts().map((post) => ({
    url: `${BASE_URL}/blog/${post.slug}`,
    lastModified: post.date,
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

  // Utility pages
  const utility: MetadataRoute.Sitemap = [
    { url: `${BASE_URL}/prayer-times`, lastModified: now, changeFrequency: "daily", priority: 0.7 },
    { url: `${BASE_URL}/volunteer`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
  ];

  // Legal pages — low priority
  const legal: MetadataRoute.Sitemap = [
    "privacy",
    "terms",
    "accessibility",
    "safeguarding",
  ].map((slug) => ({
    url: `${BASE_URL}/${slug}`,
    lastModified: now,
    changeFrequency: "yearly" as const,
    priority: 0.3,
  }));

  return [...core, ...campaigns, ...prayerCities, ...blogListing, ...blogPosts, ...utility, ...legal];
}
