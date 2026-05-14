"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";

/**
 * Reconciliation filter form — URL-driven.
 *
 * Keeps the date range and stream filter selection in the URL so
 * the Export CSV button (rendered server-side on the parent) reads
 * the same params and emits a matching CSV. Stay-in-sync without
 * cross-component state.
 *
 * Defaults applied server-side (in the parent page) — this form
 * just reflects whatever the URL currently says.
 */

const TYPE_OPTIONS = [
  { value: "", label: "Both streams" },
  { value: "donation", label: "Donations only" },
  { value: "bazaar", label: "Bazaar only" },
];

export default function ReconciliationFiltersClient() {
  const router = useRouter();
  const sp = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [from, setFrom] = useState(sp.get("from") ?? "");
  const [to, setTo] = useState(sp.get("to") ?? "");
  const [type, setType] = useState(sp.get("type") ?? "");

  function applyFilters() {
    const params = new URLSearchParams();
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    if (type) params.set("type", type);
    startTransition(() => {
      router.push(
        params.toString().length > 0
          ? `/admin/reports/reconciliation?${params.toString()}`
          : "/admin/reports/reconciliation"
      );
    });
  }

  function jumpTo(label: "this-month" | "last-month" | "this-tax-year") {
    const now = new Date();
    const year = now.getUTCFullYear();
    const month = now.getUTCMonth();
    const pad = (n: number) => String(n).padStart(2, "0");

    let f = "";
    let t = "";
    if (label === "this-month") {
      f = `${year}-${pad(month + 1)}-01`;
      t = `${year}-${pad(month + 1)}-${pad(now.getUTCDate())}`;
    } else if (label === "last-month") {
      // Last calendar month: 1st to last day.
      const lmDate = new Date(Date.UTC(year, month - 1, 1));
      const lmYear = lmDate.getUTCFullYear();
      const lmMonth = lmDate.getUTCMonth();
      // Day 0 of next month = last day of this month.
      const lastDay = new Date(Date.UTC(lmYear, lmMonth + 1, 0)).getUTCDate();
      f = `${lmYear}-${pad(lmMonth + 1)}-01`;
      t = `${lmYear}-${pad(lmMonth + 1)}-${pad(lastDay)}`;
    } else if (label === "this-tax-year") {
      // UK charity / HMRC tax year: 6 Apr to 5 Apr. The "this tax
      // year" view is the year that includes today, starting on
      // the most recent 6 Apr.
      const aprStart = new Date(Date.UTC(year, 3, 6)); // April = month 3
      const start = now >= aprStart ? aprStart : new Date(Date.UTC(year - 1, 3, 6));
      f = `${start.getUTCFullYear()}-${pad(start.getUTCMonth() + 1)}-${pad(start.getUTCDate())}`;
      t = `${year}-${pad(month + 1)}-${pad(now.getUTCDate())}`;
    }
    setFrom(f);
    setTo(t);
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        applyFilters();
      }}
      className="bg-white border border-charcoal/10 rounded-2xl p-5 mb-6 grid sm:grid-cols-[1fr_1fr_1fr_auto] gap-4 items-end"
    >
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
      <div>
        <label className="block text-[11px] font-bold uppercase tracking-[0.1em] text-charcoal/60 mb-2">
          Stream
        </label>
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="w-full px-3 py-2 rounded-lg bg-cream border border-charcoal/10 text-charcoal text-sm focus:outline-none focus:border-charcoal/40"
        >
          {TYPE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
      <button
        type="submit"
        disabled={isPending}
        className="px-4 py-2 rounded-full bg-charcoal text-white text-sm font-semibold hover:bg-charcoal/90 transition-colors disabled:opacity-60 disabled:cursor-wait whitespace-nowrap"
      >
        {isPending ? "Applying…" : "Apply"}
      </button>

      {/* Quick range presets */}
      <div className="sm:col-span-4 flex flex-wrap gap-2 text-[12px] -mt-1">
        <span className="text-charcoal/60 mr-1 self-center">Quick range:</span>
        <button
          type="button"
          onClick={() => jumpTo("this-month")}
          className="px-2.5 py-1 rounded-full bg-cream border border-charcoal/10 text-charcoal hover:border-charcoal/40 transition-colors"
        >
          This month
        </button>
        <button
          type="button"
          onClick={() => jumpTo("last-month")}
          className="px-2.5 py-1 rounded-full bg-cream border border-charcoal/10 text-charcoal hover:border-charcoal/40 transition-colors"
        >
          Last month
        </button>
        <button
          type="button"
          onClick={() => jumpTo("this-tax-year")}
          className="px-2.5 py-1 rounded-full bg-cream border border-charcoal/10 text-charcoal hover:border-charcoal/40 transition-colors"
        >
          This tax year (HMRC)
        </button>
        <span className="text-charcoal/40 self-center text-[11px]">
          (Press Apply after picking)
        </span>
      </div>
    </form>
  );
}
