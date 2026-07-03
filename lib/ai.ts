import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export const STYLE_PROMPTS = {
  gown: "modern flowing evening gown",
  lehenga: "contemporary lehenga with modern silhouette",
  cocktail: "sleek cocktail dress",
  fusion: "saree-dress fusion garment",
  jumpsuit: "draped silk jumpsuit",
  shift: "minimalist shift dress",
} as const;

export type StyleKey = keyof typeof STYLE_PROMPTS;

const MODEL_NAME = "gemini-2.5-flash-image";

async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  baseDelay = 30000
): Promise<T> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: unknown) {
      const isQuota =
        error instanceof Error && error.message.includes("429");
      if (isQuota && attempt < maxRetries) {
        const delay = baseDelay * Math.pow(2, attempt);
        console.log(
          `Rate limited. Retrying in ${delay / 1000}s (attempt ${attempt + 1}/${maxRetries})`
        );
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }
      throw error;
    }
  }
  throw new Error("Max retries exceeded");
}

export async function generateDressDesign(
  sareeImageBase64: string,
  styleKey: StyleKey
) {
  return retryWithBackoff(async () => {
    const model = genAI.getGenerativeModel({
      model: MODEL_NAME,
    });

    const prompt = `You are a world-class fashion designer. Transform this vintage Indian saree fabric into a ${STYLE_PROMPTS[styleKey]} design.

Requirements:
- Photorealistic fashion photography style
- Elegant woman wearing the dress
- Studio lighting, high-end fashion editorial
- Preserve the original fabric's patterns, colors, textures and embroidery details
- The garment must clearly use the saree's fabric and design elements

Generate an image of this design.`;

    const result = await model.generateContent({
      contents: [
        {
          role: "user",
          parts: [
            { text: prompt },
            { inlineData: { mimeType: "image/jpeg", data: sareeImageBase64 } },
          ],
        },
      ],
      generationConfig: {
        responseModalities: ["Text", "Image"],
      } as Record<string, unknown>,
    });

    return result.response;
  });
}

export async function generateMultipleDesigns(
  sareeImageBase64: string,
  styles: StyleKey[] = ["gown", "cocktail", "fusion", "lehenga"]
) {
  const results: {
    style: string;
    success: boolean;
    data: Awaited<ReturnType<typeof generateDressDesign>> | null;
    error: unknown;
  }[] = [];

  for (const style of styles) {
    try {
      const data = await generateDressDesign(sareeImageBase64, style);
      results.push({ style, success: true, data, error: null });
    } catch (error) {
      results.push({ style, success: false, data: null, error });
    }
  }

  return results;
}
