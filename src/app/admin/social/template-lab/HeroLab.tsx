"use client";

/**
 * Hero pilot fidelity preview. Builds each of the five faithful Hero
 * presets and renders it through the production Satori export route, so
 * what shows here is exactly what a published slide PNG would look like
 * (and any Satori error surfaces inline for debugging).
 */

import { useEffect, useMemo, useState } from "react";
import {
  presetForTemplate,
  type BrandLogo,
  type SlideContent,
} from "@/lib/social-editor/presets";
import type { EditorSlide } from "@/lib/social-editor/types";

const SAMPLE_IMG = "https://picsum.photos/id/1015/1080/1080";

type Variant = { id: string; label: string; c: SlideContent };

export default function HeroLab({ logo }: { logo: BrandLogo | null }) {
  const variants = useMemo<Variant[]>(
    () => [
      {
        id: "hero-a",
        label: "A · Photo-led full-bleed",
        c: {
          primary: "881 killed since the\nceasefire.",
          secondary:
            "Gaza's Health Ministry reports strikes have continued across the Strip since the January truce.",
          imageUrl: SAMPLE_IMG,
          eyebrow: "From Gaza · 25 May 2026",
          logo,
        },
      },
      {
        id: "hero-b",
        label: "B · Typography-only cover",
        c: {
          primary: "Gaza, after",
          accent: "the ceasefire.",
          secondary:
            "Four months after the truce, the bombardment has not stopped.",
          imageUrl: null,
          eyebrow: "Emergency Appeal · Palestine",
          logo,
        },
      },
      {
        id: "hero-c",
        label: "C · Top photo / bottom panel",
        c: {
          primary: "A winter without\nshelter.",
          secondary:
            "Tens of thousands of families face the cold months in tents and the rubble of their homes.",
          imageUrl: SAMPLE_IMG,
          eyebrow: "From Gaza · 25 May 2026",
          logo,
        },
      },
      {
        id: "hero-d",
        label: "D · Centered crest",
        c: {
          primary: "The need has\nnot eased.",
          secondary: null,
          imageUrl: null,
          eyebrow: "Emergency Appeal · Palestine",
          logo,
        },
      },
      {
        id: "hero-e",
        label: "E · Documentary caption bar",
        c: {
          primary: "Families return to rubble.",
          secondary: null,
          imageUrl: SAMPLE_IMG,
          eyebrow: "Rafah · 24 May 2026",
          logo,
        },
      },
      {
        id: "hero-f",
        label: "F · Brand cover",
        c: {
          primary: "Stand with",
          accent: "Gaza.",
          secondary: null,
          imageUrl: null,
          eyebrow: "Emergency Appeal · Palestine",
          logo,
        },
      },
      {
        id: "hero-g",
        label: "G · Editorial dispatch",
        c: {
          primary: "No safe place",
          accent: "to shelter.",
          secondary:
            "Across the Strip, families are sleeping in tents as winter sets in.",
          imageUrl: null,
          eyebrow: "From Gaza · 25 May 2026",
          logo,
        },
      },
      {
        id: "hero-h",
        label: "H · Stat-led",
        c: {
          primary: "2.1m",
          accent: "in need.",
          // Short stat descriptor — the design wants a punchy label, not a
          // full sentence (a long one wraps to 4 lines and overwhelms).
          secondary: "Now depend on humanitarian aid.",
          imageUrl: null,
          eyebrow: "By the numbers · Gaza",
          logo,
        },
      },
      {
        id: "hero-i",
        label: "I · Quote-led",
        c: {
          primary:
            "We rebuild what we can with our hands, and we wait for the world to remember us.",
          secondary: "Aid worker, Khan Younis",
          imageUrl: null,
          eyebrow: "In their words",
          logo,
        },
      },
      {
        id: "hero-j",
        label: "J · Framed two-tone",
        c: {
          primary: "A winter without\nshelter.",
          secondary:
            "Tens of thousands face the cold in tents and the rubble of their homes.",
          imageUrl: SAMPLE_IMG,
          eyebrow: "From Gaza · 25 May 2026",
          logo,
        },
      },
      {
        id: "hero-k",
        label: "K · Split diptych",
        c: {
          primary: "Aid is running out.",
          secondary:
            "Stocks of food, fuel and clean water are nearly gone across the Strip.",
          imageUrl: SAMPLE_IMG,
          eyebrow: "From Gaza · 25 May 2026",
          logo,
        },
      },
      {
        id: "hero-l",
        label: "L · Lower-third broadcast",
        c: {
          primary: "No safe place",
          accent: "to shelter.",
          secondary: null,
          imageUrl: SAMPLE_IMG,
          eyebrow: "Gaza City · 25 May 2026",
          logo,
        },
      },
      {
        id: "hero-m",
        label: "M · Inset card",
        c: {
          primary: "Aid is running out.",
          secondary:
            "Stocks of food, fuel and clean water are nearly gone across the Strip.",
          imageUrl: SAMPLE_IMG,
          eyebrow: "From Gaza · 25 May 2026",
          logo,
        },
      },
      {
        id: "hero-n",
        label: "N · Window crop",
        c: {
          primary: "One family among millions.",
          secondary: null,
          imageUrl: SAMPLE_IMG,
          eyebrow: "Rafah · 24 May 2026",
          logo,
        },
      },
      {
        id: "hero-o",
        label: "O · Duotone poster",
        c: {
          primary: "Stand with",
          accent: "Gaza.",
          secondary: null,
          imageUrl: SAMPLE_IMG,
          eyebrow: "Emergency Appeal · Palestine",
          logo,
        },
      },
      {
        id: "tiers-a",
        label: "Donation tiers · Impact ladder",
        c: {
          primary: "Where your gift goes",
          secondary: null,
          imageUrl: null,
          eyebrow: "Palestine Appeal",
          logo,
        },
      },
      {
        id: "beforeafter-a",
        label: "Before / After · Then & now",
        c: {
          primary: "Healthcare in collapse",
          secondary: "Source: WHO · May 2026",
          imageUrl: null,
          eyebrow: "Palestine Appeal",
          logo,
        },
      },
      {
        id: "multistat-a",
        label: "Multi-stat · By the numbers",
        c: {
          primary: "Gaza today",
          secondary: null,
          imageUrl: null,
          eyebrow: "By the numbers",
          logo,
        },
      },
      {
        id: "cta-a",
        label: "CTA A · Type-led",
        c: { primary: "Stand with them today.", secondary: "2.1M", imageUrl: SAMPLE_IMG, eyebrow: "Palestine Appeal", logo },
      },
      {
        id: "cta-b",
        label: "CTA B · Gold inverted",
        c: { primary: "Stand with them today.", secondary: "2.1M", imageUrl: SAMPLE_IMG, eyebrow: "Palestine Appeal", logo },
      },
      {
        id: "cta-c",
        label: "CTA C · Photo lower-third",
        c: { primary: "Stand with them today.", secondary: "2.1M", imageUrl: SAMPLE_IMG, eyebrow: "Palestine Appeal", logo },
      },
      {
        id: "cta-d",
        label: "CTA D · Crest",
        c: { primary: "Stand with them today.", secondary: "2.1M", imageUrl: SAMPLE_IMG, eyebrow: "Palestine Appeal", logo },
      },
      {
        id: "cta-e",
        label: "CTA E · Split",
        c: { primary: "Stand with them today.", secondary: "2.1M", imageUrl: SAMPLE_IMG, eyebrow: "Palestine Appeal", logo },
      },
      {
        id: "cta-f",
        label: "CTA F · Stat-led",
        c: { primary: "Stand with them today.", secondary: "2.1M", imageUrl: SAMPLE_IMG, eyebrow: "Palestine Appeal", logo },
      },
      {
        id: "cta-g",
        label: "CTA G · Quote-led",
        c: { primary: "Stand with them today.", secondary: "2.1M", imageUrl: SAMPLE_IMG, eyebrow: "Palestine Appeal", logo },
      },
      {
        id: "cta-h",
        label: "CTA H · Urgency",
        c: { primary: "Stand with them today.", secondary: "2.1M", imageUrl: SAMPLE_IMG, eyebrow: "Palestine Appeal", logo },
      },
      {
        id: "cta-i",
        label: "CTA I · Scan to give",
        c: { primary: "Stand with them today.", secondary: "2.1M", imageUrl: SAMPLE_IMG, eyebrow: "Palestine Appeal", logo },
      },
      {
        id: "cta-j",
        label: "CTA J · Wordmark card",
        c: { primary: "Stand with them today.", secondary: "2.1M", imageUrl: SAMPLE_IMG, eyebrow: "Palestine Appeal", logo },
      },
    ],
    [logo]
  );

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#F4F4F2",
        padding: "32px 28px",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <div style={{ maxWidth: 1320, margin: "0 auto" }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: "#1A1A2E", margin: 0 }}>
          Template Lab — Hero library
        </h1>
        <p style={{ color: "#555", marginTop: 6, fontSize: 14, lineHeight: 1.5, maxWidth: 760 }}>
          Fifteen Hero layouts in the Deen&nbsp;Relief Slide Library system, rendered
          through the real Satori export pipeline (sample copy + photo). A–J are the
          art-directed ports (top scrims on photo heroes, balanced compositions, a
          keyline crest); K–O add image-led structures: a split diptych, a lower-third
          broadcast with a proof tag, an inset card, a window crop, and a duotone
          poster. Small corner marks are the vector diamond + wordmark lockup; the
          raster logo only rasterises at larger sizes, so it&apos;s used large and
          centered on Hero&nbsp;F.
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 22, marginTop: 26 }}>
          {variants.map((v) => (
            <HeroCard key={v.id} variant={v} />
          ))}
        </div>
      </div>
    </main>
  );
}

function HeroCard({ variant }: { variant: Variant }) {
  const [state, setState] = useState<{
    status: "loading" | "ok" | "error";
    url?: string;
    msg?: string;
  }>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | undefined;
    (async () => {
      try {
        const slide: EditorSlide = presetForTemplate(variant.id, variant.c);
        const res = await fetch("/api/admin/social-editor/render", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ slide }),
        });
        if (!res.ok) {
          const txt = await res.text();
          if (!cancelled) setState({ status: "error", msg: txt.slice(0, 500) });
          return;
        }
        const blob = await res.blob();
        objectUrl = URL.createObjectURL(blob);
        if (!cancelled) setState({ status: "ok", url: objectUrl });
      } catch (e) {
        if (!cancelled)
          setState({ status: "error", msg: e instanceof Error ? e.message : String(e) });
      }
    })();
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [variant]);

  return (
    <div style={{ width: 380 }}>
      <div
        style={{
          fontSize: 12,
          fontWeight: 700,
          color: "#1A1A2E",
          marginBottom: 8,
          letterSpacing: 0.4,
        }}
      >
        {variant.label}
      </div>
      <div
        style={{
          width: 380,
          height: 380,
          borderRadius: 10,
          overflow: "hidden",
          background: "#163827",
          boxShadow: "0 2px 12px rgba(0,0,0,0.12)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {state.status === "loading" && (
          <span style={{ color: "#cbbf9e", fontSize: 12 }}>Rendering…</span>
        )}
        {state.status === "ok" && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={state.url}
            alt={variant.label}
            width={380}
            height={380}
            style={{ display: "block" }}
          />
        )}
        {state.status === "error" && (
          <pre
            style={{
              color: "#fff",
              fontSize: 10,
              padding: 12,
              whiteSpace: "pre-wrap",
              margin: 0,
              overflow: "auto",
              maxHeight: "100%",
            }}
          >
            {state.msg}
          </pre>
        )}
      </div>
    </div>
  );
}
