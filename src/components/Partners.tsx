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
    <section className="py-10 md:py-12 bg-white">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Label */}
        <p className="text-center text-green text-sm font-bold tracking-[0.1em] uppercase mb-10">
          Our Partners
        </p>

        {/* Logos — 3×2 grid on mobile, single row on sm+ */}
        <div className="grid grid-cols-3 gap-y-8 gap-x-6 sm:flex sm:items-center sm:justify-between sm:gap-12 md:gap-16">
          {partners.map((partner) => (
            <div
              key={partner.name}
              className="flex items-center justify-center sm:flex-1 min-w-0"
              title={partner.name}
            >
              <Image
                src={partner.logo}
                alt={partner.name}
                width={145}
                height={75}
                className="max-h-[72px] sm:max-h-[75px] w-auto object-contain opacity-75"
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
