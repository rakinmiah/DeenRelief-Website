import Image from "next/image";
import Button from "./Button";
import ProofTag from "./ProofTag";

const services = [
  {
    title: "Family Housing",
    description: "Free housing near hospitals so families stay together.",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
      </svg>
    ),
  },
  {
    title: "Medical Financial Aid",
    description: "Covering treatment costs for refugee children with no access to healthcare.",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" />
      </svg>
    ),
  },
  {
    title: "Nutrition Programme",
    description: "Balanced meals essential for children undergoing cancer treatment.",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8.25v-1.5m0 1.5c-1.355 0-2.697.056-4.024.166C6.845 8.51 6 9.473 6 10.608v2.513m6-4.871c1.355 0 2.697.056 4.024.166C17.155 8.51 18 9.473 18 10.608v2.513M15 8.25v-1.5m-6 1.5v-1.5m12 9.75-1.5.75a3.354 3.354 0 0 1-3 0 3.354 3.354 0 0 0-3 0 3.354 3.354 0 0 1-3 0 3.354 3.354 0 0 0-3 0 3.354 3.354 0 0 1-3 0L3 16.5m15-3.379a48.474 48.474 0 0 0-6-.371c-2.032 0-4.034.126-6 .371m12 0c.39.049.777.102 1.163.16 1.07.16 1.837 1.094 1.837 2.175v5.169c0 .621-.504 1.125-1.125 1.125H4.125A1.125 1.125 0 0 1 3 20.625v-5.17c0-1.08.768-2.014 1.837-2.174A47.78 47.78 0 0 1 6 13.12M12.265 3.11a.375.375 0 1 1-.53 0L12 2.845l.265.265Z" />
      </svg>
    ),
  },
  {
    title: "Spiritual Support",
    description: "Emotional and spiritual care for children and families throughout recovery.",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z" />
      </svg>
    ),
  },
];

export default function CancerCareCentres() {
  return (
    <section id="cancer-care" className="py-16 md:py-24 bg-cream">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header — full width */}
        <div className="max-w-3xl mb-8 md:mb-10">
          <span className="inline-block text-[11px] font-bold tracking-[0.1em] uppercase text-green mb-3">
            Children&apos;s Cancer Care Charity
          </span>
          <h2 className="text-3xl sm:text-4xl font-heading font-bold text-charcoal mb-4 leading-tight">
            Cancer Care Centres for Refugee Children
          </h2>
          <p className="text-grey text-base sm:text-[1.0625rem] leading-[1.7] max-w-2xl">
            In Adana, Turkey, we operate Gulucuk Evi — a dedicated care
            centre providing housing, medical support, and rehabilitation
            for Syrian and Gazan refugee children undergoing cancer
            treatment. Your donation funds their care directly.
          </p>
        </div>

        {/* Two-column: images left, services panel right */}
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-10">
          {/* Images — two portraits side by side, landscape below */}
          <div className="grid grid-cols-2 gap-3">
            <div className="relative rounded-2xl overflow-hidden aspect-[3/4]">
              <Image
                src="/images/cancer-children.webp"
                alt="Syrian children with cancer holding Deen Relief signs and smiling"
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 50vw, 25vw"
              />
              <ProofTag location="Adana, Turkey" />
            </div>
            <div className="relative rounded-2xl overflow-hidden aspect-[3/4]">
              <Image
                src="/images/cancer-care-visit.webp"
                alt="Deen Relief team member visiting a child with cancer at the care centre"
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 50vw, 25vw"
              />
              <ProofTag location="Adana, Turkey" position="bottom-right" />
            </div>
            <div className="relative rounded-2xl overflow-hidden aspect-[2.2/1] col-span-2">
              <Image
                src="/images/centre-child.webp"
                alt="A child drawing and colouring at the Deen Relief care centre"
                fill
                className="object-cover object-[center_30%]"
                sizes="(max-width: 1024px) 100vw, 50vw"
              />
            </div>
          </div>

          {/* Right panel — services stacked vertically in a contained block */}
          <div className="bg-white rounded-2xl p-6 sm:p-8 lg:p-9 flex flex-col justify-between">
            {/* Header block */}
            <div className="border-b border-charcoal/5 pb-4">
              <p className="text-xs font-bold tracking-[0.1em] uppercase text-green mb-1">
                What we provide
              </p>
              <p className="text-charcoal/45 text-[0.8125rem]">
                Comprehensive support for children and their families.
              </p>
            </div>

            {/* Service rows — 2×2 grid on mobile (halves the right panel's
                vertical height from ~570px to ~320px). Vertical flex-col on
                lg+ where the panel matches the image-grid height via the
                grandparent's grid-cols-2 layout. */}
            <div className="grid grid-cols-2 gap-x-4 gap-y-5 lg:flex lg:flex-1 lg:flex-col lg:justify-center lg:gap-10">
              {services.map((service) => (
                <div
                  key={service.title}
                  className="flex gap-3 items-start py-1 lg:gap-4 lg:py-3"
                >
                  <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-green-light flex items-center justify-center text-green">
                    {service.icon}
                  </div>
                  <div>
                    <h3 className="font-heading font-semibold text-[0.9375rem] text-charcoal mb-1">
                      {service.title}
                    </h3>
                    <p className="text-grey text-[0.8125rem] leading-[1.6]">
                      {service.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* CTA */}
            <div className="pt-4 border-t border-charcoal/5">
              <Button variant="secondary" href="/cancer-care#donate-form" className="w-full justify-center">
                Support Our Cancer Care Centres
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
