import Link from "next/link";
import { eq, ne } from "drizzle-orm";
import { db } from "@/db";
import { users, documents, announcements, leads } from "@/db/schema";
import { Users, FileText, Megaphone, Inbox } from "lucide-react";

export default async function AdminOverviewPage() {
  const [userCount, documentCount, announcementCount, openLeadCount] = await Promise.all([
    db.$count(users),
    db.$count(documents),
    db.$count(announcements, eq(announcements.active, true)),
    db.$count(leads, ne(leads.status, "RESOLVED")),
  ]);

  const cards = [
    { href: "/portal/admin/users", label: "Total Accounts", value: userCount, icon: Users },
    { href: "/portal/admin/documents", label: "Documents on File", value: documentCount, icon: FileText },
    { href: "/portal/admin/announcements", label: "Active Announcements", value: announcementCount, icon: Megaphone },
    { href: "/portal/admin/leads", label: "Open Leads", value: openLeadCount, icon: Inbox },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((c) => (
        <Link key={c.href} href={c.href} className="rounded-lg border border-cream-dark bg-white p-5 shadow-sm hover:shadow-md">
          <c.icon className="text-primary" />
          <p className="mt-3 text-sm text-ink-soft">{c.label}</p>
          <p className="mt-1 text-2xl font-bold text-ink">{c.value}</p>
        </Link>
      ))}
    </div>
  );
}
