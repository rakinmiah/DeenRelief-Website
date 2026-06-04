/**
 * Single source of truth for status → { label, tone } across the DR
 * Admin app.
 *
 * Before this, each section (donations, recurring, bazaar orders,
 * inquiries, blog, sponsorship, GDPR requests) hand-rolled its own
 * status → Tailwind-class map inline. Same five semantic colours,
 * eight slightly different spellings of them — which is exactly how a
 * design system rots. This collapses them into a small set of
 * semantic TONES, then maps every domain's status strings onto a tone
 * + a human label.
 *
 * Rendering lives in <StatusBadge> (components/admin/ui/StatusBadge).
 * This module is pure data + class strings so it can be imported by
 * server components without pulling in React.
 *
 * Two visual variants are provided per tone:
 *   - "soft"    — quiet fill, no border (the default; matches the
 *                 redesign's "quiet status" principle).
 *   - "outline" — fill + border, slightly louder; better on dense
 *                 financial tables where the badge must pop.
 */

export type StatusTone = "positive" | "warning" | "critical" | "neutral" | "info";

export type StatusVariant = "soft" | "outline";

export interface StatusMeta {
  label: string;
  tone: StatusTone;
}

/** Tone → Tailwind classes, per visual variant. */
export const TONE_CLASSES: Record<StatusVariant, Record<StatusTone, string>> = {
  soft: {
    positive: "bg-green-light text-green",
    warning: "bg-amber-light text-amber-dark",
    critical: "bg-red-50 text-red-600",
    neutral: "bg-grey-light text-grey",
    info: "bg-blue-50 text-blue-700",
  },
  outline: {
    positive: "bg-green/10 text-green-dark border border-green/30",
    warning: "bg-amber-light text-amber-dark border border-amber/30",
    critical: "bg-red-50 text-red-700 border border-red-200",
    neutral: "bg-charcoal/8 text-charcoal/60 border border-charcoal/15",
    info: "bg-blue-50 text-blue-800 border border-blue-200",
  },
};

/**
 * The domains that carry status. Keep these keys stable — <StatusBadge>
 * takes one as a prop.
 */
export type StatusDomain =
  | "donation"
  | "recurring"
  | "bazaarOrder"
  | "bazaarInquiry"
  | "blog"
  | "orphan"
  | "sponsor"
  | "sponsorship"
  | "dataRequest"
  | "visibility";

type DomainMap = Record<string, StatusMeta>;

const DONATION: DomainMap = {
  succeeded: { label: "Paid", tone: "positive" },
  pending: { label: "Pending", tone: "warning" },
  failed: { label: "Failed", tone: "critical" },
  refunded: { label: "Refunded", tone: "neutral" },
};

const RECURRING: DomainMap = {
  active: { label: "Active", tone: "positive" },
  trialing: { label: "Trialing", tone: "positive" },
  past_due: { label: "Past due", tone: "warning" },
  incomplete: { label: "Incomplete", tone: "warning" },
  unpaid: { label: "Unpaid", tone: "critical" },
  paused: { label: "Paused", tone: "neutral" },
  incomplete_expired: { label: "Expired", tone: "neutral" },
  canceled: { label: "Cancelled", tone: "neutral" },
};

const BAZAAR_ORDER: DomainMap = {
  // "paid" is amber here (not green): payment is in but the order
  // still needs fulfilling — it's an action state, not a done state.
  pending_payment: { label: "Pending", tone: "neutral" },
  paid: { label: "Paid", tone: "warning" },
  fulfilled: { label: "Shipped", tone: "info" },
  delivered: { label: "Delivered", tone: "positive" },
  refunded: { label: "Refunded", tone: "critical" },
  cancelled: { label: "Cancelled", tone: "neutral" },
  abandoned: { label: "Abandoned", tone: "neutral" },
};

const BAZAAR_INQUIRY: DomainMap = {
  open: { label: "Open", tone: "warning" },
  replied: { label: "Replied", tone: "positive" },
  closed: { label: "Closed", tone: "neutral" },
};

const BLOG: DomainMap = {
  draft: { label: "Draft", tone: "neutral" },
  in_review: { label: "In review", tone: "warning" },
  published: { label: "Published", tone: "positive" },
  archived: { label: "Archived", tone: "critical" },
};

const ORPHAN: DomainMap = {
  available: { label: "Available", tone: "neutral" },
  sponsored: { label: "Sponsored", tone: "positive" },
  paused: { label: "Paused", tone: "warning" },
  graduated: { label: "Graduated", tone: "info" },
  withdrawn: { label: "Withdrawn", tone: "critical" },
};

const SPONSOR: DomainMap = {
  invited: { label: "Invited", tone: "warning" },
  active: { label: "Active", tone: "positive" },
  suspended: { label: "Suspended", tone: "critical" },
  closed: { label: "Closed", tone: "neutral" },
};

const SPONSORSHIP: DomainMap = {
  active: { label: "Active", tone: "positive" },
  paused: { label: "Paused", tone: "warning" },
  ended: { label: "Ended", tone: "neutral" },
};

const DATA_REQUEST: DomainMap = {
  pending: { label: "Pending", tone: "warning" },
  fulfilled: { label: "Fulfilled", tone: "positive" },
  rejected: { label: "Rejected", tone: "critical" },
};

// Generic active/hidden flag — bazaar products, makers, anything with a
// published-vs-hidden toggle. Map a boolean with `flag ? "active" : "hidden"`.
const VISIBILITY: DomainMap = {
  active: { label: "Active", tone: "positive" },
  hidden: { label: "Hidden", tone: "neutral" },
};

const DOMAINS: Record<StatusDomain, DomainMap> = {
  donation: DONATION,
  recurring: RECURRING,
  bazaarOrder: BAZAAR_ORDER,
  bazaarInquiry: BAZAAR_INQUIRY,
  blog: BLOG,
  orphan: ORPHAN,
  sponsor: SPONSOR,
  sponsorship: SPONSORSHIP,
  dataRequest: DATA_REQUEST,
  visibility: VISIBILITY,
};

/** Title-case a raw status string as a graceful fallback label. */
function humanize(raw: string): string {
  const cleaned = raw.replace(/[_-]+/g, " ").trim();
  if (!cleaned) return "Unknown";
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

/**
 * Resolve a domain + status string to its label + tone. Unknown
 * statuses degrade gracefully to a neutral, humanized badge rather
 * than throwing — a new DB enum value shows up readable, never blank.
 */
export function resolveStatus(
  domain: StatusDomain,
  status: string | null | undefined
): StatusMeta {
  if (!status) return { label: "—", tone: "neutral" };
  const meta = DOMAINS[domain]?.[status];
  if (meta) return meta;
  return { label: humanize(status), tone: "neutral" };
}

/** Convenience: classes for a resolved status in one call. */
export function statusClasses(
  domain: StatusDomain,
  status: string | null | undefined,
  variant: StatusVariant = "soft"
): string {
  const { tone } = resolveStatus(domain, status);
  return TONE_CLASSES[variant][tone];
}
