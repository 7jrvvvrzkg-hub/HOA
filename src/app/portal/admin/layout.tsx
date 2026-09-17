import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { Users, FileText, Megaphone, Inbox, ShieldCheck } from "lucide-react";

const tabs = [
  { href: "/portal/admin", label: "place holder (overview tab label)", icon: ShieldCheck },
  { href: "/portal/admin/users", label: "place holder (users tab label)", icon: Users },
  { href: "/portal/admin/documents", label: "place holder (documents tab label)", icon: FileText },
  { href: "/portal/admin/announcements", label: "place holder (announcements tab label)", icon: Megaphone },
  { href: "/portal/admin/leads", label: "place holder (leads/CRM tab label)", icon: Inbox },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Defense in depth: proxy.ts already redirects non-admins away from
  // /portal/admin/**, but every admin surface re-checks here too, since a
  // Proxy matcher change should never be the only thing standing between a
  // resident and the admin console.
  const session = await getSession();
  if (!session?.user.roles?.includes("ADMIN")) {
    redirect("/portal");
  }

  return (
    <div>
      <div className="flex items-center gap-2 border-b border-cream-dark pb-4">
        <ShieldCheck className="text-accent-dark" size={22} />
        <h1 className="text-xl font-bold text-primary">place holder (admin console heading)</h1>
      </div>
      <nav className="mt-4 flex flex-wrap gap-2">
        {tabs.map((t) => (
          <Link
            key={t.href}
            href={t.href}
            className="flex items-center gap-2 rounded-md border border-cream-dark px-3 py-1.5 text-sm text-ink hover:border-primary hover:text-primary"
          >
            <t.icon size={14} /> {t.label}
          </Link>
        ))}
      </nav>
      <div className="mt-6">{children}</div>
    </div>
  );
}
