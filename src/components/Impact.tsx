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
  { value: 90, suffix: "p", label: "Of every £1 to programmes" },
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
        <div className="text-center max-w-2xl mx-auto mb-10">
          <h2 className="text-3xl sm:text-4xl font-heading font-bold text-charcoal leading-tight mb-3">
            Our Impact in Numbers
          </h2>
          <p className="text-grey text-base sm:text-[1.0625rem] leading-[1.7]">
            Every pound you give is accounted for. We are committed to
            transparency and to maximising the impact of your donations.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="text-center bg-green-light/40 border border-green/8 rounded-xl p-6 md:p-8"
            >
              <div className="text-3xl md:text-4xl font-heading font-bold text-green-dark mb-2">
                <CountUp value={stat.value} suffix={stat.suffix} prefix={stat.prefix} />
              </div>
              <p className="text-charcoal/50 text-sm font-medium">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Transparency Statement */}
        <div className="bg-green-dark/90 rounded-xl p-7 md:p-10">
          <div className="max-w-2xl mx-auto text-center">
            <h3 className="text-xl sm:text-2xl font-heading font-bold text-white mb-3">
              Committed to Transparency
            </h3>
            <p className="text-white/70 text-[0.9375rem] mb-6 leading-[1.7]">
              We pledge to spend no more than 10% on administrative costs. Our
              accounts are filed annually with the Charity Commission and are
              publicly available for review.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-5 border-t border-white/10">
            <a
              href="https://register-of-charities.charitycommission.gov.uk/charity-search/-/charity-details/5049652"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-white/80 hover:text-white text-[0.8125rem] font-medium transition-colors duration-200"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
              </svg>
              View on Charity Commission
            </a>
            <span className="hidden sm:inline text-white/25">·</span>
            <span className="text-white/45 text-[0.8125rem]">
              Reg. No. 1158608 &middot; Company No. 08593822
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
