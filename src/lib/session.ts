import { cookies } from "next/headers";

const SESSION_COOKIE = "telepsych_session";

export type SessionUser = {
  id: string;
  role: "doctor" | "patient";
};

/**
 * Read session from cookie (set by backend). Used in server components for redirect checks.
 * Cookie format matches backend: signed token (JWT-like HS256): header.payload.signature
 *
 * NOTE: We only decode the payload for routing/UX purposes here. Authorization is enforced
 * on the backend for every API call.
 */
export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
    const { userId, role, exp } = payload;
    if (exp && Date.now() > exp * 1000) return null;
    if (role !== "doctor" && role !== "patient") return null;
    return { id: userId, role };
  } catch {
    return null;
  }
}
