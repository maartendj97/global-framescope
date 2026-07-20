import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import type { NextFetchEvent, NextRequest } from "next/server";
import { recordVisit } from "@/lib/external/visitUsage";

// Records a page view for the observability dashboard on every real page
// request (matcher below excludes API routes, static assets, and
// metadata files, so this never counts data-fetch or asset traffic).
//
// The visitor ID is a salted SHA-256 hash of IP + calendar day — never
// the raw IP — so the day's unique-visitor Redis set (see visitUsage.ts)
// holds no reversible personal data and naturally stops linking the same
// visitor across days.
function hashVisitor(ip: string): string {
  const salt = process.env.VISIT_HASH_SALT ?? "framescope";
  const day = new Date().toISOString().slice(0, 10);
  return createHash("sha256").update(`${salt}:${day}:${ip}`).digest("hex");
}

export function proxy(request: NextRequest, event: NextFetchEvent) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  if (ip) {
    // Fire-and-forget: never delay the page response for a counter write.
    event.waitUntil(recordVisit(hashVisitor(ip)));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)"],
};
