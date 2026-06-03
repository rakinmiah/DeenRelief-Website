"use client";

/**
 * SandboxEditor — a free-form editor playground. Pick a format, then build on a
 * blank canvas with the full rail (Templates, Elements, Text, Image, Logo, QR,
 * shapes) and Export. No event, no content extraction, no Claude calls — so
 * testing the editor costs nothing. Work isn't persisted (it's a sandbox);
 * Export the PNGs to keep anything you make.
 */

import { useState } from "react";
import { makeLayerId, type EditorSlide } from "@/lib/social-editor/types";
import type { BrandLogo } from "@/lib/social-editor/presets";
import CanvasDeckEditor from "../../deck-builder/[eventId]/editor/CanvasDeckEditor";

type Format = {
  id: string;
  platform: "instagram" | "facebook" | "x";
  label: string;
  sub: string;
  w: number;
  h: number;
};

const FORMATS: Format[] = [
  { id: "square", platform: "instagram", label: "Instagram / Facebook", sub: "Square · 1080 × 1080", w: 1080, h: 1080 },
  { id: "landscape", platform: "x", label: "X (Twitter)", sub: "Landscape · 1200 × 675", w: 1200, h: 675 },
];

function blankSlide(w: number, h: number): EditorSlide {
  return { id: `sl_${makeLayerId().slice(3)}`, width: w, height: h, background: "#163827", layers: [] };
}

export default function SandboxEditor({
  logo,
  logoLight,
}: {
  logo: BrandLogo | null;
  logoLight: BrandLogo | null;
}) {
  const [fmt, setFmt] = useState<Format | null>(null);

  if (!fmt) {
    return (
      <main className="dr-soft-motion min-h-screen grid place-items-center bg-[#F4F4F2] px-6">
        <div className="dr-anim-rise w-full max-w-md">
          <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-amber-dark text-center mb-2">
            Editor sandbox
          </p>
          <h1 className="text-3xl font-heading font-bold text-charcoal text-center tracking-[-0.01em]">
            Test the editor
          </h1>
          <p className="text-charcoal/60 text-[14px] text-center mt-2 mb-7 leading-relaxed">
            A blank canvas with the full toolkit — templates, elements, text,
            images, logo, QR. No post to generate, no tokens spent. Work isn&apos;t
            saved here; Export to keep anything you make.
          </p>
          <div className="space-y-3">
            {FORMATS.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFmt(f)}
                className="w-full flex items-center gap-4 text-left bg-white border border-charcoal/12 rounded-2xl px-5 py-4 hover:border-green/60 hover:ring-2 hover:ring-green/20 transition"
              >
                <span
                  className="shrink-0 rounded-md bg-[#163827] ring-1 ring-charcoal/10"
                  style={{ width: 52, height: Math.round((52 * f.h) / f.w) }}
                />
                <span className="min-w-0">
                  <span className="block font-heading font-semibold text-charcoal text-[15px]">
                    {f.label}
                  </span>
                  <span className="block text-[12.5px] text-charcoal/50">{f.sub}</span>
                </span>
              </button>
            ))}
          </div>
          <div className="text-center mt-6">
            <a
              href="/admin/social/template-lab"
              className="text-[13px] font-medium text-charcoal/55 hover:text-charcoal"
            >
              ← Template Lab
            </a>
          </div>
        </div>
      </main>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-[#F4F4F2]">
      <CanvasDeckEditor
        key={fmt.id}
        initialDeck={[blankSlide(fmt.w, fmt.h)]}
        platform={fmt.platform}
        logo={logo}
        logoLight={logoLight}
        openTemplatesOnMount
        forceInitial
        backHref="/admin/social/template-lab/sandbox"
        title={`Sandbox · ${fmt.label}`}
      />
    </div>
  );
}
