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
    { href: "/portal/documents", label: "place holder (documents card label)", icon: FileText, value: docCount },
    { href: "/portal/announcements", label: "place holder (announcements card label)", icon: Megaphone, value: announcementCount },
    { href: "/portal/directory", label: "place holder (directory card label)", icon: Users, value: null },
    { href: "/portal/profile", label: "place holder (profile card label)", icon: UserCircle, value: null },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-primary">place holder (dashboard welcome heading)</h1>
      <p className="mt-1 text-ink-soft">
        place holder (dashboard welcome copy) — signed in as {session!.user.email}
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
            <ShieldCheck size={20} /> place holder (admin overview heading)
          </h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Link href="/portal/admin/users" className="rounded-lg border border-cream-dark bg-white p-5 shadow-sm hover:shadow-md">
              <Users className="text-primary" />
              <p className="mt-3 text-sm text-ink-soft">place holder (total accounts card label)</p>
              <p className="mt-1 text-2xl font-bold text-ink">{adminStats.userCount}</p>
            </Link>
            <Link href="/portal/admin/leads" className="rounded-lg border border-cream-dark bg-white p-5 shadow-sm hover:shadow-md">
              <Inbox className="text-primary" />
              <p className="mt-3 text-sm text-ink-soft">place holder (open leads card label)</p>
              <p className="mt-1 text-2xl font-bold text-ink">{adminStats.leadCount}</p>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
