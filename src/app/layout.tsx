import type { Metadata, Viewport } from "next";
import { Source_Serif_4, DM_Sans } from "next/font/google";
import "./globals.css";
import JsonLd from "@/components/JsonLd";

const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "NonprofitOrganization",
  name: "Deen Relief",
  alternateName: "Deen Relief UK",
  url: "https://deenrelief.org",
  logo: "https://deenrelief.org/images/logo.webp",
  description:
    "UK-registered Islamic charity providing cancer care for refugee children, emergency relief, orphan sponsorship, and community support worldwide.",
  foundingDate: "2013",
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
  telephone: "+443003658899",
  email: "info@deenrelief.org",
  sameAs: [
    "https://www.facebook.com/DeenRelief/",
    "https://www.instagram.com/deenrelief",
    "https://twitter.com/deenrelief/",
    "https://www.youtube.com/@deenrelief9734",
  ],
  nonprofitStatus: "https://schema.org/CharitableIncorporatedOrganization",
  identifier: {
    "@type": "PropertyValue",
    name: "Charity Commission Registration",
    value: "1158608",
  },
  potentialAction: {
    "@type": "DonateAction",
    target: "https://deenrelief.org/#donate",
    name: "Donate to Deen Relief",
  },
};

const websiteSchema = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "Deen Relief",
  url: "https://deenrelief.org",
  potentialAction: {
    "@type": "SearchAction",
    target: "https://deenrelief.org/blog?q={search_term_string}",
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
  title: "Deen Relief | Islamic Charity Helping Children Globally",
  description:
    "UK Islamic charity (No. 1158608) providing cancer care, emergency relief in Gaza, orphan sponsorship, and community support. Donate Zakat and Sadaqah.",
  metadataBase: new URL("https://deenrelief.org"),
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "en_GB",
    siteName: "Deen Relief",
    title: "Deen Relief | Islamic Charity Helping Children Globally",
    description:
      "UK Islamic charity (No. 1158608) providing cancer care, emergency relief in Gaza, orphan sponsorship, and community support. Donate Zakat and Sadaqah.",
    images: [
      {
        url: "/images/hero-gulucuk-evi.webp",
        width: 966,
        height: 722,
        alt: "Deen Relief — Helping Children Globally",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    site: "@deenrelief",
    title: "Deen Relief | Islamic Charity Helping Children Globally",
    description:
      "UK Islamic charity (No. 1158608) providing cancer care, emergency relief in Gaza, orphan sponsorship, and community support. Donate Zakat and Sadaqah.",
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
        <JsonLd data={organizationSchema} />
        <JsonLd data={websiteSchema} />
        {children}
      </body>
    </html>
  );
}
