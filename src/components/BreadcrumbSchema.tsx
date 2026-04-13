import JsonLd from "./JsonLd";

interface BreadcrumbItem {
  name: string;
  href: string;
}

export default function BreadcrumbSchema({ items }: { items: BreadcrumbItem[] }) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://deenrelief.org" },
      ...items.map((item, i) => ({
        "@type": "ListItem",
        position: i + 2,
        name: item.name,
        item: `https://deenrelief.org${item.href}`,
      })),
    ],
  };

  return <JsonLd data={schema} />;
}
