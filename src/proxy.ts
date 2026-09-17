import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

// Coarse gate: anyone hitting /portal/** without a session is bounced to
// /login. This is a convenience, NOT the real security boundary — every
// portal page and server action re-checks the session and role itself
// (see src/lib/auth.ts + src/lib/access.ts), per Next.js's own guidance
// that Proxy should never be the sole authorization check.
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });

  if (!token) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (pathname.startsWith("/portal/admin")) {
    const roles = (token.roles as string[]) ?? [];
    if (!roles.includes("ADMIN")) {
      return NextResponse.redirect(new URL("/portal", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/portal/:path*"],
};
