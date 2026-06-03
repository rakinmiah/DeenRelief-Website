"use client";

/**
 * TemplatesPanel — a Canva-style template browser that lives INSIDE the
 * editor (a left flyout next to the tool rail). The SMM scrolls the whole
 * 95-template catalogue grouped by slide type and clicks one to drop it in
 * as a new slide, without leaving the canvas. Each thumbnail renders through
 * the SAME Satori export route the published PNG uses, so what she sees is
 * what she gets. Thumbnails lazy-render as they scroll into view (we don't
 * fire ~95 renders at once), and the brand logos are injected per render so
 * the green/white mark matches the rest of the deck.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { buildTemplateSlide, type BrandLogo } from "@/lib/social-editor/presets";
import type { EditorSlide } from "@/lib/social-editor/types";
import { CATS, VARIANTS, variantsByCat, type Variant } from "../../../template-lab/templateData";
import { useTemplateOverrides } from "../../../template-lab/useOverrides";

export default function TemplatesPanel({
  logo,
  logoLight,
  onPick,
  onClose,
}: {
  logo: BrandLogo | null;
  logoLight: BrandLogo | null;
  /** A template was chosen — hand back a freshly-built slide to insert. */
  onPick: (slide: EditorSlide) => void;
  onClose: () => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const overrides = useTemplateOverrides();
  return (
    <aside className="w-[300px] shrink-0 bg-white border-r border-charcoal/8 flex flex-col min-h-0">
      <div className="flex items-center justify-between px-3.5 py-3 border-b border-charcoal/8 shrink-0">
        <div>
          <p className="font-heading font-semibold text-charcoal text-[14px] leading-tight">Templates</p>
          <p className="text-[11px] text-charcoal/45">{VARIANTS.length} layouts · tap to add a slide</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close templates"
          className="text-charcoal/40 hover:text-charcoal text-[20px] leading-none px-1"
        >
          ×
        </button>
      </div>
      <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto px-3 py-3">
        {CATS.map((cat) => {
          const items = variantsByCat(cat.key);
          if (!items.length) return null;
          return (
            <section key={cat.key} className="mb-5">
              <div className="sticky top-0 z-10 -mx-3 px-3 py-1.5 bg-white border-b border-charcoal/[0.07] flex items-baseline justify-between gap-2">
                <span className="text-[10.5px] font-semibold uppercase tracking-[0.13em] text-charcoal/50 truncate">
                  {cat.title}
                </span>
                <span className="text-[10px] font-medium text-charcoal/30 tabular-nums shrink-0">
                  {items.length}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-2.5">
                {items.map((v) => (
                  <TemplateCard
                    key={v.id}
                    variant={v}
                    logo={logo}
                    logoLight={logoLight}
                    overrides={overrides}
                    onPick={onPick}
                    rootRef={scrollRef}
                  />
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </aside>
  );
}

function TemplateCard({
  variant,
  logo,
  logoLight,
  overrides,
  onPick,
  rootRef,
}: {
  variant: Variant;
  logo: BrandLogo | null;
  logoLight: BrandLogo | null;
  overrides: Record<string, EditorSlide>;
  onPick: (slide: EditorSlide) => void;
  rootRef: React.RefObject<HTMLDivElement | null>;
}) {
  const ref = useRef<HTMLButtonElement>(null);
  const [inView, setInView] = useState(false);
  const [state, setState] = useState<{ status: "idle" | "loading" | "ok" | "error"; url?: string }>({
    status: "idle",
  });

  // Build the slide ONCE per (variant, logos, override) so the render effect +
  // onPick share a stable object (and the same layout the SMM will get on
  // insert). A saved override for this id is applied here.
  const ov = overrides[variant.id];
  const slide = useMemo<EditorSlide>(
    () => buildTemplateSlide(variant.id, { ...variant.c, logo, logoLight }, overrides),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [variant, logo, logoLight, ov]
  );

  // Lazy: only render once the card scrolls near the panel's viewport.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setInView(true);
          io.disconnect();
        }
      },
      { root: rootRef.current ?? null, rootMargin: "400px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [rootRef]);

  useEffect(() => {
    if (!inView) return;
    let cancelled = false;
    let objectUrl: string | undefined;
    setState({ status: "loading" });
    (async () => {
      try {
        const res = await fetch("/api/admin/social-editor/render", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ slide }),
        });
        if (!res.ok) {
          if (!cancelled) setState({ status: "error" });
          return;
        }
        const blob = await res.blob();
        objectUrl = URL.createObjectURL(blob);
        if (!cancelled) setState({ status: "ok", url: objectUrl });
      } catch {
        if (!cancelled) setState({ status: "error" });
      }
    })();
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [inView, slide]);

  return (
    <button
      ref={ref}
      type="button"
      onClick={() => onPick(slide)}
      title={variant.label}
      className="group relative aspect-square rounded-lg overflow-hidden bg-[#163827] ring-1 ring-charcoal/10 hover:ring-green/70 hover:ring-2 transition grid place-items-center"
    >
      {state.status === "ok" ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={state.url} alt={variant.label} className="absolute inset-0 w-full h-full object-cover" />
      ) : state.status === "error" ? (
        <span className="text-[9px] text-cream/70 px-1 text-center">render error</span>
      ) : (
        <span className="text-[10px] text-cream/40">…</span>
      )}
      <span className="absolute inset-x-0 bottom-0 bg-charcoal/55 text-white text-[9px] leading-tight px-1.5 py-1 opacity-0 group-hover:opacity-100 transition text-left truncate">
        {variant.label}
      </span>
    </button>
  );
}
