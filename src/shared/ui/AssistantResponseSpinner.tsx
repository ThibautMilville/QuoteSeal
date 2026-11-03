"use client";

type Variant = "ring" | "dots";

type AssistantResponseSpinnerProps = {
  /** Visible status text next to the drawing. */
  label?: string;
  variant?: Variant;
  className?: string;
};

/**
 * Lightweight chat pending indicator adapted from Signafy / Kodza Spinner.
 * Colour comes from currentColor on the host.
 */
export function AssistantResponseSpinner({
  label = "Thinking…",
  variant = "ring",
  className = "",
}: AssistantResponseSpinnerProps) {
  return (
    <span
      className={`qs-assistant-spinner ${className}`.trim()}
      role="status"
      aria-live="polite"
      aria-label={label}
    >
      <span className="qs-assistant-spinner__icon" aria-hidden="true">
        {variant === "dots" ? (
          <span className="qs-assistant-spinner__dots">
            <span />
            <span />
            <span />
          </span>
        ) : (
          <svg
            className="qs-assistant-spinner__ring"
            viewBox="0 0 24 24"
            aria-hidden="true"
            focusable="false"
          >
            <circle cx="12" cy="12" r="9" />
            <circle cx="12" cy="12" r="9" pathLength="100" />
          </svg>
        )}
      </span>
      {label ? <span className="qs-assistant-spinner__label">{label}</span> : null}
    </span>
  );
}
