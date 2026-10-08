import { desc, asc, eq } from "drizzle-orm";
import { getSession, getFreshRoles } from "@/lib/auth";
import { db } from "@/db";
import { documents, documentFolders, residentProfiles, users, documentFolderNotes } from "@/db/schema";
import { canViewDocument, isStaff } from "@/lib/access";
import { deleteDocument } from "@/actions/documents";
import { createFolder, renameFolder, deleteFolder, moveDocument } from "@/actions/folders";
import UploadDocumentForm from "@/components/UploadDocumentForm";
import { Button } from "@/components/Button";
import { Download, Lock, MessageSquare, User, Folder, FolderPlus, Pencil } from "lucide-react";
import DocumentPreview from "@/components/DocumentPreview";

export default async function DocumentsPage() {
  const session = await getSession();
  // Fresh from the database, not the session's cached roles — same
  // reasoning as every other access check in this app (see src/lib/auth.ts).
  const roles = await getFreshRoles(session!.user.id);
  const isAdmin = isStaff(roles);
  const userId = session!.user.id;

  const allDocs = await db.query.documents.findMany({
    orderBy: desc(documents.createdAt),
    with: { assignedTo: { with: { residentProfile: { columns: { fullName: true } } } } },
  });
  const visibleDocs = allDocs.filter((d) => canViewDocument(roles, userId, d));

  const folders = await db.select().from(documentFolders).orderBy(asc(documentFolders.name));

  // Notes staff left for THIS person specifically, under a folder — shown
  // even for a folder that has no documents in it yet, since the point is
  // often "please add one."
  const myNotes = await db.query.documentFolderNotes.findMany({
    where: eq(documentFolderNotes.residentUserId, userId),
  });
  const noteByFolder = new Map(myNotes.map((n) => [n.folderId, n.message]));

  const residents = isAdmin
    ? await db
        .select({ userId: residentProfiles.userId, fullName: residentProfiles.fullName, email: users.email })
        .from(residentProfiles)
        .innerJoin(users, eq(residentProfiles.userId, users.id))
        .orderBy(asc(residentProfiles.fullName))
    : [];

  const docsByFolder = new Map<string | null, typeof visibleDocs>();
  for (const doc of visibleDocs) {
    const list = docsByFolder.get(doc.folderId) ?? [];
    list.push(doc);
    docsByFolder.set(doc.folderId, list);
  }
  // Staff see every folder (so they can fill and manage empty ones). Everyone
  // else sees folders that hold something they can view, or that carry a
  // note meant for them. "Unfiled" shows only when it has something in it.
  const sections: { id: string | null; name: string }[] = folders
    .filter((f) => isAdmin || (docsByFolder.get(f.id)?.length ?? 0) > 0 || noteByFolder.has(f.id))
    .map((f) => ({ id: f.id, name: f.name }));
  if ((docsByFolder.get(null)?.length ?? 0) > 0) sections.push({ id: null, name: "Unfiled" });

  return (
    <div>
      <div className="flex items-center gap-2">
        <Lock className="text-primary" size={22} />
        <h1 className="text-2xl font-bold text-primary">Document Repository</h1>
      </div>

      <div className="mt-6">
        <h2 className="text-lg font-semibold text-primary">Add a Document</h2>
        <div className="mt-3">
          <UploadDocumentForm
            isAdmin={isAdmin}
            residents={residents.map((r) => ({ id: r.userId, label: `${r.fullName} (${r.email})` }))}
            folders={folders.map((f) => ({ id: f.id, name: f.name }))}
          />
        </div>
      </div>

      {isAdmin && (
        <form action={createFolder} className="mt-6 flex flex-wrap items-center gap-2">
          <FolderPlus size={18} className="text-primary" />
          <input
            name="name"
            required
            maxLength={80}
            placeholder="New folder name"
            className="min-w-[12rem] flex-1 rounded-md border border-cream-dark px-3 py-2 text-sm sm:max-w-xs"
          />
          <Button type="submit" size="sm">Create Folder</Button>
        </form>
      )}

      {sections.length === 0 ? (
        <p className="mt-8 rounded-md border border-dashed border-cream-dark p-6 text-ink-soft">
          No documents have been uploaded yet.
        </p>
      ) : (
        <div className="mt-8 space-y-8">
          {sections.map((section) => {
            const docs = docsByFolder.get(section.id) ?? [];
            const note = section.id ? noteByFolder.get(section.id) : undefined;
            return (
              <div key={section.id ?? "unfiled"} data-folder={section.name}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-ink-soft">
                    <Folder size={16} className="text-accent-dark" /> {section.name}
                  </h2>
                  {isAdmin && section.id && (
                    <div className="flex items-center gap-2">
                      <details className="relative">
                        <summary className="flex cursor-pointer list-none items-center gap-1 rounded-md border border-cream-dark px-2 py-1 text-xs text-ink-soft hover:border-primary hover:text-primary">
                          <Pencil size={12} /> Rename
                        </summary>
                        <form
                          action={renameFolder.bind(null, section.id)}
                          className="absolute right-0 z-10 mt-1 flex gap-1 rounded-md border border-cream-dark bg-white p-2 shadow-md"
                        >
                          <input
                            name="name"
                            required
                            maxLength={80}
                            defaultValue={section.name}
                            className="w-44 rounded-md border border-cream-dark px-2 py-1 text-sm"
                          />
                          <Button type="submit" size="sm">Save</Button>
                        </form>
                      </details>
                      <form action={deleteFolder.bind(null, section.id)}>
                        <Button type="submit" size="sm" variant="outline">
                          Delete Folder
                        </Button>
                      </form>
                    </div>
                  )}
                </div>
                {note && (
                  <div className="mt-2 flex items-start gap-2 rounded-md border border-accent/40 bg-accent/10 p-3 text-sm text-ink">
                    <MessageSquare size={16} className="mt-0.5 shrink-0 text-accent-dark" />
                    <p><span className="font-medium">Note from the office:</span> {note}</p>
                  </div>
                )}
                {docs.length === 0 ? (
                  <p className="mt-3 rounded-lg border border-dashed border-cream-dark bg-white p-4 text-sm text-ink-soft">
                    Nothing here yet.
                  </p>
                ) : (
                  <ul className="mt-3 divide-y divide-cream-dark rounded-lg border border-cream-dark bg-white">
                    {docs.map((doc) => {
                      const canDelete = isAdmin || doc.uploadedById === userId;
                      return (
                        <li key={doc.id} className="flex flex-wrap items-center justify-between gap-4 p-4">
                          <div className="flex items-center gap-3">
                            <DocumentPreview id={doc.id} title={doc.title} mimeType={doc.mimeType} fileName={doc.fileName} />
                            <div>
                              <p className="font-medium text-ink">{doc.title}</p>
                              <p className="text-xs text-ink-soft">
                                {(doc.fileSize / 1024).toFixed(0)} kb ·{" "}
                                {doc.createdAt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                              </p>
                              {doc.visibility === "PERSONAL" && (
                                <p className="mt-0.5 flex items-center gap-1 text-xs text-accent-dark">
                                  <User size={12} />
                                  Personal{isAdmin && doc.assignedTo?.residentProfile ? ` — ${doc.assignedTo.residentProfile.fullName}` : ""}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <a
                              href={`/portal/documents/${doc.id}/download`}
                              className="flex items-center gap-1 rounded-md border border-primary px-3 py-1.5 text-sm text-primary hover:bg-primary hover:text-cream"
                            >
                              <Download size={14} /> Download
                            </a>
                            {isAdmin && (
                              <form action={moveDocument.bind(null, doc.id)} className="flex items-center gap-1">
                                <select
                                  name="folderId"
                                  defaultValue={doc.folderId ?? ""}
                                  aria-label="move to folder"
                                  className="rounded-md border border-cream-dark px-2 py-1.5 text-xs"
                                >
                                  <option value="">No folder</option>
                                  {folders.map((f) => (
                                    <option key={f.id} value={f.id}>{f.name}</option>
                                  ))}
                                </select>
                                <Button type="submit" size="sm" variant="outline">Move</Button>
                              </form>
                            )}
                            {canDelete && (
                              <form action={deleteDocument.bind(null, doc.id)}>
                                <Button type="submit" size="sm" variant="danger">Delete</Button>
                              </form>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
