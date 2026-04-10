import Image from "next/image";

const partners = [
  { name: "Islamic Relief", logo: "/images/partners/islamic-relief.webp" },
  { name: "Bangladesh Red Crescent Society", logo: "/images/partners/bdrcs.webp" },
  { name: "Human Appeal", logo: "/images/partners/human-appeal.webp" },
  { name: "Food Bank", logo: "/images/partners/food-bank.webp" },
  { name: "Umma Welfare Trust", logo: "/images/partners/umma-welfare-trust.webp" },
  { name: "Read Foundation", logo: "/images/partners/read-foundation.webp" },
];

export default function Partners() {
  return (
    <section className="py-12 md:py-16 bg-white border-t border-grey-light/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <p className="text-center text-grey text-sm font-medium mb-8">
          Proud to work alongside leading humanitarian organisations
        </p>

        <div className="grid grid-cols-3 md:grid-cols-6 gap-6 items-center">
          {partners.map((partner) => (
            <div
              key={partner.name}
              className="flex items-center justify-center h-16 rounded-xl px-4 group transition-all duration-200 hover:opacity-100 opacity-70 hover:scale-105"
              title={partner.name}
            >
              <Image
                src={partner.logo}
                alt={partner.name}
                width={120}
                height={48}
                className="h-10 w-auto object-contain"
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
