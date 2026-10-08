import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getSession, getFreshRoles } from "@/lib/auth";
import { db } from "@/db";
import { forms } from "@/db/schema";
import { canView } from "@/lib/access";

const DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

/** The Word file behind a form, for the on-site form viewer. Same rule as
 * the form list: you must be signed in and allowed to see that form. The
 * content type is fixed rather than echoed from the database. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "not signed in" }, { status: 401 });

  const { id } = await params;
  const form = await db.query.forms.findFirst({ where: eq(forms.id, id) });
  if (!form) return NextResponse.json({ error: "not found" }, { status: 404 });

  const roles = await getFreshRoles(session.user.id);
  if (!canView(roles, form.visibility)) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  return new NextResponse(new Uint8Array(form.fileData), {
    headers: {
      "Content-Type": DOCX_MIME,
      "Content-Disposition": `attachment; filename="${form.fileName.replace(/[^\w.\- ]/g, "")}"`,
      "Content-Length": String(form.fileSize),
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
