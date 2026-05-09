import type { Metadata, Viewport } from "next";
import { Source_Serif_4, DM_Sans } from "next/font/google";
import "./globals.css";
import AttributionCapture from "@/components/AttributionCapture";
import ConsentBanner from "@/components/ConsentBanner";
import ConsentBootstrap from "@/components/ConsentBootstrap";
import ContentsquareBootstrap from "@/components/ContentsquareBootstrap";
import EngagedSessionTracker from "@/components/EngagedSessionTracker";
import JsonLd from "@/components/JsonLd";
import { SOCIAL_LINKS } from "@/lib/social";

const SITE_URL = "https://deenrelief.org";
const ORG_ID = `${SITE_URL}/#organization`;
const WEBSITE_ID = `${SITE_URL}/#website`;

const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "NGO",
  "@id": ORG_ID,
  name: "Deen Relief",
  alternateName: "Deen Relief UK",
  legalName: "Deen Relief",
  url: SITE_URL,
  logo: `${SITE_URL}/images/logo.webp`,
  image: `${SITE_URL}/images/logo.webp`,
  slogan: "Helping poor, vulnerable and disabled children globally",
  description:
    "UK-registered Islamic charity providing cancer care for refugee children, emergency relief in Gaza, orphan sponsorship, Zakat and Sadaqah distribution, clean water projects, and community support worldwide.",
  foundingDate: "2013",
  foundingLocation: {
    "@type": "Place",
    address: {
      "@type": "PostalAddress",
      addressCountry: "GB",
    },
  },
  founder: {
    "@type": "Person",
    name: "Shabek Ali",
  },
  address: [
    {
      "@type": "PostalAddress",
      streetAddress: "71-75 Shelton Street",
      addressLocality: "London",
      postalCode: "WC2H 9JQ",
      addressCountry: "GB",
    },
    {
      "@type": "PostalAddress",
      streetAddress: "7 Maldon Road",
      addressLocality: "Brighton",
      postalCode: "BN1 5BD",
      addressCountry: "GB",
    },
  ],
  contactPoint: [
    {
      "@type": "ContactPoint",
      contactType: "customer service",
      telephone: "+44-300-365-8899",
      email: "info@deenrelief.org",
      areaServed: "GB",
      availableLanguage: ["English"],
    },
    {
      "@type": "ContactPoint",
      contactType: "donations",
      email: "donate@deenrelief.org",
      areaServed: "GB",
      availableLanguage: ["English"],
    },
  ],
  telephone: "+44-300-365-8899",
  email: "info@deenrelief.org",
  sameAs: SOCIAL_LINKS.map((s) => s.href),
  // LimitedByGuaranteeCharity is the correct type for UK charities that also have a
  // Companies House number — CIOs don't register with Companies House. Deen Relief's
  // Companies House registration (08593822) confirms this structure.
  nonprofitStatus: "https://schema.org/LimitedByGuaranteeCharity",
  identifier: [
    {
      "@type": "PropertyValue",
      name: "Charity Commission for England and Wales",
      propertyID: "charity-number",
      value: "1158608",
    },
    {
      "@type": "PropertyValue",
      name: "Companies House",
      propertyID: "company-number",
      value: "08593822",
    },
  ],
  areaServed: [
    { "@type": "Country", name: "Palestine" },
    { "@type": "Country", name: "Bangladesh" },
    { "@type": "Country", name: "Turkey" },
    { "@type": "Country", name: "United Kingdom" },
  ],
  knowsAbout: [
    "Emergency humanitarian aid",
    "Childhood cancer care",
    "Orphan sponsorship",
    "Zakat distribution",
    "Sadaqah and Sadaqah Jariyah",
    "Clean water projects",
    "Education funding",
    "Homelessness outreach",
    "Refugee support",
  ],
  potentialAction: {
    "@type": "DonateAction",
    name: "Donate to Deen Relief",
    target: {
      "@type": "EntryPoint",
      urlTemplate: `${SITE_URL}/donate`,
      actionPlatform: [
        "http://schema.org/DesktopWebPlatform",
        "http://schema.org/MobileWebPlatform",
      ],
    },
    recipient: { "@id": ORG_ID },
  },
};

const websiteSchema = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": WEBSITE_ID,
  name: "Deen Relief",
  url: SITE_URL,
  inLanguage: "en-GB",
  publisher: { "@id": ORG_ID },
  potentialAction: {
    "@type": "SearchAction",
    target: {
      "@type": "EntryPoint",
      urlTemplate: `${SITE_URL}/blog?q={search_term_string}`,
    },
    "query-input": "required name=search_term_string",
  },
};

const sourceSerif = Source_Serif_4({
  variable: "--font-heading",
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  display: "swap",
});

const dmSans = DM_Sans({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const viewport: Viewport = {
  themeColor: "#2D6A2E",
};

export const metadata: Metadata = {
  title: "Deen Relief | UK Islamic Charity — Cancer Care, Gaza Relief, Zakat & Sadaqah",
  description:
    "UK Islamic charity trusted by 3,200+ donors since 2013. Cancer care for refugee children, emergency Gaza relief, orphan sponsorship. Donate Zakat & Sadaqah. Charity No. 1158608.",
  metadataBase: new URL("https://deenrelief.org"),
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "en_GB",
    siteName: "Deen Relief",
    title: "Deen Relief | UK Islamic Charity — Cancer Care, Gaza Relief, Zakat & Sadaqah",
    description:
      "UK Islamic charity trusted by 3,200+ donors since 2013. Cancer care for refugee children, emergency Gaza relief, orphan sponsorship. Donate Zakat & Sadaqah. Charity No. 1158608.",
    images: [
      {
        url: "/images/hero-gulucuk-evi.webp",
        width: 966,
        height: 722,
        alt: "Deen Relief — UK Islamic Charity Helping Children Globally",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    site: "@deenrelief",
    title: "Deen Relief | UK Islamic Charity — Cancer Care, Gaza Relief, Zakat & Sadaqah",
    description:
      "UK Islamic charity trusted by 3,200+ donors since 2013. Cancer care for refugee children, emergency Gaza relief, orphan sponsorship. Donate Zakat & Sadaqah. Charity No. 1158608.",
    images: ["/images/hero-gulucuk-evi.webp"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${sourceSerif.variable} ${dmSans.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-body text-charcoal bg-white">
        <ConsentBootstrap />
        <ContentsquareBootstrap />
        <JsonLd data={organizationSchema} />
        <JsonLd data={websiteSchema} />
        <AttributionCapture />
        <EngagedSessionTracker />
        {children}
        <ConsentBanner />
      </body>
    </html>
  );
}
