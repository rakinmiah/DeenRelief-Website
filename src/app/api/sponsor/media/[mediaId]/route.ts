import { NextResponse } from "next/server";
import { headers } from "next/headers";
import {
  createServerSupabase,
  getSponsorUser,
  sponsorMfaBlocked,
} from "@/lib/supabase-server";
import {
  createSignedOrphanMediaUrl,
  logChildMediaAccess,
} from "@/lib/orphan-media";
import { clientIpFromRequest } from "@/lib/admin-audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Mint a short-lived signed URL for one private child-media object.
 *
 * SECURITY — order matters:
 *   1. Identify the sponsor (getSponsorUser) → 401 if none.
 *   2. Load the media row with the sponsor's RLS-SCOPED client. The row comes
 *      back ONLY if the sponsor is actively linked to that child (the
 *      orphan_update_media SELECT policy enforces it). null → 404. This is
 *      the authorisation decision, made by the database.
 *   3. ONLY THEN mint a signed URL with the service-role client. Minting
 *      before checking could leak access; never reorder these.
 *   4. Record the issuance in the safeguarding access log.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ mediaId: string }> }
) {
  const { mediaId } = await params;

  const user = await getSponsorUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  // Block sessions that still owe a second factor (defence in depth — the
  // orphan page already redirects them, but never serve child media to an
  // un-stepped-up session).
  if (await sponsorMfaBlocked()) {
    return NextResponse.json({ error: "Verification required." }, { status: 403 });
  }

  // RLS-scoped read — the gate. Service-role is NOT used here.
  const supabase = await createServerSupabase();
  const { data: row } = await supabase
    .from("orphan_update_media")
    .select("id, orphan_id, storage_path")
    .eq("id", mediaId)
    .maybeSingle();

  if (!row) {
    // Either it doesn't exist or this sponsor isn't linked — don't distinguish.
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const signedUrl = await createSignedOrphanMediaUrl(row.storage_path as string);
  if (!signedUrl) {
    return NextResponse.json(
      { error: "Couldn't prepare the media." },
      { status: 500 }
    );
  }

  // Safeguarding trail (service-role; fire-and-forget).
  const h = await headers();
  const fauxReq = new Request("http://server.local", {
    headers: {
      "user-agent": h.get("user-agent") ?? "",
      "x-forwarded-for": h.get("x-forwarded-for") ?? "",
    },
  });
  await logChildMediaAccess({
    sponsorId: user.id,
    orphanId: row.orphan_id as string,
    mediaId: row.id as string,
    action: "signed_url_issued",
    ip: clientIpFromRequest(fauxReq),
    userAgent: h.get("user-agent"),
  });

  // no-store so the signed URL isn't cached by intermediaries past its TTL.
  return NextResponse.json(
    { url: signedUrl },
    { headers: { "Cache-Control": "no-store" } }
  );
}
