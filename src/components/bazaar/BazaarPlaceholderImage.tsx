/**
 * Renders a tasteful coloured-gradient placeholder card for product/maker
 * imagery during the pitch phase. Designed to match the brand palette
 * (cream, charcoal, green) so the mockup looks intentional rather than
 * "image missing".
 *
 * Real photoshoot output replaces this entirely — when the imagery lands
 * in /public/images/bazaar/, just drop the real <Image> in place of this
 * component on each surface.
 */

interface BazaarPlaceholderImageProps {
  label: string;
  /** "product" | "maker" — shifts the gradient and label style. */
  variant?: "product" | "maker";
  className?: string;
  rounded?: boolean;
}

export default function BazaarPlaceholderImage({
  label,
  variant = "product",
  className = "",
  rounded = false,
}: BazaarPlaceholderImageProps) {
  const gradients = {
    product: "from-cream via-amber-light/40 to-cream",
    maker: "from-green-dark/15 via-amber-light/30 to-green-dark/10",
  };

  return (
    <div
      className={`relative w-full h-full bg-gradient-to-br ${gradients[variant]} ${
        rounded ? "rounded-2xl" : ""
      } overflow-hidden flex items-center justify-center ${className}`}
      role="img"
      aria-label={`Placeholder image for ${label}`}
    >
      {/* subtle pattern */}
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 20% 20%, #1A1A2E 1px, transparent 1px), radial-gradient(circle at 80% 80%, #1A1A2E 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      />
      <div className="relative z-10 px-6 text-center">
        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-charcoal/40 mb-2 block">
          {variant === "maker" ? "Maker portrait" : "Product photo"}
        </span>
        <span className="text-charcoal/70 text-sm font-heading italic">
          {label}
        </span>
        <span className="block mt-2 text-[10px] uppercase tracking-[0.15em] text-charcoal/30">
          imagery to come from photoshoot
        </span>
      </div>
    </div>
  );
}
