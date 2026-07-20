import { createHash, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

// Single shared password, no accounts — the cookie's value is a hash of
// the password itself (not a random session ID), so "is this cookie
// valid" needs no server-side session store: just recompute the hash
// from the current DASHBOARD_PASSWORD and compare.
const COOKIE_NAME = "dashboard_session";
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

function expectedToken(): string | null {
  const password = process.env.DASHBOARD_PASSWORD;
  if (!password) return null;
  return createHash("sha256").update(password).digest("hex");
}

function tokensMatch(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

export async function isAuthenticated(): Promise<boolean> {
  const expected = expectedToken();
  if (!expected) return false;
  const cookie = (await cookies()).get(COOKIE_NAME)?.value;
  if (!cookie) return false;
  return tokensMatch(cookie, expected);
}

export async function attemptLogin(password: string): Promise<boolean> {
  const expected = expectedToken();
  if (!expected) return false;
  const provided = createHash("sha256").update(password).digest("hex");
  if (!tokensMatch(provided, expected)) return false;

  (await cookies()).set(COOKIE_NAME, expected, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: COOKIE_MAX_AGE_SECONDS,
  });
  return true;
}

export async function logout(): Promise<void> {
  (await cookies()).delete(COOKIE_NAME);
}
