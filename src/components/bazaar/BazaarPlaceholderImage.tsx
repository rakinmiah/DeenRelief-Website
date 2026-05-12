/**
 * Image renderer for product / maker imagery across the bazaar.
 *
 * Currently runs in placeholder-only mode: every render returns
 * the brand-tinted gradient placeholder regardless of any `src`
 * passed in. This was deliberately re-enabled because the catalog
 * is mid-migration — products have `primary_image` and
 * `gallery_images` URLs set, but the linked Supabase Storage
 * objects aren't reachable, so the real <Image> path was rendering
 * broken-image icons everywhere on the storefront. Showing the
 * pre-upload placeholder is materially less embarrassing than a
 * broken-image glyph while we sort out the storage URLs.
 *
 * The `src`, `sizes`, and `priority` props are still accepted so
 * call sites don't need editing — they're just ignored for now.
 * To re-enable real images, restore the `if (src) { return
 * <Image…/> }` branch and re-add the `import Image from
 * "next/image"` at the top.
 */

interface BazaarPlaceholderImageProps {
  label: string;
  /** "product" | "maker" — placeholder gradient + caption. */
  variant?: "product" | "maker";
  className?: string;
  rounded?: boolean;
  /** Real image URL (Supabase Storage WebP). Currently ignored
   *  while the placeholder-only mode is active — kept on the
   *  interface so call sites don't need editing. */
  src?: string | null;
  /** Hint to Next.js's image optimiser. Currently ignored. */
  sizes?: string;
  /** Priority hint for above-the-fold hero images. Currently
   *  ignored. */
  priority?: boolean;
}

const DEFAULT_SIZES =
  "(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw";

export default function BazaarPlaceholderImage({
  label,
  variant = "product",
  className = "",
  rounded = false,
  // src, sizes, priority intentionally destructured-then-discarded
  // (eslint-disable below) so calling components don't break when
  // they pass these props. See the file header for why we're in
  // placeholder-only mode.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  src: _src,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  sizes: _sizes = DEFAULT_SIZES,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  priority: _priority = false,
}: BazaarPlaceholderImageProps) {
  // Placeholder-only mode: render the gradient + label regardless
  // of whether a src was supplied. See file header for context.
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
          image will appear after upload
        </span>
      </div>
    </div>
  );
}
