"use client";

import { useEffect, useRef, useState } from "react";

interface Stat {
  value: number;
  suffix: string;
  prefix?: string;
  label: string;
}

const stats: Stat[] = [
  { value: 3200, suffix: "+", label: "Children & families supported" },
  { value: 5, suffix: "+", label: "Countries of operation" },
  { value: 12, suffix: "+", label: "Years of continuous service" },
  { value: 90, suffix: "%", label: "Of funds to programmes" },
];

function CountUp({ value, suffix, prefix = "" }: { value: number; suffix: string; prefix?: string }) {
  const [count, setCount] = useState(0);
  const [hasAnimated, setHasAnimated] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated) {
          setHasAnimated(true);
          const duration = 2000;
          const startTime = performance.now();

          const animate = (currentTime: number) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            setCount(Math.round(eased * value));
            if (progress < 1) requestAnimationFrame(animate);
          };
          requestAnimationFrame(animate);
        }
      },
      { threshold: 0.3 }
    );

    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [value, hasAnimated]);

  return (
    <span ref={ref}>
      {prefix}{count.toLocaleString()}{suffix}
    </span>
  );
}

export default function Impact() {
  return (
    <section id="impact" className="py-16 md:py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-14">
          <h2 className="text-3xl sm:text-4xl font-heading font-bold text-charcoal mb-4">
            Our Impact in Numbers
          </h2>
          <p className="text-grey text-lg leading-relaxed">
            Every pound you give is accounted for. We are committed to
            transparency and to maximising the impact of your donations.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-14">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="text-center bg-green-light/50 rounded-2xl p-6 md:p-8"
            >
              <div className="text-4xl md:text-5xl font-heading font-bold text-green mb-2">
                <CountUp value={stat.value} suffix={stat.suffix} prefix={stat.prefix} />
              </div>
              <p className="text-grey text-sm">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Transparency Statement */}
        <div className="bg-green-dark rounded-2xl p-8 md:p-12 text-center">
          <h3 className="text-2xl font-heading font-bold text-white mb-4">
            Committed to Transparency
          </h3>
          <p className="text-white/80 max-w-2xl mx-auto mb-6 leading-relaxed">
            We pledge to spend no more than 10% on administrative costs. Our
            accounts are filed annually with the Charity Commission and are
            publicly available for review. Your trust is our most valued asset.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href="https://register-of-charities.charitycommission.gov.uk/charity-search/-/charity-details/5049652"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-white/90 hover:text-white text-sm font-medium underline underline-offset-4 transition-colors duration-200"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
              </svg>
              View on Charity Commission
            </a>
            <span className="hidden sm:inline text-white/40">|</span>
            <span className="text-white/60 text-sm">
              Reg. No. 1158608 &middot; Company No. 08593822
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
