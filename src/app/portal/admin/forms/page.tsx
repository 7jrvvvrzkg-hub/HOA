import { desc } from "drizzle-orm";
import { db } from "@/db";
import { forms, formSubmissions } from "@/db/schema";
import { deleteForm, markSubmissionReviewed } from "@/actions/forms";
import UploadFormForm from "@/components/UploadFormForm";
import { Button } from "@/components/Button";
import { docVisibilityLabels } from "@/lib/labels";

export default async function AdminFormsPage() {
  const formList = await db
    .select({ id: forms.id, title: forms.title, visibility: forms.visibility, createdAt: forms.createdAt })
    .from(forms)
    .orderBy(desc(forms.createdAt));

  const submissions = await db.query.formSubmissions.findMany({
    orderBy: desc(formSubmissions.createdAt),
    with: {
      submittedBy: {
        columns: { email: true },
        with: { residentProfile: { columns: { fullName: true, unit: true } }, adminAccount: { columns: { fullName: true } } },
      },
    },
  });
  const newCount = submissions.filter((s) => !s.reviewedAt).length;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="flex items-center gap-2 text-lg font-semibold text-primary">
          Submissions
          {newCount > 0 && (
            <span className="rounded-full bg-accent px-2 py-0.5 text-xs font-semibold text-ink">{newCount} new</span>
          )}
        </h2>
        {submissions.length === 0 ? (
          <p className="mt-3 rounded-md border border-dashed border-cream-dark p-6 text-ink-soft">
            No forms have been submitted yet.
          </p>
        ) : (
          <div className="mt-3 space-y-3">
            {submissions.map((s) => {
              const who =
                s.submittedBy.residentProfile?.fullName ?? s.submittedBy.adminAccount?.fullName ?? s.submittedBy.email;
              return (
                <details key={s.id} data-submission={s.id} className="rounded-lg border border-cream-dark bg-white">
                  <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
                    <span className="font-medium text-ink">
                      {s.formTitle}
                      {!s.reviewedAt && (
                        <span className="ml-2 rounded-full bg-accent px-2 py-0.5 text-xs font-semibold text-ink">New</span>
                      )}
                    </span>
                    <span className="text-ink-soft">
                      {who}
                      {s.submittedBy.residentProfile?.unit ? ` · ${s.submittedBy.residentProfile.unit}` : ""} ·{" "}
                      {s.createdAt.toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                    </span>
                  </summary>
                  <div className="border-t border-cream-dark p-4">
                    <table className="w-full text-left text-sm">
                      <tbody>
                        {s.answers.map((a, i) => (
                          <tr key={i} className="border-b border-cream-dark last:border-0">
                            <td className="w-1/3 py-2 pr-3 align-top text-ink-soft">{a.label}</td>
                            <td className="py-2 align-top text-ink">{a.value || "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <form action={markSubmissionReviewed.bind(null, s.id, !s.reviewedAt)} className="mt-3">
                      <Button type="submit" size="sm" variant="outline">
                        {s.reviewedAt ? "Mark as New" : "Mark Reviewed"}
                      </Button>
                    </form>
                  </div>
                </details>
              );
            })}
          </div>
        )}
      </div>

      <div>
        <h2 className="text-lg font-semibold text-primary">Add a Form</h2>
        <div className="mt-3">
          <UploadFormForm />
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-primary">All Forms</h2>
        {formList.length === 0 ? (
          <p className="mt-3 text-sm text-ink-soft">No forms yet.</p>
        ) : (
          <ul className="mt-3 divide-y divide-cream-dark rounded-lg border border-cream-dark bg-white">
            {formList.map((f) => (
              <li key={f.id} className="flex flex-wrap items-center justify-between gap-3 p-4 text-sm">
                <div>
                  <p className="font-medium text-ink">{f.title}</p>
                  <p className="text-xs text-ink-soft">{docVisibilityLabels[f.visibility]}</p>
                </div>
                <form action={deleteForm.bind(null, f.id)}>
                  <Button type="submit" size="sm" variant="danger">Delete</Button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
