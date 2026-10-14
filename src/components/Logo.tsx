import Image from "next/image";
import clsx from "clsx";

// The Tazewell Place entrance mark: white-filled with black outlines on a
// transparent background, so it reads on photos, dark colors, or light ones
// with no box behind it. With `animate` it builds up from the steps to the
// cornice once on load (CSS only — see globals.css).
const RATIO = 520 / 686;

export default function Logo({
  height,
  animate = false,
  className,
}: {
  height: number;
  animate?: boolean;
  className?: string;
}) {
  return (
    <Image
      src="/images/logo-white.png"
      alt="Tazewell Place logo"
      priority
      width={Math.round(height * RATIO)}
      height={height}
      className={clsx("drop-shadow-[0_1px_3px_rgba(0,0,0,0.45)]", animate && "logo-build", className)}
      style={{ height, width: "auto" }}
    />
  );
}
