import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createSessionToken } from "@/lib/auth-server";

export async function POST(request: NextRequest) {
  const { idToken } = await request.json();

  let uid: string;
  try {
    // Verify Firebase ID token using the identitytoolkit API
    const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
    if (!apiKey) {
      console.error("NEXT_PUBLIC_FIREBASE_API_KEY not configured");
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
    }
    
    const res = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      }
    );
    
    if (!res.ok) {
      const errorData = await res.json();
      console.error("Token verification failed:", res.status, errorData);
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }
    
    const data = await res.json();
    uid = data.users?.[0]?.localId;
    
    if (!uid) {
      console.error("No UID in token response");
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
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
