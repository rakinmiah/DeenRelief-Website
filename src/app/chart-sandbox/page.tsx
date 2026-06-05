import { notFound } from "next/navigation";
import ChartSandbox from "./ChartSandbox";

export const dynamic = "force-dynamic";

/**
 * /chart-sandbox — a DEV-ONLY visual harness for the chart renderers. Renders
 * dummy data only (no DB, no secrets, no auth) so the charts can be inspected
 * headlessly. 404s in production so it never ships to users.
 */
export default function ChartSandboxPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <ChartSandbox />;
}
