import { desc } from "drizzle-orm";
import { db } from "@/db";
import { documents } from "@/db/schema";
import { deleteDocument } from "@/actions/documents";
import UploadDocumentForm from "@/components/UploadDocumentForm";
import { Button } from "@/components/Button";

export default async function AdminDocumentsPage() {
  const docs = await db.query.documents.findMany({
    orderBy: desc(documents.createdAt),
    with: { uploadedBy: { columns: { email: true } } },
  });

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold text-primary">Upload Document</h2>
        <div className="mt-3">
          <UploadDocumentForm />
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
                  <td className="px-4 py-3 text-ink-soft">{d.category.toLowerCase().replace("_", " ")}</td>
                  <td className="px-4 py-3 text-ink-soft">{d.visibility.toLowerCase().replace("_", " ")}</td>
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
