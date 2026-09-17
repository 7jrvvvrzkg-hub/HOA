import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { db } from "@/db";
import { residentProfiles } from "@/db/schema";
import ProfileForm from "@/components/ProfileForm";
import { UserCircle } from "lucide-react";

export default async function ProfilePage() {
  const session = await getSession();
  const profile = await db.query.residentProfiles.findFirst({
    where: eq(residentProfiles.userId, session!.user.id),
  });

  return (
    <div>
      <div className="flex items-center gap-2">
        <UserCircle className="text-primary" size={22} />
        <h1 className="text-2xl font-bold text-primary">My Profile</h1>
      </div>
      <p className="mt-1 text-ink-soft">
        You can only edit your own profile; roles are managed by admins.
      </p>

      {profile ? (
        <ProfileForm
          fullName={profile.fullName}
          unit={profile.unit ?? ""}
          address={profile.address ?? ""}
          phone={profile.phone ?? ""}
          contactEmail={profile.contactEmail ?? ""}
          shareUnit={profile.shareUnit}
          sharePhone={profile.sharePhone}
          shareContactEmail={profile.shareContactEmail}
        />
      ) : (
        <p className="mt-8 rounded-md border border-dashed border-cream-dark p-6 text-ink-soft">
          This login doesn&apos;t have a resident profile to edit.
        </p>
      )}
    </div>
  );
}
