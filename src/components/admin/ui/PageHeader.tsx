import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * The standard heading block for an admin page. Gives every section
 * the same rhythm: optional back link, title, optional description,
 * and a right-aligned actions slot that wraps below the title on
 * mobile.
 *
 *   <PageHeader
 *     title="Donations"
 *     description="One-off and first recurring payments."
 *     actions={<Button href="/admin/donations/export">Export</Button>}
 *   />
 *
 * Server-component safe.
 */
export default function PageHeader({
  title,
  description,
  actions,
  backHref,
  backLabel = "Back",
  eyebrow,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  /** Right-aligned action controls (buttons, links). */
  actions?: ReactNode;
  /** When set, renders a small "← Back" link above the title. */
  backHref?: string;
  backLabel?: string;
  /** Tiny uppercase label above the title (e.g. a section name). */
  eyebrow?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-6", className)}>
      {backHref && (
        <Link
          href={backHref}
          className="inline-flex items-center gap-1 text-sm font-medium text-charcoal/60 hover:text-charcoal transition-colors mb-2"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
          </svg>
          {backLabel}
        </Link>
      )}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          {eyebrow && (
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-amber-dark mb-1">
              {eyebrow}
            </p>
          )}
          <h1 className="font-heading font-bold text-2xl sm:text-[1.7rem] text-charcoal leading-tight">
            {title}
          </h1>
          {description && (
            <p className="mt-1.5 text-sm text-charcoal/60 leading-relaxed max-w-2xl">
              {description}
            </p>
          )}
        </div>
        {actions && (
          <div className="flex flex-wrap items-center gap-2 shrink-0">{actions}</div>
        )}
      </div>
    </div>
  );
}
