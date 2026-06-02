import type { Metadata } from "next";
import { requireAdminSession } from "@/lib/admin-session";
import { resolveBrandLogo } from "@/lib/social-editor/logo";
import TemplateSorter from "./TemplateSorter";

export const metadata: Metadata = {
  title: "View templates | Deen Relief Admin",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/**
 * /admin/social/template-lab/view — the PowerPoint-style "View templates"
 * browser, reachable from the slide editor's nav. All 95 templates in a
 * Normal-view layout: a left rail of numbered slide thumbnails grouped into
 * sections by type, plus a large preview pane for the selected slide. Each
 * slide renders through the real Satori export pipeline.
 */
export default async function ViewTemplatesPage() {
  await requireAdminSession();
  const [{ logo }, { logo: logoLight }] = await Promise.all([
    resolveBrandLogo("logo-on-dark"),
    resolveBrandLogo("logo-on-light"),
  ]);
  return <TemplateSorter logo={logo} logoLight={logoLight} />;
}
