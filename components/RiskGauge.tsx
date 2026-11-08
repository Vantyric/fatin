"use client";

import React, { useEffect, useState } from "react";

interface RiskGaugeProps {
  score: number; // 0 to 100
  size?: number;
}

export function RiskGauge({ score, size = 180 }: RiskGaugeProps) {
  const [displayScore, setDisplayScore] = useState(0);

  useEffect(() => {
    // Check if user prefers reduced motion
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mediaQuery.matches) {
      setDisplayScore(score);
      return;
    }

    // Animate score count-up
    const duration = 900; // ms
    const startTime = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(1, elapsed / duration);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayScore(Math.round(eased * score));

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    const animId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animId);
  }, [score]);

  // Semicircle geometry
  const radius = 70;
  const strokeWidth = 14;
  const arcLength = Math.PI * radius; // approx 219.9
  const strokeDashoffset = arcLength - (displayScore / 100) * arcLength;

  let strokeColor = "var(--verdict-safe)";
  if (score >= 70) {
    strokeColor = "var(--verdict-danger)";
  } else if (score >= 30) {
    strokeColor = "var(--verdict-warning)";
  }

  return (
    <div className="flex flex-col items-center justify-center" aria-label={`مؤشر الخطورة: ${score} من 100`}>
      <div className="relative" style={{ width: size, height: size * 0.58 }}>
        <svg
          viewBox="0 0 180 110"
          className="w-full h-full overflow-visible"
          role="img"
          aria-hidden="true"
        >
          {/* Background Arc */}
          <path
            d="M 20 95 A 70 70 0 0 1 160 95"
            fill="none"
            stroke="var(--border)"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />

          {/* Colored Active Arc */}
          <path
            d="M 20 95 A 70 70 0 0 1 160 95"
            fill="none"
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            strokeDasharray={arcLength}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-300 ease-out"
          />
        </svg>

        {/* Center score readout */}
        <div className="absolute inset-0 flex flex-col items-center justify-end pb-1">
          <span className="text-3xl sm:text-4xl font-black text-foreground tracking-tight leading-none">
            {displayScore}
          </span>
          <span className="text-[11px] text-muted font-medium mt-1">مستوى الخطورة / 100</span>
        </div>
      </div>
    </div>
  );
}
