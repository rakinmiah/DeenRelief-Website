import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireAdminSession } from "@/lib/admin-session";
import { resolveBrandLogo } from "@/lib/social-editor/logo";
import { buildEditableTemplate, type SlideContent } from "@/lib/social-editor/presets";
import { getTemplateOverride } from "@/lib/template-overrides";
import type { EditorSlide } from "@/lib/social-editor/types";
import { VARIANTS } from "../../templateData";
import CanvasDeckEditor from "../../../deck-builder/[eventId]/editor/CanvasDeckEditor";

export const metadata: Metadata = {
  title: "Edit template | Deen Relief Admin",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/**
 * /admin/social/template-lab/edit/[templateId] — edit one of the 95 slide
 * templates in the full canvas editor and save the result as the official
 * Deen Relief version. The template is loaded with sample copy + bind tags on
 * the content layers (so design edits stick but copy/photo still fill on use).
 * "Save as template" PUTs the slide to the override store; "Reset to default"
 * deletes it. Gated to the social-section owner by the section layout.
 */
export default async function EditTemplatePage({
  params,
}: {
  params: Promise<{ templateId: string }>;
}) {
  await requireAdminSession();
  const { templateId } = await params;
  const variant = VARIANTS.find((v) => v.id === templateId);
  if (!variant) notFound();

  const [{ logo }, { logo: logoLight }] = await Promise.all([
    resolveBrandLogo("logo-on-dark"),
    resolveBrandLogo("logo-on-light"),
  ]);

  const content: SlideContent = { ...variant.c, logo, logoLight };
  // Pick up where she left off if there's already a saved override; otherwise
  // build the editable template fresh (sample copy + bind tags).
  const override = await getTemplateOverride(templateId);
  const slide: EditorSlide = override ?? buildEditableTemplate(templateId, content);

  return (
    <div className="fixed inset-0 z-50 bg-[#F4F4F2]">
      <CanvasDeckEditor
        initialDeck={[slide]}
        logo={logo}
        logoLight={logoLight}
        templateId={templateId}
        backHref="/admin/social/template-lab/view"
        title={`Template · ${variant.label}`}
      />
    </div>
  );
}
