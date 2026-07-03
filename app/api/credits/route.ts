import { NextResponse } from "next/server";
import { getServerUser } from "@/lib/auth-server";
import { getUserCredits } from "@/lib/credits";

export async function GET() {
  try {
    const user = await getServerUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const credits = await getUserCredits(user.uid);
    return NextResponse.json({ credits });
  } catch (error) {
    console.error("Credits fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch credits" }, { status: 500 });
  }
}
