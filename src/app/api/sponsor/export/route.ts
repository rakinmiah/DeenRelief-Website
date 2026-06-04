import { NextResponse } from "next/server";
import {
  createServerSupabase,
  getSponsorUser,
  sponsorMfaBlocked,
} from "@/lib/supabase-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Subject-access export (UK GDPR Art. 15). Streams a JSON file containing the
 * personal data we hold about the SIGNED-IN sponsor only.
 *
 * Every read uses the sponsor's RLS-scoped client, so the export can only
 * ever contain that sponsor's own rows — there's no way to widen it. We
 * include the sponsorship links and the display data of the children they're
 * entitled to see, their consent history, and any prior data requests.
 */
export async function GET() {
  const user = await getSponsorUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  if (await sponsorMfaBlocked()) {
    return NextResponse.json({ error: "Verification required." }, { status: 403 });
  }

  const supabase = await createServerSupabase();

  const [profile, sponsorships, orphans, consents, requests] = await Promise.all([
    supabase.from("sponsor_profiles").select("*").eq("id", user.id).maybeSingle(),
    supabase.from("sponsorships").select("*"),
    supabase
      .from("orphans")
      .select("slug, display_name, country, region, age_band, status"),
    supabase.from("sponsor_consents").select("*"),
    supabase.from("sponsor_data_requests").select("*"),
  ]);

  const payload = {
    exportedAt: new Date().toISOString(),
    account: {
      id: user.id,
      email: user.email,
      createdAt: user.created_at,
    },
    profile: profile.data ?? null,
    sponsorships: sponsorships.data ?? [],
    sponsoredChildren: orphans.data ?? [],
    consentHistory: consents.data ?? [],
    dataRequests: requests.data ?? [],
  };

  return new NextResponse(JSON.stringify(payload, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="deenrelief-my-data.json"`,
      "Cache-Control": "no-store",
    },
  });
}
