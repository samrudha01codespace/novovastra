import { NextRequest, NextResponse } from "next/server";
import { generateDressDesign, type StyleKey, type ModelKey, AI_MODELS } from "@/lib/ai";
import { getServerUser } from "@/lib/auth-server";
import { deductCredit } from "@/lib/credits";

const VALID_STYLES: StyleKey[] = ["gown", "lehenga", "cocktail", "fusion", "jumpsuit"];
const VALID_MODELS: ModelKey[] = ["standard", "premium"];

export async function POST(request: NextRequest) {
  try {
    const user = await getServerUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { sareeImageBase64, style, customPrompt, model = "standard" } = await request.json();

    if (!sareeImageBase64) {
      return NextResponse.json({ error: "Missing sareeImageBase64" }, { status: 400 });
    }

    if (!style) {
      return NextResponse.json({ error: "Missing style" }, { status: 400 });
    }

    if (!VALID_MODELS.includes(model as ModelKey)) {
      return NextResponse.json(
        { error: `Invalid model. Allowed: ${VALID_MODELS.join(", ")}` },
        { status: 400 }
      );
    }

    const isCustom = style === "custom";
    const isPredefined = VALID_STYLES.includes(style as StyleKey);

    if (!isCustom && !isPredefined) {
      return NextResponse.json(
        { error: `Invalid style. Allowed: ${VALID_STYLES.join(", ")}, or custom` },
        { status: 400 }
      );
    }

    if (isCustom && !customPrompt) {
      return NextResponse.json({ error: "Missing customPrompt for custom style" }, { status: 400 });
    }

    const selectedModel = AI_MODELS[model as ModelKey];
    const deduction = await deductCredit(user.uid, style, model as ModelKey);
    if (!deduction.success) {
      return NextResponse.json(
        { error: "Insufficient credits", remaining: deduction.remaining, creditsNeeded: selectedModel.credits },
        { status: 402 }
      );
    }

    const result = await generateDressDesign(
      sareeImageBase64,
      isCustom ? "custom" : (style as StyleKey),
      customPrompt,
      model as ModelKey
    );

    return NextResponse.json({
      images: [{ mimeType: result.mimeType, data: result.imageBase64 }],
      remaining: deduction.remaining,
    });
  } catch (error) {
    console.error("Generation error:", error);

    const message = error instanceof Error ? error.message : "Failed to generate design";

    if (message.includes("429")) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Please wait a minute and try again." },
        { status: 429 }
      );
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
