"use client";

/**
 * TemplateSorter — the PowerPoint "Normal view" browser for the full slide
 * library. A left rail of numbered slide thumbnails, grouped into sections by
 * slide type (so you always know which type a slide belongs to), plus a large
 * preview pane for the selected slide. Every thumbnail + the big preview render
 * through the production Satori export route, so this is pixel-faithful to a
 * published PNG. Rail thumbnails lazy-render as you scroll; arrow keys move the
 * selection like PowerPoint.
 */

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from "react";
import { presetForTemplate, type BrandLogo } from "@/lib/social-editor/presets";
import { CATS, variantsByCat, type Variant } from "../templateData";

const FOREST = "#163827";
const GOLD = "#A9842B";
const WORKSPACE = "#3b3b3b"; // PowerPoint's dark slide-area grey

type Numbered = { variant: Variant; number: number; catKey: string };

export default function TemplateSorter({ logo }: { logo: BrandLogo | null }) {
  // Flatten the catalogue in section order, assigning running slide numbers.
  const sections = useMemo(
    () =>
      CATS.map((c) => ({ ...c, items: variantsByCat(c.key) })).filter(
        (s) => s.items.length > 0
      ),
    []
  );
  const ordered = useMemo<Numbered[]>(() => {
    const out: Numbered[] = [];
    let n = 0;
    for (const s of sections) for (const v of s.items) out.push({ variant: v, number: ++n, catKey: s.key });
    return out;
  }, [sections]);

  const [selectedId, setSelectedId] = useState(ordered[0]?.variant.id ?? "");
  const selectedIdx = ordered.findIndex((o) => o.variant.id === selectedId);
  const selected = ordered[selectedIdx] ?? ordered[0];
  const selectedCat = CATS.find((c) => c.key === selected?.catKey);

  const railRef = useRef<HTMLDivElement>(null);

  // Arrow keys move selection (PowerPoint-like). Ignore when typing.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
      e.preventDefault();
      const cur = ordered.findIndex((o) => o.variant.id === selectedId);
      const next = e.key === "ArrowDown" ? Math.min(ordered.length - 1, cur + 1) : Math.max(0, cur - 1);
      const id = ordered[next]?.variant.id;
      if (id) {
        setSelectedId(id);
        document.getElementById(`thumb-${id}`)?.scrollIntoView({ block: "nearest" });
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [ordered, selectedId]);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        background: "#e9e7e2",
        fontFamily: "system-ui, sans-serif",
        color: "#1A1A2E",
      }}
    >
      {/* Title bar */}
      <header
        style={{
          flexShrink: 0,
          height: 52,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 18px",
          background: "#fff",
          borderBottom: "1px solid #d9d6cc",
        }}
      >
        <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: FOREST }}>Template Library</span>
          <span style={{ fontSize: 12.5, color: "#777" }}>
            {ordered.length} templates · {sections.length} slide types
          </span>
        </div>
        <a
          href="/admin/social/template-lab"
          style={{
            fontSize: 12.5,
            fontWeight: 600,
            color: FOREST,
            textDecoration: "none",
            border: "1px solid #d9d6cc",
            borderRadius: 999,
            padding: "6px 12px",
            background: "#fff",
          }}
        >
          Grid view ↗
        </a>
      </header>

      <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
        {/* Left rail — numbered thumbnails grouped by section */}
        <div
          ref={railRef}
          style={{
            width: 268,
            flexShrink: 0,
            overflowY: "auto",
            background: "#f4f3ef",
            borderRight: "1px solid #d9d6cc",
            padding: "6px 0 40px",
          }}
        >
          {sections.map((s) => (
            <div key={s.key}>
              <div
                style={{
                  position: "sticky",
                  top: 0,
                  zIndex: 2,
                  background: "#ecebe5",
                  borderBottom: "1px solid #ddd9cf",
                  padding: "7px 14px",
                  fontSize: 11,
                  fontWeight: 800,
                  letterSpacing: 0.6,
                  textTransform: "uppercase",
                  color: FOREST,
                  display: "flex",
                  justifyContent: "space-between",
                }}
              >
                <span>{s.title}</span>
                <span style={{ color: GOLD }}>{s.items.length}</span>
              </div>
              {s.items.map((v) => {
                const num = ordered.find((o) => o.variant.id === v.id)?.number ?? 0;
                return (
                  <RailThumb
                    key={v.id}
                    variant={v}
                    number={num}
                    selected={v.id === selectedId}
                    onSelect={() => setSelectedId(v.id)}
                    logo={logo}
                    rootRef={railRef}
                  />
                );
              })}
            </div>
          ))}
        </div>

        {/* Preview pane */}
        <div
          style={{
            flex: 1,
            minWidth: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 18,
            background: WORKSPACE,
            padding: 32,
          }}
        >
          {selected && <Preview key={selected.variant.id} variant={selected.variant} logo={logo} />}
          {selected && (
            <div style={{ textAlign: "center", maxWidth: 640 }}>
              <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: 0.6, color: GOLD, textTransform: "uppercase" }}>
                Slide {selected.number} · {selectedCat?.title}
              </div>
              <div style={{ fontSize: 15, fontWeight: 600, color: "#fff", marginTop: 4 }}>
                {selected.variant.label}
              </div>
              {selectedCat?.sub && (
                <div style={{ fontSize: 12.5, color: "rgba(255,255,255,0.6)", marginTop: 3 }}>
                  {selectedCat.sub}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/** Fires a Satori render for `variant` once `active` is true; returns state. */
function useSlideImage(variant: Variant | null, active: boolean, logo: BrandLogo | null) {
  const [state, setState] = useState<{
    status: "idle" | "loading" | "ok" | "error";
    url?: string;
    msg?: string;
  }>({ status: "idle" });

  useEffect(() => {
    if (!variant || !active) return;
    let cancelled = false;
    let objectUrl: string | undefined;
    setState({ status: "loading" });
    (async () => {
      try {
        const slide = presetForTemplate(variant.id, { ...variant.c, logo });
        const res = await fetch("/api/admin/social-editor/render", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ slide }),
        });
        if (!res.ok) {
          const txt = await res.text();
          if (!cancelled) setState({ status: "error", msg: txt.slice(0, 400) });
          return;
        }
        const blob = await res.blob();
        objectUrl = URL.createObjectURL(blob);
        if (!cancelled) setState({ status: "ok", url: objectUrl });
      } catch (e) {
        if (!cancelled) setState({ status: "error", msg: e instanceof Error ? e.message : String(e) });
      }
    })();
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [variant, active, logo]);

  return state;
}

function RailThumb({
  variant,
  number,
  selected,
  onSelect,
  logo,
  rootRef,
}: {
  variant: Variant;
  number: number;
  selected: boolean;
  onSelect: () => void;
  logo: BrandLogo | null;
  rootRef: RefObject<HTMLDivElement | null>;
}) {
  const ref = useRef<HTMLButtonElement>(null);
  const [inView, setInView] = useState(false);

  // Lazy-render against the rail's own scroll container so off-screen rows
  // don't all fire at once.
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
      { root: rootRef.current ?? null, rootMargin: "300px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [rootRef]);

  const img = useSlideImage(variant, inView, logo);

  return (
    <button
      ref={ref}
      id={`thumb-${variant.id}`}
      type="button"
      onClick={onSelect}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        width: "100%",
        padding: "8px 12px",
        background: selected ? "rgba(22,56,39,0.08)" : "transparent",
        border: "none",
        borderLeft: selected ? `3px solid ${GOLD}` : "3px solid transparent",
        cursor: "pointer",
        textAlign: "left",
      }}
    >
      <span style={{ width: 18, flexShrink: 0, fontSize: 11, color: "#999", textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
        {number}
      </span>
      <div
        style={{
          width: 196,
          height: 196,
          flexShrink: 0,
          borderRadius: 4,
          overflow: "hidden",
          background: FOREST,
          boxShadow: selected ? `0 0 0 2px ${GOLD}` : "0 1px 3px rgba(0,0,0,0.18)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {img.status === "ok" ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={img.url} alt={variant.label} width={196} height={196} style={{ display: "block" }} />
        ) : img.status === "error" ? (
          <span style={{ color: "#e6b8b8", fontSize: 9, padding: 6, textAlign: "center" }}>render error</span>
        ) : (
          <span style={{ color: "#cbbf9e", fontSize: 10 }}>…</span>
        )}
      </div>
    </button>
  );
}

function Preview({ variant, logo }: { variant: Variant; logo: BrandLogo | null }) {
  const img = useSlideImage(variant, true, logo);
  return (
    <div
      style={{
        width: "min(72vh, 680px)",
        height: "min(72vh, 680px)",
        borderRadius: 6,
        overflow: "hidden",
        background: FOREST,
        boxShadow: "0 8px 40px rgba(0,0,0,0.4)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {img.status === "ok" ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={img.url} alt={variant.label} style={{ width: "100%", height: "100%", display: "block" }} />
      ) : img.status === "error" ? (
        <pre style={{ color: "#fff", fontSize: 11, padding: 16, whiteSpace: "pre-wrap", margin: 0, overflow: "auto", maxHeight: "100%" }}>
          {img.msg}
        </pre>
      ) : (
        <span style={{ color: "#cbbf9e", fontSize: 13 }}>Rendering…</span>
      )}
    </div>
  );
}
