"use client";

import { useState } from "react";
import Image from "next/image";
import Header from "@/components/Header";
import Button from "@/components/Button";
import ProofTag from "@/components/ProofTag";
import Footer from "@/components/Footer";

export default function VolunteerPage() {
  const [formState, setFormState] = useState<"idle" | "submitting" | "submitted" | "error">("idle");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [project, setProject] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email) return;
    setFormState("submitting");
    try {
      const res = await fetch("/api/volunteer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, phone, project, message }),
      });
      if (!res.ok) throw new Error();
      setFormState("submitted");
      setName("");
      setEmail("");
      setPhone("");
      setProject("");
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
              alt="Deen Relief volunteers gathered at Brighton seafront for a community outreach event"
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
                Take Action, Get Involved
              </h1>
              <p className="text-[0.875rem] sm:text-[0.9375rem] text-white/65 mb-7 leading-[1.7] max-w-[24rem]">
                Join our team of dedicated volunteers across the UK and
                abroad. From Brighton outreach to Bangladesh housing
                projects — no experience needed, just a willingness to
                help.
              </p>
              <Button variant="primary" href="#volunteer-form">
                Apply Now
              </Button>
            </div>
          </div>

          <ProofTag location="Brighton, UK" position="bottom-right" />
        </section>

        {/* ─── 2. Volunteer Form + Info ─── */}
        <section id="volunteer-form" className="py-16 md:py-24 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-2 gap-10 lg:gap-16">
              {/* Left: Info */}
              <div>
                <span className="inline-block text-[11px] font-bold tracking-[0.1em] uppercase text-green mb-3">
                  Charity Volunteer Opportunities
                </span>
                <h2 className="text-3xl sm:text-4xl font-heading font-bold text-charcoal leading-tight mb-4">
                  Volunteer Opportunities — UK and Abroad
                </h2>
                <p className="text-grey text-base sm:text-[1.0625rem] leading-[1.7] mb-8">
                  Volunteering with Deen Relief is a rewarding experience —
                  offering personal development, growth, and the
                  satisfaction of knowing your time makes a real difference.
                  No experience needed, just a willingness to help.
                </p>

                {/* How it works */}
                <div className="space-y-6 mb-8">
                  {[
                    { step: "01", title: "Choose a project", description: "Select from our available campaigns in the UK or abroad" },
                    { step: "02", title: "Apply", description: "Fill out the form or email us at info@deenrelief.org" },
                    { step: "03", title: "Get started", description: "We'll be in touch to welcome you to the team" },
                  ].map((item) => (
                    <div key={item.step} className="flex gap-4 items-start">
                      <span className="text-2xl font-heading font-bold text-green/20 flex-shrink-0">
                        {item.step}
                      </span>
                      <div>
                        <p className="font-heading font-semibold text-[0.9375rem] text-charcoal mb-0.5">
                          {item.title}
                        </p>
                        <p className="text-grey text-[0.8125rem] leading-[1.6]">
                          {item.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Contact */}
                <div className="pt-5 border-t border-charcoal/5">
                  <p className="text-charcoal/40 text-xs font-medium mb-3">
                    Questions?
                  </p>
                  <div className="space-y-1.5">
                    <a
                      href="mailto:info@deenrelief.org"
                      className="text-grey text-sm hover:text-green transition-colors duration-200 block"
                    >
                      info@deenrelief.org
                    </a>
                    <a
                      href="tel:+443003658899"
                      className="text-grey text-sm hover:text-green transition-colors duration-200 block"
                    >
                      +44 (0) 300 365 8899
                    </a>
                  </div>
                </div>
              </div>

              {/* Right: Form */}
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
                        Application Received
                      </h3>
                      <p className="text-grey text-sm leading-relaxed">
                        Thank you for your interest in volunteering. We&apos;ll
                        be in touch soon.
                      </p>
                    </div>
                  ) : (
                    <form onSubmit={handleSubmit} className="space-y-5">
                      <div>
                        <label
                          htmlFor="vol-name"
                          className="block text-sm font-semibold text-charcoal mb-2"
                        >
                          Name
                        </label>
                        <input
                          id="vol-name"
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
                          htmlFor="vol-email"
                          className="block text-sm font-semibold text-charcoal mb-2"
                        >
                          Email
                        </label>
                        <input
                          id="vol-email"
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
                          htmlFor="vol-phone"
                          className="block text-sm font-semibold text-charcoal mb-2"
                        >
                          Phone
                        </label>
                        <input
                          id="vol-phone"
                          type="tel"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="Your phone number"
                          className="w-full px-4 py-3 rounded-xl border-2 border-grey-light bg-white text-charcoal placeholder:text-grey/35 focus:outline-none focus:border-green/40 transition-colors duration-200"
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="vol-project"
                          className="block text-sm font-semibold text-charcoal mb-2"
                        >
                          Preferred Project
                        </label>
                        <select
                          id="vol-project"
                          value={project}
                          onChange={(e) => setProject(e.target.value)}
                          className="w-full px-4 py-3 rounded-xl border-2 border-grey-light bg-white text-charcoal focus:outline-none focus:border-green/40 transition-colors duration-200"
                        >
                          <option value="">Select a project</option>
                          <option value="bangladesh-housing">Bangladesh Housing Aid</option>
                          <option value="bangladesh-water">Bangladesh Clean Water Aid</option>
                          <option value="local-community">Local Community Support</option>
                          <option value="brighton-homeless">Brighton Homeless Assistance</option>
                        </select>
                      </div>

                      <div>
                        <label
                          htmlFor="vol-message"
                          className="block text-sm font-semibold text-charcoal mb-2"
                        >
                          Message
                        </label>
                        <textarea
                          id="vol-message"
                          rows={4}
                          value={message}
                          onChange={(e) => setMessage(e.target.value)}
                          placeholder="Tell us about yourself and why you'd like to volunteer"
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
                            Submitting…
                          </span>
                        ) : "Apply to Volunteer"}
                      </button>
                    </form>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ─── 3. Available Projects ─── */}
        <section className="py-16 md:py-24 bg-cream">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-10">
              <span className="inline-block text-[11px] font-bold tracking-[0.1em] uppercase text-green mb-3">
                Our Projects
              </span>
              <h2 className="text-3xl sm:text-4xl font-heading font-bold text-charcoal leading-tight mb-3">
                Charity Volunteer Projects
              </h2>
              <p className="text-grey text-base sm:text-[1.0625rem] leading-[1.7]">
                Choose a project that matches your skills and interests.
              </p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {[
                {
                  title: "Bangladesh Housing",
                  description: "Help build and maintain housing for vulnerable families in rural Bangladesh.",
                  icon: (
                    <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
                    </svg>
                  ),
                },
                {
                  title: "Clean Water",
                  description: "Support tube well construction and water access projects in rural communities.",
                  icon: (
                    <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8.25v-1.5m0 1.5c-1.355 0-2.697.056-4.024.166C6.845 8.51 6 9.473 6 10.608v2.513m6-4.871c1.355 0 2.697.056 4.024.166C17.155 8.51 18 9.473 18 10.608v2.513M15 8.25v-1.5m-6 1.5v-1.5m12 9.75-1.5.75a3.354 3.354 0 0 1-3 0 3.354 3.354 0 0 0-3 0 3.354 3.354 0 0 1-3 0 3.354 3.354 0 0 0-3 0 3.354 3.354 0 0 1-3 0L3 16.5m15-3.379a48.474 48.474 0 0 0-6-.371c-2.032 0-4.034.126-6 .371m12 0c.39.049.777.102 1.163.16 1.07.16 1.837 1.094 1.837 2.175v5.169c0 .621-.504 1.125-1.125 1.125H4.125A1.125 1.125 0 0 1 3 20.625v-5.17c0-1.08.768-2.014 1.837-2.174A47.78 47.78 0 0 1 6 13.12M12.265 3.11a.375.375 0 1 1-.53 0L12 2.845l.265.265Z" />
                    </svg>
                  ),
                },
                {
                  title: "Community Support",
                  description: "Join our community outreach programmes across the UK.",
                  icon: (
                    <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z" />
                    </svg>
                  ),
                },
                {
                  title: "Brighton Homeless",
                  description: "Distribute hot meals and essentials on Brighton's streets every week.",
                  icon: (
                    <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" />
                    </svg>
                  ),
                },
              ].map((proj) => (
                <div
                  key={proj.title}
                  className="bg-white border border-charcoal/5 rounded-2xl p-6 text-center"
                >
                  <div className="w-12 h-12 rounded-xl bg-green/10 text-green flex items-center justify-center mx-auto mb-4">
                    {proj.icon}
                  </div>
                  <h3 className="font-heading font-bold text-[1.0625rem] text-charcoal mb-2">
                    {proj.title}
                  </h3>
                  <p className="text-grey/80 text-[0.8125rem] leading-[1.6]">
                    {proj.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── 4. Final CTA ─── */}
        <section className="py-10 md:py-12 bg-green-dark">
          <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-xl sm:text-2xl font-heading font-bold text-white mb-2">
              Volunteer With Us Today
            </h2>
            <p className="text-white/55 text-sm mb-6">
              No experience needed. Just a willingness to help.
            </p>
            <Button variant="primary" href="#volunteer-form">
              Apply to Volunteer
            </Button>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
