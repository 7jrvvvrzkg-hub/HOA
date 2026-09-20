// Placeholder brand mark for Embellish Antiques — deliberately just a plain
// circle, standing in until the owner's real logo is ready. Swap it for the
// owner's actual logo preferences and this component is the only place that
// needs to change — everything else (favicon, admin header, email
// templates) imports from here.

export function LogoMark({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <circle cx="24" cy="24" r="22" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

export function Logo({
  className = "",
  markClassName = "h-8 w-8",
  wordmark = true,
}: {
  className?: string;
  markClassName?: string;
  wordmark?: boolean;
}) {
  return (
    <span className={`inline-flex items-center gap-2.5 text-ink ${className}`}>
      <LogoMark className={markClassName} />
      {wordmark && (
        <span className="leading-none">
          <span className="block font-display text-xl italic tracking-tight">Embellish</span>
          <span className="block text-[0.6rem] font-semibold tracking-[0.35em] text-ink-soft">
            ANTIQUES
          </span>
        </span>
      )}
    </span>
  );
}
