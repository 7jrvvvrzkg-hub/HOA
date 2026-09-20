import Link from "next/link";
import { LayoutDashboard, Package, BarChart3, Mail, LogOut, ExternalLink } from "lucide-react";
import { Logo } from "@/components/logo";
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";
import { logoutAction } from "@/app/admin/login/actions";

const NAV = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/items", label: "Items", icon: Package },
  { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/admin/newsletter", label: "Newsletter", icon: Mail },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const configured = isSupabaseConfigured();

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 lg:flex-row lg:px-8">
      <aside className="lg:w-56 lg:shrink-0">
        <div className="mb-6 flex items-center justify-between lg:block">
          <Logo />
          <Link
            href="/"
            className="flex items-center gap-1 text-xs text-ink-soft hover:text-pop lg:mt-3"
          >
            View site <ExternalLink className="h-3 w-3" />
          </Link>
        </div>
        <nav className="flex gap-1 overflow-x-auto lg:flex-col lg:overflow-visible">
          {NAV.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex min-h-11 shrink-0 items-center gap-2 rounded-xl px-3.5 py-2.5 text-sm font-medium text-ink transition hover:bg-cream-soft active:bg-cream-soft"
            >
              <Icon className="h-4 w-4 shrink-0" /> {label}
            </Link>
          ))}
          <form action={logoutAction}>
            <button className="mt-2 flex min-h-11 w-full shrink-0 items-center gap-2 rounded-xl px-3.5 py-2.5 text-sm font-medium text-ink-soft transition hover:bg-cream-soft active:bg-cream-soft">
              <LogOut className="h-4 w-4 shrink-0" /> Log out
            </button>
          </form>
        </nav>
      </aside>

      <div className="min-w-0 flex-1">
        {!configured && (
          <div className="mb-6 rounded-2xl border border-gold-soft bg-gold-soft/30 px-4 py-3 text-sm text-ink-soft">
            Demo mode: Supabase isn&apos;t connected yet, so this panel is a live preview —
            everything renders against the ported catalog, but adding/editing items,
            analytics, and newsletter sends won&apos;t persist until real credentials are set.
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
