"use client";

import { useState } from "react";

export default function Newsletter() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [error, setError] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setIsSubmitting(true);
    setError(false);
    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) throw new Error();
      setSubmitted(true);
      setEmail("");
    } catch {
      setError(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="py-12 md:py-14 bg-green-dark">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-xl mx-auto text-center">
          <h2 className="text-xl sm:text-2xl font-heading font-bold text-white mb-2">
            Stay Connected With Our Work
          </h2>
          <p className="text-white/55 text-sm mb-6">
            Campaign updates, impact stories, and ways to give.
            No spam — just meaningful updates.
          </p>

          {error && (
            <p className="text-amber-light text-xs mb-3">
              Something went wrong. Please try again.
            </p>
          )}

          {submitted ? (
            <div className="bg-white/10 rounded-lg p-5">
              <p className="text-white text-sm font-medium">
                Thank you for subscribing. We&apos;ll be in touch.
              </p>
            </div>
          ) : (
            <form
              onSubmit={handleSubmit}
              className="flex flex-col sm:flex-row gap-2.5 max-w-md mx-auto"
            >
              <label htmlFor="newsletter-email" className="sr-only">
                Email address
              </label>
              <input
                id="newsletter-email"
                type="email"
                required
                placeholder="Your email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex-1 px-4 py-2.5 rounded-lg bg-white/10 border border-white/25 text-white text-base placeholder:text-white/40 focus:outline-none focus:border-white/50 transition-colors duration-200"
              />
              <button
                type="submit"
                disabled={isSubmitting}
                className={`px-6 py-2.5 rounded-full bg-amber text-charcoal text-sm font-semibold hover:bg-amber-dark transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${isSubmitting ? "opacity-75 pointer-events-none" : ""}`}
              >
                {isSubmitting ? (
                  <span className="inline-flex items-center gap-2">
                    <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Subscribing…
                  </span>
                ) : (
                  "Subscribe"
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
