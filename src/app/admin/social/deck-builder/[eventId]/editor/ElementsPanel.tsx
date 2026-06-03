"use client";

/**
 * ElementsPanel — a Canva-style "Elements" flyout. The SMM inserts individual,
 * brand-consistent building blocks (the logo, the red emergency-appeal box, the
 * donate button, donation tiers, a portrait/photo placeholder, a stat cell, a
 * gold rule, the Zakat line, …) onto the slide she's on. Each card shows a tiny
 * forest-ground preview of the real thing; clicking it drops it in (multi-part
 * elements arrive grouped so they move as one).
 */

import {
  ELEMENT_GROUPS,
  type ElementDef,
} from "./elementLibrary";

export default function ElementsPanel({
  onPick,
  onClose,
}: {
  onPick: (def: ElementDef) => void;
  onClose: () => void;
}) {
  return (
    <aside className="dr-anim-panel w-[300px] shrink-0 bg-white border-r border-charcoal/8 flex flex-col min-h-0">
      <div className="flex items-center justify-between px-3.5 py-3 border-b border-charcoal/8 shrink-0">
        <div>
          <p className="font-heading font-semibold text-charcoal text-[14px] leading-tight">Elements</p>
          <p className="text-[11px] text-charcoal/45">Tap to add a brand element</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close elements"
          className="text-charcoal/40 hover:text-charcoal text-[20px] leading-none px-1"
        >
          ×
        </button>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto px-3 py-3">
        {ELEMENT_GROUPS.map((group) => (
          <section key={group.key} className="mb-5">
            <div className="sticky top-0 z-10 -mx-3 px-3 py-1.5 bg-white border-b border-charcoal/[0.07]">
              <span className="text-[10.5px] font-semibold uppercase tracking-[0.13em] text-charcoal/50">
                {group.title}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-2.5">
              {group.items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onPick(item)}
                  title={item.hint ?? item.label}
                  className="group flex flex-col rounded-lg overflow-hidden ring-1 ring-charcoal/10 hover:ring-green/70 hover:ring-2 transition text-left"
                >
                  <div className="h-[64px] bg-[#163827] grid place-items-center overflow-hidden px-2">
                    <Preview id={item.id} />
                  </div>
                  <div className="px-2 py-1.5 bg-white">
                    <span className="block text-[11px] font-semibold text-charcoal leading-tight truncate">
                      {item.label}
                    </span>
                    {item.hint && (
                      <span className="block text-[9.5px] text-charcoal/40 leading-tight truncate">
                        {item.hint}
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </section>
        ))}
      </div>
    </aside>
  );
}

/* ── Tiny forest-ground previews of each element ──────────────────── */
const AMBER = "#D4A843";
const CREAM = "#F7F3E8";
const RED = "#C0392B";
const FOREST = "#163827";

function Preview({ id }: { id: string }) {
  switch (id) {
    case "logo":
      return (
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-2 h-2 rotate-45" style={{ background: AMBER }} />
          <span className="text-[9px] font-bold tracking-[0.15em]" style={{ color: CREAM }}>
            DEEN RELIEF
          </span>
        </span>
      );
    case "eyebrow":
      return (
        <span className="text-[9px] font-bold uppercase tracking-[0.18em]" style={{ color: AMBER }}>
          From Gaza · 25 May
        </span>
      );
    case "gold-rule":
      return <span className="block w-10 h-[3px]" style={{ background: AMBER }} />;
    case "source-line":
      return (
        <span className="text-[8px] uppercase tracking-[0.16em] text-center" style={{ color: "rgba(247,243,232,0.6)" }}>
          Source · deenrelief.org
        </span>
      );
    case "zakat-line":
      return (
        <span className="text-[8px] uppercase tracking-[0.1em] text-center" style={{ color: AMBER }}>
          Your Zakat, in trusted hands
        </span>
      );
    case "emergency-box":
      return (
        <span className="px-2 py-1 rounded" style={{ background: RED }}>
          <span className="text-[8px] font-extrabold uppercase tracking-[0.14em]" style={{ color: CREAM }}>
            Emergency Appeal
          </span>
        </span>
      );
    case "donate-button":
      return (
        <span className="px-3 py-1.5 rounded" style={{ background: AMBER }}>
          <span className="text-[10px] font-extrabold uppercase tracking-[0.12em]" style={{ color: FOREST }}>
            Donate now
          </span>
        </span>
      );
    case "tier-ladder":
      return (
        <span className="flex flex-col gap-0.5 leading-none">
          {["£30", "£100", "£250"].map((a) => (
            <span key={a} className="flex items-center gap-1">
              <span className="text-[10px] font-bold" style={{ color: AMBER, fontFamily: "var(--font-anton, sans-serif)" }}>{a}</span>
              <span className="w-8 h-[3px] rounded-full" style={{ background: "rgba(247,243,232,0.35)" }} />
            </span>
          ))}
        </span>
      );
    case "qr-placeholder":
      return (
        <span className="w-9 h-9 rounded-md grid place-items-center" style={{ background: CREAM, border: `2px solid ${AMBER}` }}>
          <span className="text-[8px] font-bold" style={{ color: FOREST }}>QR</span>
        </span>
      );
    case "scan-caption":
      return (
        <span className="text-[9px] font-bold uppercase tracking-[0.16em]" style={{ color: "rgba(247,243,232,0.8)" }}>
          Scan to give
        </span>
      );
    case "stat-cell":
      return (
        <span className="flex flex-col items-center leading-none">
          <span className="text-[22px] font-extrabold" style={{ color: AMBER }}>2.1M</span>
          <span className="text-[7px] mt-0.5" style={{ color: "rgba(247,243,232,0.7)" }}>depend on aid</span>
        </span>
      );
    case "fact-row":
      return (
        <span className="flex items-center gap-1.5">
          <span className="text-[15px] font-extrabold" style={{ color: AMBER }}>9 in 10</span>
          <span className="text-[8px]" style={{ color: CREAM }}>skip meals</span>
        </span>
      );
    case "quote-mark":
      return <span className="text-[40px] leading-none font-bold" style={{ color: AMBER }}>&ldquo;</span>;
    case "headline":
      return (
        <span className="text-[12px] font-extrabold uppercase leading-tight text-center" style={{ color: CREAM }}>
          881 killed
        </span>
      );
    case "portrait-photo":
    case "landscape-photo":
    case "square-photo":
      return (
        <span
          className="grid place-items-center rounded"
          style={{
            background: "#2a3f33",
            width: id === "portrait-photo" ? 26 : id === "square-photo" ? 36 : 46,
            height: id === "portrait-photo" ? 40 : id === "square-photo" ? 36 : 28,
          }}
        >
          <PhotoGlyph />
        </span>
      );
    default:
      return <span className="text-[10px]" style={{ color: CREAM }}>+</span>;
  }
}

function PhotoGlyph() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(247,243,232,0.7)" strokeWidth="1.6" aria-hidden>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <circle cx="8.5" cy="9.5" r="1.6" />
      <path d="M21 16l-5-5-9 9" />
    </svg>
  );
}
