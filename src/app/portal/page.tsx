import Link from "next/link";
import { eq, ne } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { db } from "@/db";
import { documents, announcements, users, leads } from "@/db/schema";
import { FileText, Users, Megaphone, Inbox, ShieldCheck, UserCircle } from "lucide-react";

export default async function PortalDashboard() {
  const session = await getSession();
  const roles = session!.user.roles ?? [];
  const isAdmin = roles.includes("ADMIN");

  const [docCount, announcementCount] = await Promise.all([
    db.$count(documents),
    db.$count(announcements, eq(announcements.active, true)),
  ]);

  let adminStats: { userCount: number; leadCount: number } | null = null;
  if (isAdmin) {
    const [userCount, leadCount] = await Promise.all([
      db.$count(users),
      db.$count(leads, ne(leads.status, "RESOLVED")),
    ]);
    adminStats = { userCount, leadCount };
  }

  const cards = [
    { href: "/portal/documents", label: "Documents", icon: FileText, value: docCount },
    { href: "/portal/announcements", label: "Announcements", icon: Megaphone, value: announcementCount },
    { href: "/portal/directory", label: "Directory", icon: Users, value: null },
    { href: "/portal/profile", label: "Profile", icon: UserCircle, value: null },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-primary">Welcome</h1>
      <p className="mt-1 text-ink-soft">
        Signed in as {session!.user.email}
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <Link
            key={c.href}
            href={c.href}
            className="rounded-lg border border-cream-dark bg-white p-5 shadow-sm transition hover:shadow-md"
          >
            <c.icon className="text-primary" />
            <p className="mt-3 text-sm text-ink-soft">{c.label}</p>
            {c.value !== null && <p className="mt-1 text-2xl font-bold text-ink">{c.value}</p>}
          </Link>
        ))}
      </div>

      {isAdmin && adminStats && (
        <div className="mt-10">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-primary">
            <ShieldCheck size={20} /> Admin Overview
          </h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Link href="/portal/admin/users" className="rounded-lg border border-cream-dark bg-white p-5 shadow-sm hover:shadow-md">
              <Users className="text-primary" />
              <p className="mt-3 text-sm text-ink-soft">Total Accounts</p>
              <p className="mt-1 text-2xl font-bold text-ink">{adminStats.userCount}</p>
            </Link>
            <Link href="/portal/admin/leads" className="rounded-lg border border-cream-dark bg-white p-5 shadow-sm hover:shadow-md">
              <Inbox className="text-primary" />
              <p className="mt-3 text-sm text-ink-soft">Open Leads</p>
              <p className="mt-1 text-2xl font-bold text-ink">{adminStats.leadCount}</p>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
