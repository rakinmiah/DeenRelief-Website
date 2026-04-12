"use client";

import { useEffect, useRef, useState } from "react";

interface TrustStat {
  label: string;
  value: string;
  numericValue?: number;
  prefix?: string;
  suffix?: string;
}

const stats: TrustStat[] = [
  {
    label: "Registered Charity",
    value: "No. 1158608",
  },
  {
    label: "Years of Impact",
    value: "12+",
    numericValue: 12,
    suffix: "+",
  },
  {
    label: "Countries of Operation",
    value: "5+",
    numericValue: 5,
    suffix: "+",
  },
  {
    label: "Committed to Transparency",
    value: "Charity Commission Verified",
  },
];

function AnimatedNumber({
  target,
  suffix = "",
  prefix = "",
}: {
  target: number;
  suffix?: string;
  prefix?: string;
}) {
  const [count, setCount] = useState(0);
  const [hasAnimated, setHasAnimated] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated) {
          setHasAnimated(true);
          const duration = 1500;
          const startTime = performance.now();

          const animate = (currentTime: number) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            setCount(Math.round(eased * target));
            if (progress < 1) {
              requestAnimationFrame(animate);
            }
          };
          requestAnimationFrame(animate);
        }
      },
      { threshold: 0.5 }
    );

    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [target, hasAnimated]);

  return (
    <span ref={ref}>
      {prefix}
      {count}
      {suffix}
    </span>
  );
}

export default function TrustBar() {
  return (
    <section className="bg-green-dark py-7 md:py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-y-4 gap-x-6 lg:gap-0 items-center">
          {stats.map((stat, index) => {
            const isVerified = index === stats.length - 1;
            return (
              <div
                key={stat.label}
                className={`text-center ${
                  index < stats.length - 1
                    ? "lg:border-r lg:border-white/15"
                    : ""
                } ${isVerified ? "lg:pl-6" : "lg:px-2"}`}
              >
                <div
                  className={`font-heading font-bold text-white leading-tight ${
                    isVerified
                      ? "text-[15px] sm:text-base mb-0.5"
                      : "text-2xl sm:text-[26px] mb-0.5 tracking-tight"
                  }`}
                >
                  {stat.numericValue !== undefined ? (
                    <AnimatedNumber
                      target={stat.numericValue}
                      suffix={stat.suffix}
                      prefix={stat.prefix}
                    />
                  ) : (
                    stat.value
                  )}
                </div>
                <div
                  className={`font-medium ${
                    isVerified
                      ? "text-white/50 text-[11px]"
                      : "text-white/50 text-[11.5px]"
                  }`}
                >
                  {stat.label}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
