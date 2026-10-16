import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { announcements } from "@/db/schema";
import { getSession, getFreshRoles } from "@/lib/auth";
import { canView, isStaff } from "@/lib/access";
import { ctx, decryptBytes } from "@/lib/crypto";
import { SAFE_IMAGE_MIME_TYPES } from "@/lib/fileTypes";

// A picture on an announcement. Announcements for everyone are shown on the
// public homepage, so their pictures are public too. A picture on an owners-
// only / renters-only / admin-only announcement is only handed to people who
// are allowed to read that announcement.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const a = await db.query.announcements.findFirst({
    where: eq(announcements.id, id),
    columns: { id: true, imageData: true, imageMimeType: true, audience: true, active: true, updatedAt: true },
  });
  if (!a?.imageData || !a.imageMimeType || !SAFE_IMAGE_MIME_TYPES.has(a.imageMimeType)) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const isPublic = a.active && a.audience === "ALL_RESIDENTS";
  if (!isPublic) {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "not found" }, { status: 404 });
    const roles = await getFreshRoles(session.user.id);
    const ok = isStaff(roles) || (a.active && canView(roles, a.audience));
    if (!ok) return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  let bytes: Buffer;
  try {
    bytes = decryptBytes(a.imageData, ctx.announcementImage(a.id));
  } catch {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      "Content-Type": a.imageMimeType,
      // The page asks for ?v=<last edited>, so a changed picture is a new address.
      "Cache-Control": isPublic ? "public, max-age=3600" : "private, no-cache",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; sandbox",
    },
  });
}
