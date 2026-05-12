import type { Metadata } from "next";
import { requireAdminSession } from "@/lib/admin-session";
import {
  fetchAdminAuditLog,
  type AdminAction,
  type AdminAuditLogRow,
} from "@/lib/admin-audit";
import { formatAdminDate } from "@/lib/admin-donations";

export const metadata: Metadata = {
  title: "Audit log | Deen Relief Admin",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const ACTION_LABEL: Record<AdminAction, string> = {
  sign_in: "Sign-in",
  sign_in_failed: "Failed sign-in",
  sign_in_rate_limited: "Sign-in rate-limited",
  sign_out: "Sign-out",
  view_gift_aid_csv: "Gift Aid CSV downloaded",
  view_donations_csv: "Donations CSV downloaded",
  refund_donation: "Refund issued",
  resend_receipt: "Receipt resent",
  cancel_subscription: "Subscription cancelled",
  send_portal_link: "Portal link generated",
  send_donation_message: "Donor email sent",
  backfill_livemode: "Livemode backfill",
};

const ACTION_STYLES: Record<AdminAction, string> = {
  sign_in: "bg-green/10 text-green-dark border-green/30",
  sign_in_failed: "bg-amber-light text-amber-dark border-amber/30",
  sign_in_rate_limited: "bg-red-50 text-red-700 border-red-200",
  sign_out: "bg-charcoal/8 text-charcoal/60 border-charcoal/15",
  view_gift_aid_csv: "bg-amber-light text-amber-dark border-amber/30",
  view_donations_csv: "bg-amber-light text-amber-dark border-amber/30",
  refund_donation: "bg-red-50 text-red-700 border-red-200",
  resend_receipt: "bg-green/10 text-green-dark border-green/30",
  cancel_subscription: "bg-amber-light text-amber-dark border-amber/30",
  send_portal_link: "bg-green/10 text-green-dark border-green/30",
  send_donation_message: "bg-green/10 text-green-dark border-green/30",
  backfill_livemode: "bg-charcoal/8 text-charcoal/60 border-charcoal/15",
};

/**
 * Audit log viewer.
 *
 * Lists the most recent 200 admin actions sorted by timestamp DESC.
 * Each row shows: when, who, what, target (where applicable), IP.
 * The metadata jsonb is rendered as collapsed JSON in a <details>
 * element so trustees can drill in without bloating the row height.
 *
 * Filtering: Phase 4 — for now the table fits on one page at our
 * scale and trustees can Ctrl-F. Add server-side filters once the log
 * exceeds a few thousand rows.
 */
export default async function AdminAuditLogPage() {
  await requireAdminSession();
  const rows = await fetchAdminAuditLog(200);

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <span className="block text-[11px] font-bold tracking-[0.15em] uppercase text-amber-dark mb-1">
          Compliance
        </span>
        <h1 className="text-charcoal font-heading font-bold text-2xl sm:text-3xl">
          Audit log
        </h1>
        <p className="text-grey text-sm mt-2 max-w-2xl">
          Every admin action is recorded here. Sign-ins (including
          failures), refunds, subscription cancellations, Gift Aid CSV
          downloads — anything privileged. Use this when answering
          &quot;who looked at this donor&apos;s record?&quot; or
          investigating a credential leak.
        </p>
      </div>

      <div className="bg-white border border-charcoal/10 rounded-2xl overflow-hidden">
        {rows.length === 0 ? (
          <div className="p-8 text-center text-charcoal/50 text-sm">
            No admin actions logged yet. The first entry will be your
            sign-in.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-cream border-b border-charcoal/10">
                <tr className="text-left">
                  {[
                    "When",
                    "Who",
                    "Action",
                    "Target",
                    "IP",
                    "Detail",
                  ].map((h) => (
                    <th
                      key={h}
                      className="px-4 sm:px-5 py-3 font-bold uppercase tracking-[0.1em] text-charcoal/60 text-[11px] whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-charcoal/8">
                {rows.map((row) => (
                  <AuditRow key={row.id} row={row} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {rows.length > 0 && (
        <p className="mt-4 text-[11px] text-charcoal/40">
          Showing the {rows.length} most recent actions. Older entries
          remain in the database.
        </p>
      )}
    </main>
  );
}

function AuditRow({ row }: { row: AdminAuditLogRow }) {
  const actionStyle =
    ACTION_STYLES[row.action] ??
    "bg-charcoal/8 text-charcoal/60 border-charcoal/15";
  const actionLabel = ACTION_LABEL[row.action] ?? row.action;

  return (
    <tr className="hover:bg-cream/50 transition-colors align-top">
      <td className="px-4 sm:px-5 py-4 text-charcoal/70 whitespace-nowrap">
        {formatAdminDate(row.createdAt)}
      </td>
      <td className="px-4 sm:px-5 py-4">
        {row.userEmail ? (
          <span className="text-charcoal text-[12px]">{row.userEmail}</span>
        ) : (
          <span className="text-charcoal/40 text-[11px] italic">
            scripted / bearer
          </span>
        )}
      </td>
      <td className="px-4 sm:px-5 py-4">
        <span
          className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-medium uppercase tracking-wider border ${actionStyle}`}
        >
          {actionLabel}
        </span>
      </td>
      <td className="px-4 sm:px-5 py-4">
        {row.targetId ? (
          <span className="font-mono text-[11px] text-charcoal/70 break-all">
            {row.targetId}
          </span>
        ) : (
          <span className="text-charcoal/30 text-[11px]">—</span>
        )}
      </td>
      <td className="px-4 sm:px-5 py-4 text-charcoal/60 text-[11px] font-mono whitespace-nowrap">
        {row.ip ?? "—"}
      </td>
      <td className="px-4 sm:px-5 py-4">
        {row.metadata && Object.keys(row.metadata).length > 0 ? (
          <details className="text-[11px]">
            <summary className="cursor-pointer text-charcoal/60 hover:text-charcoal transition-colors">
              View
            </summary>
            <pre className="mt-2 p-2 bg-cream rounded-lg text-[10px] text-charcoal/70 whitespace-pre-wrap break-words max-w-[28rem] overflow-x-auto">
              {JSON.stringify(row.metadata, null, 2)}
            </pre>
            {row.userAgent && (
              <p className="mt-2 text-[10px] text-charcoal/40 italic break-all">
                UA: {row.userAgent}
              </p>
            )}
          </details>
        ) : row.userAgent ? (
          <details className="text-[11px]">
            <summary className="cursor-pointer text-charcoal/60 hover:text-charcoal transition-colors">
              View
            </summary>
            <p className="mt-2 text-[10px] text-charcoal/40 italic break-all">
              UA: {row.userAgent}
            </p>
          </details>
        ) : (
          <span className="text-charcoal/30 text-[11px]">—</span>
        )}
      </td>
    </tr>
  );
}
