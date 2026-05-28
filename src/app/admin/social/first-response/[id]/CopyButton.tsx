"use client";

import { useState } from "react";

/**
 * Tiny "Copy" button for packet sections — the SMM pastes into Canva,
 * Buffer, Instagram, email tool, etc. Falls back to a clipboard
 * prompt() when the Clipboard API is unavailable (older Safari, file://).
 */
export default function CopyButton({
  text,
  label = "Copy",
}: {
  text: string;
  label?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      window.prompt("Copy this:", text);
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="px-2.5 py-1 rounded-md text-[11px] font-semibold text-charcoal/70 hover:text-charcoal hover:bg-charcoal/5 transition-colors"
    >
      {copied ? "Copied!" : label}
    </button>
  );
}
