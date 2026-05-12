"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

/**
 * Bazaar orders filter form.
 *
 * URL-driven state — every filter change pushes a new
 * `?status=...&from=...&to=...&q=...` URL, which the parent server
 * component reads via searchParams. That makes filters shareable,
 * survives refresh, and plays nice with the browser back button.
 *
 * Local state mirrors the URL for the lifetime of the form
 * interaction, then commits on submit. Same UX pattern as the
 * donations admin filters.
 *
 * Status options are deliberately ordered by fulfilment lifecycle
 * (paid → fulfilled → delivered → refunded → cancelled) so the
 * checkboxes read top-to-bottom as the path an order takes through
 * the system.
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

  function toggleStatus(value: Status) {
    setStatuses((current) => {
      const next = new Set(current);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return next;
    });
  }

  function applyFilters() {
    const params = new URLSearchParams();
    if (statuses.size > 0) {
      params.set("status", Array.from(statuses).join(","));
    }
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    if (q.trim()) params.set("q", q.trim());
    startTransition(() => {
      router.push(
        params.toString().length > 0
          ? `/admin/bazaar/orders?${params.toString()}`
          : "/admin/bazaar/orders"
      );
    });
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

  const hasAnyFilter =
    statuses.size > 0 || from !== "" || to !== "" || q.trim() !== "";

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        applyFilters();
      }}
      className="bg-white border border-charcoal/10 rounded-2xl p-5 mb-6 grid sm:grid-cols-[1.6fr_1fr_1fr_auto] gap-4 items-end"
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
  );
}
