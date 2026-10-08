import { desc } from "drizzle-orm";
import { getSession, getFreshRoles } from "@/lib/auth";
import { db } from "@/db";
import { forms } from "@/db/schema";
import { canView } from "@/lib/access";
import FormsClient from "@/components/FormsClient";
import { ClipboardList } from "lucide-react";

export default async function FormsPage() {
  const session = await getSession();
  const roles = await getFreshRoles(session!.user.id);

  // Never selects the file bytes here — the viewer fetches those separately
  // through an access-checked route.
  const all = await db
    .select({ id: forms.id, title: forms.title, description: forms.description, visibility: forms.visibility })
    .from(forms)
    .orderBy(desc(forms.createdAt));
  const visible = all.filter((f) => canView(roles, f.visibility));

  return (
    <div>
      <div className="flex items-center gap-2">
        <ClipboardList className="text-primary" size={22} />
        <h1 className="text-2xl font-bold text-primary">Forms</h1>
      </div>
      <div className="mt-6">
        <FormsClient forms={visible.map((f) => ({ id: f.id, title: f.title, description: f.description }))} />
      </div>
    </div>
  );
}
