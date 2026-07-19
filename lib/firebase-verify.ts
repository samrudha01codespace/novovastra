import { importX509, jwtVerify, type JWTPayload } from "jose";

const FIREBASE_CERTS_URL = "https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com";

let cachedKeys: Map<string, { key: ReturnType<typeof importX509> extends Promise<infer T> ? T : never; expiry: number }> | null = null;

async function getSigningKey(kid: string) {
  const now = Date.now();

  if (cachedKeys && cachedKeys.has(kid)) {
    const entry = cachedKeys.get(kid)!;
    if (entry.expiry > now) return entry.key;
  }

  const res = await fetch(FIREBASE_CERTS_URL);
  if (!res.ok) throw new Error(`Failed to fetch Firebase certs: ${res.status}`);

  const certs: Record<string, string> = await res.json();

  // Cache all keys (certs are valid for 1h)
  cachedKeys = new Map();
  const expiry = now + 3500_000; // ~58 minutes

  for (const [kid2, pem] of Object.entries(certs)) {
    const key = await importX509(pem, "RS256");
    cachedKeys.set(kid2, { key, expiry });
  }

  const entry = cachedKeys.get(kid);
  if (!entry) throw new Error(`Unknown key ID: ${kid}`);
  return entry.key;
}

export interface FirebaseTokenPayload extends JWTPayload {
  sub: string;
  user_id?: string;
  email?: string;
  name?: string;
}

export async function verifyFirebaseToken(idToken: string): Promise<FirebaseTokenPayload> {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  if (!projectId) {
    throw new Error("FIREBASE_PROJECT_ID not configured");
  }

  // Decode header to get kid
  const header = JSON.parse(
    Buffer.from(idToken.split(".")[0], "base64url").toString()
  );

  const key = await getSigningKey(header.kid);

  const { payload } = await jwtVerify(idToken, key, {
    issuer: `https://securetoken.google.com/${projectId}`,
    audience: projectId,
  });

  return payload as FirebaseTokenPayload;
}
