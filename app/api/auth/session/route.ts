import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getFirebaseAuth } from "next-firebase-auth-edge/lib/auth";
import { authConfig } from "@/lib/auth-server";

const { verifyIdToken } = getFirebaseAuth({
  serviceAccount: {
    projectId: authConfig.projectId,
    clientEmail: authConfig.clientEmail,
    privateKey: authConfig.privateKey,
  },
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "",
});

export async function POST(request: NextRequest) {
  const { idToken } = await request.json();

  try {
    await verifyIdToken(idToken);
  } catch {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  const expiresIn = 60 * 60 * 24 * 14 * 1000;
  const cookieStore = await cookies();
  cookieStore.set("session", idToken, {
    maxAge: expiresIn / 1000,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    sameSite: "lax",
  });

  return NextResponse.json({ status: "success" });
}

export async function DELETE() {
  const cookieStore = await cookies();
  cookieStore.delete("session");
  return NextResponse.json({ status: "success" });
}
