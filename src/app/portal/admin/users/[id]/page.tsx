import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { residentProfiles } from "@/db/schema";
import { addAdminNote, addCommunicationLog } from "@/actions/notes";
import { updateResidentAccessLevel } from "@/actions/users";
import { Button } from "@/components/Button";
import { StickyNote, Phone } from "lucide-react";

export default async function AdminUserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const profile = await db.query.residentProfiles.findFirst({
    where: eq(residentProfiles.id, id),
    with: {
      user: { columns: { email: true, roles: true } },
      adminNotes: { orderBy: (t, { desc }) => desc(t.createdAt), with: { author: { columns: { email: true } } } },
      communicationLogs: { orderBy: (t, { desc }) => desc(t.createdAt), with: { author: { columns: { email: true } } } },
    },
  });
  if (!profile) notFound();

  async function setAccessLevel(formData: FormData) {
    "use server";
    await updateResidentAccessLevel(id, formData.get("level") as never);
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold text-primary">{profile.fullName}</h2>
        <p className="text-sm text-ink-soft">{profile.user.email}</p>
        <p className="mt-1 text-xs uppercase tracking-wide text-ink-soft">
          place holder (role tags label): {profile.user.roles.join(", ")}
        </p>

        <form action={setAccessLevel} className="mt-3 flex items-center gap-2">
          <label className="text-sm text-ink-soft">place holder (portal access level label)</label>
          <select name="level" defaultValue={profile.portalAccessLevel} className="rounded-md border border-cream-dark px-2 py-1 text-sm">
            <option value="FULL">full</option>
            <option value="STANDARD">standard</option>
            <option value="LIMITED">limited</option>
          </select>
          <Button type="submit" size="sm" variant="outline">
            place holder (save label)
          </Button>
        </form>
      </div>

      <div>
        <h3 className="flex items-center gap-2 font-semibold text-ink">
          <StickyNote size={18} className="text-accent-dark" /> place holder (admin notes heading — only admins see this)
        </h3>
        <form action={addAdminNote.bind(null, profile.id)} className="mt-3 flex gap-2">
          <input name="body" placeholder="place holder (add a note placeholder)" className="flex-1 rounded-md border border-cream-dark px-3 py-2 text-sm" />
          <Button type="submit" size="sm">place holder (add label)</Button>
        </form>
        <ul className="mt-3 space-y-2">
          {profile.adminNotes.map((n) => (
            <li key={n.id} className="rounded-md border border-cream-dark bg-white p-3 text-sm">
              <p className="text-ink">{n.body}</p>
              <p className="mt-1 text-xs text-ink-soft">
                {n.author.email} · {n.createdAt.toLocaleDateString("en-US")}
              </p>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <h3 className="flex items-center gap-2 font-semibold text-ink">
          <Phone size={18} className="text-accent-dark" /> place holder (communication log heading — only admins see this)
        </h3>
        <form action={addCommunicationLog.bind(null, profile.id)} className="mt-3 flex flex-wrap gap-2">
          <select name="channel" className="rounded-md border border-cream-dark px-2 py-2 text-sm">
            <option value="email">email</option>
            <option value="phone">phone</option>
            <option value="in-person">in-person</option>
            <option value="other">other</option>
          </select>
          <input name="summary" placeholder="place holder (what was discussed placeholder)" className="flex-1 rounded-md border border-cream-dark px-3 py-2 text-sm" />
          <Button type="submit" size="sm">place holder (log label)</Button>
        </form>
        <ul className="mt-3 space-y-2">
          {profile.communicationLogs.map((l) => (
            <li key={l.id} className="rounded-md border border-cream-dark bg-white p-3 text-sm">
              <p className="text-ink"><span className="font-medium">{l.channel}</span> — {l.summary}</p>
              <p className="mt-1 text-xs text-ink-soft">
                {l.author.email} · {l.createdAt.toLocaleDateString("en-US")}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
