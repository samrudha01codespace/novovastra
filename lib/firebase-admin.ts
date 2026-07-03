import { App, getApps, initializeApp, cert } from "firebase-admin/app";
import { getAuth, Auth } from "firebase-admin/auth";
import { getFirestore, Firestore } from "firebase-admin/firestore";

let adminApp: App | null = null;
let _adminAuth: Auth | null = null;
let _adminDb: Firestore | null = null;

function getAdminApp(): App {
  if (adminApp) return adminApp;

  if (getApps().length > 0) {
    adminApp = getApps()[0];
  } else {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY;

    if (!projectId || !clientEmail || !privateKey) {
      throw new Error(
        "Missing Firebase Admin credentials. Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY."
      );
    }

    adminApp = initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey: privateKey.replace(/\\n/g, "\n"),
      }),
    });
  }

  return adminApp;
}

export function getAdminAuth(): Auth {
  if (_adminAuth) return _adminAuth;
  _adminAuth = getAuth(getAdminApp());
  return _adminAuth;
}

export function getAdminDb(): Firestore {
  if (_adminDb) return _adminDb;
  _adminDb = getFirestore(getAdminApp());
  return _adminDb;
}

// Lazy exports for backward compatibility
export const adminAuth = new Proxy({} as Auth, {
  get(_, prop) {
    const auth = getAdminAuth();
    return (auth as unknown as Record<string | symbol, unknown>)[prop];
  },
});

export const adminDb = new Proxy({} as Firestore, {
  get(_, prop) {
    const db = getAdminDb();
    return (db as unknown as Record<string | symbol, unknown>)[prop];
  },
});

export default getAdminApp;
