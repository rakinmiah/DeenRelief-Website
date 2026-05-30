/**
 * /admin/social/first-response/[id] — Phase 6 redirect shim.
 *
 * The legacy auto-gen packet detail page used to live here. Phase 6
 * pivots the SMM's primary entry point to the deck builder, so this
 * route now 308 (permanent) redirects to `/admin/social/deck-builder/
 * [id]` and the actual legacy view lives at `../legacy/[id]/`.
 *
 * Why a redirect and not a hard delete: the legacy view is still
 * reachable at `/admin/social/first-response/legacy/[id]/` for the
 * SMM to fall back to if the deck builder hits a bug, and any
 * historical links (push notifications, emails sent before the
 * pivot, browser history) still resolve cleanly to the new flow.
 */

import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function FirstResponsePacketRedirect({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/admin/social/deck-builder/${id}`);
}
