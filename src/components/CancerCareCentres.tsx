import Image from "next/image";
import Button from "./Button";

const services = [
  {
    title: "Family Housing",
    description: "Free accommodation near hospitals so families can stay together during treatment.",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
      </svg>
    ),
  },
  {
    title: "Medical Financial Aid",
    description: "Covering treatment costs for refugee children who have no access to healthcare.",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" />
      </svg>
    ),
  },
  {
    title: "Nutrition Programme",
    description: "Providing balanced meals essential for children undergoing cancer treatment.",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8.25v-1.5m0 1.5c-1.355 0-2.697.056-4.024.166C6.845 8.51 6 9.473 6 10.608v2.513m6-4.871c1.355 0 2.697.056 4.024.166C17.155 8.51 18 9.473 18 10.608v2.513M15 8.25v-1.5m-6 1.5v-1.5m12 9.75-1.5.75a3.354 3.354 0 0 1-3 0 3.354 3.354 0 0 0-3 0 3.354 3.354 0 0 1-3 0 3.354 3.354 0 0 0-3 0 3.354 3.354 0 0 1-3 0L3 16.5m15-3.379a48.474 48.474 0 0 0-6-.371c-2.032 0-4.034.126-6 .371m12 0c.39.049.777.102 1.163.16 1.07.16 1.837 1.094 1.837 2.175v5.169c0 .621-.504 1.125-1.125 1.125H4.125A1.125 1.125 0 0 1 3 20.625v-5.17c0-1.08.768-2.014 1.837-2.174A47.78 47.78 0 0 1 6 13.12M12.265 3.11a.375.375 0 1 1-.53 0L12 2.845l.265.265Z" />
      </svg>
    ),
  },
  {
    title: "Spiritual Support",
    description: "Emotional and spiritual care for children and their families throughout recovery.",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z" />
      </svg>
    ),
  },
];

export default function CancerCareCentres() {
  return (
    <section className="py-16 md:py-24 bg-cream">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="max-w-3xl mb-12">
          <span className="inline-block text-xs font-semibold tracking-widest uppercase text-green mb-3">
            What Makes Us Different
          </span>
          <h2 className="text-3xl sm:text-4xl font-heading font-bold text-charcoal mb-4 leading-tight">
            A Home of Hope for Children Fighting Cancer
          </h2>
          <p className="text-grey text-lg leading-relaxed">
            In Adana, Turkey, we operate the Gulucuk Evi — the House of
            Smiles — a care centre for Syrian and Gazan refugee children
            undergoing cancer treatment. This is not just funding from afar.
            We are in the room with these children.
          </p>
        </div>

        {/* Image Grid + Services */}
        <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-start">
          {/* Images */}
          <div className="grid grid-cols-2 gap-4">
            <div className="relative rounded-2xl overflow-hidden aspect-[3/4]">
              <Image
                src="/images/cancer-children.webp"
                alt="Syrian children with cancer holding Deen Relief signs and smiling"
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 50vw, 25vw"
              />
            </div>
            <div className="relative rounded-2xl overflow-hidden aspect-[3/4] mt-8">
              <Image
                src="/images/cancer-care-visit.webp"
                alt="Deen Relief team member visiting a child with cancer at the care centre"
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 50vw, 25vw"
              />
            </div>
            <div className="relative rounded-2xl overflow-hidden aspect-[4/3] col-span-2">
              <Image
                src="/images/centre-child.webp"
                alt="A child drawing and colouring at the Deen Relief care centre"
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 50vw"
              />
            </div>
          </div>

          {/* Services */}
          <div>
            <div className="space-y-6 mb-10">
              {services.map((service) => (
                <div
                  key={service.title}
                  className="flex gap-4 items-start bg-white rounded-xl p-5 shadow-sm"
                >
                  <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-green-light flex items-center justify-center text-green">
                    {service.icon}
                  </div>
                  <div>
                    <h3 className="font-heading font-semibold text-charcoal mb-1">
                      {service.title}
                    </h3>
                    <p className="text-grey text-sm leading-relaxed">
                      {service.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <Button variant="secondary" size="lg" href="#cancer-care">
              Support Our Cancer Care Centres
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
