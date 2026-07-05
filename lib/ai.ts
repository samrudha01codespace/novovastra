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

export const AI_MODELS = {
  flash: {
    id: "imagen-4.0-fast-generate-001",
    name: "Nano Banana Flash",
    description: "Lightning fast generations",
    credits: 1,
  },
  nano_banana: {
    id: "imagen-4.0-generate-001",
    name: "Nano Banana",
    description: "Balanced speed and quality",
    credits: 2,
  },
  nano_banana_pro: {
    id: "imagen-4.0-ultra-generate-001",
    name: "Nano Banana Pro",
    description: "Premium 4K ultra quality",
    credits: 4,
  },
} as const;

export type ModelKey = keyof typeof AI_MODELS;

async function getGoogleAuthToken() {
  // In a real app, you would use google-auth-library here:
  // const { GoogleAuth } = require('google-auth-library');
  // const auth = new GoogleAuth({ scopes: 'https://www.googleapis.com/auth/cloud-platform' });
  // const client = await auth.getClient();
  // const token = await client.getAccessToken();
  // return token.token;
  return process.env.GOOGLE_CLOUD_ACCESS_TOKEN || "mock-token";
}

export async function generateDressDesign(
  sareeImageBase64: string,
  styleKey: StyleKey,
  modelKey: ModelKey = "nano_banana"
) {
  const modelConfig = AI_MODELS[modelKey];
  const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID;
  const location = process.env.GOOGLE_CLOUD_LOCATION || "us-central1";

  const prompt = `A photorealistic fashion editorial of a beautiful woman wearing a ${STYLE_PROMPTS[styleKey]}. The dress is made from a traditional vintage Indian saree fabric. High quality, 4k, studio lighting, highly detailed.`;

  const url = `https://${location}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${location}/publishers/google/models/${modelConfig.id}:predict`;
  const token = await getGoogleAuthToken();

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      instances: [
        {
          prompt: prompt,
          // Note: If you want to do image-to-image translation to preserve the EXACT saree,
          // you would include the base image here depending on Imagen's edit/control capabilities.
          // For Imagen text-to-image generation:
        }
      ],
      parameters: {
        sampleCount: 1,
        aspectRatio: "3:4"
      }
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Vertex AI Error:", errorText);
    throw new Error(`Failed to generate image: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  
  // Imagen returns predictions[].bytesBase64Encoded
  const base64Image = data.predictions?.[0]?.bytesBase64Encoded;

  if (!base64Image) {
    throw new Error("No image returned from Imagen API");
  }

  // Format the response to match what the API route expects (mimicking the previous Gemini structure)
  return {
    candidates: [
      {
        content: {
          parts: [
            {
              inlineData: {
                mimeType: "image/png",
                data: base64Image
              }
            }
          ]
        }
      }
    ]
  };
}

export async function generateMultipleDesigns(
  sareeImageBase64: string,
  styles: StyleKey[] = ["gown", "cocktail", "fusion", "lehenga"],
  modelKey: ModelKey = "nano_banana"
) {
  const results: {
    style: string;
    success: boolean;
    data: Awaited<ReturnType<typeof generateDressDesign>> | null;
    error: unknown;
  }[] = [];

  for (const style of styles) {
    try {
      const data = await generateDressDesign(sareeImageBase64, style, modelKey);
      results.push({ style, success: true, data, error: null });
    } catch (error) {
      results.push({ style, success: false, data: null, error });
    }
  }

  return results;
}
