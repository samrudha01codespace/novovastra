import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createSessionToken } from "@/lib/auth-server";
import { verifyFirebaseToken } from "@/lib/firebase-verify";

export async function POST(request: NextRequest) {
  const { idToken } = await request.json();

  let uid: string;
  try {
    const decoded = await verifyFirebaseToken(idToken);
    uid = decoded.sub || decoded.user_id || "";
    if (!uid) {
      return NextResponse.json({ error: "No uid in token" }, { status: 401 });
    }
  } catch (error) {
    console.error("Token verification error:", error);
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  const sessionToken = await createSessionToken(uid);

  const expiresIn = 60 * 60 * 24 * 14;
  const cookieStore = await cookies();
  cookieStore.set("session", sessionToken, {
    maxAge: expiresIn,
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
