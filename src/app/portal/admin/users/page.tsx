import Link from "next/link";
import { asc } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import RoleChips from "@/components/RoleChips";
import CreateUserForm from "@/components/CreateUserForm";

export default async function AdminUsersPage() {
  const allUsers = await db.query.users.findMany({
    orderBy: asc(users.createdAt),
    with: { residentProfile: true, adminAccount: true },
  });

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold text-primary">place holder (create profile heading)</h2>
        <p className="mt-1 text-sm text-ink-soft">
          place holder (create profile subheading — give the person a temporary password, then have them change it after they sign in)
        </p>
        <div className="mt-3">
          <CreateUserForm />
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-primary">place holder (all accounts heading)</h2>
        <p className="mt-1 text-sm text-ink-soft">
          place holder (roles subheading — only admins can see or edit these role tags)
        </p>
        <div className="mt-3 overflow-x-auto rounded-lg border border-cream-dark bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-cream-dark bg-cream-dark/40 text-xs uppercase text-ink-soft">
              <tr>
                <th className="px-4 py-3">place holder (name column label)</th>
                <th className="px-4 py-3">place holder (email column label)</th>
                <th className="px-4 py-3">place holder (roles column label)</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {allUsers.map((u) => (
                <tr key={u.id} className="border-b border-cream-dark last:border-0">
                  <td className="px-4 py-3 font-medium text-ink">
                    {u.adminAccount?.fullName ?? u.residentProfile?.fullName ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-ink-soft">{u.email}</td>
                  <td className="px-4 py-3">
                    <RoleChips userId={u.id} roles={u.roles} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    {u.residentProfile && (
                      <Link href={`/portal/admin/users/${u.residentProfile.id}`} className="text-primary hover:underline">
                        place holder (view details link label)
                      </Link>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
