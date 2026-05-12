"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Bell-icon notification feed in the AdminShell.
 *
 * Polls /api/admin/notifications every 30 seconds for the active,
 * unread set. Shows an unread-count badge on the bell. Click
 * opens a dropdown with the list; clicking a row marks it read
 * AND navigates to its targetUrl.
 *
 * Auto-pauses polling when the document is hidden (tab in
 * background) to save battery + bandwidth. Resumes immediately
 * on visibility change.
 *
 * Why polling not Realtime: simpler infra, no Supabase Realtime
 * subscription to manage, and at the trustee's poll frequency
 * (30s) the latency is fine for non-urgent ops alerts. If we
 * later add Web Push, the push delivery covers urgent latency
 * and the bell stays on polling for the in-app counter.
 */

interface NotificationRow {
  id: string;
  type: string;
  severity: "info" | "warning" | "urgent";
  title: string;
  body: string | null;
  targetUrl: string | null;
  targetId: string | null;
  scheduledFor: string;
  cancelledAt: string | null;
  readAt: string | null;
  createdAt: string;
}

const POLL_INTERVAL_MS = 30_000;

export default function AdminNotificationBell() {
  const router = useRouter();
  const [items, setItems] = useState<NotificationRow[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  // Single fetch. Wrapped so the polling effect, visibility-change
  // handler, and action-feedback paths all call the same thing.
  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/notifications", {
        credentials: "same-origin",
      });
      if (!res.ok) {
        setItems([]);
        return;
      }
      const body = (await res.json()) as { notifications?: NotificationRow[] };
      setItems(body.notifications ?? []);
    } catch {
      // Silent on poll failure — the bell goes to zero (acceptable)
      // and the next poll retries. No need to bother the trustee.
    } finally {
      setLoading(false);
    }
  }, []);

  // Polling loop. Skips ticks when the tab is hidden.
  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setInterval> | null = null;

    function tick() {
      if (!cancelled && !document.hidden) {
        void refresh();
      }
    }

    void refresh();
    timer = setInterval(tick, POLL_INTERVAL_MS);

    function onVisibilityChange() {
      if (!document.hidden) {
        // Returning to tab — immediate refresh, no need to wait
        // for the next poll boundary.
        void refresh();
      }
    }
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [refresh]);

  // Close the dropdown when clicking outside.
  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  async function handleClickRow(n: NotificationRow) {
    setOpen(false);
    // Fire-and-forget mark-read; if it fails, the row reappears
    // on the next poll, which is acceptable.
    void fetch(`/api/admin/notifications/${n.id}/read`, {
      method: "POST",
      credentials: "same-origin",
    }).then(() => refresh());
    if (n.targetUrl) router.push(n.targetUrl);
  }

  async function handleMarkAllRead() {
    try {
      await fetch("/api/admin/notifications/read-all", {
        method: "POST",
        credentials: "same-origin",
      });
      await refresh();
    } catch {
      // Ignore — next poll will re-sync.
    }
  }

  const unreadCount = items.length;
  const hasUnread = unreadCount > 0;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={`Notifications${hasUnread ? ` (${unreadCount} unread)` : ""}`}
        aria-expanded={open}
        className="relative w-9 h-9 flex items-center justify-center rounded-full hover:bg-charcoal/5 text-charcoal/70 hover:text-charcoal transition-colors"
      >
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.8}
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0"
          />
        </svg>
        {hasUnread && (
          <span
            className={`absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold flex items-center justify-center border-2 border-white ${
              items.some((i) => i.severity === "urgent")
                ? "bg-red-600 text-white"
                : items.some((i) => i.severity === "warning")
                  ? "bg-amber-dark text-white"
                  : "bg-charcoal text-white"
            }`}
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Notifications"
          className="absolute right-0 top-full mt-2 w-[22rem] sm:w-[26rem] max-w-[calc(100vw-2rem)] bg-white border border-charcoal/10 rounded-2xl shadow-lg overflow-hidden z-50"
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-charcoal/8 bg-cream/40">
            <h3 className="text-sm font-semibold text-charcoal">
              Notifications
            </h3>
            {hasUnread && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                className="text-[12px] text-green hover:text-green-dark font-semibold transition-colors"
              >
                Mark all read
              </button>
            )}
          </div>
          <div className="max-h-[60vh] overflow-y-auto">
            {loading ? (
              <p className="px-4 py-6 text-sm text-charcoal/50 text-center">
                Loading…
              </p>
            ) : items.length === 0 ? (
              <p className="px-4 py-8 text-sm text-charcoal/50 text-center">
                You&apos;re all caught up.
              </p>
            ) : (
              <ul className="divide-y divide-charcoal/8">
                {items.map((n) => (
                  <li key={n.id}>
                    <button
                      type="button"
                      onClick={() => handleClickRow(n)}
                      className="w-full text-left px-4 py-3 hover:bg-cream/60 transition-colors flex gap-3"
                    >
                      <span
                        aria-hidden="true"
                        className={`flex-shrink-0 mt-1 w-2 h-2 rounded-full ${
                          n.severity === "urgent"
                            ? "bg-red-600"
                            : n.severity === "warning"
                              ? "bg-amber-dark"
                              : "bg-green"
                        }`}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-charcoal leading-snug">
                          {n.title}
                        </p>
                        {n.body && (
                          <p className="text-[12px] text-charcoal/65 leading-snug mt-0.5">
                            {n.body}
                          </p>
                        )}
                        <p className="text-[11px] text-charcoal/40 mt-1">
                          {timeAgo(n.scheduledFor)}
                        </p>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="px-4 py-2.5 border-t border-charcoal/8 bg-cream/30 text-[11px] text-charcoal/50 leading-snug">
            Updates every 30 seconds. Click a notification to open it
            and mark it read.
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Short relative-time label — "2m ago" / "3h ago" / "yesterday" /
 * "5 May". Coarse on purpose; the bell is for at-a-glance scans.
 */
function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return "";
  const now = Date.now();
  const diffSec = Math.round((now - then) / 1000);
  if (diffSec < 60) return "just now";
  const diffMin = Math.round(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.round(diffHr / 24);
  if (diffDay === 1) return "yesterday";
  if (diffDay < 7) return `${diffDay}d ago`;
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  });
}
