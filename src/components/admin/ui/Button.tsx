import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * The one admin button. Distinct from the public-site Button
 * (src/components/Button.tsx, amber-primary, donor-facing) — admin
 * chrome leads with charcoal so primary actions read as "tool", not
 * "donate".
 *
 * Renders as a real <button> by default, or as a Next <Link> when
 * `href` is passed — same look either way, so a "New post" link and a
 * "Save" submit button stay visually consistent.
 *
 * Server-component safe: no hooks. Interactivity (onClick) is passed
 * straight through to the underlying element, so a client parent can
 * still wire handlers.
 */

type Variant = "primary" | "secondary" | "outline" | "ghost" | "danger";
type Size = "sm" | "md";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-charcoal text-white hover:bg-charcoal/90 shadow-sm",
  secondary: "bg-green text-white hover:bg-green-dark shadow-sm",
  outline:
    "bg-white text-charcoal border border-charcoal/15 hover:border-charcoal/30 hover:bg-cream",
  ghost: "text-charcoal/70 hover:text-charcoal hover:bg-charcoal/5",
  danger: "bg-red-600 text-white hover:bg-red-700 shadow-sm",
};

const SIZES: Record<Size, string> = {
  sm: "px-3 py-1.5 text-sm gap-1.5",
  md: "px-5 py-2.5 text-sm gap-2",
};

const BASE =
  "inline-flex items-center justify-center rounded-full font-semibold transition-colors disabled:opacity-60 disabled:pointer-events-none focus:outline-none focus-visible:ring-2 focus-visible:ring-charcoal/30 focus-visible:ring-offset-1";

interface CommonProps {
  variant?: Variant;
  size?: Size;
  /** Optional leading icon (an SVG node). */
  icon?: ReactNode;
  /** Shows a spinner + disables the control. Buttons only. */
  loading?: boolean;
  /** Stretch to the container width. */
  block?: boolean;
  className?: string;
  children: ReactNode;
}

type ButtonAsButton = CommonProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, keyof CommonProps> & {
    href?: undefined;
  };

type ButtonAsLink = CommonProps & {
  href: string;
  /** Pass for external links. */
  target?: string;
  rel?: string;
  /**
   * Forwarded to Next's <Link>. Set `false` for download / API-route
   * hrefs (e.g. CSV export) so hover-prefetch never fires the endpoint.
   */
  prefetch?: boolean;
};

export type ButtonProps = ButtonAsButton | ButtonAsLink;

function Spinner() {
  return (
    <svg
      className="w-4 h-4 animate-spin"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}

function classesFor(
  variant: Variant = "primary",
  size: Size = "md",
  block?: boolean,
  className?: string
) {
  return cn(BASE, VARIANTS[variant], SIZES[size], block && "w-full", className);
}

export default function Button(props: ButtonProps) {
  // Link branch — destructure exactly the link props so nothing leaks
  // onto the <button> path and there are no discarded vars.
  if (props.href !== undefined) {
    const { href, target, rel, prefetch, variant, size, icon, block, className, children } =
      props;
    return (
      <Link
        href={href}
        target={target}
        rel={rel}
        prefetch={prefetch}
        className={classesFor(variant, size, block, className)}
      >
        {icon}
        {children}
      </Link>
    );
  }

  // Button branch — `props` is narrowed to ButtonAsButton, so the rest
  // after the custom props is exactly the native <button> attributes.
  const { variant, size, icon, loading, block, className, children, ...buttonProps } =
    props;
  return (
    <button
      {...buttonProps}
      disabled={loading || buttonProps.disabled}
      className={classesFor(variant, size, block, className)}
    >
      {loading ? <Spinner /> : icon}
      {children}
    </button>
  );
}
