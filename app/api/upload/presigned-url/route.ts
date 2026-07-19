import { NextRequest, NextResponse } from "next/server";
import { r2GetPresignedUrl } from "@/lib/r2-client";
import { nanoid } from "nanoid";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE = 10 * 1024 * 1024; // 10MB

export async function POST(request: NextRequest) {
  try {
    const { fileName, fileType, fileSize } = await request.json();

    if (!ALLOWED_TYPES.includes(fileType)) {
      return NextResponse.json(
        { error: "Invalid file type. Allowed: JPEG, PNG, WebP" },
        { status: 400 }
      );
    }

    if (fileSize > MAX_SIZE) {
      return NextResponse.json(
        { error: "File too large. Maximum size: 10MB" },
        { status: 400 }
      );
    }

    const timestamp = new Date().toISOString().split("T")[0];
    const fileId = nanoid(10);
    const ext = fileName.split(".").pop();
    const fileKey = `uploads/${timestamp}/${fileId}.${ext}`;

    const presignedUrl = await r2GetPresignedUrl(fileKey, fileType, 300);

    return NextResponse.json({ presignedUrl, fileKey });
  } catch (error) {
    console.error("Presigned URL error:", error);
    return NextResponse.json(
      { error: "Failed to generate upload URL" },
      { status: 500 }
    );
  }
}
