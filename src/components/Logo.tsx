import Image from "next/image";
import clsx from "clsx";

// The Tazewell Place entrance mark. With `animate`, the outline draws in and
// the solid mark fades over it once on page load (CSS only — see
// globals.css). Without it, just the finished mark.
export default function Logo({
  height,
  animate = false,
  className,
}: {
  height: number;
  animate?: boolean;
  className?: string;
}) {
  const width = Math.round((height * 900) / 1173);
  const dims = { width, height, style: { height, width: "auto" as const } };
  return (
    <span
      className={clsx("relative inline-block", animate && "logo-anim", className)}
      style={{ height, width }}
      role="img"
      aria-label="Tazewell Place logo"
    >
      {animate && (
        <Image src="/images/logo-outline.png" alt="" aria-hidden priority {...dims}
          className="logo-outline absolute inset-0" />
      )}
      <Image src="/images/logo-mark.png" alt="" aria-hidden priority {...dims}
        className={clsx(animate ? "logo-fill absolute inset-0" : "")} />
    </span>
  );
}
