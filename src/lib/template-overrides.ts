/**
 * Template overrides — saved "official template" edits.
 *
 * The slide templates live in code (presetForTemplate). When the SMM edits a
 * template and saves it, we persist the edited EditorSlide here keyed by
 * template id. Loaders consult these before falling back to the code preset.
 *
 * Service-role only (called from the admin API after requireAdminSession).
 */
import { getSupabaseAdmin } from "@/lib/supabase";
import type { EditorSlide } from "@/lib/social-editor/types";

const COLS = "template_id, slide, updated_by_email, updated_at";

/** All overrides as a map { templateId → EditorSlide }, for bulk loaders. */
export async function listTemplateOverrides(): Promise<Record<string, EditorSlide>> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.from("template_overrides").select(COLS);
  if (error) throw error;
  const out: Record<string, EditorSlide> = {};
  for (const row of data ?? []) {
    out[row.template_id as string] = row.slide as EditorSlide;
  }
  return out;
}

/** A single override, or null if the template uses its code default. */
export async function getTemplateOverride(templateId: string): Promise<EditorSlide | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("template_overrides")
    .select(COLS)
    .eq("template_id", templateId)
    .maybeSingle();
  if (error) throw error;
  return (data?.slide as EditorSlide) ?? null;
}

/** Insert or replace the override for a template. */
export async function upsertTemplateOverride(
  templateId: string,
  slide: EditorSlide,
  email: string | null
): Promise<void> {
  const supabase = getSupabaseAdmin();
  const now = new Date().toISOString();
  const { error } = await supabase.from("template_overrides").upsert(
    {
      template_id: templateId,
      slide,
      updated_by_email: email,
      updated_at: now,
    },
    { onConflict: "template_id" }
  );
  if (error) throw error;
}

/** Remove an override → the template reverts to its code default. */
export async function deleteTemplateOverride(templateId: string): Promise<void> {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("template_overrides").delete().eq("template_id", templateId);
  if (error) throw error;
}
