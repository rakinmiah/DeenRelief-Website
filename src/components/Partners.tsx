/**
 * Homepage partner strip — high-quality brand logos sourced directly from
 * each partner's media kit (vector SVG where available, transparent PNG
 * otherwise). Plain <img> rather than next/image to support SVG without
 * relaxing next.config security; logos are tiny static assets, fixed size,
 * below the fold, so optimisation isn't load-relevant.
 *
 * Each logo carries its intrinsic width/height so the browser can reserve
 * layout space and avoid CLS, while CSS clamps to the strip's row height
 * and lets width auto-compute via object-contain.
 *
 * Order is mixed by aspect-ratio rather than alphabetic so the eye gets a
 * rhythm of narrow / wide / square instead of three skinny logos in a row.
 */
const partners = [
  // narrow vertical (stacked brand, native blue)
  { name: "Islamic Relief Worldwide", logo: "/images/partners/islamic-relief.png", width: 820, height: 1426 },
  // wide horizontal wordmark
  { name: "Trussell", logo: "/images/partners/trussell.svg", width: 145, height: 38 },
  // square emblem
  { name: "Bangladesh Red Crescent Society", logo: "/images/partners/bangladesh-red-crescent.svg", width: 400, height: 400 },
  // square brand tile (knockout logo on the foundation's green) — only
  // usable variant; the transparent PNG is white-on-transparent so it
  // would disappear against the strip's white background.
  { name: "READ Foundation", logo: "/images/partners/read-foundation.jpeg", width: 400, height: 400 },
  // square-ish
  { name: "Human Appeal", logo: "/images/partners/human-appeal.png", width: 334, height: 357 },
  // very wide wordmark — anchors the row
  { name: "Ummah Welfare Trust", logo: "/images/partners/ummah-welfare-trust.png", width: 800, height: 104 },
];

export default function Partners() {
  return (
    <section className="py-10 md:py-12 bg-cream">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Label */}
        <p className="text-center text-green text-base sm:text-[17px] font-bold tracking-[0.12em] uppercase mb-10">
          Working Alongside
        </p>

        {/* Logos — 3×2 grid on mobile, single row on sm+ */}
        <div className="grid grid-cols-3 gap-y-8 gap-x-6 sm:flex sm:items-center sm:justify-between sm:gap-10 md:gap-14">
          {partners.map((partner) => (
            <div
              key={partner.name}
              className="flex items-center justify-center sm:flex-1 min-w-0"
              title={partner.name}
            >
              <img
                src={partner.logo}
                alt={partner.name}
                width={partner.width}
                height={partner.height}
                loading="lazy"
                decoding="async"
                className="max-h-[60px] sm:max-h-[68px] md:max-h-[72px] max-w-full w-auto h-auto object-contain opacity-75 hover:opacity-100 transition-opacity duration-200"
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
