import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession, getFreshRoles } from "@/lib/auth";
import NeedsDot from "@/components/NeedsDot";
import { getStaffAttention } from "@/lib/attention";
import { isAdmin, isStaff } from "@/lib/access";
import { Users, Megaphone, Inbox, ShieldCheck, ClipboardList, ScrollText } from "lucide-react";

const tabs = [
  { href: "/portal/admin", label: "Overview", icon: ShieldCheck },
  { href: "/portal/admin/users", label: "Users", icon: Users },
  { href: "/portal/admin/announcements", label: "Announcements", icon: Megaphone },
  { href: "/portal/admin/forms", label: "Forms", icon: ClipboardList },
  { href: "/portal/admin/leads", label: "Leads", icon: Inbox },
  { href: "/portal/admin/activity", label: "Activity", icon: ScrollText },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Defense in depth: proxy.ts already redirects non-admins away from
  // /portal/admin/**, but every admin surface re-checks here too, since a
  // Proxy matcher change should never be the only thing standing between a
  // resident and the admin console.
  const session = await getSession();
  if (!session) redirect("/login");
  // Fresh from the database, not the session's cached roles — see the
  // comment on setUserRoles in src/actions/users.ts for why that matters.
  const roles = await getFreshRoles(session.user.id);
  if (!isStaff(roles)) {
    redirect("/portal");
  }

  const attention = await getStaffAttention();
  const dotFor: Record<string, boolean> = {
    "/portal/admin": attention.total > 0,
    "/portal/admin/forms": attention.forms > 0,
    "/portal/admin/leads": attention.leads > 0,
  };

  return (
    <div>
      <div className="flex items-center gap-2 border-b border-cream-dark pb-4">
        <ShieldCheck className="text-accent-dark" size={22} />
        <h1 className="text-xl font-bold text-primary">{isAdmin(roles) ? "Admin Console" : "Director Console"}</h1>
      </div>
      <nav className="mt-4 flex flex-wrap gap-2">
        {tabs.map((t) => (
          <Link
            key={t.href}
            href={t.href}
            className="flex items-center gap-2 rounded-md border border-cream-dark px-3 py-1.5 text-sm text-ink hover:border-primary hover:text-primary"
          >
            <t.icon size={14} /> {t.label}
            <NeedsDot show={dotFor[t.href] ?? false} />
          </Link>
        ))}
      </nav>
      <div className="mt-6">{children}</div>
    </div>
  );
}
