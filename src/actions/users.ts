"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { and, arrayContains, eq, ne } from "drizzle-orm";
import { db } from "@/db";
import { users, residentProfiles, adminAccounts, leads } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { createUserSchema } from "@/lib/validation";
import type { RoleTag, PortalAccessLevel } from "@/db/schema";

export type CreateUserFormState = { ok: boolean; error?: string };

const defaultAccessLevel: Record<RoleTag, PortalAccessLevel> = {
  ADMIN: "FULL",
  OWNER: "STANDARD",
  RENTER: "LIMITED",
};

async function countOtherAdmins(excludingUserId: string) {
  return db.$count(users, and(arrayContains(users.roles, ["ADMIN"]), ne(users.id, excludingUserId)));
}

/** Admin-only: create a brand-new profile (resident and/or admin) with a
 * temporary password, matching the "capability to create profiles" ask. */
export async function createUserProfile(
  _prev: CreateUserFormState,
  formData: FormData
): Promise<CreateUserFormState> {
  await requireAdmin();

  const roles = formData.getAll("roles") as RoleTag[];
  const parsed = createUserSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    fullName: formData.get("fullName"),
    roles,
    unit: formData.get("unit") ?? "",
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "invalid submission" };
  }

  const normalizedEmail = parsed.data.email.toLowerCase();
  const existing = await db.query.users.findFirst({ where: eq(users.email, normalizedEmail) });
  if (existing) return { ok: false, error: "an account with that email already exists" };

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);
  const isAdminRole = parsed.data.roles.includes("ADMIN");
  const isResidentRole = parsed.data.roles.includes("OWNER") || parsed.data.roles.includes("RENTER");
  const primaryAccessLevel: PortalAccessLevel = isAdminRole
    ? "FULL"
    : defaultAccessLevel[parsed.data.roles[0]];

  await db.transaction(async (tx) => {
    const [user] = await tx
      .insert(users)
      .values({ email: normalizedEmail, passwordHash, roles: parsed.data.roles })
      .returning();

    if (isAdminRole) {
      await tx.insert(adminAccounts).values({ userId: user.id, fullName: parsed.data.fullName });
    }
    if (isResidentRole) {
      await tx.insert(residentProfiles).values({
        userId: user.id,
        fullName: parsed.data.fullName,
        unit: parsed.data.unit || null,
        portalAccessLevel: primaryAccessLevel,
      });
    }
  });

  revalidatePath("/portal/admin/users");
  return { ok: true };
}

/** Admin-only: add or remove a role tag on a profile — the "x to remove a
 * role" control. Adding OWNER/RENTER creates a ResidentProfile if missing;
 * adding ADMIN creates an AdminAccount if missing. Removing a role never
 * deletes the underlying profile record, just the tag, so re-adding it
 * later restores access without losing history.
 *
 * Two safety rules on top of the plain admin check:
 *  - nobody can change their OWN role tags (including granting roles back
 *    to themselves) — that has to come from a different admin account.
 *    This is deliberate even for admins: it closes off the "remove my own
 *    admin, then immediately re-add it" loop, and it's also *why* that loop
 *    was possible before — the acting admin's own session token still said
 *    "ADMIN" after the database row changed, because NextAuth bakes roles
 *    into the JWT at login and doesn't refresh it mid-session. requireAdmin()
 *    now re-checks the database on every call, but self-edits are blocked
 *    outright regardless, since a stale token isn't the only way this could
 *    go wrong.
 *  - the last remaining admin account can't have its ADMIN tag removed by
 *    anyone, since that would lock every admin out of the console for good. */
export async function setUserRoles(userId: string, roles: RoleTag[]) {
  const session = await requireAdmin();
  if (roles.length === 0) throw new Error("a profile needs at least one role");

  if (userId === session.user.id) {
    throw new Error("you can't change your own roles — have another admin do it");
  }

  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    with: { residentProfile: true, adminAccount: true },
  });
  if (!user) throw new Error("user not found");

  const losingAdmin = user.roles.includes("ADMIN") && !roles.includes("ADMIN");
  if (losingAdmin && (await countOtherAdmins(userId)) === 0) {
    throw new Error("can't remove the last admin account");
  }

  const needsResident = roles.includes("OWNER") || roles.includes("RENTER");
  const needsAdmin = roles.includes("ADMIN");

  await db.transaction(async (tx) => {
    await tx.update(users).set({ roles, updatedAt: new Date() }).where(eq(users.id, userId));

    if (needsResident && !user.residentProfile) {
      await tx.insert(residentProfiles).values({ userId, fullName: user.email, portalAccessLevel: "STANDARD" });
    }
    if (needsAdmin && !user.adminAccount) {
      await tx.insert(adminAccounts).values({ userId, fullName: user.email });
    }
  });

  revalidatePath("/portal/admin/users");
  revalidatePath(`/portal/admin/users/${userId}`);
}

export async function updateResidentAccessLevel(profileId: string, level: PortalAccessLevel) {
  await requireAdmin();
  await db.update(residentProfiles).set({ portalAccessLevel: level }).where(eq(residentProfiles.id, profileId));
  revalidatePath("/portal/admin/users");
}

/** Admin-only: permanently delete a login and everything tied to it
 * (resident profile, admin account, private notes/communication log —
 * all cascade at the database level). Blocked for your own account and for
 * the last remaining admin, same reasoning as setUserRoles above. Content a
 * user authored (documents, announcements) has a required author reference
 * with no cascade, so deleting an account that posted any of that fails
 * with a clear error instead of silently orphaning rows. */
export async function deleteUserAccount(userId: string) {
  const session = await requireAdmin();
  if (userId === session.user.id) {
    throw new Error("you can't delete your own account");
  }

  const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
  if (!user) throw new Error("user not found");

  if (user.roles.includes("ADMIN") && (await countOtherAdmins(userId)) === 0) {
    throw new Error("can't delete the last admin account");
  }

  // leads.assignedToId is nullable, so free it up rather than blocking the delete on it.
  await db.update(leads).set({ assignedToId: null }).where(eq(leads.assignedToId, userId));

  try {
    await db.delete(users).where(eq(users.id, userId));
  } catch {
    throw new Error(
      "can't delete this account — it authored documents or announcements; reassign or delete those first"
    );
  }

  revalidatePath("/portal/admin/users");
}
