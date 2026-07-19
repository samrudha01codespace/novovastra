import { NextRequest, NextResponse } from "next/server";

const RTDB_URL = process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL;

export async function GET() {
  try {
    if (!RTDB_URL) {
      return NextResponse.json(
        { error: "Firebase RTDB not configured" },
        { status: 500 }
      );
    }

    const res = await fetch(`${RTDB_URL}/feedback.json`);
    const data = await res.json();

    if (!data) {
      return NextResponse.json([]);
    }

    const items = Object.entries(data).map(
      ([id, val]) => {
        const v = val as Record<string, unknown>;
        return {
          id,
          name: v.name,
          quote: v.quote,
          rating: v.rating,
          createdAt: v.createdAt,
        };
      }
    );

    items.sort(
      (a, b) =>
        new Date(b.createdAt as string).getTime() -
        new Date(a.createdAt as string).getTime()
    );

    return NextResponse.json(items);
  } catch (error) {
    console.error("Feedback fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch feedback" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, quote, rating } = body;

    if (!name || !quote || !rating) {
      return NextResponse.json(
        { error: "Name, quote, and rating are required" },
        { status: 400 }
      );
    }

    if (typeof rating !== "number" || rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: "Rating must be a number between 1 and 5" },
        { status: 400 }
      );
    }

    if (!RTDB_URL) {
      return NextResponse.json(
        { error: "Firebase RTDB not configured" },
        { status: 500 }
      );
    }

    const pushRes = await fetch(`${RTDB_URL}/feedback.json`, {
      method: "POST",
      body: JSON.stringify({
        name: name.trim(),
        quote: quote.trim(),
        rating,
        createdAt: new Date().toISOString(),
      }),
    });

    const { name: feedbackId } = await pushRes.json();

    return NextResponse.json({ success: true, feedbackId });
  } catch (error) {
    console.error("Feedback submission error:", error);
    return NextResponse.json(
      { error: "Failed to submit feedback" },
      { status: 500 }
    );
  }
}
