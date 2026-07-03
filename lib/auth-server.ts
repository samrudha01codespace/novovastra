import { cookies } from "next/headers";
import { getFirebaseAuth } from "next-firebase-auth-edge/lib/auth";

export const authConfig = {
  projectId: process.env.FIREBASE_PROJECT_ID || "",
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL || "",
  privateKey: (process.env.FIREBASE_PRIVATE_KEY || "").replace(/\\n/g, "\n"),
};

const { verifyIdToken } = getFirebaseAuth({
  serviceAccount: {
    projectId: authConfig.projectId,
    clientEmail: authConfig.clientEmail,
    privateKey: authConfig.privateKey,
  },
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "",
});

export async function getServerUser() {
  try {
    const cookieStore = await cookies();
    const session = cookieStore.get("session")?.value;

    if (!session) return null;

    const decoded = await verifyIdToken(session);
    return { uid: decoded.uid };
  } catch {
    return null;
  }
}
