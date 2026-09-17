import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getSession, getFreshRoles } from "@/lib/auth";
import { db } from "@/db";
import { documents } from "@/db/schema";
import { canViewDocument } from "@/lib/access";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "not signed in" }, { status: 401 });
  }

  const { id } = await params;
  const doc = await db.query.documents.findFirst({ where: eq(documents.id, id) });
  if (!doc) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  // Fresh from the database, not the session's cached roles — same reasoning
  // as every other access check in this app (see src/lib/auth.ts).
  const roles = await getFreshRoles(session.user.id);
  if (!canViewDocument(roles, session.user.id, doc)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  return new NextResponse(new Uint8Array(doc.fileData), {
    headers: {
      "Content-Type": doc.mimeType,
      "Content-Disposition": `attachment; filename="${doc.fileName.replace(/"/g, "")}"`,
      "Content-Length": String(doc.fileSize),
    },
  });
}
