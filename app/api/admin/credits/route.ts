import { NextRequest, NextResponse } from "next/server";
import { SignJWT } from "jose";

const RTDB_URL = "https://novavastra-ee441-default-rtdb.firebaseio.com";

async function getAccessToken(): Promise<string> {
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!clientEmail || !privateKey) {
    throw new Error("Firebase service account credentials not configured");
  }

  const now = Math.floor(Date.now() / 1000);
  const oneHour = 3600;

  const header = { alg: "RS256", typ: "JWT" };
  const payload = {
    iss: clientEmail,
    sub: clientEmail,
    aud: "https://identitytoolkit.googleapis.com/google.identity.identitytoolkit.v1.IdentityToolkit",
    iat: now,
    exp: now + oneHour,
    scope: "https://www.googleapis.com/auth/firebase.database https://www.googleapis.com/auth/userinfo.email",
  };

  const key = await importPrivateKey(privateKey);
  const jwt = await new SignJWT(payload)
    .setProtectedHeader(header)
    .sign(key);

  const tokenRes = await fetch(
    "https://oauth2.googleapis.com/token",
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion: jwt,
      }),
    }
  );

  if (!tokenRes.ok) {
    throw new Error("Failed to get Firebase access token");
  }

  const tokenData = await tokenRes.json();
  return tokenData.access_token;
}

async function importPrivateKey(pemKey: string) {
  const { importPKCS8 } = await import("jose");
  const key = pemKey
    .replace("-----BEGIN PRIVATE KEY-----", "")
    .replace("-----END PRIVATE KEY-----", "")
    .replace(/\s/g, "");
  return importPKCS8(key, "RS256");
}

async function rdbGet(path: string, token: string): Promise<unknown> {
  const res = await fetch(`${RTDB_URL}/${path}.json?auth=${token}`);
  if (!res.ok) throw new Error(`RTDB GET failed: ${res.status}`);
  return res.json();
}

async function rdbSet(path: string, value: unknown, token: string): Promise<void> {
  const res = await fetch(`${RTDB_URL}/${path}.json?auth=${token}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(value),
  });
  if (!res.ok) throw new Error(`RTDB SET failed: ${res.status}`);
}

export async function POST(req: NextRequest) {
  try {
    const { uid, credits } = await req.json();

    if (!uid || typeof credits !== "number") {
      return NextResponse.json({ error: "uid and credits required" }, { status: 400 });
    }

    const token = await getAccessToken();
    const current = (await rdbGet(`users/${uid}/credits`, token)) as number || 0;
    const newCredits = current + credits;
    await rdbSet(`users/${uid}/credits`, newCredits, token);

    return NextResponse.json({ success: true, uid, credits: newCredits });
  } catch (e) {
    console.error("Admin credits error:", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
