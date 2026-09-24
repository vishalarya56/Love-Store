import { db } from "@/lib/db";
import { cookies } from "next/headers";
import { randomBytes } from "crypto";

export interface AuthSession {
  creatorId: string;
  name: string;
  phone: string;
}

const SESSION_COOKIE = "ls_session";
const SESSION_TTL_DAYS = 30;

export async function createSession(creatorId: string): Promise<string> {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000);
  await db.session.create({
    data: { creatorId, token, expiresAt },
  });
  return token;
}

// IMPORTANT: the session cookie MUST be `SameSite=None; Secure` so it is sent
// when the app runs inside the cross-site preview iframe (the preview panel's
// top-level site differs from the iframe's site, which makes `SameSite=Lax`
// cookies get silently dropped on fetch subresource requests → 401s).
//
// `Secure` is satisfied in all relevant contexts:
//  - the https preview (Caddy terminates TLS)
//  - http://localhost (modern browsers treat localhost as a secure context and
//    still allow `Secure` cookies to be set/sent there)
//  - production https
const COOKIE_OPTS = {
  httpOnly: true,
  secure: true,
  sameSite: "none" as const,
  path: "/",
};

export async function setSessionCookie(token: string) {
  const expires = new Date(Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000);
  const c = await cookies();
  c.set(SESSION_COOKIE, token, { ...COOKIE_OPTS, expires });
}

export async function clearSessionCookie() {
  const c = await cookies();
  // match the exact attributes used when setting, otherwise the delete is a no-op
  c.set(SESSION_COOKIE, "", { ...COOKIE_OPTS, expires: new Date(0) });
}

export async function getSessionToken(): Promise<string | undefined> {
  const c = await cookies();
  return c.get(SESSION_COOKIE)?.value;
}

export async function getAuthSession(): Promise<AuthSession | null> {
  const token = await getSessionToken();
  if (!token) return null;
  const session = await db.session.findUnique({
    where: { token },
    include: { creator: true },
  });
  if (!session) return null;
  if (session.expiresAt < new Date()) {
    await db.session.delete({ where: { id: session.id } }).catch(() => {});
    return null;
  }
  return {
    creatorId: session.creator.id,
    name: session.creator.name,
    phone: session.creator.phone,
  };
}

/** Require an authenticated session or throw an apiError-like signal. */
export async function requireAuth(): Promise<AuthSession> {
  const s = await getAuthSession();
  if (!s) {
    throw new AuthError("AUTH_REQUIRED", "Please sign in to continue.");
  }
  return s;
}

export class AuthError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}
