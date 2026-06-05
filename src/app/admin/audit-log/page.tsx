import type { Metadata } from "next";
import { requireRoleAdmin } from "@/lib/admin-session";
import {
  fetchAdminAuditLogPage,
  type AdminAction,
  type AdminAuditLogRow,
} from "@/lib/admin-audit";
import { formatAdminDate } from "@/lib/admin-donations";
import { TONE_CLASSES, type StatusTone } from "@/lib/admin-status";
import { cn } from "@/lib/cn";
import {
  Button,
  PageHeader,
  ResponsiveTable,
  EmptyState,
  type Column,
} from "@/components/admin/ui";

const PAGE_SIZE = 50;

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
  admin_password_changed: "Admin password changed",
  confirm_offline_donation: "Offline donation confirmed",
  issue_manual_receipt: "Manual receipt issued",
  view_gift_aid_csv: "Gift Aid CSV downloaded",
  view_donations_csv: "Donations CSV downloaded",
  view_reconciliation_csv: "Reconciliation CSV downloaded",
  refund_donation: "Refund issued",
  resend_receipt: "Receipt resent",
  cancel_subscription: "Subscription cancelled",
  send_portal_link: "Portal link generated",
  send_donation_message: "Donor email sent",
  backfill_livemode: "Livemode backfill",
  mark_bazaar_order_shipped: "Bazaar order shipped",
  update_bazaar_order_notes: "Bazaar order notes updated",
  resend_bazaar_shipping_email: "Bazaar shipping email resent",
  mark_bazaar_order_delivered: "Bazaar order delivered",
  refund_bazaar_order: "Bazaar order refunded",
  view_click_and_drop_csv: "Click & Drop CSV downloaded",
  create_bazaar_maker: "Bazaar maker created",
  update_bazaar_maker: "Bazaar maker updated",
  create_bazaar_product: "Bazaar product created",
  update_bazaar_product: "Bazaar product updated",
  create_bazaar_variant: "Bazaar variant created",
  update_bazaar_variant: "Bazaar variant updated",
  delete_bazaar_variant: "Bazaar variant deleted",
  adjust_bazaar_stock: "Bazaar stock adjusted",
  upload_bazaar_image: "Bazaar image uploaded",
  ai_analyze_bazaar_image: "Bazaar AI image analysis",
  delete_bazaar_product: "Bazaar product deleted",
  delete_bazaar_maker: "Bazaar maker deleted",
  send_bazaar_inquiry_reply: "Bazaar inquiry reply sent",
  update_bazaar_inquiry_status: "Bazaar inquiry status changed",
  log_manual_inquiry_message: "Bazaar inquiry note added",
  send_bazaar_order_message: "Bazaar customer email sent",
  push_to_click_and_drop: "Pushed to Click & Drop",
  delete_bazaar_order: "Bazaar order deleted",
  delete_donation: "Donation deleted",
  upload_media: "Media uploaded",
  delete_media: "Media deleted",
  update_media_metadata: "Media metadata updated",
  short_link_created: "Short link created",
  short_link_archived: "Short link archived",
  short_link_restored: "Short link restored",
  banner_updated: "Site banner updated",
  featured_campaign_updated: "Featured campaign updated",
  spotlight_created: "/now spotlight set",
  spotlight_created_from_post: "/now spotlight set from post",
  spotlight_extended: "/now spotlight extended",
  spotlight_cleared: "/now spotlight cleared",
  first_response_packet_drafted: "Launch packet drafted",
  first_response_event_reviewed: "Emergency event reviewed",
  first_response_event_dismissed: "Emergency event dismissed",
  first_response_event_deleted: "Emergency event deleted",
  first_response_appeal_launched: "Emergency appeal launched",
  social_post_logged: "Social post logged",
  deck_marked_as_posted: "Deck marked as posted",
  bio_link_pointed_at_post: "Bio link pointed at post",
  social_post_archived: "Social post archived",
  social_post_restored: "Social post restored",
  media_uploaded: "Media uploaded to library",
  media_saved_to_library: "Media saved to library",
  media_edited: "Media library item edited",
  media_archived_from_library: "Media library item archived",
  media_storage_scan: "Storage orphan scan run",
  media_retag_proposed: "Media library item re-tag proposed (Vision)",
  first_response_test_event_created: "Test emergency event created",
  first_response_test_events_cleared: "Test emergency events cleared",
  brand_asset_uploaded: "Brand asset uploaded",
  brand_asset_archived: "Brand asset archived",
  blog_post_created: "Blog draft created",
  blog_post_updated: "Blog post edited",
  blog_post_submitted: "Blog post submitted for review",
  blog_post_published: "Blog post published",
  blog_post_unpublished: "Blog post unpublished",
  blog_post_returned_to_draft: "Blog post returned to draft",
  blog_post_archived: "Blog post archived",
  blog_writer_added: "Blog writer added",
  blog_writer_removed: "Blog writer removed",
  orphan_created: "Orphan profile created",
  orphan_updated: "Orphan profile edited",
  orphan_status_changed: "Orphan status changed",
  orphan_deleted: "Orphan profile deleted",
  orphan_update_created: "Orphan update created",
  orphan_update_updated: "Orphan update edited",
  orphan_update_published: "Orphan update published",
  orphan_update_unpublished: "Orphan update unpublished",
  orphan_media_uploaded: "Orphan media uploaded",
  orphan_media_deleted: "Orphan media deleted",
  sponsor_invited: "Sponsor invited",
  sponsorship_linked: "Sponsor linked to orphan",
  sponsorship_paused: "Sponsorship paused",
  sponsorship_ended: "Sponsorship ended",
  sponsor_suspended: "Sponsor account suspended",
  sponsor_mfa_reset: "Sponsor 2FA reset",
  sponsor_data_export_fulfilled: "Sponsor data export fulfilled",
  sponsor_erasure_fulfilled: "Sponsor erasure fulfilled",
};

// Audit "actions" aren't lifecycle statuses, so they live here rather
// than in admin-status — but they reuse the shared tone palette
// (outline variant) so the colours match the rest of the admin.
const ACTION_TONE: Record<AdminAction, StatusTone> = {
  sign_in: "positive",
  sign_in_failed: "warning",
  sign_in_rate_limited: "critical",
  sign_out: "neutral",
  admin_password_changed: "warning",
  confirm_offline_donation: "positive",
  issue_manual_receipt: "neutral",
  view_gift_aid_csv: "warning",
  view_donations_csv: "warning",
  view_reconciliation_csv: "warning",
  refund_donation: "critical",
  resend_receipt: "positive",
  cancel_subscription: "warning",
  send_portal_link: "positive",
  send_donation_message: "positive",
  backfill_livemode: "neutral",
  mark_bazaar_order_shipped: "positive",
  update_bazaar_order_notes: "neutral",
  resend_bazaar_shipping_email: "positive",
  mark_bazaar_order_delivered: "positive",
  refund_bazaar_order: "critical",
  view_click_and_drop_csv: "warning",
  create_bazaar_maker: "neutral",
  update_bazaar_maker: "neutral",
  create_bazaar_product: "neutral",
  update_bazaar_product: "neutral",
  create_bazaar_variant: "neutral",
  update_bazaar_variant: "neutral",
  delete_bazaar_variant: "warning",
  adjust_bazaar_stock: "warning",
  upload_bazaar_image: "neutral",
  ai_analyze_bazaar_image: "positive",
  delete_bazaar_product: "critical",
  delete_bazaar_maker: "critical",
  send_bazaar_inquiry_reply: "positive",
  update_bazaar_inquiry_status: "neutral",
  log_manual_inquiry_message: "neutral",
  send_bazaar_order_message: "positive",
  push_to_click_and_drop: "info",
  delete_bazaar_order: "critical",
  delete_donation: "critical",
  upload_media: "neutral",
  delete_media: "critical",
  update_media_metadata: "neutral",
  short_link_created: "positive",
  short_link_archived: "neutral",
  short_link_restored: "positive",
  banner_updated: "warning",
  featured_campaign_updated: "neutral",
  spotlight_created: "positive",
  spotlight_created_from_post: "positive",
  spotlight_extended: "positive",
  spotlight_cleared: "neutral",
  first_response_packet_drafted: "positive",
  first_response_event_reviewed: "neutral",
  first_response_event_dismissed: "neutral",
  first_response_event_deleted: "warning",
  first_response_appeal_launched: "critical",
  social_post_logged: "positive",
  deck_marked_as_posted: "positive",
  bio_link_pointed_at_post: "positive",
  social_post_archived: "neutral",
  social_post_restored: "positive",
  media_uploaded: "warning",
  media_saved_to_library: "positive",
  media_edited: "neutral",
  media_archived_from_library: "neutral",
  media_storage_scan: "warning",
  media_retag_proposed: "warning",
  first_response_test_event_created: "warning",
  first_response_test_events_cleared: "neutral",
  brand_asset_uploaded: "positive",
  brand_asset_archived: "neutral",
  blog_post_created: "neutral",
  blog_post_updated: "neutral",
  blog_post_submitted: "warning",
  blog_post_published: "positive",
  blog_post_unpublished: "warning",
  blog_post_returned_to_draft: "neutral",
  blog_post_archived: "critical",
  blog_writer_added: "positive",
  blog_writer_removed: "critical",
  orphan_created: "positive",
  orphan_updated: "neutral",
  orphan_status_changed: "warning",
  orphan_deleted: "critical",
  orphan_update_created: "neutral",
  orphan_update_updated: "neutral",
  orphan_update_published: "positive",
  orphan_update_unpublished: "warning",
  orphan_media_uploaded: "neutral",
  orphan_media_deleted: "critical",
  sponsor_invited: "positive",
  sponsorship_linked: "positive",
  sponsorship_paused: "warning",
  sponsorship_ended: "warning",
  sponsor_suspended: "critical",
  sponsor_mfa_reset: "warning",
  sponsor_data_export_fulfilled: "positive",
  sponsor_erasure_fulfilled: "critical",
};

/** Action pill — reuses the shared outline tone classes. */
function AuditActionBadge({ action }: { action: AdminAction }) {
  const tone = ACTION_TONE[action] ?? "neutral";
  const label = ACTION_LABEL[action] ?? action;
  return (
    <span
      className={cn(
        "inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold",
        TONE_CLASSES.outline[tone]
      )}
    >
      {label}
    </span>
  );
}

/** Expandable metadata / user-agent cell. */
function AuditDetail({ row }: { row: AdminAuditLogRow }) {
  const hasMeta = row.metadata && Object.keys(row.metadata).length > 0;
  if (!hasMeta && !row.userAgent) {
    return <span className="text-charcoal/30 text-[11px]">—</span>;
  }
  return (
    <details className="text-[11px]">
      <summary className="cursor-pointer text-charcoal/60 hover:text-charcoal transition-colors">
        View
      </summary>
      {hasMeta && (
        <pre className="mt-2 p-2 bg-cream rounded-lg text-[10px] text-charcoal/70 whitespace-pre-wrap break-words max-w-[28rem] overflow-x-auto">
          {JSON.stringify(row.metadata, null, 2)}
        </pre>
      )}
      {row.userAgent && (
        <p className="mt-2 text-[10px] text-charcoal/40 italic break-all">
          UA: {row.userAgent}
        </p>
      )}
    </details>
  );
}

/**
 * Audit log viewer.
 *
 * Lists the most recent 200 admin actions sorted by timestamp DESC.
 * Each row shows: when, who, what, target (where applicable), IP.
 * The metadata jsonb is rendered as collapsed JSON in a <details>
 * element so trustees can drill in without bloating the row height.
 *
 * Pagination: 50 rows per page, newest first, navigated via ?page=N
 * (zero-based). hasMore is detected by over-fetching one row, so there's
 * no separate COUNT query. Server-side filtering is a later phase.
 */
export default async function AdminAuditLogPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  await requireRoleAdmin();
  const sp = await searchParams;
  const requestedPage = Number.parseInt(sp.page ?? "0", 10);
  const { rows, hasMore, page } = await fetchAdminAuditLogPage(
    Number.isFinite(requestedPage) ? requestedPage : 0,
    PAGE_SIZE
  );

  const columns: Column<AdminAuditLogRow>[] = [
    {
      key: "when",
      header: "When",
      secondary: true,
      cell: (row) => formatAdminDate(row.createdAt),
      cellClassName: "whitespace-nowrap text-charcoal/70 align-top",
    },
    {
      key: "who",
      header: "Who",
      cell: (row) =>
        row.userEmail ? (
          <span className="text-charcoal text-[12px]">{row.userEmail}</span>
        ) : (
          <span className="text-charcoal/40 text-[11px] italic">scripted / bearer</span>
        ),
      cellClassName: "align-top",
    },
    {
      key: "action",
      header: "Action",
      primary: true,
      cell: (row) => <AuditActionBadge action={row.action} />,
      cellClassName: "align-top",
    },
    {
      key: "target",
      header: "Target",
      cell: (row) =>
        row.targetId ? (
          <span className="font-mono text-[11px] text-charcoal/70 break-all">
            {row.targetId}
          </span>
        ) : (
          <span className="text-charcoal/30 text-[11px]">—</span>
        ),
      cellClassName: "align-top",
    },
    {
      key: "ip",
      header: "IP",
      cell: (row) => row.ip ?? "—",
      cellClassName: "text-charcoal/60 text-[11px] font-mono whitespace-nowrap align-top",
    },
    {
      key: "detail",
      header: "Detail",
      isAction: true,
      cell: (row) => <AuditDetail row={row} />,
      cellClassName: "align-top",
    },
  ];

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <PageHeader
        eyebrow="Compliance"
        title="Audit log"
        description={
          <>
            Every admin action is recorded here. Sign-ins (including failures),
            refunds, subscription cancellations, Gift Aid CSV downloads —
            anything privileged. Use this when answering &quot;who looked at
            this donor&apos;s record?&quot; or investigating a credential leak.
          </>
        }
      />

      <ResponsiveTable<AdminAuditLogRow>
        rows={rows}
        getRowKey={(row) => row.id}
        columns={columns}
        empty={
          <EmptyState
            title={page > 0 ? "Nothing on this page" : "No admin actions logged yet"}
            description={
              page > 0
                ? "You've reached the end of the log."
                : "The first entry will be your sign-in."
            }
          />
        }
      />

      {(rows.length > 0 || page > 0) && (
        <div className="mt-5 flex items-center justify-between gap-3">
          <p className="text-[11px] text-charcoal/40">
            Page {page + 1} · {PAGE_SIZE} per page · newest first
          </p>
          <div className="flex items-center gap-2">
            {page > 0 ? (
              <Button
                href={`/admin/audit-log?page=${page - 1}`}
                variant="outline"
                size="sm"
              >
                ← Newer
              </Button>
            ) : (
              <span className="inline-flex items-center rounded-full border border-charcoal/10 px-3 py-1.5 text-sm font-semibold text-charcoal/30">
                ← Newer
              </span>
            )}
            {hasMore ? (
              <Button
                href={`/admin/audit-log?page=${page + 1}`}
                variant="outline"
                size="sm"
              >
                Older →
              </Button>
            ) : (
              <span className="inline-flex items-center rounded-full border border-charcoal/10 px-3 py-1.5 text-sm font-semibold text-charcoal/30">
                Older →
              </span>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
