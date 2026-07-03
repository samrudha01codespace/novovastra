import { NextRequest, NextResponse } from "next/server";
import { generateDressDesign, type StyleKey } from "@/lib/ai";
import { getServerUser } from "@/lib/auth-server";
import { deductCredit } from "@/lib/credits";

export async function POST(request: NextRequest) {
  try {
    const user = await getServerUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { imageBase64, style } = await request.json();

    if (!imageBase64 || !style) {
      return NextResponse.json(
        { error: "Missing imageBase64 or style" },
        { status: 400 }
      );
    }

    const validStyles: StyleKey[] = [
      "gown",
      "lehenga",
      "cocktail",
      "fusion",
      "jumpsuit",
      "shift",
    ];

    if (!validStyles.includes(style as StyleKey)) {
      return NextResponse.json(
        { error: `Invalid style. Allowed: ${validStyles.join(", ")}` },
        { status: 400 }
      );
    }

    const deduction = await deductCredit(user.uid, style);
    if (!deduction.success) {
      return NextResponse.json(
        { error: "Insufficient credits", remaining: deduction.remaining },
        { status: 402 }
      );
    }

    const response = await generateDressDesign(imageBase64, style as StyleKey);

    const parts = response.candidates?.[0]?.content?.parts || [];
    const generatedImages: { mimeType: string; data: string }[] = [];

    for (const part of parts) {
      if (part.inlineData && part.inlineData.mimeType?.startsWith("image/")) {
        generatedImages.push({
          mimeType: part.inlineData.mimeType,
          data: part.inlineData.data,
        });
      }
    }

    if (generatedImages.length === 0) {
      const textParts = parts
        .filter((p) => p.text)
        .map((p) => p.text)
        .join("\n");

      console.log("No images returned. Text response:", textParts);

      return NextResponse.json(
        {
          error:
            "The model returned text instead of an image. This may be due to content policy or the model not supporting image generation with this input.",
          textResponse: textParts,
          remaining: deduction.remaining,
        },
        { status: 422 }
      );
    }

    return NextResponse.json({
      images: generatedImages,
      remaining: deduction.remaining,
    });
  } catch (error) {
    console.error("Generation error:", error);

    const message =
      error instanceof Error ? error.message : "Failed to generate design";

    if (message.includes("429")) {
      return NextResponse.json(
        {
          error: "Rate limit exceeded. Please wait a minute and try again.",
        },
        { status: 429 }
      );
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
