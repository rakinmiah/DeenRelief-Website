/**
 * Template registry — the single source of truth for which
 * templates exist, grouped by category + filtered by platform.
 *
 * Pattern: each template file in templates/<id>.tsx exports a
 * default `Template` value. This registry imports them all into
 * one TEMPLATES array. The Plan page's gallery + the render
 * endpoint both consume the registry via the lookup helpers
 * below.
 *
 * Adding a template:
 *   1. Create templates/<id>.tsx exporting a default Template
 *   2. Add the import + reference in this file
 *   3. (Optional) Run the preview-builder script so the gallery
 *      shows a thumbnail at the next page load
 */

import type {
  SocialPlatform,
  Template,
  TemplateCategory,
  TemplateMeta,
} from "./types";

import igHeroMagazineCover from "./templates/ig-hero-magazine-cover";
import igHeroTypography from "./templates/ig-hero-typography";
import igStatHeadline from "./templates/ig-stat-headline";
import igTiersLadder from "./templates/ig-tiers-ladder";
import igCtaDonate from "./templates/ig-cta-donate";
import igCtaWitness from "./templates/ig-cta-witness";
import igHeroPanelRight from "./templates/ig-hero-panel-right";
import igFactTypography from "./templates/ig-fact-typography";
import igFactPhoto from "./templates/ig-fact-photo";
import igResponsePhoto from "./templates/ig-response-photo";
import igTestimonyQuote from "./templates/ig-testimony-quote";
import igTestimonyPortrait from "./templates/ig-testimony-portrait";
import igChapterNumbered from "./templates/ig-chapter-numbered";
import igCtaEngage from "./templates/ig-cta-engage";

/** Every template the deck builder knows about. Order matters —
 *  this is the default sort within a category in the gallery. */
const TEMPLATES: Template[] = [
  igHeroMagazineCover,
  igHeroTypography,
  igStatHeadline,
  igTiersLadder,
  igCtaDonate,
  igCtaWitness,
  igHeroPanelRight,
  igFactTypography,
  igFactPhoto,
  igResponsePhoto,
  igTestimonyQuote,
  igTestimonyPortrait,
  igChapterNumbered,
  igCtaEngage,
];

/** Build a lookup map once at module init. */
const BY_ID = new Map<string, Template>(TEMPLATES.map((t) => [t.meta.id, t]));

export function getTemplate(id: string): Template | null {
  return BY_ID.get(id) ?? null;
}

/** List ALL templates with metadata only — used by the gallery API
 *  endpoint to feed the Plan page without sending the JSX render
 *  functions over the wire. */
export function listTemplateMetas(): TemplateMeta[] {
  return TEMPLATES.map((t) => t.meta);
}

/** Filter for a single platform. IG carousels and FB carousels
 *  share the same 1080×1080 templates per Phase 5c — passing
 *  "instagram" or "facebook" returns the same set. X-specific
 *  templates (1200×675) ship under platform "x". */
export function listTemplatesForPlatform(
  platform: SocialPlatform
): TemplateMeta[] {
  return TEMPLATES.filter((t) => t.meta.platforms.includes(platform)).map(
    (t) => t.meta
  );
}

/** Group templates by category for the gallery's section headers. */
export function groupByCategory(
  metas: TemplateMeta[]
): Record<TemplateCategory, TemplateMeta[]> {
  const groups: Record<TemplateCategory, TemplateMeta[]> = {
    hero: [],
    fact: [],
    stat: [],
    response: [],
    testimony: [],
    tiers: [],
    chapter: [],
    cta: [],
  };
  for (const m of metas) groups[m.category].push(m);
  return groups;
}
