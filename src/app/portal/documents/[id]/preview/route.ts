import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getSession, getFreshRoles } from "@/lib/auth";
import { db } from "@/db";
import { documents } from "@/db/schema";
import { canViewDocument } from "@/lib/access";
import { previewKind, safeContentType } from "@/lib/fileTypes";
import { ctx, decryptBytes } from "@/lib/crypto";

/** Same access rules as the download route (see that file). Feeds the
 * on-site viewer: raster images and PDF are sent inline, and the Office /
 * text types the viewer knows how to draw are sent as attachments (the
 * viewer fetches the bytes itself, so a person can't end up with one
 * rendered by the browser directly). Anything else 415s. */
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

  const kind = previewKind(doc.mimeType, doc.fileName);
  if (!kind) {
    return NextResponse.json({ error: "this file type can't be previewed — download it instead" }, { status: 415 });
  }

  let bytes: Buffer;
  try {
    bytes = decryptBytes(doc.fileData, ctx.document(doc.id));
  } catch (e) {
    console.error("[documents] couldn't open stored file", doc.id, e);
    return NextResponse.json({ error: "this file couldn't be opened" }, { status: 500 });
  }

  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      "Content-Type": safeContentType(kind, doc.mimeType, doc.fileName),
      "Content-Disposition": `${kind === "image" || kind === "pdf" ? "inline" : "attachment"}; filename="${doc.fileName.replace(/[^\w.\- ]/g, "")}"`,
      "Content-Length": String(bytes.length),
      "Cache-Control": "private, no-store, max-age=0",
      // Belt-and-suspenders alongside the mime-type allow-list on upload —
      // never let the browser guess a different (more dangerous) content
      // type than the one declared here.
      "X-Content-Type-Options": "nosniff",
    },
  });
}
