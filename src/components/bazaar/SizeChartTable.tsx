import type { SizeChartRow } from "@/lib/bazaar-sizing";

/**
 * Read-only chart of every dimension per size, for the sizing
 * guide page. Server component — no interactivity, just a table.
 *
 * Two layouts: a horizontally-scrollable table on small screens
 * (so all columns are visible) and a clean grid on desktop. The
 * "Fits height" column lives in plain text so customers can
 * scan the band that matches their height.
 */

export default function SizeChartTable({
  rows,
  garmentLabel,
}: {
  rows: SizeChartRow[];
  garmentLabel: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-charcoal/10 overflow-hidden">
      <div className="px-5 sm:px-6 py-4 border-b border-charcoal/8 bg-cream/40">
        <h3 className="font-heading font-semibold text-base sm:text-lg text-charcoal">
          {garmentLabel} sizes
        </h3>
        <p className="text-charcoal/55 text-[12px] mt-0.5">
          Wearer measurements on the left, finished garment dimensions on
          the right. All measurements in cm.
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[640px]">
          <thead>
            <tr className="text-left border-b border-charcoal/8 bg-cream/20">
              {[
                "Size",
                "Fits height",
                "Bust range",
                "Garment length",
                "Garment chest",
                "Sleeve",
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
              <tr key={row.size} className="text-[14px]">
                <td className="px-4 sm:px-5 py-3 text-charcoal font-semibold whitespace-nowrap">
                  {row.size}
                </td>
                <td className="px-4 sm:px-5 py-3 text-charcoal/80 whitespace-nowrap">
                  {row.fitsHeight}
                </td>
                <td className="px-4 sm:px-5 py-3 text-charcoal/80 whitespace-nowrap tabular-nums">
                  {row.bustMinCm}–{row.bustMaxCm} cm
                </td>
                <td className="px-4 sm:px-5 py-3 text-charcoal/80 whitespace-nowrap tabular-nums">
                  {row.lengthCm} cm
                </td>
                <td className="px-4 sm:px-5 py-3 text-charcoal/80 whitespace-nowrap tabular-nums">
                  {row.garmentChestCm} cm
                </td>
                <td className="px-4 sm:px-5 py-3 text-charcoal/80 whitespace-nowrap tabular-nums">
                  {row.sleeveCm} cm
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
