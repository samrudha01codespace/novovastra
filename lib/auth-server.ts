import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";

function getSecret(): Uint8Array {
  const key = process.env.SESSION_SECRET || process.env.FIREBASE_PROJECT_ID || "novavastra-dev";
  return new TextEncoder().encode(key);
}

export async function createSessionToken(uid: string): Promise<string> {
  return new SignJWT({ uid })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("14d")
    .sign(getSecret());
}

export async function getServerUser() {
  try {
    const cookieStore = await cookies();
    const session = cookieStore.get("session")?.value;

    if (!session) return null;

    const { payload } = await jwtVerify(session, getSecret());

    if (typeof payload.uid !== "string") return null;

    return { uid: payload.uid };
  } catch {
    return null;
  }
}
