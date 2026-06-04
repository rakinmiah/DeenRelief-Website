import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * A single metric tile — big value, small label, optional supporting
 * note and an optional delta chip (e.g. "+12% vs last month").
 *
 *   <StatStrip>
 *     <StatCard label="Raised this month" value="£4,210" delta={{ value: "+8%", tone: "positive" }} />
 *     <StatCard label="Active sponsors" value={142} />
 *   </StatStrip>
 *
 * Server-component safe.
 */

type DeltaTone = "positive" | "negative" | "neutral";

const DELTA_CLASSES: Record<DeltaTone, string> = {
  positive: "bg-green-light text-green",
  negative: "bg-red-50 text-red-600",
  neutral: "bg-grey-light text-grey",
};

export function StatCard({
  label,
  value,
  hint,
  delta,
  icon,
  className,
}: {
  label: ReactNode;
  value: ReactNode;
  /** Small muted note under the value. */
  hint?: ReactNode;
  /** Optional change chip shown beside the label. */
  delta?: { value: ReactNode; tone?: DeltaTone };
  /** Optional SVG node shown top-right. */
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-charcoal/8 bg-white p-4 sm:p-5",
        className
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-charcoal/45">
          {label}
        </p>
        {icon && <span className="text-charcoal/30">{icon}</span>}
      </div>
      <div className="mt-2 flex items-baseline gap-2">
        <span className="font-heading font-bold text-2xl sm:text-[1.75rem] text-charcoal leading-none">
          {value}
        </span>
        {delta && (
          <span
            className={cn(
              "rounded-full px-1.5 py-0.5 text-[11px] font-semibold",
              DELTA_CLASSES[delta.tone ?? "neutral"]
            )}
          >
            {delta.value}
          </span>
        )}
      </div>
      {hint && <p className="mt-1.5 text-xs text-charcoal/50">{hint}</p>}
    </div>
  );
}

/**
 * Responsive grid wrapper for a row of StatCards. 2 columns on phones
 * + tablets, up to 4 on desktop. Pass `className` to override the grid
 * for a different card count.
 */
export function StatStrip({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4",
        className
      )}
    >
      {children}
    </div>
  );
}

export default StatCard;
