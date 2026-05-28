"use client";

import { useState, useTransition } from "react";
import type { BannerConfig } from "@/lib/site-config";
import { saveBannerAction } from "./actions";

export default function BannerForm({ initial }: { initial: BannerConfig }) {
  const [active, setActive] = useState(initial.active);
  const [message, setMessage] = useState(initial.message);
  const [linkHref, setLinkHref] = useState(initial.link?.href ?? "");
  const [linkLabel, setLinkLabel] = useState(initial.link?.label ?? "");
  const [theme, setTheme] = useState<"info" | "urgent">(initial.theme);
  const [dismissible, setDismissible] = useState(initial.dismissible);

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    startTransition(async () => {
      const result = await saveBannerAction({
        active,
        message: message.trim(),
        linkHref: linkHref.trim() || undefined,
        linkLabel: linkLabel.trim() || undefined,
        theme,
        dismissible,
      });
      if (result.ok) {
        setSuccess(true);
        setTimeout(() => setSuccess(false), 4000);
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white border border-charcoal/10 rounded-2xl p-5 md:p-6 space-y-5"
    >
      {success && (
        <div className="px-4 py-3 rounded-lg bg-green-light/40 border border-green/30 text-green-dark text-sm">
          Saved. The banner is now {active ? "live" : "hidden"} on the public site.
        </div>
      )}
      {error && (
        <div
          role="alert"
          className="px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm"
        >
          {error}
        </div>
      )}

      <div className="flex items-center justify-between gap-3 pb-4 border-b border-charcoal/10">
        <div>
          <h3 className="text-charcoal font-semibold text-[15px]">
            Show the banner
          </h3>
          <p className="text-charcoal/60 text-[13px] mt-0.5">
            Master switch. Off = banner hidden everywhere on the public site.
          </p>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={active}
            onChange={(e) => setActive(e.target.checked)}
            className="sr-only peer"
          />
          <span className="w-11 h-6 bg-charcoal/15 peer-checked:bg-green rounded-full transition-colors" />
          <span className="absolute left-0.5 top-0.5 bg-white w-5 h-5 rounded-full transition-transform peer-checked:translate-x-5 shadow-sm" />
        </label>
      </div>

      <div>
        <label
          htmlFor="message"
          className="block text-xs font-bold uppercase tracking-[0.1em] text-charcoal/60 mb-1.5"
        >
          Message
        </label>
        <input
          id="message"
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          maxLength={200}
          placeholder="Sudan emergency — your donation reaches families today"
          className="w-full px-3 py-3 rounded-xl bg-cream border border-charcoal/10 focus:border-charcoal/30 focus:outline-none focus:ring-2 focus:ring-charcoal/10 text-charcoal text-sm"
        />
        <p className="mt-1.5 text-[12px] text-charcoal/50">
          {message.length} / 200
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label
            htmlFor="linkLabel"
            className="block text-xs font-bold uppercase tracking-[0.1em] text-charcoal/60 mb-1.5"
          >
            Link label <span className="text-charcoal/40 normal-case font-normal">(optional)</span>
          </label>
          <input
            id="linkLabel"
            type="text"
            value={linkLabel}
            onChange={(e) => setLinkLabel(e.target.value)}
            placeholder="Donate now"
            className="w-full px-3 py-3 rounded-xl bg-cream border border-charcoal/10 focus:border-charcoal/30 focus:outline-none focus:ring-2 focus:ring-charcoal/10 text-charcoal text-sm"
          />
        </div>
        <div>
          <label
            htmlFor="linkHref"
            className="block text-xs font-bold uppercase tracking-[0.1em] text-charcoal/60 mb-1.5"
          >
            Link URL
          </label>
          <input
            id="linkHref"
            type="text"
            value={linkHref}
            onChange={(e) => setLinkHref(e.target.value)}
            placeholder="/palestine"
            className="w-full px-3 py-3 rounded-xl bg-cream border border-charcoal/10 focus:border-charcoal/30 focus:outline-none focus:ring-2 focus:ring-charcoal/10 text-charcoal text-sm font-mono"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-bold uppercase tracking-[0.1em] text-charcoal/60 mb-2">
          Theme
        </label>
        <div className="flex gap-2">
          {(["info", "urgent"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTheme(t)}
              className={`flex-1 px-4 py-2 rounded-full text-sm font-semibold capitalize transition-colors ${
                theme === t
                  ? t === "urgent"
                    ? "bg-red-600 text-white"
                    : "bg-charcoal text-white"
                  : "bg-cream text-charcoal/70 hover:text-charcoal"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
        <p className="mt-1.5 text-[12px] text-charcoal/50 leading-snug">
          <strong>Info</strong> = brand-neutral, charcoal. <strong>Urgent</strong> = red, for emergencies.
        </p>
      </div>

      <div className="flex items-center gap-3 pt-2 border-t border-charcoal/5">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={dismissible}
            onChange={(e) => setDismissible(e.target.checked)}
            className="w-4 h-4 accent-charcoal"
          />
          <span className="text-charcoal text-sm">Donors can dismiss it (24h)</span>
        </label>
      </div>

      <div className="flex justify-end pt-2">
        <button
          type="submit"
          disabled={pending}
          className="px-5 py-2.5 rounded-full bg-charcoal text-white text-sm font-semibold hover:bg-charcoal/85 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {pending ? "Saving…" : "Save banner"}
        </button>
      </div>
    </form>
  );
}
