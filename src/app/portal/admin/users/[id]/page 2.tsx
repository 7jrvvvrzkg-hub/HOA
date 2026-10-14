import { notFound } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { residentProfiles, documentFolders, documentFolderNotes } from "@/db/schema";
import { addAdminNote, addCommunicationLog } from "@/actions/notes";
import { setDocumentFolderNote } from "@/actions/documentNotes";
import SetPasswordForm from "@/components/SetPasswordForm";
import { updateResidentAccessLevel, deleteUserAccount } from "@/actions/users";
import { getSession, getFreshRoles } from "@/lib/auth";
import { isAdmin as hasAdmin, canManageAccount, editMinutesLeft } from "@/lib/access";
import { accessLevelLabels, communicationChannelLabels } from "@/lib/labels";
import { Button } from "@/components/Button";
import { StickyNote, Phone, FileText } from "lucide-react";

export default async function AdminUserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();

  const profile = await db.query.residentProfiles.findFirst({
    where: eq(residentProfiles.id, id),
    with: {
      user: { columns: { email: true, roles: true, createdById: true, createdAt: true } },
      adminNotes: { orderBy: (t, { desc }) => desc(t.createdAt), with: { author: { columns: { email: true } } } },
      communicationLogs: { orderBy: (t, { desc }) => desc(t.createdAt), with: { author: { columns: { email: true } } } },
    },
  });
  if (!profile) notFound();

  const folders = await db.select().from(documentFolders).orderBy(asc(documentFolders.name));
  const folderNotes = await db.query.documentFolderNotes.findMany({
    where: eq(documentFolderNotes.residentUserId, profile.userId),
  });
  const noteByFolder = new Map(folderNotes.map((n) => [n.folderId, n.message]));

  const isSelf = profile.userId === session?.user.id;
  const myRoles = await getFreshRoles(session!.user.id);
  const viewerIsAdmin = hasAdmin(myRoles);
  // Admins can change any account. A director can change only one they
  // created, and only for the first hour (see canManageAccount).
  const canManage = canManageAccount(
    { id: session!.user.id, roles: myRoles },
    { roles: profile.user.roles, createdById: profile.user.createdById, createdAt: profile.user.createdAt }
  );
  const minutesLeft = editMinutesLeft(profile.user.createdAt);

  async function setAccessLevel(formData: FormData) {
    "use server";
    await updateResidentAccessLevel(id, formData.get("level") as never);
  }

  return (
    <div className="space-y-8">
      <div>
        <div className="flex items-center gap-3">
          {profile.avatarMimeType ? (
            // eslint-disable-next-line @next/next/no-img-element -- served from our own DB-backed route, not an optimizable static asset
            <img
              src={`/portal/avatars/${profile.id}`}
              alt=""
              className="h-12 w-12 rounded-full border border-cream-dark object-cover"
            />
          ) : null}
          <div>
            <h2 className="text-lg font-semibold text-primary">{profile.fullName}</h2>
            <p className="text-sm text-ink-soft">{profile.user.email}</p>
          </div>
        </div>
        <p className="mt-1 text-xs uppercase tracking-wide text-ink-soft">
          Roles: {profile.user.roles.join(", ")}
        </p>

        {canManage && !viewerIsAdmin && (
          <p className="mt-2 text-sm text-ink-soft">
            You created this profile, so you can change or delete it for {minutesLeft} more minute{minutesLeft === 1 ? "" : "s"}.
          </p>
        )}
        {!canManage && !isSelf && (
          <p className="mt-2 text-sm text-ink-soft">View only.</p>
        )}

        {canManage && (<>
        <form action={setAccessLevel} className="mt-3 flex items-center gap-2">
          <label className="text-sm text-ink-soft">Portal Access Level</label>
          <select name="level" defaultValue={profile.portalAccessLevel} className="rounded-md border border-cream-dark px-2 py-1 text-sm">
            {Object.entries(accessLevelLabels).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
          <Button type="submit" size="sm" variant="outline">
            Save
          </Button>
        </form>
        <SetPasswordForm userId={profile.userId} />
        </>)}
      </div>

      <div>
        <h3 className="flex items-center gap-2 font-semibold text-ink">
          <StickyNote size={18} className="text-accent-dark" /> Admin Notes (private)
        </h3>
        <form action={addAdminNote.bind(null, profile.id)} className="mt-3 flex gap-2">
          <input name="body" placeholder="Add a note..." className="flex-1 rounded-md border border-cream-dark px-3 py-2 text-sm" />
          <Button type="submit" size="sm">Add</Button>
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
          <FileText size={18} className="text-accent-dark" /> Document Notes
        </h3>
        <p className="mt-1 text-sm text-ink-soft">
          Shows on their Documents page.
        </p>
        <div className="mt-3 space-y-3">
          {folders.length === 0 && (
            <p className="text-sm text-ink-soft">No folders yet. Create one on the Documents page.</p>
          )}
          {folders.map((folder) => (
            <form
              key={folder.id}
              action={setDocumentFolderNote.bind(null, profile.userId, folder.id)}
              className="flex flex-wrap items-center gap-2 rounded-md border border-cream-dark bg-white p-3"
            >
              <span className="w-40 shrink-0 text-sm font-medium text-ink">{folder.name}</span>
              <input
                name="message"
                defaultValue={noteByFolder.get(folder.id) ?? ""}
                placeholder="No note — leave blank to clear"
                className="min-w-[12rem] flex-1 rounded-md border border-cream-dark px-3 py-1.5 text-sm"
              />
              <Button type="submit" size="sm" variant="outline">Save</Button>
            </form>
          ))}
        </div>
      </div>

      <div>
        <h3 className="flex items-center gap-2 font-semibold text-ink">
          <Phone size={18} className="text-accent-dark" /> Communication Log (private)
        </h3>
        <form action={addCommunicationLog.bind(null, profile.id)} className="mt-3 flex flex-wrap gap-2">
          <select name="channel" className="rounded-md border border-cream-dark px-2 py-2 text-sm">
            {Object.entries(communicationChannelLabels).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
          <input name="summary" placeholder="What was discussed..." className="flex-1 rounded-md border border-cream-dark px-3 py-2 text-sm" />
          <Button type="submit" size="sm">Log</Button>
        </form>
        <ul className="mt-3 space-y-2">
          {profile.communicationLogs.map((l) => (
            <li key={l.id} className="rounded-md border border-cream-dark bg-white p-3 text-sm">
              <p className="text-ink"><span className="font-medium">{communicationChannelLabels[l.channel] ?? l.channel}</span> — {l.summary}</p>
              <p className="mt-1 text-xs text-ink-soft">
                {l.author.email} · {l.createdAt.toLocaleDateString("en-US")}
              </p>
            </li>
          ))}
        </ul>
      </div>

      {!isSelf && canManage && (
        <div className="rounded-lg border border-danger/30 bg-danger/5 p-4">
          <h3 className="font-semibold text-danger">Danger Zone</h3>
          <p className="mt-1 text-sm text-ink-soft">
            This can&apos;t be undone.
          </p>
          <form action={deleteUserAccount.bind(null, profile.userId)} className="mt-3">
            <Button type="submit" size="sm" variant="danger">Delete Account</Button>
          </form>
        </div>
      )}
    </div>
  );
}
