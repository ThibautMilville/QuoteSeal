"use client";

import { useId, type SVGProps } from "react";

type QuoteSealMarkProps = SVGProps<SVGSVGElement> & {
  title?: string;
};

/**
 * QuoteSeal mark - wax-seal ring with QS stamp.
 * Soft 3D emerald/cyan, readable at 16px.
 */
export function QuoteSealMark({
  title = "QuoteSeal",
  className = "",
  ...props
}: QuoteSealMarkProps) {
  const uid = useId().replace(/:/g, "");
  const tile = `qs-tile-${uid}`;
  const mark = `qs-mark-${uid}`;
  const hi = `qs-hi-${uid}`;
  const gold = `qs-gold-${uid}`;

  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label={title}
      {...props}
    >
      <title>{title}</title>
      <defs>
        <linearGradient
          id={tile}
          x1="4"
          y1="2"
          x2="28"
          y2="30"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#0a242a" />
          <stop offset="1" stopColor="#02090d" />
        </linearGradient>
        <linearGradient
          id={mark}
          x1="6"
          y1="8"
          x2="26"
          y2="24"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#7af0d0" />
          <stop offset="0.55" stopColor="#36b8a6" />
          <stop offset="1" stopColor="#5ec8d8" />
        </linearGradient>
        <linearGradient
          id={hi}
          x1="8"
          y1="4"
          x2="22"
          y2="14"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#f0fff9" stopOpacity="0.55" />
          <stop offset="1" stopColor="#5beebe" stopOpacity="0" />
        </linearGradient>
        <linearGradient
          id={gold}
          x1="10"
          y1="10"
          x2="22"
          y2="22"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#f0d78c" />
          <stop offset="1" stopColor="#c9a227" />
        </linearGradient>
      </defs>

      <rect
        x="1.5"
        y="1.5"
        width="29"
        height="29"
        rx="8"
        fill={`url(#${tile})`}
        stroke={`url(#${mark})`}
        strokeWidth="1.35"
        strokeOpacity="0.55"
      />
      <path
        d="M8.5 4.2 H20.5 A6.2 6.2 0 0 1 26.7 10.4"
        stroke={`url(#${hi})`}
        strokeWidth="1.1"
        strokeLinecap="round"
      />

      {/* Outer seal ring */}
      <circle
        cx="16"
        cy="16"
        r="9.2"
        stroke={`url(#${mark})`}
        strokeWidth="2.2"
      />
      {/* Bead ring */}
      <circle
        cx="16"
        cy="16"
        r="7.35"
        stroke={`url(#${gold})`}
        strokeWidth="1.05"
        opacity="0.85"
      />
      {/* Inner disc */}
      <circle cx="16" cy="16" r="5.6" fill={`url(#${mark})`} opacity="0.18" />
      {/* QS monogram */}
      <path
        d="M13.1 13.2 C12.35 14.05 11.95 15.05 11.95 16.15 C11.95 18.55 13.85 20.35 16.2 20.35 C17.35 20.35 18.35 19.9 19.05 19.15"
        stroke={`url(#${mark})`}
        strokeWidth="1.55"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M19.35 19.45 L20.55 20.7"
        stroke={`url(#${mark})`}
        strokeWidth="1.55"
        strokeLinecap="round"
      />
      <path
        d="M14.55 12.9 H18.15 C19.05 12.9 19.7 13.55 19.7 14.4 C19.7 15.2 19.15 15.8 18.35 15.95 L19.85 18.05"
        stroke={`url(#${mark})`}
        strokeWidth="1.45"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}
