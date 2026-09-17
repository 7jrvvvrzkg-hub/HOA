import { desc, asc, eq } from "drizzle-orm";
import { getSession, getFreshRoles } from "@/lib/auth";
import { db } from "@/db";
import { documents, residentProfiles, users } from "@/db/schema";
import { canViewDocument } from "@/lib/access";
import { documentCategoryLabels } from "@/lib/labels";
import { deleteDocument } from "@/actions/documents";
import UploadDocumentForm from "@/components/UploadDocumentForm";
import { Button } from "@/components/Button";
import { Download, FileText, Lock, User } from "lucide-react";

export default async function DocumentsPage() {
  const session = await getSession();
  // Fresh from the database, not the session's cached roles — same
  // reasoning as every other access check in this app (see src/lib/auth.ts).
  const roles = await getFreshRoles(session!.user.id);
  const isAdmin = roles.includes("ADMIN");

  const allDocs = await db.query.documents.findMany({
    orderBy: desc(documents.createdAt),
    with: { assignedTo: { with: { residentProfile: { columns: { fullName: true } } } } },
  });
  const visibleDocs = allDocs.filter((d) => canViewDocument(roles, session!.user.id, d));

  const residents = isAdmin
    ? await db
        .select({ userId: residentProfiles.userId, fullName: residentProfiles.fullName, email: users.email })
        .from(residentProfiles)
        .innerJoin(users, eq(residentProfiles.userId, users.id))
        .orderBy(asc(residentProfiles.fullName))
    : [];

  const byCategory = visibleDocs.reduce<Record<string, typeof visibleDocs>>((acc, doc) => {
    (acc[doc.category] ??= []).push(doc);
    return acc;
  }, {});

  return (
    <div>
      <div className="flex items-center gap-2">
        <Lock className="text-primary" size={22} />
        <h1 className="text-2xl font-bold text-primary">Document Repository</h1>
      </div>
      <p className="mt-1 text-ink-soft">
        Documents available to your role — including anything assigned personally to you.
      </p>

      {isAdmin && (
        <div className="mt-6">
          <h2 className="text-lg font-semibold text-primary">Add a Document</h2>
          <div className="mt-3">
            <UploadDocumentForm
              residents={residents.map((r) => ({ id: r.userId, label: `${r.fullName} (${r.email})` }))}
            />
          </div>
        </div>
      )}

      {visibleDocs.length === 0 ? (
        <p className="mt-8 rounded-md border border-dashed border-cream-dark p-6 text-ink-soft">
          No documents have been uploaded yet.
        </p>
      ) : (
        <div className="mt-8 space-y-8">
          {Object.entries(byCategory).map(([category, docs]) => (
            <div key={category}>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-soft">
                {documentCategoryLabels[category as keyof typeof documentCategoryLabels] ?? category}
              </h2>
              <ul className="mt-3 divide-y divide-cream-dark rounded-lg border border-cream-dark bg-white">
                {docs.map((doc) => (
                  <li key={doc.id} className="flex flex-wrap items-center justify-between gap-4 p-4">
                    <div className="flex items-center gap-3">
                      <FileText className="text-primary" size={20} />
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
                        <form action={deleteDocument.bind(null, doc.id)}>
                          <Button type="submit" size="sm" variant="danger">Delete</Button>
                        </form>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
