import Image from "next/image";
import Button from "./Button";

export default function Hero() {
  return (
    <section className="relative min-h-[75vh] md:min-h-[85vh] flex items-end pb-16 md:pb-24">
      {/* Background Image */}
      <div className="absolute inset-0 z-0">
        <Image
          src="/images/hero-gulucuk-evi.webp"
          alt="Children standing in front of the Deen Relief Gulucuk Evi care centre in Adana, Turkey"
          fill
          className="object-cover"
          priority
          sizes="100vw"
        />
        {/* Gradient overlay for text readability */}
        <div className="absolute inset-0 bg-gradient-to-r from-charcoal/90 via-charcoal/75 to-charcoal/50" />
      </div>

      {/* Content — pushed down with pt to clear the transparent header */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full pt-32">
        <div className="max-w-2xl">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl text-white font-heading font-bold leading-tight mb-6 drop-shadow-lg">
            Every child deserves a chance to heal
          </h1>
          <p className="text-lg sm:text-xl text-white/85 mb-8 leading-relaxed max-w-xl">
            We run care centres for refugee children with cancer, deliver
            emergency aid in Gaza, and support vulnerable communities from
            Bangladesh to Brighton.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <Button variant="primary" size="lg" href="#donate">
              Donate Now
            </Button>
            <Button variant="outline" size="lg" href="#impact">
              See Our Impact
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
