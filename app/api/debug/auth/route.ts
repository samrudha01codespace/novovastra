import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET() {
  const cookieStore = await cookies();
  const session = cookieStore.get("session");

  return NextResponse.json({
    sessionCookieExists: !!session,
    sessionCookieLength: session?.value?.length ?? 0,
    sessionSecret: process.env.SESSION_SECRET ? "set" : "missing",
    firebaseProjectId: process.env.FIREBASE_PROJECT_ID ? "set" : "missing",
    nodeEnv: process.env.NODE_ENV,
  });
}
