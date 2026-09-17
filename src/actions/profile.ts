"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { residentProfiles } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { profileUpdateSchema } from "@/lib/validation";

export type ProfileFormState = { ok: boolean; error?: string };

const MAX_AVATAR_BYTES = 4 * 1024 * 1024;

/** A resident can only ever edit their own row — the session's user id is
 * the sole key used to find the profile to update, never a client-supplied id. */
export async function updateOwnProfile(
  _prev: ProfileFormState,
  formData: FormData
): Promise<ProfileFormState> {
  const session = await getSession();
  if (!session?.user?.id) return { ok: false, error: "not signed in" };

  const parsed = profileUpdateSchema.safeParse({
    fullName: formData.get("fullName"),
    unit: formData.get("unit") ?? "",
    address: formData.get("address") ?? "",
    phone: formData.get("phone") ?? "",
    contactEmail: formData.get("contactEmail") ?? "",
    shareUnit: formData.get("shareUnit") === "on",
    sharePhone: formData.get("sharePhone") === "on",
    shareContactEmail: formData.get("shareContactEmail") === "on",
  });

  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "invalid submission" };
  }

  const avatar = formData.get("avatar") as File | null;
  let avatarUpdate: { avatarData: Buffer; avatarMimeType: string } | null = null;
  if (avatar && avatar.size > 0) {
    if (!avatar.type.startsWith("image/")) {
      return { ok: false, error: "profile picture has to be an image file" };
    }
    if (avatar.size > MAX_AVATAR_BYTES) {
      return { ok: false, error: "profile picture is larger than the 4MB limit" };
    }
    avatarUpdate = {
      avatarData: Buffer.from(await avatar.arrayBuffer()),
      avatarMimeType: avatar.type,
    };
  }

  const profile = await db.query.residentProfiles.findFirst({
    where: eq(residentProfiles.userId, session.user.id),
  });
  if (!profile) return { ok: false, error: "no resident profile on this account" };

  const { fullName, unit, address, phone, contactEmail, shareUnit, sharePhone, shareContactEmail } =
    parsed.data;

  await db
    .update(residentProfiles)
    .set({
      fullName,
      unit: unit || null,
      address: address || null,
      phone: phone || null,
      contactEmail: contactEmail || null,
      shareUnit,
      sharePhone,
      shareContactEmail,
      updatedAt: new Date(),
      ...avatarUpdate,
    })
    .where(eq(residentProfiles.id, profile.id));

  revalidatePath("/portal/profile");
  revalidatePath("/portal/directory");
  revalidatePath(`/portal/avatars/${profile.id}`);
  return { ok: true };
}
