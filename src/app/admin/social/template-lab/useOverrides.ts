"use client";

import { useEffect, useState } from "react";
import type { EditorSlide } from "@/lib/social-editor/types";

/**
 * Fetch all saved "official template" overrides once, as a map
 * { templateId → EditorSlide }. Pass into `buildTemplateSlide(id, c, overrides)`
 * so every place a template is built (panel, lab, deck seeding) reflects the
 * SMM's saved edits. Starts empty, fills in after the fetch — callers that key
 * off it re-render once it loads.
 */
export function useTemplateOverrides(): Record<string, EditorSlide> {
  const [overrides, setOverrides] = useState<Record<string, EditorSlide>>({});
  useEffect(() => {
    let cancelled = false;
    fetch("/api/admin/social/template-overrides", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : { overrides: {} }))
      .then((j: { overrides?: Record<string, EditorSlide> }) => {
        if (!cancelled) setOverrides(j.overrides ?? {});
      })
      .catch(() => {
        /* fall back to code presets */
      });
    return () => {
      cancelled = true;
    };
  }, []);
  return overrides;
}
