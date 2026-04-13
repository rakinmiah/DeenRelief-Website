"use client";

import { useState } from "react";
import Image from "next/image";
import Header from "@/components/Header";
import ProofTag from "@/components/ProofTag";
import Newsletter from "@/components/Newsletter";
import Footer from "@/components/Footer";

export default function ContactPage() {
  const [formState, setFormState] = useState<"idle" | "submitting" | "submitted" | "error">("idle");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !message) return;
    setFormState("submitting");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, subject, message }),
      });
      if (!res.ok) throw new Error();
      setFormState("submitted");
      setName("");
      setEmail("");
      setSubject("");
      setMessage("");
    } catch {
      setFormState("error");
    }
  };

  return (
    <>
      <Header />

      <main id="main-content" className="flex-1">
        {/* ─── 1. Hero ─── */}
        <section className="relative min-h-[40vh] md:min-h-[45vh] flex items-center mt-[60px] md:mt-[64px]">
          <div className="absolute inset-0 z-0">
            <Image
              src="/images/brighton-team.webp"
              alt="Deen Relief volunteers gathered at Brighton seafront"
              fill
              className="object-cover object-[center_75%]"
              priority
            />
            <div
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(to right, rgba(26,26,46,0.93) 0%, rgba(26,26,46,0.88) 35%, rgba(26,26,46,0.62) 52%, rgba(26,26,46,0.20) 75%, rgba(26,26,46,0.06) 100%)",
              }}
            />
            <div
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(to top, rgba(26,26,46,0.45) 0%, transparent 45%)",
              }}
            />
          </div>

          <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full py-12 md:py-16 lg:py-20">
            <div className="max-w-[22rem] sm:max-w-[26rem] md:max-w-[28rem]">
              <h1 className="text-[1.75rem] sm:text-[2.25rem] lg:text-[2.5rem] leading-[1.18] sm:leading-[1.14] lg:leading-[1.12] text-white font-heading font-bold mb-4 tracking-[-0.02em]">
                Get in Touch
              </h1>
              <p className="text-[0.875rem] sm:text-[0.9375rem] text-white/65 leading-[1.7] max-w-[24rem]">
                Questions about donations, volunteering, or partnerships?
                Our UK charity team is here to help.
              </p>
            </div>
          </div>

          <ProofTag location="Brighton, UK" position="bottom-right" />
        </section>

        {/* ─── 2. Contact Details + Form ─── */}
        <section className="py-16 md:py-24 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-2 gap-10 lg:gap-16">
              {/* Left: Contact Info */}
              <div>
                <span className="inline-block text-[11px] font-bold tracking-[0.1em] uppercase text-green mb-3">
                  Contact Us
                </span>
                <h2 className="text-3xl sm:text-4xl font-heading font-bold text-charcoal leading-tight mb-4">
                  Get in Touch With Deen Relief
                </h2>
                <p className="text-grey text-base sm:text-[1.0625rem] leading-[1.7] mb-6">
                  Whether you have a question about our programmes, want to
                  volunteer, or are interested in partnering with us — we&apos;re
                  here to help.
                </p>

                {/* Contact Items */}
                <div className="space-y-5 mb-6">
                  {/* Email */}
                  <div className="flex gap-3.5 items-center">
                    <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-green/10 text-green flex items-center justify-center">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
                      </svg>
                    </div>
                    <div>
                      <p className="font-heading font-semibold text-[0.9375rem] text-charcoal mb-1">
                        Email
                      </p>
                      <a
                        href="mailto:info@deenrelief.org"
                        className="text-grey text-sm hover:text-green transition-colors duration-200 block"
                      >
                        info@deenrelief.org
                      </a>
                      <a
                        href="mailto:donations@deenrelief.org"
                        className="text-grey text-sm hover:text-green transition-colors duration-200 block"
                      >
                        donations@deenrelief.org
                      </a>
                    </div>
                  </div>

                  {/* Phone */}
                  <div className="flex gap-3.5 items-center">
                    <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-green/10 text-green flex items-center justify-center">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 0 1-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z" />
                      </svg>
                    </div>
                    <div>
                      <p className="font-heading font-semibold text-[0.9375rem] text-charcoal mb-1">
                        Phone
                      </p>
                      <a
                        href="tel:+443003658899"
                        className="text-grey text-sm hover:text-green transition-colors duration-200"
                      >
                        +44 (0) 300 365 8899
                      </a>
                    </div>
                  </div>

                  {/* Hours */}
                  <div className="flex gap-3.5 items-center">
                    <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-green/10 text-green flex items-center justify-center">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                      </svg>
                    </div>
                    <div>
                      <p className="font-heading font-semibold text-[0.9375rem] text-charcoal mb-1">
                        Office Hours
                      </p>
                      <p className="text-grey text-sm">
                        Monday – Sunday, 09:00 – 17:00
                      </p>
                    </div>
                  </div>
                </div>

                {/* Social Links */}
                <div className="pt-5 border-t border-charcoal/5">
                  <p className="text-charcoal/40 text-xs font-medium mb-3">Follow us</p>
                </div>
                <div className="flex items-center gap-2.5">
                  {[
                    { name: "Facebook", href: "https://www.facebook.com/DeenRelief/", icon: "M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" },
                    { name: "Instagram", href: "https://www.instagram.com/deenrelief", icon: "M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37zM17.5 6.5h.01M7.5 2h9A5.5 5.5 0 0 1 22 7.5v9a5.5 5.5 0 0 1-5.5 5.5h-9A5.5 5.5 0 0 1 2 16.5v-9A5.5 5.5 0 0 1 7.5 2z" },
                    { name: "Twitter", href: "https://twitter.com/deenrelief/", icon: "M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z" },
                    { name: "YouTube", href: "https://www.youtube.com/@deenrelief9734", icon: "m22 8-6 4 6 4V8ZM2 6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6Z" },
                  ].map((social) => (
                    <a
                      key={social.name}
                      href={social.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-10 h-10 rounded-full bg-green/10 flex items-center justify-center text-green hover:bg-green hover:text-white transition-all duration-200"
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

              {/* Right: Contact Form */}
              <div>
                <div className="bg-cream rounded-2xl p-6 sm:p-8">
                  {formState === "submitted" ? (
                    <div className="text-center py-10">
                      <div className="w-14 h-14 rounded-full bg-green/10 text-green flex items-center justify-center mx-auto mb-4">
                        <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                        </svg>
                      </div>
                      <h3 className="font-heading font-bold text-lg text-charcoal mb-2">
                        Message Sent
                      </h3>
                      <p className="text-grey text-sm leading-relaxed">
                        Thank you for reaching out. We&apos;ll get back to you
                        as soon as possible.
                      </p>
                    </div>
                  ) : (
                    <form onSubmit={handleSubmit} className="space-y-5">
                      <div>
                        <label
                          htmlFor="contact-name"
                          className="block text-sm font-semibold text-charcoal mb-2"
                        >
                          Name
                        </label>
                        <input
                          id="contact-name"
                          type="text"
                          required
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="Your full name"
                          className="w-full px-4 py-3 rounded-xl border-2 border-grey-light bg-white text-charcoal placeholder:text-grey/35 focus:outline-none focus:border-green/40 transition-colors duration-200"
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="contact-email"
                          className="block text-sm font-semibold text-charcoal mb-2"
                        >
                          Email
                        </label>
                        <input
                          id="contact-email"
                          type="email"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="your@email.com"
                          className="w-full px-4 py-3 rounded-xl border-2 border-grey-light bg-white text-charcoal placeholder:text-grey/35 focus:outline-none focus:border-green/40 transition-colors duration-200"
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="contact-subject"
                          className="block text-sm font-semibold text-charcoal mb-2"
                        >
                          Subject
                        </label>
                        <input
                          id="contact-subject"
                          type="text"
                          value={subject}
                          onChange={(e) => setSubject(e.target.value)}
                          placeholder="What is this regarding?"
                          className="w-full px-4 py-3 rounded-xl border-2 border-grey-light bg-white text-charcoal placeholder:text-grey/35 focus:outline-none focus:border-green/40 transition-colors duration-200"
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="contact-message"
                          className="block text-sm font-semibold text-charcoal mb-2"
                        >
                          Message
                        </label>
                        <textarea
                          id="contact-message"
                          required
                          rows={5}
                          value={message}
                          onChange={(e) => setMessage(e.target.value)}
                          placeholder="How can we help?"
                          className="w-full px-4 py-3 rounded-xl border-2 border-grey-light bg-white text-charcoal placeholder:text-grey/35 focus:outline-none focus:border-green/40 transition-colors duration-200 resize-none"
                        />
                      </div>

                      {formState === "error" && (
                        <p className="text-sm text-red-600 text-center">
                          Something went wrong. Please try again or email us directly.
                        </p>
                      )}

                      <button
                        type="submit"
                        disabled={formState === "submitting"}
                        className={`w-full py-3 mt-1 rounded-full bg-green text-white font-semibold text-sm hover:bg-green-dark transition-colors duration-200 shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green ${formState === "submitting" ? "opacity-75 pointer-events-none" : ""}`}
                      >
                        {formState === "submitting" ? (
                          <span className="inline-flex items-center gap-2">
                            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                            Sending…
                          </span>
                        ) : "Send Message"}
                      </button>
                    </form>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ─── 3. Addresses ─── */}
        <section className="py-16 md:py-24 bg-cream">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-10">
              <span className="inline-block text-[11px] font-bold tracking-[0.1em] uppercase text-green mb-3">
                Find Us
              </span>
              <h2 className="text-3xl sm:text-4xl font-heading font-bold text-charcoal leading-tight">
                Deen Relief Office Locations
              </h2>
            </div>

            <div className="grid sm:grid-cols-2 gap-6 max-w-3xl mx-auto mb-8">
              {/* Registered Office */}
              <div className="bg-white border border-charcoal/5 rounded-2xl p-6 text-center">
                <div className="w-12 h-12 rounded-xl bg-green/10 text-green flex items-center justify-center mx-auto mb-4">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
                  </svg>
                </div>
                <p className="text-charcoal/40 text-xs font-bold uppercase tracking-wider mb-2">
                  Registered Office
                </p>
                <p className="font-heading font-semibold text-[0.9375rem] text-charcoal mb-1">
                  71-75 Shelton Street
                </p>
                <p className="text-grey text-sm">
                  London, WC2H 9JQ
                </p>
              </div>

              {/* Operations Office */}
              <div className="bg-white border border-charcoal/5 rounded-2xl p-6 text-center">
                <div className="w-12 h-12 rounded-xl bg-green/10 text-green flex items-center justify-center mx-auto mb-4">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
                  </svg>
                </div>
                <p className="text-charcoal/40 text-xs font-bold uppercase tracking-wider mb-2">
                  Operations Office
                </p>
                <p className="font-heading font-semibold text-[0.9375rem] text-charcoal mb-1">
                  7 Maldon Road
                </p>
                <p className="text-grey text-sm">
                  Brighton, BN1 5BD
                </p>
              </div>
            </div>

            {/* Trust line */}
            <p className="text-center text-charcoal/35 text-xs font-medium">
              Charity Commission Reg. No. 1158608 · Company No. 08593822
            </p>
          </div>
        </section>

        {/* ─── 4. Newsletter ─── */}
        <Newsletter />
      </main>

      <Footer />
    </>
  );
}
