import Link from "next/link";
import { InvadersGame } from "@/components/invaders-game";

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col items-center gap-6 px-4 py-16 text-center sm:px-6">
      <span className="font-display text-7xl italic text-pop">404</span>
      <div>
        <h1 className="font-display text-2xl">This piece isn&apos;t here</h1>
        <p className="mt-2 text-ink-soft">
          Whatever you were looking for has moved, sold, or never existed — but you&apos;re
          welcome to blast some invaders while you decide where to go next.
        </p>
      </div>

      <div className="w-full rounded-[3rem] bg-forest p-6 sm:p-8">
        <InvadersGame />
      </div>

      <Link href="/" className="rounded-full bg-pop px-6 py-3 text-sm font-semibold text-cream shadow-pop">
        Back to the shop
      </Link>
    </div>
  );
}
