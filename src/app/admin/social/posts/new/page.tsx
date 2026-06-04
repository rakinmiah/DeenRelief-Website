import type { Metadata } from "next";
import Link from "next/link";
import { requireAdminSession } from "@/lib/admin-session";
import { getSupabaseAdmin } from "@/lib/supabase";
import type { DeckRecipeEntry } from "../actions";
import LogPostForm, {
  type ShortLinkOption,
  type EventOption,
} from "./LogPostForm";

/** Roles a templateId can belong to, longest-compound first so "multistat"
 *  wins over "stat" and "beforeafter" isn't mis-split. Template ids embed
 *  their role name (hero-a, fact-photo, multistat-a, …). */
const RECIPE_ROLE_KEYS = [
  "beforeafter",
  "multistat",
  "testimony",
  "response",
  "tiers",
  "hero",
  "fact",
  "stat",
  "cta",
] as const;

function inferRoleFromTemplateId(templateId: string): string {
  const id = templateId.toLowerCase();
  for (const role of RECIPE_ROLE_KEYS) if (id.includes(role)) return role;
  return "fact"; // sensible generic middle
}

export const metadata: Metadata = {
  title: "Log a post | Deen Relief Admin",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/**
 * /admin/social/posts/new — log a published post.
 *
 * The SMM submits this after she's already posted to Instagram /
 * TikTok / etc. The form is built around the short link as the
 * attribution anchor — pick the link you put in the post and the
 * dashboard does the rest.
 */
export default async function NewPostPage({
  searchParams,
}: {
  searchParams?: Promise<{ eventId?: string }>;
}) {
  await requireAdminSession();

  const sp = (await searchParams) ?? {};
  const initialEventId = typeof sp.eventId === "string" ? sp.eventId : "";

  // Pre-load recent active short links for the dropdown. 50 is plenty
  // for the SMM's most-recent options; older ones can be selected by
  // creating the post and editing, or by searching.
  const supabase = getSupabaseAdmin();
  const { data: links } = await supabase
    .from("short_links")
    .select("id, slug, campaign_slug, platform, notes")
    .is("archived_at", null)
    .order("created_at", { ascending: false })
    .limit(50);

  const shortLinks: ShortLinkOption[] = (links ?? []).map((l) => ({
    id: l.id,
    slug: l.slug,
    campaignSlug: l.campaign_slug,
    platform: l.platform,
    notes: l.notes,
  }));

  // Recent news reports she may be posting about, each with the design
  // recipe recovered from its guided deck draft (if one exists) so a
  // manually-logged post can still carry design + topic provenance.
  const { data: events } = await supabase
    .from("emergency_events")
    .select("id, title, region, detected_at")
    .order("detected_at", { ascending: false })
    .limit(30);

  const eventIds = (events ?? []).map((e) => e.id as string);
  const recipeByEvent = new Map<string, DeckRecipeEntry[]>();
  if (eventIds.length) {
    const { data: drafts } = await supabase
      .from("deck_drafts")
      .select("event_id, slides, updated_at")
      .in("event_id", eventIds)
      .order("updated_at", { ascending: false });
    for (const d of drafts ?? []) {
      const eid = d.event_id as string;
      if (recipeByEvent.has(eid)) continue; // keep the most recently updated
      const slides = Array.isArray(d.slides) ? d.slides : [];
      const recipe = slides
        .map((s: unknown) =>
          s && typeof s === "object"
            ? String((s as { templateId?: unknown }).templateId ?? "")
            : ""
        )
        .filter(Boolean)
        .slice(0, 20)
        .map((templateId: string) => ({
          role: inferRoleFromTemplateId(templateId),
          templateId,
        }));
      if (recipe.length) recipeByEvent.set(eid, recipe);
    }
  }

  const eventOptions: EventOption[] = (events ?? []).map((e) => ({
    id: e.id as string,
    title: (e.title as string) ?? "Untitled report",
    region: (e.region as string | null) ?? null,
    deckRecipe: recipeByEvent.get(e.id as string) ?? null,
  }));

  return (
    <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
      <div className="mb-6 md:mb-8">
        <Link
          href="/admin/social/performance"
          className="inline-block text-[12px] font-semibold uppercase tracking-[0.1em] text-amber-dark mb-2 hover:text-amber-darker"
        >
          ← Performance
        </Link>
        <h1 className="text-3xl md:text-4xl font-heading font-bold text-charcoal tracking-[-0.01em]">
          Log a post
        </h1>
        <p className="text-charcoal/70 text-[15px] leading-relaxed mt-2 max-w-2xl">
          Tell us about a post you just published. Pick the short link you used
          so we can track its clicks and donations.
        </p>
      </div>

      <LogPostForm
        shortLinks={shortLinks}
        events={eventOptions}
        initialEventId={initialEventId}
      />
    </main>
  );
}
