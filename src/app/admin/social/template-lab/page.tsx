import type { Metadata } from "next";
import { requireAdminSession } from "@/lib/admin-session";
import { getActiveBrandAsset } from "@/lib/brand-assets";
import type { BrandLogo } from "@/lib/social-editor/presets";
import HeroLab from "./HeroLab";

export const metadata: Metadata = {
  title: "Template Lab | Deen Relief Admin",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/**
 * /admin/social/template-lab — fidelity preview for the faithful Hero
 * port (the "5-per-style" pilot). Renders all five Hero layouts with the
 * real on-dark logo + a sample photo so we can compare against the
 * Claude Design library before porting the remaining slide types.
 */
export default async function TemplateLabPage() {
  await requireAdminSession();

  const asset = await getActiveBrandAsset("logo-on-dark");
  const logo: BrandLogo | null =
    asset && asset.width && asset.height
      ? { url: asset.publicUrl, aspect: asset.width / asset.height }
      : null;

  return <HeroLab logo={logo} hasLogo={!!asset} />;
}
