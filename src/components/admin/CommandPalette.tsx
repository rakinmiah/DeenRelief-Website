"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { canAccessSocial } from "@/lib/admin-social-access";
import type { AdminRole } from "./admin-nav";

/**
 * DR Admin command palette (⌘K / Ctrl+K).
 *
 * A deterministic, £0 "smart search" — no AI. Two streams merge:
 *   1. Pages — a static, role-gated index filtered instantly client-side.
 *   2. Records — donors, orders, products, blog posts, orphans, etc.
 *      fetched (debounced) from /api/admin/search, which re-derives the
 *      role server-side and only returns what the caller may see.
 *
 * Results are grouped, keyboard-navigable (↑/↓/↵), and deep-link to the
 * relevant detail page. Mounted once by AdminShell; opened via ⌘K or the
 * sidebar / top-bar search triggers.
 */

type RecordItem = { id: string; title: string; subtitle?: string; href: string };
type RecordGroup = { key: string; label: string; items: RecordItem[] };
type Row = { key: string; title: string; subtitle?: string; href: string; groupKey: string };

type PageEntry = {
  label: string;
  href: string;
  keywords: string[];
  roles: AdminRole[];
  /** Additionally requires social-section access (email allow-list). */
  social?: boolean;
};

/**
 * Static page index. Mirrors the nav (admin-nav.tsx) plus the high-value
 * sub-pages, so ⌘K can jump anywhere — not just to top-level sections.
 * Gating mirrors the page guards: role membership + (for social) the
 * email allow-list.
 */
const PAGE_INDEX: PageEntry[] = [
  // Giving
  { label: "Donations", href: "/admin/donations", roles: ["admin"], keywords: ["gifts", "payments", "giving"] },
  { label: "Recurring", href: "/admin/recurring", roles: ["admin"], keywords: ["subscriptions", "monthly"] },
  { label: "Reports", href: "/admin/reports", roles: ["admin"], keywords: ["reporting"] },
  { label: "Reports · Failed payments", href: "/admin/reports/failed-payments", roles: ["admin"], keywords: ["declines", "failures"] },
  { label: "Reports · Gift Aid", href: "/admin/reports/gift-aid", roles: ["admin"], keywords: ["hmrc", "tax", "csv"] },
  { label: "Reports · Reconciliation", href: "/admin/reports/reconciliation", roles: ["admin"], keywords: ["stripe", "match"] },
  { label: "Audit log", href: "/admin/audit-log", roles: ["admin"], keywords: ["activity", "history"] },
  // Bazaar
  { label: "Bazaar · Orders", href: "/admin/bazaar/orders", roles: ["admin"], keywords: ["shop", "fulfilment"] },
  { label: "Bazaar · Inquiries", href: "/admin/bazaar/inquiries", roles: ["admin"], keywords: ["messages", "support"] },
  { label: "Bazaar · Catalog", href: "/admin/bazaar/catalog", roles: ["admin"], keywords: ["products", "shop"] },
  { label: "Bazaar · Products", href: "/admin/bazaar/products", roles: ["admin"], keywords: ["catalog", "stock"] },
  { label: "Bazaar · New product", href: "/admin/bazaar/products/new", roles: ["admin"], keywords: ["add", "create"] },
  { label: "Bazaar · Makers", href: "/admin/bazaar/makers", roles: ["admin"], keywords: ["artisans", "suppliers"] },
  // Programmes
  { label: "Sponsorship", href: "/admin/sponsorship", roles: ["admin", "sponsorship"], keywords: ["orphans", "children"] },
  { label: "Sponsorship · Sponsors", href: "/admin/sponsorship/sponsors", roles: ["admin", "sponsorship"], keywords: ["donors", "supporters"] },
  { label: "Sponsorship · Data requests", href: "/admin/sponsorship/data-requests", roles: ["admin", "sponsorship"], keywords: ["gdpr", "erasure"] },
  // Content
  { label: "Blog", href: "/admin/blog", roles: ["admin", "writer"], keywords: ["posts", "articles", "cms"] },
  { label: "Blog · Writers", href: "/admin/blog/writers", roles: ["admin"], keywords: ["authors"] },
  { label: "Media", href: "/admin/media", roles: ["admin"], keywords: ["files", "uploads", "images"] },
  // Social (email-gated)
  { label: "Social", href: "/admin/social", roles: ["admin", "social"], social: true, keywords: ["smm"] },
  { label: "Social · Spotlight", href: "/admin/social/spotlight", roles: ["admin", "social"], social: true, keywords: ["now", "redirect"] },
  { label: "Social · Log a post", href: "/admin/social/posts/new", roles: ["admin", "social"], social: true, keywords: ["posts"] },
  { label: "Social · Short links", href: "/admin/social/links", roles: ["admin", "social"], social: true, keywords: ["r", "utm", "links"] },
  { label: "Social · Performance", href: "/admin/social/performance", roles: ["admin", "social"], social: true, keywords: ["analytics", "stats"] },
  { label: "Social · First Response", href: "/admin/social/first-response", roles: ["admin", "social"], social: true, keywords: ["emergencies", "crisis", "events"] },
  { label: "Social · Media library", href: "/admin/social/media-library", roles: ["admin", "social"], social: true, keywords: ["assets"] },
  { label: "Social · Brand assets", href: "/admin/social/brand-assets", roles: ["admin", "social"], social: true, keywords: ["logos"] },
  { label: "Social · QR codes", href: "/admin/social/qr", roles: ["admin", "social"], social: true, keywords: ["qr"] },
  { label: "Social · Template lab", href: "/admin/social/template-lab", roles: ["admin", "social"], social: true, keywords: ["templates", "deck"] },
];

export default function CommandPalette({
  open,
  onClose,
  role,
  email,
}: {
  open: boolean;
  onClose: () => void;
  role: AdminRole;
  email?: string;
}) {
  const router = useRouter();
  const social = canAccessSocial(email);
  const inputRef = useRef<HTMLInputElement>(null);

  const [query, setQuery] = useState("");
  const [records, setRecords] = useState<RecordGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(0);

  // Reset + focus whenever the palette opens. Lock body scroll while open.
  useEffect(() => {
    if (!open) return;
    setQuery("");
    setRecords([]);
    setActive(0);
    const id = window.setTimeout(() => inputRef.current?.focus(), 20);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.clearTimeout(id);
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  // Debounced record fetch. Aborts the in-flight request on each keystroke.
  useEffect(() => {
    if (!open) return;
    const q = query.trim();
    if (q.length < 2) {
      setRecords([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const ctrl = new AbortController();
    const t = window.setTimeout(async () => {
      try {
        const res = await fetch(`/api/admin/search?q=${encodeURIComponent(q)}`, {
          signal: ctrl.signal,
        });
        if (!ctrl.signal.aborted && res.ok) {
          const json = await res.json();
          setRecords(Array.isArray(json.results) ? json.results : []);
        }
      } catch {
        /* aborted or network error — leave prior results */
      } finally {
        if (!ctrl.signal.aborted) setLoading(false);
      }
    }, 160);
    return () => {
      window.clearTimeout(t);
      ctrl.abort();
    };
  }, [query, open]);

  // Pages: instant client-side filter, role + social gated.
  const pages = useMemo(() => {
    const visible = PAGE_INDEX.filter(
      (p) => p.roles.includes(role) && (!p.social || social)
    );
    const q = query.trim().toLowerCase();
    if (!q) return visible.slice(0, 6);
    return visible
      .filter(
        (p) =>
          p.label.toLowerCase().includes(q) ||
          p.href.includes(q) ||
          p.keywords.some((k) => k.includes(q))
      )
      .slice(0, 8);
  }, [query, role, social]);

  // Ordered sections: records first (the "find a thing" intent), pages last.
  const sections = useMemo(() => {
    const out: { key: string; label: string; rows: Row[] }[] = [];
    for (const g of records) {
      out.push({
        key: g.key,
        label: g.label,
        rows: g.items.map((it) => ({
          key: `${g.key}:${it.id}`,
          title: it.title,
          subtitle: it.subtitle,
          href: it.href,
          groupKey: g.key,
        })),
      });
    }
    if (pages.length) {
      out.push({
        key: "pages",
        label: query.trim() ? "Pages" : "Jump to",
        rows: pages.map((p) => ({
          key: `page:${p.href}`,
          title: p.label,
          href: p.href,
          groupKey: "pages",
        })),
      });
    }
    return out;
  }, [records, pages, query]);

  const flat = useMemo(() => sections.flatMap((s) => s.rows), [sections]);

  // Keep the highlight in range as results change.
  useEffect(() => {
    setActive((i) => (flat.length === 0 ? 0 : Math.min(i, flat.length - 1)));
  }, [flat.length]);

  const go = useCallback(
    (href: string) => {
      onClose();
      router.push(href);
    },
    [onClose, router]
  );

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setActive((i) => (flat.length ? (i + 1) % flat.length : 0));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActive((i) => (flat.length ? (i - 1 + flat.length) % flat.length : 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        const row = flat[active];
        if (row) go(row.href);
      }
    },
    [flat, active, go, onClose]
  );

  if (!open) return null;

  const q = query.trim();
  const showEmpty = q.length >= 2 && !loading && flat.length === 0;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-start justify-center px-4 pt-[12vh] pb-6"
      role="dialog"
      aria-modal="true"
      aria-label="Search DR Admin"
    >
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Close search"
        onClick={onClose}
        className="absolute inset-0 bg-charcoal/40 backdrop-blur-[2px] cursor-default motion-safe:animate-[fadeIn_120ms_ease-out]"
      />

      {/* Panel */}
      <div
        className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl ring-1 ring-charcoal/10 overflow-hidden motion-safe:animate-[paletteIn_150ms_ease-out]"
        onKeyDown={onKeyDown}
      >
        {/* Search field */}
        <div className="flex items-center gap-3 px-4 border-b border-charcoal/8">
          <svg className="w-[18px] h-[18px] text-charcoal/35 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.2-3.2" strokeLinecap="round" />
          </svg>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search donors, orders, posts, pages…"
            className="flex-1 py-3.5 bg-transparent text-[15px] text-charcoal placeholder:text-charcoal/35 outline-none"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            aria-label="Search query"
          />
          {loading && (
            <span className="w-4 h-4 shrink-0 rounded-full border-2 border-charcoal/15 border-t-charcoal/45 animate-spin" aria-hidden />
          )}
          <kbd className="hidden sm:block text-[10px] font-semibold text-charcoal/40 bg-charcoal/5 rounded px-1.5 py-0.5 shrink-0">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-[56vh] overflow-y-auto py-2">
          {q.length < 2 && (
            <p className="px-4 py-1.5 text-[11px] text-charcoal/40">
              Type to search records, or jump to a page below.
            </p>
          )}

          {showEmpty && (
            <p className="px-4 py-6 text-center text-[13.5px] text-charcoal/45">
              No matches for &ldquo;{q}&rdquo;.
            </p>
          )}

          {sections.map((section) => (
            <div key={section.key} className="mb-1">
              <p className="px-4 pt-2 pb-1 text-[10px] font-bold uppercase tracking-[0.12em] text-charcoal/40">
                {section.label}
              </p>
              <ul>
                {section.rows.map((row) => {
                  const idx = flat.indexOf(row);
                  const isActive = idx === active;
                  return (
                    <li key={row.key}>
                      <button
                        type="button"
                        onClick={() => go(row.href)}
                        onMouseMove={() => setActive(idx)}
                        className={`w-full text-left flex items-center gap-3 px-4 py-2 transition-colors ${
                          isActive ? "bg-charcoal/[0.055]" : "hover:bg-charcoal/[0.03]"
                        }`}
                      >
                        <span className={`shrink-0 ${isActive ? "text-green" : "text-charcoal/35"}`}>
                          {groupIcon(row.groupKey)}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-[14px] text-charcoal truncate">{row.title}</span>
                          {row.subtitle && (
                            <span className="block text-[12px] text-charcoal/45 truncate">{row.subtitle}</span>
                          )}
                        </span>
                        {isActive && (
                          <svg className="w-3.5 h-3.5 text-charcoal/30 shrink-0" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
                            <path d="M8 5l5 5-5 5" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>

        {/* Footer hint */}
        <div className="flex items-center gap-4 px-4 py-2 border-t border-charcoal/8 text-[11px] text-charcoal/45">
          <span className="flex items-center gap-1"><Kbd>↑</Kbd><Kbd>↓</Kbd> navigate</span>
          <span className="flex items-center gap-1"><Kbd>↵</Kbd> open</span>
          <span className="flex items-center gap-1"><Kbd>esc</Kbd> close</span>
        </div>
      </div>

      {/* Local keyframes (kept inline so no global CSS edit is needed). */}
      <style>{`
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes paletteIn { from { opacity: 0; transform: translateY(-8px) scale(0.985) } to { opacity: 1; transform: none } }
      `}</style>
    </div>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex items-center justify-center min-w-[16px] h-[16px] px-1 rounded bg-charcoal/5 text-[10px] font-semibold text-charcoal/55">
      {children}
    </kbd>
  );
}

/** Small monochrome icon per result group. */
function groupIcon(key: string) {
  const P = { className: "w-[17px] h-[17px]", fill: "none", stroke: "currentColor", strokeWidth: 1.7, viewBox: "0 0 24 24", "aria-hidden": true } as const;
  switch (key) {
    case "donors":
    case "sponsors":
      return (<svg {...P}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.5 20.25a7.5 7.5 0 0 1 15 0v.75H4.5v-.75Z" /></svg>);
    case "orders":
      return (<svg {...P}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.4l.4 1.5M5 7.5h14.2l-1.7 7H6.6L5 7.5Zm1.6 7L5 4.5M9 20a1 1 0 1 1-2 0 1 1 0 0 1 2 0Zm9 0a1 1 0 1 1-2 0 1 1 0 0 1 2 0Z" /></svg>);
    case "products":
      return (<svg {...P}><path strokeLinecap="round" strokeLinejoin="round" d="M21 7.5 12 3 3 7.5m18 0L12 12M21 7.5v9L12 21m0-9L3 7.5M12 12v9M3 7.5v9L12 21" /></svg>);
    case "inquiries":
      return (<svg {...P}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.76c0 1.6 1.12 2.99 2.7 3.23 1.07.16 2.15.28 3.24.36.47.04.9.28 1.15.67L12 21l2.65-3.98c.26-.39.69-.63 1.15-.67 1.09-.08 2.17-.2 3.24-.36 1.58-.24 2.71-1.63 2.71-3.23V6.74c0-1.6-1.13-2.99-2.71-3.23A48.39 48.39 0 0 0 12 3c-2.39 0-4.74.18-7.04.51-1.59.24-2.71 1.63-2.71 3.23v6.02Z" /></svg>);
    case "blog":
      return (<svg {...P}><path strokeLinecap="round" strokeLinejoin="round" d="M16.86 4.49l1.69-1.69a1.88 1.88 0 1 1 2.65 2.65L10.58 16.07a4.5 4.5 0 0 1-1.9 1.13L6 18l.8-2.69a4.5 4.5 0 0 1 1.13-1.9l8.93-8.93Z" /></svg>);
    case "orphans":
      return (<svg {...P}><path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.49-2.1-4.5-4.69-4.5-1.93 0-3.6 1.13-4.31 2.73-.72-1.6-2.38-2.73-4.31-2.73C5.1 3.75 3 5.76 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" /></svg>);
    case "events":
      return (<svg {...P}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.34 3.94 1.94 18a1.5 1.5 0 0 0 1.3 2.25h17.52A1.5 1.5 0 0 0 22.06 18l-8.4-14.06a1.5 1.5 0 0 0-2.58 0Z" /></svg>);
    case "links":
      return (<svg {...P}><path strokeLinecap="round" strokeLinejoin="round" d="M13.19 10.81a4.5 4.5 0 0 0-6.36 0l-2.5 2.5a4.5 4.5 0 0 0 6.36 6.36l1.06-1.06M10.81 13.19a4.5 4.5 0 0 0 6.36 0l2.5-2.5a4.5 4.5 0 0 0-6.36-6.36l-1.06 1.06" /></svg>);
    case "media":
      return (<svg {...P}><path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.16-5.16a2.25 2.25 0 0 1 3.18 0l5.16 5.16m-1.5-1.5 1.41-1.41a2.25 2.25 0 0 1 3.18 0l2.91 2.91M3.75 4.5h16.5a1.5 1.5 0 0 1 1.5 1.5v12a1.5 1.5 0 0 1-1.5 1.5H3.75a1.5 1.5 0 0 1-1.5-1.5V6a1.5 1.5 0 0 1 1.5-1.5Z" /></svg>);
    default: // pages
      return (<svg {...P}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.63c0-2.27 0-3.4-.67-4.16a2.25 2.25 0 0 0-.32-.31c-.76-.66-1.89-.66-4.16-.66H9.75M14.25 19.5H7.5c-1.4 0-2.1 0-2.64-.27a2.5 2.5 0 0 1-1.09-1.1C3.5 17.6 3.5 16.9 3.5 15.5V8" /></svg>);
  }
}
