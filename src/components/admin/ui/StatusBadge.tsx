import { cn } from "@/lib/cn";
import {
  resolveStatus,
  TONE_CLASSES,
  type StatusDomain,
  type StatusVariant,
} from "@/lib/admin-status";

/**
 * Renders a status pill from the shared admin-status source of truth.
 *
 *   <StatusBadge domain="donation" status={d.status} />
 *   <StatusBadge domain="bazaarOrder" status={o.status} variant="outline" />
 *
 * Pass the raw DB status string; the label + colour are resolved
 * centrally, so every section spells "Paid" / "Cancelled" the same way
 * and an unknown enum value degrades to a readable neutral badge.
 *
 * Server-component safe (no hooks / client code).
 */
export default function StatusBadge({
  domain,
  status,
  variant = "soft",
  className,
}: {
  domain: StatusDomain;
  status: string | null | undefined;
  variant?: StatusVariant;
  className?: string;
}) {
  const { label, tone } = resolveStatus(domain, status);
  return (
    <span
      className={cn(
        "inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold",
        TONE_CLASSES[variant][tone],
        className
      )}
    >
      {label}
    </span>
  );
}
