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
          let start = 0;
          const duration = 1500;
          const startTime = performance.now();

          const animate = (currentTime: number) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            // Ease-out cubic
            const eased = 1 - Math.pow(1 - progress, 3);
            start = Math.round(eased * target);
            setCount(start);
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
    <section className="bg-green-dark text-white py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
          {stats.map((stat) => (
            <div key={stat.label} className="text-center">
              <div className="text-xl sm:text-2xl font-heading font-bold mb-1">
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
              <div className="text-white/70 text-xs sm:text-sm">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
