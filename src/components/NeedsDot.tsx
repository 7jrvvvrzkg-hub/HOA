/** A small red dot marking something that still needs doing. Quiet on
 * purpose: no number, no animation. Renders nothing when `show` is false. */
export default function NeedsDot({ show = true, className = "" }: { show?: boolean; className?: string }) {
  if (!show) return null;
  return (
    <span
      role="img"
      aria-label="needs attention"
      data-needs-dot
      className={`inline-block h-2 w-2 shrink-0 rounded-full bg-danger ${className}`}
    />
  );
}
