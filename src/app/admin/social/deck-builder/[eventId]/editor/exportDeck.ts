"use client";

/**
 * Export the deck to PNG(s) (Phase 10f).
 *
 * Renders each slide via /api/admin/social-editor/render, then either
 * downloads a single PNG or zips a carousel. Keeps the posting pipeline
 * intact — these are real 1080² PNGs ready to upload.
 */

import JSZip from "jszip";
import type { EditorSlide } from "@/lib/social-editor/types";

function slug(s: string): string {
  return (
    s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 48) ||
    "deck"
  );
}

async function renderSlide(slide: EditorSlide): Promise<ArrayBuffer | null> {
  try {
    const res = await fetch("/api/admin/social-editor/render", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slide }),
    });
    if (!res.ok) return null;
    return await res.arrayBuffer();
  } catch {
    return null;
  }
}

function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export async function exportDeck(deck: EditorSlide[], title: string): Promise<void> {
  const name = slug(title);

  if (deck.length === 1) {
    const buf = await renderSlide(deck[0]!);
    if (!buf) {
      alert("Export failed — could not render the slide.");
      return;
    }
    download(new Blob([buf], { type: "image/png" }), `${name}.png`);
    return;
  }

  const results = await Promise.all(deck.map((s) => renderSlide(s)));
  const zip = new JSZip();
  let ok = 0;
  results.forEach((buf, i) => {
    if (buf) {
      zip.file(`slide-${String(i + 1).padStart(2, "0")}.png`, buf);
      ok++;
    }
  });
  if (ok === 0) {
    alert("Export failed — could not render the slides.");
    return;
  }
  const blob = await zip.generateAsync({ type: "blob" });
  download(blob, `${name}.zip`);
}
