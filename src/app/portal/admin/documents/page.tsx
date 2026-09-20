import { desc, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { documents, residentProfiles, users } from "@/db/schema";
import { deleteDocument } from "@/actions/documents";
import UploadDocumentForm from "@/components/UploadDocumentForm";
import { Button } from "@/components/Button";
import { documentCategoryLabels, docVisibilityLabels } from "@/lib/labels";

export default async function AdminDocumentsPage() {
  const docs = await db.query.documents.findMany({
    orderBy: desc(documents.createdAt),
    with: {
      uploadedBy: { columns: { email: true } },
      assignedTo: { with: { residentProfile: { columns: { fullName: true } } } },
    },
  });

  const residents = await db
    .select({ userId: residentProfiles.userId, fullName: residentProfiles.fullName, email: users.email })
    .from(residentProfiles)
    .innerJoin(users, eq(residentProfiles.userId, users.id))
    .orderBy(asc(residentProfiles.fullName));

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold text-primary">Upload Document</h2>
        <p className="mt-1 text-sm text-ink-soft">
          This same upload form is also on the main Document Repository page, so you don&apos;t
          have to come here just to add something.
        </p>
        <div className="mt-3">
          <UploadDocumentForm
            residents={residents.map((r) => ({ id: r.userId, label: `${r.fullName} (${r.email})` }))}
          />
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-primary">All Documents</h2>
        <div className="mt-3 overflow-x-auto rounded-lg border border-cream-dark bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-cream-dark bg-cream-dark/40 text-xs uppercase text-ink-soft">
              <tr>
                <th className="px-4 py-3">Title</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Visibility</th>
                <th className="px-4 py-3">Uploaded By</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {docs.map((d) => (
                <tr key={d.id} className="border-b border-cream-dark last:border-0">
                  <td className="px-4 py-3 font-medium text-ink">{d.title}</td>
                  <td className="px-4 py-3 text-ink-soft">{documentCategoryLabels[d.category]}</td>
                  <td className="px-4 py-3 text-ink-soft">
                    {docVisibilityLabels[d.visibility]}
                    {d.visibility === "PERSONAL" && d.assignedTo?.residentProfile && (
                      <span className="block text-xs">({d.assignedTo.residentProfile.fullName})</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-ink-soft">{d.uploadedBy.email}</td>
                  <td className="px-4 py-3 text-right">
                    <form action={deleteDocument.bind(null, d.id)}>
                      <Button type="submit" size="sm" variant="danger">
                        Delete
                      </Button>
                    </form>
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
