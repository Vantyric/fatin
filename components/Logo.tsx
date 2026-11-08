import React from "react";

interface LogoProps {
  className?: string;
  size?: number;
  monochrome?: boolean;
}

export function Logo({ className = "", size = 36, monochrome = false }: LogoProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 512 512"
      width={size}
      height={size}
      className={className}
      aria-hidden="true"
    >
      <defs>
        {!monochrome && (
          <>
            <linearGradient id="shieldGradComp" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#14B8A6" />
              <stop offset="100%" stopColor="#38BDF8" />
            </linearGradient>
            <linearGradient id="innerGlowComp" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#ffffff" stopOpacity="0.0" />
            </linearGradient>
          </>
        )}
      </defs>

      {/* Shield Base */}
      <path
        d="M 256 64 C 360 64 416 96 416 96 C 416 260 340 376 256 432 C 172 376 96 260 96 96 C 96 96 152 64 256 64 Z"
        fill={monochrome ? "currentColor" : "url(#shieldGradComp)"}
      />

      {/* Inner highlight */}
      {!monochrome && (
        <path
          d="M 256 72 C 350 72 404 102 404 102 C 404 252 334 362 256 416 C 178 362 108 252 108 102 C 108 102 162 72 256 72 Z"
          fill="url(#innerGlowComp)"
          opacity="0.6"
        />
      )}

      {/* Central Eye Lens */}
      <path
        d="M 160 256 C 188 196 324 196 352 256 C 324 316 188 316 160 256 Z"
        fill={monochrome ? "var(--background)" : "#121A2F"}
        stroke="#ffffff"
        strokeWidth="14"
        strokeLinejoin="round"
      />

      {/* Pupil / Iris */}
      <circle
        cx="256"
        cy="256"
        r="44"
        fill={monochrome ? "currentColor" : "url(#shieldGradComp)"}
      />

      {/* Verification Checkmark */}
      <path
        d="M 238 256 L 250 268 L 274 244"
        fill="none"
        stroke="#ffffff"
        strokeWidth="10"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
