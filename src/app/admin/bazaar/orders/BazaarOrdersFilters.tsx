"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import BottomSheet from "@/components/admin/BottomSheet";

/**
 * Bazaar orders filter form.
 *
 * URL-driven state — every filter change pushes a new
 * `?status=...&from=...&to=...&q=...` URL, which the parent server
 * component reads via searchParams. That makes filters shareable,
 * survives refresh, and plays nice with the browser back button.
 *
 * Local state mirrors the URL for the lifetime of the form
 * interaction, then commits on Apply (or live-debounced for search
 * on mobile so a keyboard-driven user doesn't have to dismiss the
 * keyboard + tap Apply).
 *
 * Status options are deliberately ordered by fulfilment lifecycle
 * (paid → fulfilled → delivered → refunded → cancelled) so the
 * checkboxes read top-to-bottom as the path an order takes through
 * the system.
 *
 * Mobile layout: the 4-column desktop grid would stack into 4-5
 * rows on a phone — ~400px of filter UI above the orders table.
 * Instead the mobile view collapses to a single row (full-width
 * search + Filters button) with the full status/date form
 * surfaced in a bottom sheet.
 */

type Status =
  | "pending_payment"
  | "paid"
  | "fulfilled"
  | "delivered"
  | "refunded"
  | "cancelled";

const STATUS_OPTIONS: { value: Status; label: string }[] = [
  { value: "paid", label: "Awaiting fulfilment" },
  { value: "fulfilled", label: "Shipped" },
  { value: "delivered", label: "Delivered" },
  { value: "refunded", label: "Refunded" },
  { value: "cancelled", label: "Cancelled" },
  { value: "pending_payment", label: "Pending payment" },
];

export default function BazaarOrdersFilters() {
  const router = useRouter();
  const sp = useSearchParams();
  const [isPending, startTransition] = useTransition();

  // Initialise from current URL state so an in-flight refresh
  // shows the same selections as the rendered table.
  const initialStatuses = useMemo(
    () =>
      new Set<Status>(
        (sp.get("status") ?? "")
          .split(",")
          .map((s) => s.trim())
          .filter((s): s is Status =>
            (STATUS_OPTIONS.map((o) => o.value) as string[]).includes(s)
          )
      ),
    [sp]
  );

  const [statuses, setStatuses] = useState<Set<Status>>(initialStatuses);
  const [from, setFrom] = useState(sp.get("from") ?? "");
  const [to, setTo] = useState(sp.get("to") ?? "");
  const [q, setQ] = useState(sp.get("q") ?? "");
  const [sheetOpen, setSheetOpen] = useState(false);

  function toggleStatus(value: Status) {
    setStatuses((current) => {
      const next = new Set(current);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return next;
    });
  }

  // Push URL once params settle. Used by Apply (immediate) and by
  // the live-debounced mobile search.
  function pushFilters(opts?: {
    statuses?: Set<Status>;
    from?: string;
    to?: string;
    q?: string;
  }) {
    const effectiveStatuses = opts?.statuses ?? statuses;
    const effectiveFrom = opts?.from ?? from;
    const effectiveTo = opts?.to ?? to;
    const effectiveQ = opts?.q ?? q;
    const params = new URLSearchParams();
    if (effectiveStatuses.size > 0) {
      params.set("status", Array.from(effectiveStatuses).join(","));
    }
    if (effectiveFrom) params.set("from", effectiveFrom);
    if (effectiveTo) params.set("to", effectiveTo);
    if (effectiveQ.trim()) params.set("q", effectiveQ.trim());
    startTransition(() => {
      router.push(
        params.toString().length > 0
          ? `/admin/bazaar/orders?${params.toString()}`
          : "/admin/bazaar/orders"
      );
    });
  }

  function applyFilters() {
    pushFilters();
  }

  function clearFilters() {
    setStatuses(new Set());
    setFrom("");
    setTo("");
    setQ("");
    startTransition(() => {
      router.push("/admin/bazaar/orders");
    });
  }

  // Debounce live mobile search — same UX pattern as DonationsFilters.
  // Only fires on the mobile path; desktop search runs through Apply.
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    const urlQ = sp.get("q") ?? "";
    if (q === urlQ) return;
    searchDebounceRef.current = setTimeout(() => {
      pushFilters({ q });
    }, 300);
    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const hasAnyFilter =
    statuses.size > 0 || from !== "" || to !== "" || q.trim() !== "";
  const filterCount =
    statuses.size + (from ? 1 : 0) + (to ? 1 : 0) + (q.trim() ? 1 : 0);

  return (
    <>
      {/* ─── MOBILE — single row: search + Filters button ─── */}
      <div className="md:hidden flex items-center gap-2 mb-4">
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search customer…"
          className="flex-1 min-h-[44px] px-4 rounded-full text-base bg-white border border-charcoal/10 text-charcoal placeholder:text-charcoal/40 focus:outline-none focus:border-charcoal/30"
        />
        <button
          type="button"
          onClick={() => setSheetOpen(true)}
          className={`flex-shrink-0 min-h-[44px] px-4 rounded-full text-sm font-medium inline-flex items-center gap-2 transition-colors ${
            filterCount > 0
              ? "bg-charcoal text-white"
              : "bg-white border border-charcoal/10 text-charcoal/70"
          }`}
          aria-label="Filters"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3 4.5h18M6 12h12M10 19.5h4"
            />
          </svg>
          {filterCount > 0 && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber text-charcoal min-w-[18px] text-center">
              {filterCount}
            </span>
          )}
        </button>
      </div>

      {/* ─── DESKTOP — full form. md+ only. ─── */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          applyFilters();
        }}
        className="hidden md:grid bg-white border border-charcoal/10 rounded-2xl p-5 mb-6 sm:grid-cols-[1.6fr_1fr_1fr_auto] gap-4 items-end"
      >
        {/* Status chips */}
        <div>
          <label className="block text-[11px] font-bold uppercase tracking-[0.1em] text-charcoal/60 mb-2">
            Status
          </label>
          <div className="flex flex-wrap gap-1.5">
            {STATUS_OPTIONS.map((opt) => {
              const active = statuses.has(opt.value);
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => toggleStatus(opt.value)}
                  className={`px-3 py-1.5 rounded-full text-[12px] font-medium border transition-colors ${
                    active
                      ? "bg-charcoal text-white border-charcoal"
                      : "bg-white text-charcoal border-charcoal/15 hover:border-charcoal/40"
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Date range */}
        <div>
          <label className="block text-[11px] font-bold uppercase tracking-[0.1em] text-charcoal/60 mb-2">
            From
          </label>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-cream border border-charcoal/10 text-charcoal text-sm focus:outline-none focus:border-charcoal/40"
          />
        </div>
        <div>
          <label className="block text-[11px] font-bold uppercase tracking-[0.1em] text-charcoal/60 mb-2">
            To
          </label>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-cream border border-charcoal/10 text-charcoal text-sm focus:outline-none focus:border-charcoal/40"
          />
        </div>

        {/* Apply / clear */}
        <div className="flex gap-2 sm:flex-col">
          <button
            type="submit"
            disabled={isPending}
            className="px-4 py-2 rounded-full bg-charcoal text-white text-sm font-semibold hover:bg-charcoal/90 transition-colors disabled:opacity-60 disabled:cursor-wait"
          >
            {isPending ? "Applying…" : "Apply"}
          </button>
          {hasAnyFilter && (
            <button
              type="button"
              onClick={clearFilters}
              disabled={isPending}
              className="px-4 py-2 rounded-full bg-white border border-charcoal/15 text-charcoal text-sm font-medium hover:bg-cream transition-colors disabled:opacity-60"
            >
              Clear
            </button>
          )}
        </div>

        {/* Search — full-width on its own line below */}
        <div className="sm:col-span-4">
          <label className="block text-[11px] font-bold uppercase tracking-[0.1em] text-charcoal/60 mb-2">
            Customer search
          </label>
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by name or email…"
            className="w-full px-3 py-2 rounded-lg bg-cream border border-charcoal/10 text-charcoal text-sm focus:outline-none focus:border-charcoal/40"
          />
        </div>
      </form>

      {/* ─── MOBILE BOTTOM SHEET — status + date range only ─── */}
      <div className="md:hidden">
        <BottomSheet
          open={sheetOpen}
          onClose={() => setSheetOpen(false)}
          title="Filters"
        >
          <div className="space-y-6">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-charcoal/60 mb-2">
                Status
              </p>
              <div className="flex flex-wrap gap-2">
                {STATUS_OPTIONS.map((opt) => {
                  const active = statuses.has(opt.value);
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => toggleStatus(opt.value)}
                      className={`min-h-[44px] px-4 rounded-full text-sm font-medium border transition-colors ${
                        active
                          ? "bg-charcoal text-white border-charcoal"
                          : "bg-white text-charcoal border-charcoal/15"
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-charcoal/60 mb-2">
                Date range
              </p>
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                  className="flex-1 min-h-[44px] px-3 rounded-lg bg-white border border-charcoal/10 text-charcoal text-base"
                  aria-label="From date"
                />
                <span className="text-charcoal/40">→</span>
                <input
                  type="date"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  className="flex-1 min-h-[44px] px-3 rounded-lg bg-white border border-charcoal/10 text-charcoal text-base"
                  aria-label="To date"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  clearFilters();
                  setSheetOpen(false);
                }}
                className="flex-1 min-h-[44px] px-4 rounded-lg bg-white border border-charcoal/15 text-charcoal text-sm font-medium hover:bg-cream transition-colors"
              >
                Clear all
              </button>
              <button
                type="button"
                onClick={() => {
                  applyFilters();
                  setSheetOpen(false);
                }}
                className="flex-1 min-h-[44px] px-4 rounded-lg bg-charcoal text-white text-sm font-semibold hover:bg-charcoal/90 transition-colors"
              >
                {isPending ? "Applying…" : "Apply"}
              </button>
            </div>
          </div>
        </BottomSheet>
      </div>
    </>
  );
}
