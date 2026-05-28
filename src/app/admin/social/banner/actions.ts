"use server";

import { requireAdminSession } from "@/lib/admin-session";
import { logAdminAction } from "@/lib/admin-audit";
import { setBannerConfig, type SetBannerInput } from "@/lib/site-config";

export type BannerActionResult =
  | { ok: true }
  | { ok: false; error: string };

export async function saveBannerAction(
  input: SetBannerInput
): Promise<BannerActionResult> {
  const session = await requireAdminSession();
  const result = await setBannerConfig(input, session.email);
  if (!result.ok) return result;

  await logAdminAction({
    action: "banner_updated",
    userEmail: session.email,
    metadata: {
      active: input.active,
      theme: input.theme,
      hasLink: !!(input.linkHref && input.linkLabel),
    },
  });
  return { ok: true };
}
