import Link from "next/link";
import clsx from "clsx";

type Variant = "primary" | "accent" | "outline" | "ghost" | "danger" | "ghostInvert" | "outlineInvert";
type Size = "sm" | "md";

const base =
  "inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none";

const variants: Record<Variant, string> = {
  primary: "bg-primary text-cream hover:bg-primary-dark focus-visible:ring-primary",
  accent: "bg-accent text-ink hover:bg-accent-dark focus-visible:ring-accent",
  outline: "border border-primary text-primary hover:bg-primary hover:text-cream focus-visible:ring-primary",
  ghost: "text-ink-soft hover:bg-cream-dark",
  danger: "bg-danger text-cream hover:opacity-90 focus-visible:ring-danger",
  // For use on dark backgrounds (e.g. the top bar / sidebar) where the
  // light-background "ghost" and "outline" variants read as low-contrast
  // grey-on-grey. Kept as separate variants rather than className overrides
  // so there's no Tailwind class-order specificity fight.
  ghostInvert: "text-cream hover:bg-cream/15 hover:text-accent focus-visible:ring-cream",
  outlineInvert: "border border-cream/70 text-cream hover:bg-cream hover:text-primary focus-visible:ring-cream",
};

const sizes: Record<Size, string> = {
  sm: "px-3 py-1.5 text-sm",
  md: "px-4 py-2 text-sm sm:text-base",
};

type CommonProps = {
  variant?: Variant;
  size?: Size;
  className?: string;
  children: React.ReactNode;
};

export function Button({
  variant = "primary",
  size = "md",
  className,
  children,
  ...rest
}: CommonProps & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button className={clsx(base, variants[variant], sizes[size], className)} {...rest}>
      {children}
    </button>
  );
}

export function ButtonLink({
  href,
  variant = "primary",
  size = "md",
  className,
  children,
}: CommonProps & { href: string }) {
  return (
    <Link href={href} className={clsx(base, variants[variant], sizes[size], className)}>
      {children}
    </Link>
  );
}
