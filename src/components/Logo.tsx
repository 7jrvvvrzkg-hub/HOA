import Image from "next/image";
import clsx from "clsx";

// The Tazewell Place entrance mark. With `animate`, the four original logo
// progression drawings play in order, each fading in over the last, ending on
// the finished logo (CSS only — see globals.css). Without it, just the
// finished logo. The drawings have solid white backgrounds, so this sits on
// a white plaque.
const RATIO = 400 / 522;

export default function Logo({
  height,
  animate = false,
  className,
}: {
  height: number;
  animate?: boolean;
  className?: string;
}) {
  const width = Math.round(height * RATIO);
  const img = (n: number, extra: string) => (
    <Image
      key={n}
      src={`/images/logo-stage-${n}.png`}
      alt=""
      aria-hidden
      priority
      width={width}
      height={height}
      className={clsx("absolute inset-0 h-full w-full", extra)}
    />
  );
  return (
    <span
      className={clsx("relative inline-block", animate && "logo-seq", className)}
      style={{ height, width }}
      role="img"
      aria-label="Tazewell Place logo"
    >
      {animate
        ? [1, 2, 3, 4].map((n) => img(n, `stage stage-${n}`))
        : img(4, "")}
    </span>
  );
}
