import { NextRequest, NextResponse } from "next/server";
import { initializeApp, getApps, cert, type App } from "firebase-admin/app";
import { getDatabase } from "firebase-admin/database";

function getAdminApp(): App {
  if (getApps().length > 0) {
    return getApps()[0];
  }

  return initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    }),
    databaseURL: "https://novavastra-ee441-default-rtdb.firebaseio.com",
  });
}

export async function POST(req: NextRequest) {
  try {
    const { uid, credits } = await req.json();

    if (!uid || typeof credits !== "number") {
      return NextResponse.json({ error: "uid and credits required" }, { status: 400 });
    }

    const app = getAdminApp();
    const db = getDatabase(app);
    const snapshot = await db.ref(`users/${uid}/credits`).get();
    const current = snapshot.val() || 0;
    await db.ref(`users/${uid}/credits`).set(current + credits);

    return NextResponse.json({ success: true, uid, credits: current + credits });
  } catch (e) {
    console.error("Admin credits error:", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
