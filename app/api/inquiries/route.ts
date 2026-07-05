import { NextRequest, NextResponse } from "next/server";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { r2Client } from "@/lib/r2-client";
import { nanoid } from "nanoid";

const RTDB_URL = process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, phone, whatsapp, notes, style, measurements, sareeImage } = body;

    if (!name || !phone || !style || !sareeImage) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    if (!RTDB_URL) {
      return NextResponse.json(
        { error: "Firebase RTDB not configured" },
        { status: 500 }
      );
    }

    // Upload saree image to R2
    const base64Data = sareeImage.split(",")[1];
    const mimeType = sareeImage.split(";")[0].split(":")[1] || "image/jpeg";
    const ext = mimeType.split("/")[1] === "png" ? "png" : mimeType.split("/")[1] === "webp" ? "webp" : "jpg";
    const fileKey = `inquiries/${new Date().toISOString().split("T")[0]}/${nanoid(10)}.${ext}`;

    const buffer = Buffer.from(base64Data, "base64");

    await r2Client.send(
      new PutObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME,
        Key: fileKey,
        Body: buffer,
        ContentType: mimeType,
      })
    );

    const r2BaseUrl = process.env.NEXT_PUBLIC_R2_BASE_URL || "";
    const sareeImageUrl = r2BaseUrl ? `${r2BaseUrl}/${fileKey}` : fileKey;

    // Build design image URL
    const designImageUrl = r2BaseUrl ? `${r2BaseUrl}/designs/${style}.jpg` : `/designs/${style}.jpg`;

    // Generate push key using RTDB REST API
    const pushRes = await fetch(`${RTDB_URL}/inquiries.json`, {
      method: "POST",
      body: JSON.stringify({
        name,
        phone,
        whatsapp: whatsapp || phone,
        notes: notes || "",
        style,
        measurements: measurements || [],
        sareeImageUrl,
        designImageUrl,
        status: "new",
        createdAt: new Date().toISOString(),
      }),
    });

    const { name: inquiryId } = await pushRes.json();

    return NextResponse.json({
      success: true,
      inquiryId,
      sareeImageUrl,
    });
  } catch (error) {
    console.error("Inquiry submission error:", error);
    return NextResponse.json(
      { error: "Failed to submit inquiry" },
      { status: 500 }
    );
  }
}
