import type { Metadata } from "next";
import { requireAdminSession } from "@/lib/admin-session";
import { resolveBrandLogo } from "@/lib/social-editor/logo";
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

  const { logo } = await resolveBrandLogo("logo-on-dark");

  return <HeroLab logo={logo} />;
}
