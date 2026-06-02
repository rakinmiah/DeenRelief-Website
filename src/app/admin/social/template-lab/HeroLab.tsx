"use client";

/**
 * Template Lab — categorised grid. Builds each of the 95 presets and renders
 * it through the production Satori export route, so what shows here is exactly
 * what a published slide PNG would look like (and any Satori error surfaces
 * inline for debugging). The catalogue itself lives in `templateData.ts`,
 * shared with the PowerPoint-style "View templates" browser.
 */

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { presetForTemplate, type BrandLogo } from "@/lib/social-editor/presets";
import type { EditorSlide } from "@/lib/social-editor/types";
import { CATS, VARIANTS, variantsByCat, type Variant } from "./templateData";

export default function HeroLab({
  logo,
  logoLight,
}: {
  logo: BrandLogo | null;
  logoLight: BrandLogo | null;
}) {
  const total = VARIANTS.length;
  const chip: CSSProperties = {
    fontSize: 12.5,
    fontWeight: 600,
    color: "#163827",
    background: "#fff",
    border: "1px solid #d9d6cc",
    borderRadius: 999,
    padding: "6px 12px",
    textDecoration: "none",
    whiteSpace: "nowrap",
  };
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
          Template Lab — Slide library
        </h1>
        <p style={{ color: "#555", marginTop: 6, fontSize: 14, lineHeight: 1.5, maxWidth: 820 }}>
          {total} templates across {CATS.length} slide types, each rendered through the
          real Satori export pipeline with sample copy + photo — exactly what a published
          PNG looks like. Use the nav to jump between sections; cards lazy-render as you
          scroll.
        </p>
        {/* Sticky category nav — flick between sections. */}
        <nav
          style={{
            position: "sticky",
            top: 0,
            zIndex: 20,
            display: "flex",
            flexWrap: "wrap",
            gap: 8,
            padding: "12px 0",
            marginTop: 14,
            background: "#F4F4F2",
            borderBottom: "1px solid #e3e1da",
          }}
        >
          {CATS.map((c) => {
            const n = variantsByCat(c.key).length;
            if (!n) return null;
            return (
              <a key={c.key} href={`#cat-${c.key}`} style={chip}>
                {c.title}{" "}
                <span style={{ color: "#A9842B", fontWeight: 700 }}>{n}</span>
              </a>
            );
          })}
        </nav>
        {CATS.map((c) => {
          const items = variantsByCat(c.key);
          if (!items.length) return null;
          return (
            <section
              key={c.key}
              id={`cat-${c.key}`}
              style={{ marginTop: 40, scrollMarginTop: 72 }}
            >
              <h2
                style={{
                  fontSize: 18,
                  fontWeight: 700,
                  color: "#1A1A2E",
                  margin: 0,
                  display: "flex",
                  alignItems: "baseline",
                  gap: 10,
                }}
              >
                {c.title}
                <span style={{ fontSize: 13, fontWeight: 600, color: "#A9842B" }}>
                  {items.length}
                </span>
              </h2>
              <p style={{ color: "#777", margin: "2px 0 0", fontSize: 13 }}>{c.sub}</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 22, marginTop: 18 }}>
                {items.map((v) => (
                  <HeroCard key={v.id} variant={v} logo={logo} logoLight={logoLight} />
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </main>
  );
}

function HeroCard({
  variant,
  logo,
  logoLight,
}: {
  variant: Variant;
  logo: BrandLogo | null;
  logoLight: BrandLogo | null;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  const [state, setState] = useState<{
    status: "loading" | "ok" | "error";
    url?: string;
    msg?: string;
  }>({ status: "loading" });

  // Lazy: only render when the card nears the viewport, so we don't fire all
  // ~95 Satori renders on load.
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
      { rootMargin: "500px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!inView) return;
    let cancelled = false;
    let objectUrl: string | undefined;
    (async () => {
      try {
        const slide: EditorSlide = presetForTemplate(variant.id, { ...variant.c, logo, logoLight });
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
  }, [variant, inView, logo, logoLight]);

  return (
    <div ref={ref} style={{ width: 380 }}>
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
