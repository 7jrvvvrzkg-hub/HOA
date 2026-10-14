import Logo from "@/components/Logo";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession, getFreshRoles } from "@/lib/auth";
import SignOutButton from "@/components/SignOutButton";
import NeedsDot from "@/components/NeedsDot";
import AutoRefresh from "@/components/AutoRefresh";
import { getStaffAttention, getResidentAttention } from "@/lib/attention";
import {
  LayoutDashboard,
  FileText,
  Users,
  UserCircle,
  Megaphone,
  ShieldCheck,
  ClipboardList,
} from "lucide-react";
import { isStaff, isAdmin as hasAdmin } from "@/lib/access";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");

  // Fresh from the database rather than the session's cached roles, so the
  // "Admin Console" link disappears immediately if someone's admin access
  // was just revoked, instead of only after they log back in.
  const roles = await getFreshRoles(session.user.id);
  const staff = isStaff(roles);

  const staffAttention = staff ? await getStaffAttention() : null;
  const residentAttention = await getResidentAttention(session.user.id, roles);

  const navItems = [
    { href: "/portal", label: "Dashboard", icon: LayoutDashboard, dot: false },
    {
      href: "/portal/documents",
      label: "Documents",
      icon: FileText,
      dot: (staffAttention?.documents ?? 0) > 0 || residentAttention.documents > 0,
    },
    { href: "/portal/directory", label: "Directory", icon: Users, dot: false },
    { href: "/portal/forms", label: "Forms", icon: ClipboardList, dot: residentAttention.forms > 0 },
    { href: "/portal/announcements", label: "Announcements", icon: Megaphone, dot: false },
    { href: "/portal/profile", label: "Profile", icon: UserCircle, dot: false },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-cream lg:flex-row">
      <aside className="flex flex-col justify-between border-b border-cream-dark bg-primary text-cream lg:min-h-screen lg:w-64 lg:border-b-0 lg:border-r">
        <div>
          <div className="px-6 py-5">
            <Link href="/" className="flex items-center gap-3 text-lg font-semibold">
              <span className="flex items-center justify-center rounded-sm bg-white p-[3px]">
                <Logo height={36} />
              </span>
              <span className="font-serif uppercase tracking-[0.18em]">Tazewell Place</span>
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
                <NeedsDot show={item.dot} className="ring-1 ring-cream/70" />
              </Link>
            ))}
            {staff && (
              <Link
                href="/portal/admin"
                className="mt-2 flex items-center gap-3 whitespace-nowrap rounded-md bg-accent px-3 py-2 font-medium text-ink hover:bg-accent-dark lg:mt-4"
              >
                <ShieldCheck size={18} />
                {hasAdmin(roles) ? "Admin Console" : "Director Console"}
                <NeedsDot show={(staffAttention?.total ?? 0) > 0} className="ring-1 ring-ink/60" />
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
      <AutoRefresh />
    </div>
  );
}
