import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

// Two jobs, both on the pages that need real protection (the portal, sign-in
// and account-security pages):
//
// 1. Coarse gate: anyone hitting /portal/** without a session is bounced to
//    /login. This is a convenience, NOT the real security boundary — every
//    portal page, download address and server action re-checks the session
//    and role itself (see src/lib/auth.ts + src/lib/access.ts), per Next.js's
//    own guidance that Proxy should never be the sole authorization check.
//
// 2. A strict Content-Security-Policy with a fresh random nonce on every
//    request: the browser will run only the site's own scripts and refuses
//    anything injected, and the pages can't be embedded in anyone else's site.
//    (The public marketing page gets a static policy from next.config.ts.)

function buildCsp(nonce: string) {
  const dev = process.env.NODE_ENV !== "production";
  return [
    "default-src 'self'",
    // 'wasm-unsafe-eval' lets the PDF viewer's image decoder run; it does not
    // allow eval() of text.
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' 'wasm-unsafe-eval'${dev ? " 'unsafe-eval'" : ""}`,
    // Document viewers (Word/PowerPoint previews) inject their own <style> tags.
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    "connect-src 'self'",
    "worker-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    ...(dev ? [] : ["upgrade-insecure-requests"]),
  ].join("; ");
}

function finish(res: NextResponse, csp: string) {
  res.headers.set("Content-Security-Policy", csp);
  res.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
  return res;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const csp = buildCsp(nonce);

  if (pathname.startsWith("/portal")) {
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });

    if (!token) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("from", pathname);
      return finish(NextResponse.redirect(loginUrl), csp);
    }

    if (pathname.startsWith("/portal/admin")) {
      const roles = (token.roles as string[]) ?? [];
      if (!roles.includes("ADMIN") && !roles.includes("DIRECTOR")) {
        return finish(NextResponse.redirect(new URL("/portal", request.url)), csp);
      }
    }
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);
  return finish(NextResponse.next({ request: { headers: requestHeaders } }), csp);
}

export const config = {
  matcher: ["/portal/:path*", "/login", "/forgot-password", "/reset-password", "/security"],
};
