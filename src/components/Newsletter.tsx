"use client";

import { useState } from "react";

export default function Newsletter() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      setSubmitted(true);
      setEmail("");
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
                className="flex-1 px-4 py-2.5 rounded-lg bg-white/10 border border-white/25 text-white text-sm placeholder:text-white/40 focus:outline-none focus:border-white/50 transition-colors duration-200"
              />
              <button
                type="submit"
                className="px-6 py-2.5 rounded-full bg-amber text-charcoal text-sm font-semibold hover:bg-amber-dark transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                Subscribe
              </button>
            </form>
          )}

          {/* Social Links */}
          <div className="mt-7 pt-6 border-t border-white/8 flex items-center justify-center gap-4">
            {[
              { name: "Facebook", href: "https://facebook.com/deenrelief", icon: "M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" },
              { name: "Instagram", href: "https://instagram.com/deenrelief", icon: "M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37zM17.5 6.5h.01M7.5 2h9A5.5 5.5 0 0 1 22 7.5v9a5.5 5.5 0 0 1-5.5 5.5h-9A5.5 5.5 0 0 1 2 16.5v-9A5.5 5.5 0 0 1 7.5 2z" },
              { name: "Twitter", href: "https://twitter.com/deenrelief", icon: "M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z" },
              { name: "YouTube", href: "https://youtube.com/deenrelief", icon: "m22 8-6 4 6 4V8ZM2 6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6Z" },
            ].map((social) => (
              <a
                key={social.name}
                href={social.href}
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 rounded-full bg-white/8 flex items-center justify-center text-white/45 hover:bg-white/16 hover:text-white/80 transition-all duration-200"
                aria-label={`Follow us on ${social.name}`}
              >
                <svg
                  className="w-[18px] h-[18px]"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  viewBox="0 0 24 24"
                >
                  <path d={social.icon} />
                </svg>
              </a>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
