import Link from "next/link";
import { asc } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { getSession, getFreshRoles } from "@/lib/auth";
import { isAdmin as hasAdmin, canManageAccount, editMinutesLeft } from "@/lib/access";
import { deleteUserAccount } from "@/actions/users";
import RoleChips from "@/components/RoleChips";
import CreateUserForm from "@/components/CreateUserForm";
import { Button } from "@/components/Button";

export default async function AdminUsersPage() {
  const session = await getSession();
  const myRoles = await getFreshRoles(session!.user.id);
  const viewerIsAdmin = hasAdmin(myRoles);
  const actor = { id: session!.user.id, roles: myRoles };
  const allUsers = await db.query.users.findMany({
    orderBy: asc(users.createdAt),
    with: {
      residentProfile: { columns: { id: true, fullName: true, avatarMimeType: true } },
      adminAccount: { columns: { fullName: true } },
    },
  });

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold text-primary">Create Profile</h2>
        <p className="mt-1 text-sm text-ink-soft">
          {viewerIsAdmin
            ? "Set a password."
            : "Set a password. You can change or delete a profile you create for one hour after creating it."}
        </p>
        <div className="mt-3">
          <CreateUserForm isAdmin={viewerIsAdmin} />
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-primary">All Accounts</h2>
        <div className="mt-3 overflow-x-auto rounded-lg border border-cream-dark bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-cream-dark bg-cream-dark/40 text-xs uppercase text-ink-soft">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Roles</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {allUsers.map((u) => {
                const isSelf = u.id === session?.user.id;
                const manageable = canManageAccount(actor, u);
                const minutesLeft = editMinutesLeft(u.createdAt);
                return (
                  <tr key={u.id} className="border-b border-cream-dark last:border-0">
                    <td className="px-4 py-3 font-medium text-ink">
                      <div className="flex items-center gap-2">
                        {u.residentProfile?.avatarMimeType ? (
                          // eslint-disable-next-line @next/next/no-img-element -- served from our own DB-backed route, not an optimizable static asset
                          <img
                            src={`/portal/avatars/${u.residentProfile.id}`}
                            alt=""
                            className="h-7 w-7 rounded-full border border-cream-dark object-cover"
                          />
                        ) : null}
                        {u.adminAccount?.fullName ?? u.residentProfile?.fullName ?? "—"}
                        {isSelf && <span className="text-xs text-ink-soft/70">(you)</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-ink-soft">{u.email}</td>
                    <td className="px-4 py-3">
                      <RoleChips
                        userId={u.id}
                        roles={u.roles}
                        isSelf={isSelf}
                        readOnly={!manageable}
                        allowedRoles={viewerIsAdmin ? undefined : ["OWNER", "RENTER"]}
                      />
                      {!viewerIsAdmin && manageable && (
                        <p className="mt-1 text-xs text-ink-soft">You can change this for {minutesLeft} more min</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-3">
                        {u.residentProfile && (
                          <Link href={`/portal/admin/users/${u.residentProfile.id}`} className="text-primary hover:underline">
                            View →
                          </Link>
                        )}
                        {!isSelf && manageable && (
                          <form action={deleteUserAccount.bind(null, u.id)}>
                            <Button type="submit" size="sm" variant="danger">Delete</Button>
                          </form>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
