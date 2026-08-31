/**
 * Editorial mark — the only drawn element in the Discovery.
 *
 * One gesture in two states. The opening draws a circle that deliberately
 * does not close: 256° of arc and a 104° gap held open on the right. The
 * closing keeps that exact arc and adds a second stroke that carries the
 * line across the gap — the form does not become a circle, it finds its
 * continuation. Same system, one small evolution between them.
 */

const ARC = "M28 30.24A13 13 0 1 1 28 9.76"
const CONTINUATION = "M28 30.24C34.6 26.4 34.6 13.6 28 9.76"

export function Mark({
  variant = "open",
  className = "",
}: {
  variant?: "open" | "continued"
  className?: string
}) {
  return (
    <svg
      viewBox="0 0 40 40"
      aria-hidden
      focusable="false"
      className={`h-[30px] w-[30px] sm:h-[34px] sm:w-[34px] ${className}`}
      fill="none"
      strokeWidth={1.1}
      strokeLinecap="round"
    >
      <path
        d={ARC}
        stroke="var(--ink-45)"
        className="mark-draw"
        style={{ ["--draw-length" as string]: "59" }}
      />

      {variant === "continued" && (
        <path
          d={CONTINUATION}
          stroke="var(--accent)"
          className="mark-draw"
          style={{
            ["--draw-length" as string]: "24",
            animationDelay: "700ms",
          }}
        />
      )}
    </svg>
  )
}
