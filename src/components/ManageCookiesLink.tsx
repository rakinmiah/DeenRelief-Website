"use client";

import { CONSENT_OPEN_EVENT } from "@/lib/consent";

/**
 * Footer-sized "Manage cookies" button. Fires a DOM event the
 * ConsentBanner listens for — avoids prop-drilling or a global store.
 * Styled to match the other footer legal links.
 */
export default function ManageCookiesLink() {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event(CONSENT_OPEN_EVENT))}
      className="text-white/40 hover:text-white/60 text-xs transition-colors duration-200"
    >
      Manage cookies
    </button>
  );
}
