import { desc } from "drizzle-orm";
import { db } from "@/db";
import { leads } from "@/db/schema";
import { updateLeadStatus, assignLeadToSelf, deleteLead } from "@/actions/leads";
import { Button } from "@/components/Button";
import { leadStatusLabels } from "@/lib/labels";
import clsx from "clsx";

const statusTag: Record<string, string> = {
  NEW: "bg-info/10 text-info",
  IN_PROGRESS: "bg-warning/10 text-warning",
  RESOLVED: "bg-primary/10 text-primary",
};

export default async function AdminLeadsPage() {
  const leadList = await db.query.leads.findMany({
    orderBy: desc(leads.createdAt),
    with: { assignedTo: { columns: { email: true } } },
  });

  return (
    <div>
      <h2 className="text-lg font-semibold text-primary">Contact Form Leads</h2>
      <p className="mt-1 text-sm text-ink-soft">
        Every contact-form submission lands here as a simple built-in CRM.
      </p>

      <div className="mt-4 space-y-3">
        {leadList.map((lead) => (
          <div key={lead.id} className="rounded-lg border border-cream-dark bg-white p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-medium text-ink">{lead.name} <span className="text-ink-soft">— {lead.email}</span></p>
                {lead.phone && <p className="text-xs text-ink-soft">{lead.phone}</p>}
              </div>
              <span className={clsx("rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase", statusTag[lead.status])}>
                {leadStatusLabels[lead.status]}
              </span>
            </div>
            <p className="mt-2 text-sm text-ink-soft">{lead.message}</p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <form action={async (formData: FormData) => {
                "use server";
                await updateLeadStatus(lead.id, formData.get("status") as never);
              }} className="flex items-center gap-2">
                <select name="status" defaultValue={lead.status} className="rounded-md border border-cream-dark px-2 py-1 text-sm">
                  {Object.entries(leadStatusLabels).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
                <Button type="submit" size="sm" variant="outline">Update</Button>
              </form>
              <form action={assignLeadToSelf.bind(null, lead.id)}>
                <Button type="submit" size="sm" variant="ghost">
                  {lead.assignedTo ? `Assigned to: ${lead.assignedTo.email}` : "Assign to Me"}
                </Button>
              </form>
              <span className="text-xs text-ink-soft">
                {lead.createdAt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
              </span>
              <form action={deleteLead.bind(null, lead.id)} className="ml-auto">
                <Button type="submit" size="sm" variant="danger">Delete</Button>
              </form>
            </div>
          </div>
        ))}
        {leadList.length === 0 && (
          <p className="rounded-md border border-dashed border-cream-dark p-6 text-ink-soft">
            No leads yet.
          </p>
        )}
      </div>
    </div>
  );
}
