import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getSession, getFreshRoles } from "@/lib/auth";
import { db } from "@/db";
import { documents } from "@/db/schema";
import { canViewDocument } from "@/lib/access";
import { PREVIEWABLE_MIME_TYPES } from "@/lib/fileTypes";

/** Same access rules as the download route (see that file), but with the
 * "Content-Disposition: attachment" header left off, so a supported type
 * opens right in the tab instead of forcing a download — only for a small,
 * explicit allow-list of types a browser can actually render safely
 * (raster images and PDF); anything else 415s rather than guessing. */
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

  const roles = await getFreshRoles(session.user.id);
  if (!canViewDocument(roles, session.user.id, doc)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  if (!PREVIEWABLE_MIME_TYPES.has(doc.mimeType)) {
    return NextResponse.json({ error: "this file type can't be previewed — download it instead" }, { status: 415 });
  }

  return new NextResponse(new Uint8Array(doc.fileData), {
    headers: {
      "Content-Type": doc.mimeType,
      "Content-Disposition": `inline; filename="${doc.fileName.replace(/"/g, "")}"`,
      "Content-Length": String(doc.fileSize),
      // Belt-and-suspenders alongside the mime-type allow-list on upload —
      // never let the browser guess a different (more dangerous) content
      // type than the one declared here.
      "X-Content-Type-Options": "nosniff",
    },
  });
}
