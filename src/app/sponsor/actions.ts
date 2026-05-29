"use server";

import { headers } from "next/headers";
import { getSponsorUser } from "@/lib/supabase-server";
import { clientIpFromRequest } from "@/lib/admin-audit";
import {
  activateSponsor,
  setMarketingConsent,
  createDataRequest,
} from "@/lib/sponsor-consent";

/**
 * Server actions for the sponsor portal. Each one re-derives the verified
 * sponsor from the session cookie via getSponsorUser() — the client never
 * passes its own id, so there's nothing to spoof. Writes happen through the
 * service-role helpers in sponsor-consent.ts because sponsors are read-only
 * on these tables.
 */

async function requestContext() {
  const h = await headers();
  const fauxRequest = new Request("http://server-action.local", {
    headers: {
      "user-agent": h.get("user-agent") ?? "",
      "x-forwarded-for": h.get("x-forwarded-for") ?? "",
    },
  });
  return {
    ip: clientIpFromRequest(fauxRequest),
    userAgent: h.get("user-agent"),
  };
}

/**
 * Finalise account activation after the sponsor sets their password. Marks
 * the profile active and records the mandatory activation consents (account
 * terms, privacy policy, child-media confidentiality).
 */
export async function activateAccountAction(): Promise<{
  ok: boolean;
  error?: string;
}> {
  const user = await getSponsorUser();
  if (!user) return { ok: false, error: "Not signed in." };
  const { ip, userAgent } = await requestContext();
  return activateSponsor({ sponsorId: user.id, ip, userAgent });
}

export async function setMarketingConsentAction(
  granted: boolean
): Promise<{ ok: boolean; error?: string }> {
  const user = await getSponsorUser();
  if (!user) return { ok: false, error: "Not signed in." };
  const { ip, userAgent } = await requestContext();
  return setMarketingConsent({ sponsorId: user.id, granted, ip, userAgent });
}

export async function requestDataExportAction(): Promise<{
  ok: boolean;
  error?: string;
}> {
  const user = await getSponsorUser();
  if (!user) return { ok: false, error: "Not signed in." };
  return createDataRequest({ sponsorId: user.id, requestType: "export" });
}

export async function requestErasureAction(): Promise<{
  ok: boolean;
  error?: string;
}> {
  const user = await getSponsorUser();
  if (!user) return { ok: false, error: "Not signed in." };
  return createDataRequest({ sponsorId: user.id, requestType: "erasure" });
}
