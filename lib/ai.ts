export const STYLE_PROMPTS = {
  gown: "An elegant floor-length evening gown with flowing skirt, Indian textile patterns, rich colors",
  lehenga: "A modern lehenga choli with embroidered blouse and voluminous flared skirt, traditional Indian patterns",
  cocktail: "A chic cocktail dress, fitted bodice, knee-length, modern Indian fabric patterns",
  fusion: "A saree-dress fusion garment combining traditional Indian draping with modern Western tailoring",
  jumpsuit: "A wide-leg silk jumpsuit with cinched waist, deep V-neckline, Indian fabric patterns",
} as const;

export type StyleKey = keyof typeof STYLE_PROMPTS;

export const AI_MODELS = {
  standard: {
    id: "@cf/black-forest-labs/flux-1-schnell",
    name: "Standard",
    description: "Fast generation, good quality",
    credits: 1,
  },
  premium: {
    id: "@cf/leonardo/lucid-origin",
    name: "Premium",
    description: "Best quality, detailed output",
    credits: 3,
  },
} as const;

export type ModelKey = keyof typeof AI_MODELS;

export async function generateDressDesign(
  sareeImageBase64: string,
  styleKey: StyleKey | "custom",
  customPrompt?: string,
  modelKey: ModelKey = "standard"
) {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const apiToken = process.env.CLOUDFLARE_API_TOKEN;

  if (!accountId || !apiToken) {
    throw new Error("Cloudflare AI credentials not configured.");
  }

  const model = AI_MODELS[modelKey];

  let styleDescription: string;

  if (styleKey === "custom" && customPrompt) {
    styleDescription = customPrompt;
  } else {
    styleDescription = STYLE_PROMPTS[styleKey as StyleKey] || "a beautiful Indian dress";
  }

  const prompt = `Generate a fashion design photo of ${styleDescription}. The dress should be made from Indian saree fabric with intricate patterns and vibrant colors. Professional fashion photography, studio lighting, white background, high quality, detailed textile patterns.`;

  console.log(`Generating dress design with ${model.name} model`);

  const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${model.id}`;

  // Retry logic for rate limits
  for (let attempt = 1; attempt <= 3; attempt++) {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prompt: prompt,
        num_steps: modelKey === "premium" ? 20 : 4,
        guidance: 3.5,
        width: 1024,
        height: 1024,
      }),
    });

    if (response.status === 429) {
      const waitTime = attempt * 10000;
      console.log(`Rate limited, waiting ${waitTime / 1000}s (attempt ${attempt}/3)`);
      await new Promise((r) => setTimeout(r, waitTime));
      continue;
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Cloudflare AI Error:", errorText);
      throw new Error(`Failed to generate design: ${response.status}`);
    }

    const data = await response.json();

    if (data.errors?.length) {
      throw new Error(data.errors[0].message || "Cloudflare AI error");
    }

    const result = data.result;

    if (result?.image) {
      const imageData = result.image;

      if (imageData.startsWith("data:")) {
        const base64 = imageData.split(",")[1];
        const mimeType = imageData.split(";")[0].split(":")[1];
        return { imageBase64: base64, mimeType };
      }

      if (imageData.startsWith("/9j/") || imageData.startsWith("iVBOR") || imageData.startsWith("UklGR")) {
        let mimeType = "image/jpeg";
        if (imageData.startsWith("iVBOR")) mimeType = "image/png";
        if (imageData.startsWith("UklGR")) mimeType = "image/webp";
        return { imageBase64: imageData, mimeType };
      }

      const imgResponse = await fetch(imageData);
      if (!imgResponse.ok) {
        throw new Error("Failed to fetch generated image");
      }
      const buffer = await imgResponse.arrayBuffer();
      const base64 = Buffer.from(buffer).toString("base64");
      const contentType = imgResponse.headers.get("content-type") || "image/jpeg";
      return { imageBase64: base64, mimeType: contentType };
    }

    throw new Error("Unexpected response format from AI model");
  }

  throw new Error("Rate limit exceeded after retries. Please wait a minute and try again.");
}

export async function generateMultipleDesigns(
  sareeImageBase64: string,
  styles: StyleKey[] = ["gown", "cocktail", "fusion", "lehenga"]
) {
  const results: {
    style: string;
    success: boolean;
    imageBase64: string | null;
    mimeType: string | null;
    error: unknown;
  }[] = [];

  for (const style of styles) {
    try {
      const result = await generateDressDesign(sareeImageBase64, style);
      results.push({ style, success: true, imageBase64: result.imageBase64, mimeType: result.mimeType, error: null });
    } catch (error) {
      results.push({ style, success: false, imageBase64: null, mimeType: null, error });
    }
  }

  return results;
}
