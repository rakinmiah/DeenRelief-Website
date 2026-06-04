import type { ReactNode } from "react";
import { canAccessSocial } from "@/lib/admin-social-access";

/**
 * Single source of truth for the DR Admin navigation.
 *
 * Both surfaces consume this:
 *   - AdminShell's desktop left sidebar (lg+)
 *   - AdminMobileDrawer's slide-out drawer (<lg)
 *
 * The old design was a flat row of 11 horizontal pills that
 * overflowed and forced trustees to scroll a cramped header. This
 * regroups the same destinations under five labelled sections —
 * Giving · Bazaar · Programmes · Content · Social — so the surface
 * area maps to how the charity actually thinks about its work.
 *
 * Role gating is per-item via `roles`. `visibleGroups(role)` filters
 * items and drops any group that ends up empty, so e.g. a `writer`
 * only ever sees the Content group (Blog), a `sponsorship`
 * coordinator only sees Programmes, and a `social` manager only sees
 * Social. An `admin` sees everything.
 *
 * NOTE: the Social section pages are owned by a separate workstream —
 * we keep the nav link here (so the grouping is complete) but do not
 * touch anything under /admin/social.
 */

export type AdminRole = "admin" | "social" | "writer" | "sponsorship";

export interface AdminNavItem {
  href: string;
  label: string;
  roles: AdminRole[];
  icon: ReactNode;
}

export interface AdminNavGroup {
  label: string;
  items: AdminNavItem[];
}

const ICON_PROPS = {
  className: "w-[18px] h-[18px]",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.7,
  viewBox: "0 0 24 24",
  "aria-hidden": true,
} as const;

// ── Icons (kept inline so the nav is one self-contained module) ──

const IconDonations = (
  <svg {...ICON_PROPS}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h.008v.008H18V10.5Zm-12 0h.008v.008H6V10.5Z"
    />
  </svg>
);

const IconRecurring = (
  <svg {...ICON_PROPS}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99"
    />
  </svg>
);

const IconReports = (
  <svg {...ICON_PROPS}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z"
    />
  </svg>
);

const IconAuditLog = (
  <svg {...ICON_PROPS}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25ZM6.75 12h.008v.008H6.75V12Zm0 3h.008v.008H6.75V15Zm0 3h.008v.008H6.75V18Z"
    />
  </svg>
);

const IconOrders = (
  <svg {...ICON_PROPS}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 0 0-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 0 0-16.536-1.84M7.5 14.25 5.106 5.272M6 20.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Zm12.75 0a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z"
    />
  </svg>
);

const IconInquiries = (
  <svg {...ICON_PROPS}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M2.25 12.76c0 1.6 1.123 2.994 2.707 3.227 1.068.157 2.148.279 3.238.364.466.037.893.281 1.153.671L12 21l2.652-3.978c.26-.39.687-.634 1.153-.67 1.09-.086 2.17-.208 3.238-.365 1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z"
    />
  </svg>
);

const IconCatalog = (
  <svg {...ICON_PROPS}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M9.568 3H5.25A2.25 2.25 0 0 0 3 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 0 0 5.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 0 0 9.568 3Z"
    />
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6Z" />
  </svg>
);

const IconSponsorship = (
  <svg {...ICON_PROPS}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z"
    />
  </svg>
);

const IconBlog = (
  <svg {...ICON_PROPS}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M16.862 4.487l1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10"
    />
  </svg>
);

const IconMedia = (
  <svg {...ICON_PROPS}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z"
    />
  </svg>
);

const IconSocial = (
  <svg {...ICON_PROPS}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M10.34 15.84c-.688-.06-1.386-.09-2.09-.09H7.5a4.5 4.5 0 1 1 0-9h.75c.704 0 1.402-.03 2.09-.09m0 9.18c.253.962.584 1.892.985 2.783.247.55.06 1.21-.463 1.511l-.657.38c-.551.318-1.26.117-1.527-.461a20.845 20.845 0 0 1-1.44-4.282m3.102.069a18.03 18.03 0 0 1-.59-4.59c0-1.586.205-3.124.59-4.59m0 9.18a23.848 23.848 0 0 1 8.835 2.535M10.34 6.66a23.847 23.847 0 0 0 8.835-2.535m0 0A23.74 23.74 0 0 0 18.795 3m.38 1.125a23.91 23.91 0 0 1 1.014 5.395m-1.014 8.855c-.118.38-.245.754-.38 1.125m.38-1.125a23.91 23.91 0 0 0 1.014-5.395m0-3.46c.495.413.811 1.035.811 1.73 0 .695-.316 1.317-.811 1.73m0-3.46a24.347 24.347 0 0 1 0 3.46"
    />
  </svg>
);

/**
 * The grouped navigation. Order is admin-centric (Giving first) but a
 * non-admin role still lands on its own first visible item via
 * `flatVisible(role)[0]`.
 */
export const NAV_GROUPS: AdminNavGroup[] = [
  {
    label: "Giving",
    items: [
      { href: "/admin/donations", label: "Donations", roles: ["admin"], icon: IconDonations },
      { href: "/admin/recurring", label: "Recurring", roles: ["admin"], icon: IconRecurring },
      { href: "/admin/reports", label: "Reports", roles: ["admin"], icon: IconReports },
      { href: "/admin/audit-log", label: "Audit log", roles: ["admin"], icon: IconAuditLog },
    ],
  },
  {
    label: "Bazaar",
    items: [
      { href: "/admin/bazaar/orders", label: "Orders", roles: ["admin"], icon: IconOrders },
      { href: "/admin/bazaar/inquiries", label: "Inquiries", roles: ["admin"], icon: IconInquiries },
      { href: "/admin/bazaar/catalog", label: "Catalog", roles: ["admin"], icon: IconCatalog },
    ],
  },
  {
    label: "Programmes",
    items: [
      {
        href: "/admin/sponsorship",
        label: "Sponsorship",
        roles: ["admin", "sponsorship"],
        icon: IconSponsorship,
      },
    ],
  },
  {
    label: "Content",
    items: [
      { href: "/admin/blog", label: "Blog", roles: ["admin", "writer"], icon: IconBlog },
      { href: "/admin/media", label: "Media", roles: ["admin"], icon: IconMedia },
    ],
  },
  {
    label: "Social",
    items: [
      { href: "/admin/social", label: "Social", roles: ["admin", "social"], icon: IconSocial },
    ],
  },
];

/**
 * Groups visible to `role`, with empty groups removed.
 *
 * The Social section (/admin/social) is additionally gated by email via
 * the SOCIAL_ALLOWED_EMAILS allow-list — a general admin doesn't see it
 * unless they're one of the social-managing accounts. Pass the
 * signed-in email so that filter can apply.
 */
export function visibleGroups(role: AdminRole, email?: string): AdminNavGroup[] {
  const social = canAccessSocial(email);
  return NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter(
      (item) =>
        item.roles.includes(role) &&
        (social || !item.href.startsWith("/admin/social"))
    ),
  })).filter((group) => group.items.length > 0);
}

/** Flat list of every nav item visible to `role` (+ email), in display order. */
export function flatVisible(role: AdminRole, email?: string): AdminNavItem[] {
  return visibleGroups(role, email).flatMap((group) => group.items);
}
