"use client";

type SealLoaderProps = {
  /** Visible status text next to the drawing. */
  label?: string;
  className?: string;
};

/**
 * Lightweight chat pending indicator (ring). Colour from currentColor.
 */
export function SealLoader({
  label = "Thinking…",
  className = "",
}: SealLoaderProps) {
  return (
    <span
      className={`qs-assistant-spinner ${className}`.trim()}
      role="status"
      aria-live="polite"
      aria-label={label}
    >
      <span className="qs-assistant-spinner__icon" aria-hidden="true">
        <svg
          className="qs-assistant-spinner__ring"
          viewBox="0 0 24 24"
          aria-hidden="true"
          focusable="false"
        >
          <circle cx="12" cy="12" r="9" />
          <circle cx="12" cy="12" r="9" pathLength="100" />
        </svg>
      </span>
      {label ? <span className="qs-assistant-spinner__label">{label}</span> : null}
    </span>
  );
}
