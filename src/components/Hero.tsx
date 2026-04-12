import Image from "next/image";
import Button from "./Button";
import ProofTag from "./ProofTag";

export default function Hero() {
  return (
    <section className="relative min-h-[68vh] md:min-h-[78vh] flex items-end mt-[60px] md:mt-[64px]">
      {/* Background Image */}
      <div className="absolute inset-0 z-0">
        <Image
          src="/images/hero-gulucuk-evi.webp"
          alt="Children standing in front of the Deen Relief Gulucuk Evi care centre in Adana, Turkey"
          fill
          className="object-cover object-[center_58%]"
          priority
          sizes="100vw"
        />
        {/* Primary gradient: anchors the left for text, eases off to reveal signage */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to right, rgba(26,26,46,0.93) 0%, rgba(26,26,46,0.88) 35%, rgba(26,26,46,0.62) 52%, rgba(26,26,46,0.20) 75%, rgba(26,26,46,0.06) 100%)",
          }}
        />
        {/* Bottom vignette: grounds the base */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to top, rgba(26,26,46,0.45) 0%, transparent 45%)",
          }}
        />
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full py-14 md:py-18 lg:py-22">
        <div className="max-w-[20rem] sm:max-w-[24rem] md:max-w-[26rem]">
          <h1 className="text-[1.75rem] sm:text-[2.25rem] lg:text-[2.85rem] leading-[1.18] sm:leading-[1.14] lg:leading-[1.12] text-white font-heading font-bold mb-5 tracking-[-0.02em]">
            Every child deserves
            <br className="hidden sm:block" /> a chance to heal
          </h1>
          <p className="text-[0.875rem] sm:text-[0.9375rem] text-white/65 mb-8 leading-[1.7] max-w-[22rem]">
            We run care centres for refugee children with cancer, deliver
            emergency aid in Gaza, and support vulnerable communities from
            Bangladesh to Brighton.
          </p>
          <div className="flex flex-row items-center gap-4">
            <Button variant="primary" href="#donate">
              Donate Now
            </Button>
            <Button variant="outline" href="#impact">
              See Our Impact
            </Button>
          </div>
        </div>

        {/* Proof: location tag */}
        <ProofTag location="Adana, Turkey" position="bottom-right" />
      </div>
    </section>
  );
}
