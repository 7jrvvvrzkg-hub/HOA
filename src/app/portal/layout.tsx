import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import SignOutButton from "@/components/SignOutButton";
import {
  LayoutDashboard,
  FileText,
  Users,
  UserCircle,
  Megaphone,
  ShieldCheck,
} from "lucide-react";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");

  const roles = session.user.roles ?? [];
  const isAdmin = roles.includes("ADMIN");

  const navItems = [
    { href: "/portal", label: "Dashboard", icon: LayoutDashboard },
    { href: "/portal/documents", label: "Documents", icon: FileText },
    { href: "/portal/directory", label: "Directory", icon: Users },
    { href: "/portal/announcements", label: "Announcements", icon: Megaphone },
    { href: "/portal/profile", label: "Profile", icon: UserCircle },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-cream lg:flex-row">
      <aside className="flex flex-col justify-between border-b border-cream-dark bg-primary text-cream lg:h-screen lg:w-64 lg:border-b-0 lg:border-r">
        <div>
          <div className="px-6 py-5">
            <Link href="/" className="text-lg font-semibold">
              place holder (hoa name)
            </Link>
            <p className="mt-1 text-xs text-cream/70">Resident &amp; Admin Portal</p>
          </div>
          <nav className="flex flex-row gap-1 overflow-x-auto px-3 pb-3 text-sm lg:flex-col lg:overflow-visible">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 whitespace-nowrap rounded-md px-3 py-2 hover:bg-primary-dark"
              >
                <item.icon size={18} />
                {item.label}
              </Link>
            ))}
            {isAdmin && (
              <Link
                href="/portal/admin"
                className="mt-2 flex items-center gap-3 whitespace-nowrap rounded-md bg-accent px-3 py-2 font-medium text-ink hover:bg-accent-dark lg:mt-4"
              >
                <ShieldCheck size={18} />
                Admin Console
              </Link>
            )}
          </nav>
        </div>
        <div className="px-6 py-4 text-sm">
          <p className="truncate text-cream/80">{session.user.email}</p>
          <SignOutButton />
        </div>
      </aside>
      <main className="flex-1 p-4 sm:p-8">{children}</main>
    </div>
  );
}
