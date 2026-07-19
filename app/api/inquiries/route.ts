import { NextRequest, NextResponse } from "next/server";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { r2Client } from "@/lib/r2-client";
import { nanoid } from "nanoid";

const RTDB_URL = process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL;

async function uploadToR2(base64Data: string, key: string, mimeType: string): Promise<string> {
  const buffer = Buffer.from(base64Data, "base64");

  await r2Client.send(
    new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: key,
      Body: buffer,
      ContentType: mimeType,
    })
  );

  const r2BaseUrl = process.env.NEXT_PUBLIC_R2_PUBLIC_URL || "";
  return r2BaseUrl ? `${r2BaseUrl}/${key}` : key;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      name,
      phone,
      whatsapp,
      notes,
      style,
      customPrompt,
      measurements,
      sareeImage,
      generatedDesign,
    } = body;

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

    const datePrefix = new Date().toISOString().split("T")[0];

    // Upload saree image to R2
    const sareeBase64 = sareeImage.split(",")[1];
    const sareeMime = sareeImage.split(";")[0].split(":")[1] || "image/jpeg";
    const sareeExt = sareeMime.split("/")[1] === "png" ? "png" : sareeMime.split("/")[1] === "webp" ? "webp" : "jpg";
    const sareeKey = `inquiries/${datePrefix}/${nanoid(10)}_saree.${sareeExt}`;
    const sareeImageUrl = await uploadToR2(sareeBase64, sareeKey, sareeMime);

    // Upload generated design image to R2 (if provided)
    let designImageUrl: string | null = null;
    if (generatedDesign?.imageData && generatedDesign?.mimeType) {
      const designKey = `inquiries/${datePrefix}/${nanoid(10)}_design.${generatedDesign.mimeType.split("/")[1] || "jpg"}`;
      designImageUrl = await uploadToR2(generatedDesign.imageData, designKey, generatedDesign.mimeType);
    }

    // Build inquiry record
    const inquiry: Record<string, any> = {
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
    };

    // Add custom prompt if provided
    if (customPrompt) {
      inquiry.customPrompt = customPrompt;
    }

    // Generate push key using RTDB REST API
    const pushRes = await fetch(`${RTDB_URL}/inquiries.json`, {
      method: "POST",
      body: JSON.stringify(inquiry),
    });

    const { name: inquiryId } = await pushRes.json();

    return NextResponse.json({
      success: true,
      inquiryId,
      sareeImageUrl,
      designImageUrl,
    });
  } catch (error) {
    console.error("Inquiry submission error:", error);
    return NextResponse.json(
      { error: "Failed to submit inquiry" },
      { status: 500 }
    );
  }
}
