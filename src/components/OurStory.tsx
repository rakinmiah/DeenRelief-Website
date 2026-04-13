import Image from "next/image";
import Button from "./Button";
import ProofTag from "./ProofTag";

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
              className="object-cover object-[center_40%]"
              sizes="(max-width: 1024px) 100vw, 50vw"
            />
            <ProofTag location="Bangladesh" position="bottom-right" />
          </div>

          {/* Content */}
          <div>
            <span className="inline-block text-[11px] font-bold tracking-[0.1em] uppercase text-green mb-3">
              About Deen Relief
            </span>
            <h2 className="text-3xl sm:text-4xl font-heading font-bold text-charcoal leading-tight mb-4">
              A UK Islamic Charity Since 2013
            </h2>
            <p className="text-grey text-base sm:text-[1.0625rem] leading-[1.7] mb-6">
              Shabek Ali began distributing food to Brighton&apos;s homeless
              community in 2013. What started as one person&apos;s compassion
              grew into Deen Relief — a registered Islamic charity now
              running children&apos;s cancer care centres in Turkey, delivering
              emergency relief in Palestine, and sponsoring orphans in
              Bangladesh.
            </p>
            <Button variant="secondary" href="/about">
              Read Our Full Story
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
