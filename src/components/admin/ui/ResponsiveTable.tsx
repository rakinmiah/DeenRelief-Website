import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * One data list, two layouts. On md+ it renders a real <table>; below
 * md it stacks each row into a card so dense admin tables stop forcing
 * a horizontal scroll on phones.
 *
 * Define the columns once; both layouts are driven from the same
 * definition, so desktop and mobile never drift:
 *
 *   <ResponsiveTable
 *     rows={orders}
 *     getRowKey={(o) => o.id}
 *     rowHref={(o) => `/admin/bazaar/orders/${o.id}`}
 *     rowLabel={(o) => `Order ${o.reference}`}
 *     columns={[
 *       { key: "ref", header: "Order", primary: true, cell: (o) => o.reference },
 *       { key: "status", header: "Status", cell: (o) => <StatusBadge domain="bazaarOrder" status={o.status} /> },
 *       { key: "total", header: "Total", align: "right", cell: (o) => fmtGBP(o.total) },
 *     ]}
 *     empty={<EmptyState title="No orders yet" />}
 *   />
 *
 * Row navigation (when `rowHref` is set):
 *   - Desktop: the `primary` column becomes a link.
 *   - Mobile: the whole card is tappable via a stretched overlay link
 *     (`rowLabel` supplies its accessible name). Cells flagged
 *     `isAction` sit above the overlay so their own buttons stay
 *     clickable.
 *
 * Server-component safe — no hooks, render-prop `cell` functions run
 * on the server.
 */

export interface Column<T> {
  /** Stable key for React + the column. */
  key: string;
  /** Header label (also used as the field label on mobile cards). */
  header: ReactNode;
  /** Cell renderer. */
  cell: (row: T) => ReactNode;
  align?: "left" | "right" | "center";
  /** Heading on mobile; the navigating link cell on desktop. */
  primary?: boolean;
  /**
   * Pulled up to the top-right of the mobile card (beside the primary
   * heading) — use for the row's headline value, e.g. an amount or a
   * status. Without it, the first remaining field is used.
   */
  secondary?: boolean;
  /** Omit this column from the mobile card layout. */
  hideOnMobile?: boolean;
  /**
   * Cell carries its own interactive controls (buttons, menus). On
   * mobile it renders full-width at the foot of the card and sits
   * above the row overlay link so its controls remain clickable.
   */
  isAction?: boolean;
  headerClassName?: string;
  cellClassName?: string;
}

const ALIGN: Record<NonNullable<Column<unknown>["align"]>, string> = {
  left: "text-left",
  right: "text-right",
  center: "text-center",
};

export default function ResponsiveTable<T>({
  columns,
  rows,
  getRowKey,
  rowHref,
  rowLabel,
  rowClassName,
  empty,
  className,
}: {
  columns: Column<T>[];
  rows: T[];
  getRowKey: (row: T) => string;
  rowHref?: (row: T) => string;
  /** Accessible name for the mobile overlay link. */
  rowLabel?: (row: T) => string;
  /** Extra classes per row/card — e.g. a tint for refund or flagged rows. */
  rowClassName?: (row: T) => string | undefined;
  empty?: ReactNode;
  className?: string;
}) {
  if (rows.length === 0) {
    return empty ? <>{empty}</> : null;
  }

  const primaryCol = columns.find((c) => c.primary) ?? columns[0];
  const actionCols = columns.filter((c) => c.isAction);
  // Columns eligible to show as labelled fields on the mobile card.
  const fieldCols = columns.filter(
    (c) => !c.hideOnMobile && c !== primaryCol && !c.isAction
  );
  // The headline value pulled up beside the card heading: an explicit
  // `secondary` column, else the first remaining field.
  const secondaryCol = fieldCols.find((c) => c.secondary) ?? fieldCols[0];
  const detailCols = fieldCols.filter((c) => c !== secondaryCol);

  return (
    <div className={className}>
      {/* ── Desktop table (md+) ── */}
      <div className="hidden md:block overflow-x-auto rounded-2xl border border-charcoal/8 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-charcoal/8 bg-charcoal/[0.02]">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={cn(
                    "px-4 py-3 text-[11px] font-bold uppercase tracking-[0.08em] text-charcoal/45 whitespace-nowrap",
                    ALIGN[col.align ?? "left"],
                    col.headerClassName
                  )}
                  scope="col"
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const href = rowHref?.(row);
              return (
                <tr
                  key={getRowKey(row)}
                  className={cn(
                    "border-b border-charcoal/5 last:border-0 hover:bg-cream/60 transition-colors",
                    rowClassName?.(row)
                  )}
                >
                  {columns.map((col) => {
                    const content = col.cell(row);
                    const isLinkCell = col === primaryCol && href;
                    return (
                      <td
                        key={col.key}
                        className={cn(
                          "px-4 py-3 align-middle text-charcoal/80",
                          ALIGN[col.align ?? "left"],
                          col.cellClassName
                        )}
                      >
                        {isLinkCell ? (
                          <Link
                            href={href}
                            className="font-semibold text-charcoal hover:text-green transition-colors"
                          >
                            {content}
                          </Link>
                        ) : (
                          content
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ── Mobile cards (<md) ── */}
      <div className="md:hidden space-y-3">
        {rows.map((row) => {
          const href = rowHref?.(row);
          return (
            <div
              key={getRowKey(row)}
              className={cn(
                "relative rounded-2xl border border-charcoal/8 bg-white p-4",
                rowClassName?.(row)
              )}
            >
              {href && (
                <Link
                  href={href}
                  aria-label={rowLabel?.(row) ?? "View details"}
                  className="absolute inset-0 rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-charcoal/30"
                />
              )}

              {/* Heading row: primary value + the headline secondary
                  value (amount / status) pulled up for scanning. */}
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 font-heading font-semibold text-charcoal">
                  {primaryCol.cell(row)}
                </div>
                {secondaryCol && (
                  <div className="relative z-10 shrink-0 text-right">
                    {secondaryCol.cell(row)}
                  </div>
                )}
              </div>

              {/* Remaining fields as label / value rows. */}
              {detailCols.length > 0 && (
                <dl className="mt-3 space-y-1.5">
                  {detailCols.map((col) => (
                    <div
                      key={col.key}
                      className="flex items-baseline justify-between gap-3 text-sm"
                    >
                      <dt className="text-[11px] font-bold uppercase tracking-[0.08em] text-charcoal/40 shrink-0">
                        {col.header}
                      </dt>
                      <dd className="text-charcoal/80 text-right min-w-0">
                        {col.cell(row)}
                      </dd>
                    </div>
                  ))}
                </dl>
              )}

              {/* Action cells sit above the overlay so they stay tappable. */}
              {actionCols.length > 0 && (
                <div className="relative z-10 mt-3 flex flex-wrap items-center gap-2 border-t border-charcoal/5 pt-3">
                  {actionCols.map((col) => (
                    <div key={col.key}>{col.cell(row)}</div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
