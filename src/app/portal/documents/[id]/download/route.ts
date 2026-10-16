import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getSession, getFreshRoles } from "@/lib/auth";
import { db } from "@/db";
import { documents } from "@/db/schema";
import { canViewDocument } from "@/lib/access";
import { ctx, decryptBytes } from "@/lib/crypto";
import { logActivity } from "@/lib/activity";

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

  let bytes: Buffer;
  try {
    bytes = decryptBytes(doc.fileData, ctx.document(doc.id));
  } catch (e) {
    console.error("[documents] couldn't open stored file", doc.id, e);
    return NextResponse.json({ error: "this file couldn't be opened" }, { status: 500 });
  }

  // Downloading anything that isn't yours leaves a trail (opening your own
  // upload, or a document assigned to you, isn't recorded — that's just noise).
  if (doc.assignedToId !== session.user.id && doc.uploadedById !== session.user.id) {
    await logActivity({
      actorId: session.user.id,
      category: "document",
      summary: `Downloaded ${doc.visibility === "PERSONAL" ? "the personal document" : "the document"} "${doc.title}"`,
    });
  }

  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      "Content-Type": doc.mimeType,
      "Content-Disposition": `attachment; filename="${doc.fileName.replace(/[^\w.\- ]/g, "")}"`,
      "Content-Length": String(bytes.length),
      // Private documents are never kept by the browser cache or any proxy.
      "Cache-Control": "private, no-store, max-age=0",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
