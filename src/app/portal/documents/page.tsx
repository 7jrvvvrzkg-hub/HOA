import { desc } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { db } from "@/db";
import { documents } from "@/db/schema";
import { canView } from "@/lib/access";
import { documentCategoryLabels } from "@/lib/labels";
import { Download, FileText, Lock } from "lucide-react";

export default async function DocumentsPage() {
  const session = await getSession();
  const roles = session!.user.roles ?? [];

  const allDocs = await db.select().from(documents).orderBy(desc(documents.createdAt));
  const visibleDocs = allDocs.filter((d) => canView(roles, d.visibility));

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
        Governing documents available to your role.
      </p>

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
                  <li key={doc.id} className="flex items-center justify-between gap-4 p-4">
                    <div className="flex items-center gap-3">
                      <FileText className="text-primary" size={20} />
                      <div>
                        <p className="font-medium text-ink">{doc.title}</p>
                        <p className="text-xs text-ink-soft">
                          {(doc.fileSize / 1024).toFixed(0)} kb ·{" "}
                          {doc.createdAt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        </p>
                      </div>
                    </div>
                    <a
                      href={`/portal/documents/${doc.id}/download`}
                      className="flex items-center gap-1 rounded-md border border-primary px-3 py-1.5 text-sm text-primary hover:bg-primary hover:text-cream"
                    >
                      <Download size={14} /> Download
                    </a>
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
