import Image from "next/image";
import Button from "./Button";

export default function OurStory() {
  return (
    <section id="about" className="py-16 md:py-24 bg-cream">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
          {/* Image */}
          <div className="relative rounded-2xl overflow-hidden aspect-[4/3]">
            <Image
              src="/images/hero-bangladesh-community.webp"
              alt="Deen Relief team members with a large group of smiling children in Bangladesh"
              fill
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 50vw"
            />
          </div>

          {/* Content */}
          <div>
            <span className="inline-block text-xs font-semibold tracking-widest uppercase text-green mb-3">
              Our Story
            </span>
            <h2 className="text-3xl sm:text-4xl font-heading font-bold text-charcoal mb-6 leading-tight">
              From Brighton&apos;s Streets to a Global Mission
            </h2>
            <div className="space-y-4 text-grey text-lg leading-relaxed mb-8">
              <p>
                In 2013, Shabek Ali began distributing food to homeless
                individuals on the streets of Brighton. What started as one
                person&apos;s compassion grew into Deen Relief — a registered
                charity now operating across five countries.
              </p>
              <p>
                Today we run cancer care centres in Turkey, deliver emergency
                aid in Palestine, sponsor orphans in Bangladesh, build homes
                and schools, and continue to support our local community in
                Brighton. The mission has grown, but the principle remains the
                same: show up where people need you most.
              </p>
            </div>
            <Button variant="secondary" href="#about-full">
              Read Our Full Story
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
