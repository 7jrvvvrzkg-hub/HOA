import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { db } from "@/db";
import { residentProfiles } from "@/db/schema";

// Profile pictures aren't gated by the directory-sharing toggles (they're
// treated like a name, not a private detail), so the only check here is
// "are you signed in at all" — matching who can see the directory in the
// first place. `id` is the resident profile's id, same pattern as the
// documents download route.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "not signed in" }, { status: 401 });
  }

  const { id } = await params;
  const profile = await db.query.residentProfiles.findFirst({ where: eq(residentProfiles.id, id) });
  if (!profile?.avatarData || !profile.avatarMimeType) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  return new NextResponse(new Uint8Array(profile.avatarData), {
    headers: {
      "Content-Type": profile.avatarMimeType,
      "Cache-Control": "private, max-age=300",
    },
  });
}
