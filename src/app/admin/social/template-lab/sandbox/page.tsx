import type { Metadata } from "next";
import { requireAdminSession } from "@/lib/admin-session";
import { resolveBrandLogo } from "@/lib/social-editor/logo";
import SandboxEditor from "./SandboxEditor";

export const metadata: Metadata = {
  title: "Editor sandbox | Deen Relief Admin",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/**
 * /admin/social/template-lab/sandbox — a free-form editor playground. Open a
 * blank canvas (square or landscape) with the full editor toolkit and Export,
 * without an event or any Claude-driven content generation — so testing the
 * editor never costs tokens. Gated to the social-section owner by the section
 * layout. Nothing here is persisted (Export to keep output).
 */
export default async function SandboxPage() {
  await requireAdminSession();
  const [{ logo }, { logo: logoLight }] = await Promise.all([
    resolveBrandLogo("logo-on-dark"),
    resolveBrandLogo("logo-on-light"),
  ]);
  return <SandboxEditor logo={logo} logoLight={logoLight} />;
}
