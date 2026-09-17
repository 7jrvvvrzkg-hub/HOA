"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users, residentProfiles, adminAccounts } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { createUserSchema } from "@/lib/validation";
import type { RoleTag, PortalAccessLevel } from "@/db/schema";

async function requireAdmin() {
  const session = await getSession();
  if (!session?.user?.roles?.includes("ADMIN")) {
    throw new Error("admin access required");
  }
  return session;
}

export type CreateUserFormState = { ok: boolean; error?: string };

const defaultAccessLevel: Record<RoleTag, PortalAccessLevel> = {
  ADMIN: "FULL",
  OWNER: "STANDARD",
  RENTER: "LIMITED",
};

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
 * later restores access without losing history. */
export async function setUserRoles(userId: string, roles: RoleTag[]) {
  await requireAdmin();
  if (roles.length === 0) throw new Error("a profile needs at least one role");

  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    with: { residentProfile: true, adminAccount: true },
  });
  if (!user) throw new Error("user not found");

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
