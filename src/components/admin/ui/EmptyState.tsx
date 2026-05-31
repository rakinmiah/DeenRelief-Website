import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * The empty/zero state for a list or panel — a quiet, centred block
 * with an optional icon, a title, a one-line explanation and an
 * optional call to action.
 *
 *   <EmptyState
 *     title="No donations yet"
 *     description="Donations will appear here as they come in."
 *     action={<Button href="/admin/...">Do the thing</Button>}
 *   />
 *
 * Server-component safe.
 */
export default function EmptyState({
  title,
  description,
  icon,
  action,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  /** Optional SVG node, shown above the title in a soft circle. */
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center rounded-2xl border border-dashed border-charcoal/15 bg-white/60 px-6 py-12",
        className
      )}
    >
      {icon && (
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-charcoal/5 text-charcoal/40">
          {icon}
        </div>
      )}
      <h3 className="font-heading font-semibold text-base text-charcoal">{title}</h3>
      {description && (
        <p className="mt-1 max-w-sm text-sm text-charcoal/55 leading-relaxed">
          {description}
        </p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
