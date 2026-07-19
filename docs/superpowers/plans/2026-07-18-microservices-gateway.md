# Microservices Gateway Architecture Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restructure the NovaVstra backend into a microservices architecture with a gateway pattern for safer, more maintainable code.

**Architecture:** Each backend concern becomes an independent service module with clear boundaries. A gateway layer routes requests to the appropriate service. Services communicate through well-defined interfaces, making it easy to extract them into separate Cloudflare Workers later.

**Tech Stack:** Next.js 16 API Routes, Cloudflare Workers AI, Firebase RTDB, Razorpay, Cloudflare R2, jose (JWT)

## Global Constraints

- Next.js 16.2.10 on Cloudflare Workers
- Firebase Realtime Database for data storage
- Cloudflare AI (`@cf/leonardo/lucid-origin`) for image generation
- Razorpay for payments
- Cloudflare R2 for file storage
- Session-based auth with httpOnly cookies

---

## File Structure

```
services/
├── auth/
│   └── index.ts          # Auth service (Firebase token verify, JWT session)
├── credits/
│   └── index.ts          # Credits service (CRUD via RTDB)
├── generate/
│   └── index.ts          # Generate service (AI image generation)
├── payments/
│   └── index.ts          # Payments service (Razorpay, payment links)
├── inquiries/
│   └── index.ts          # Inquiries service (customer inquiries, R2)
├── feedback/
│   └── index.ts          # Feedback service (CRUD)
├── model/
│   └── index.ts          # Model service (R2 proxy)
└── gateway.ts            # Gateway router

lib/
├── auth-server.ts        # (modified) uses services/auth
├── credits.ts            # (modified) uses services/credits
├── ai.ts                 # (modified) uses services/generate
└── ...

app/api/
├── auth/session/route.ts    # (modified) thin wrapper → services/auth
├── generate/route.ts        # (modified) thin wrapper → services/generate
├── credits/route.ts         # (modified) thin wrapper → services/credits
├── checkout/route.ts        # (modified) thin wrapper → services/payments
├── verify-payment/route.ts  # (modified) thin wrapper → services/payments
├── webhooks/razorpay/route.ts # (modified) thin wrapper → services/payments
├── inquiries/route.ts       # (modified) thin wrapper → services/inquiries
├── feedback/route.ts        # (modified) thin wrapper → services/feedback
├── model/route.ts           # (modified) thin wrapper → services/model
└── ...
```

---

## Task 1: Create Auth Service

**Files:**
- Create: `services/auth/index.ts`
- Modify: `lib/auth-server.ts`

**Interfaces:**
- Consumes: `jose` library, environment variables (`SESSION_SECRET`, `FIREBASE_PROJECT_ID`)
- Produces: `createSessionToken(uid)`, `getServerUser()`, `verifyFirebaseToken(idToken)`

- [ ] **Step 1: Create services/auth/index.ts**

```typescript
import { SignJWT, jwtVerify, importX509, type JWTPayload } from "jose";

const FIREBASE_CERTS_URL = "https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com";

let cachedKeys: Map<string, { key: any; expiry: number }> | null = null;

function getSecret(): Uint8Array {
  const key = process.env.SESSION_SECRET || process.env.FIREBASE_PROJECT_ID || "novavastra-dev";
  return new TextEncoder().encode(key);
}

async function getSigningKey(kid: string) {
  const now = Date.now();
  if (cachedKeys && cachedKeys.has(kid)) {
    const entry = cachedKeys.get(kid)!;
    if (entry.expiry > now) return entry.key;
  }

  const res = await fetch(FIREBASE_CERTS_URL);
  if (!res.ok) throw new Error(`Failed to fetch Firebase certs: ${res.status}`);

  const certs: Record<string, string> = await res.json();
  cachedKeys = new Map();
  const expiry = now + 3500_000;

  for (const [kid2, pem] of Object.entries(certs)) {
    const key = await importX509(pem, "RS256");
    cachedKeys.set(kid2, { key, expiry });
  }

  const entry = cachedKeys.get(kid);
  if (!entry) throw new Error(`Unknown key ID: ${kid}`);
  return entry.key;
}

export interface FirebaseTokenPayload extends JWTPayload {
  sub: string;
  user_id?: string;
  email?: string;
  name?: string;
}

export async function verifyFirebaseToken(idToken: string): Promise<FirebaseTokenPayload> {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  if (!projectId) throw new Error("FIREBASE_PROJECT_ID not configured");

  const header = JSON.parse(Buffer.from(idToken.split(".")[0], "base64url").toString());
  const key = await getSigningKey(header.kid);

  const { payload } = await jwtVerify(idToken, key, {
    issuer: `https://securetoken.google.com/${projectId}`,
    audience: projectId,
  });

  return payload as FirebaseTokenPayload;
}

export async function createSessionToken(uid: string): Promise<string> {
  return new SignJWT({ uid })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("14d")
    .sign(getSecret());
}

export async function getServerUser(): Promise<{ uid: string } | null> {
  try {
    const { cookies } = await import("next/headers");
    const cookieStore = await cookies();
    const session = cookieStore.get("session")?.value;

    if (!session) return null;

    const { payload } = await jwtVerify(session, getSecret());
    if (typeof payload.uid !== "string") return null;

    return { uid: payload.uid };
  } catch {
    return null;
  }
}
```

- [ ] **Step 2: Update lib/auth-server.ts to re-export from service**

```typescript
export { createSessionToken, getServerUser } from "@/services/auth";
```

- [ ] **Step 3: Update lib/firebase-verify.ts to re-export from service**

```typescript
export { verifyFirebaseToken, type FirebaseTokenPayload } from "@/services/auth";
```

- [ ] **Step 4: Test auth still works**

Run: `npm run dev` and test login flow
Expected: Session cookie is set, `/api/credits` returns 200

---

## Task 2: Create Credits Service

**Files:**
- Create: `services/credits/index.ts`
- Modify: `lib/credits.ts`

**Interfaces:**
- Consumes: Firebase Realtime Database (client SDK)
- Produces: `getUserCredits(uid)`, `addCredits(uid, amount)`, `deductCredit(uid, style, model)`

- [ ] **Step 1: Create services/credits/index.ts**

```typescript
import { getDatabase, ref, get, set } from "firebase/database";
import { getRTDB } from "@/lib/firebase";

export async function getUserCredits(uid: string): Promise<number> {
  try {
    const db = getRTDB();
    const snapshot = await get(ref(db, `users/${uid}/credits`));
    return snapshot.val() || 0;
  } catch {
    return 0;
  }
}

export async function addCredits(uid: string, amount: number): Promise<number> {
  const db = getRTDB();
  const current = await getUserCredits(uid);
  const newTotal = current + amount;
  await set(ref(db, `users/${uid}/credits`), newTotal);
  return newTotal;
}

export async function deductCredit(
  uid: string,
  style: string,
  model: string
): Promise<{ success: boolean; remaining: number }> {
  const current = await getUserCredits(uid);
  if (current < 1) {
    return { success: false, remaining: current };
  }

  const db = getRTDB();
  const newTotal = current - 1;
  await set(ref(db, `users/${uid}/credits`), newTotal);

  // Log usage
  const usageRef = ref(db, `users/${uid}/usage`);
  const usageSnapshot = await get(usageRef);
  const usageCount = usageSnapshot.val() || 0;
  await set(ref(db, `users/${uid}/usage/${usageCount}`), {
    style,
    model,
    timestamp: Date.now(),
  });

  return { success: true, remaining: newTotal };
}
```

- [ ] **Step 2: Update lib/credits.ts to re-export from service**

```typescript
export { getUserCredits, addCredits, deductCredit } from "@/services/credits";
```

- [ ] **Step 3: Test credits work**

Run: `npm run dev` and test `/api/credits` endpoint
Expected: Returns credit balance

---

## Task 3: Create Generate Service

**Files:**
- Create: `services/generate/index.ts`
- Modify: `lib/ai.ts`

**Interfaces:**
- Consumes: Cloudflare AI API
- Produces: `generateDressDesign(sareeImageBase64, styleKey, customPrompt?)`

- [ ] **Step 1: Create services/generate/index.ts**

```typescript
export const STYLE_PROMPTS = {
  gown: "An elegant floor-length evening gown with flowing skirt, Indian textile patterns, rich colors",
  lehenga: "A modern lehenga choli with embroidered blouse and voluminous flared skirt, traditional Indian patterns",
  cocktail: "A chic cocktail dress, fitted bodice, knee-length, modern Indian fabric patterns",
  fusion: "A saree-dress fusion garment combining traditional Indian draping with modern Western tailoring",
  jumpsuit: "A wide-leg silk jumpsuit with cinched waist, deep V-neckline, Indian fabric patterns",
} as const;

export type StyleKey = keyof typeof STYLE_PROMPTS;

export const AI_MODELS = {
  tryon: {
    id: "@cf/leonardo/lucid-origin",
    name: "Lucid Origin Generator",
    description: "AI-powered dress design generation using Leonardo Lucid Origin",
    credits: 1,
  },
} as const;

export type ModelKey = keyof typeof AI_MODELS;

export async function generateDressDesign(
  sareeImageBase64: string,
  styleKey: StyleKey | "custom",
  customPrompt?: string
) {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const apiToken = process.env.CLOUDFLARE_API_TOKEN;

  if (!accountId || !apiToken) {
    throw new Error("Cloudflare AI credentials not configured.");
  }

  let styleDescription: string;
  if (styleKey === "custom" && customPrompt) {
    styleDescription = customPrompt;
  } else {
    styleDescription = STYLE_PROMPTS[styleKey as StyleKey] || "a beautiful Indian dress";
  }

  const prompt = `Generate a fashion design photo of ${styleDescription}. The dress should be made from Indian saree fabric with intricate patterns and vibrant colors. Professional fashion photography, studio lighting, white background, high quality, detailed textile patterns.`;

  console.log("Generating dress design with Lucid Origin model");

  const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/@cf/leonardo/lucid-origin`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      prompt: prompt,
      num_steps: 4,
      guidance: 3.5,
      width: 1024,
      height: 1024,
    }),
  });

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
```

- [ ] **Step 2: Update lib/ai.ts to re-export from service**

```typescript
export { STYLE_PROMPTS, AI_MODELS, generateDressDesign, type StyleKey, type ModelKey } from "@/services/generate";
```

- [ ] **Step 3: Test image generation works**

Run: `npm run dev` and test generate endpoint
Expected: Returns generated image

---

## Task 4: Create Payments Service

**Files:**
- Create: `services/payments/index.ts`
- Modify: `lib/razorpay.ts`

**Interfaces:**
- Consumes: Razorpay API, Firebase RTDB
- Produces: `createOrder(uid, planId)`, `verifyPayment(orderId, paymentId, signature)`, `createPaymentLink(inquiryId, amount, customer)`, `getPaymentByToken(token)`, `markPaymentPaid(token, paymentId, orderId)`

- [ ] **Step 1: Create services/payments/index.ts**

```typescript
import crypto from "crypto";

const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || "";
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || "";

export const CREDIT_PLANS = {
  starter: { id: "starter", credits: 5, price: 1999, label: "5 Credits", description: "Try a few designs" },
  popular: { id: "popular", credits: 15, price: 4999, label: "15 Credits", description: "Most popular choice" },
  premium: { id: "premium", credits: 30, price: 9999, label: "30 Credits", description: "Best value" },
} as const;

export type PlanId = keyof typeof CREDIT_PLANS;

export async function createOrder(uid: string, planId: PlanId) {
  const plan = CREDIT_PLANS[planId];
  if (!plan) throw new Error("Invalid plan");

  const response = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: {
      "Authorization": `Basic ${Buffer.from(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`).toString("base64")}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      amount: plan.price,
      currency: "INR",
      notes: { uid, credits: plan.credits.toString(), plan: planId },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Razorpay order creation failed: ${error}`);
  }

  return response.json();
}

export async function verifyPaymentSignature(orderId: string, paymentId: string, signature: string): Promise<boolean> {
  const expectedSignature = crypto
    .createHmac("sha256", RAZORPAY_KEY_SECRET)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");

  return expectedSignature === signature;
}

export async function getOrderDetails(orderId: string) {
  const response = await fetch(`https://api.razorpay.com/v1/orders/${orderId}`, {
    headers: {
      "Authorization": `Basic ${Buffer.from(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`).toString("base64")}`,
    },
  });

  if (!response.ok) throw new Error("Failed to fetch order");
  return response.json();
}
```

- [ ] **Step 2: Update lib/razorpay.ts to re-export from service**

```typescript
export { CREDIT_PLANS, createOrder, verifyPaymentSignature, getOrderDetails, type PlanId } from "@/services/payments";
```

- [ ] **Step 3: Test checkout flow**

Run: `npm run dev` and test checkout endpoint
Expected: Creates Razorpay order

---

## Task 5: Create Inquiries Service

**Files:**
- Create: `services/inquiries/index.ts`

**Interfaces:**
- Consumes: Cloudflare R2 (S3), Firebase RTDB (REST)
- Produces: `submitInquiry(data)`, `getInquiry(id)`

- [ ] **Step 1: Create services/inquiries/index.ts**

```typescript
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { r2Client } from "@/lib/r2-client";
import { nanoid } from "nanoid";

const RTDB_URL = process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL;

export async function submitInquiry(data: {
  name: string;
  phone: string;
  whatsapp?: string;
  notes?: string;
  style: string;
  measurements: Array<{ param: string; value: string }>;
  sareeImage: string;
  generatedDesign?: any;
}) {
  // Upload saree image to R2
  const imageKey = `inquiries/saree_${nanoid()}.jpg`;
  const imageBuffer = Buffer.from(data.sareeImage.split(",")[1], "base64");

  await r2Client.send(new PutObjectCommand({
    Bucket: "nova-vovastra",
    Key: imageKey,
    Body: imageBuffer,
    ContentType: "image/jpeg",
  }));

  // Store inquiry in RTDB
  const inquiryId = nanoid();
  const inquiry = {
    id: inquiryId,
    name: data.name,
    phone: data.phone,
    whatsapp: data.whatsapp || data.phone,
    notes: data.notes || "",
    style: data.style,
    measurements: data.measurements,
    sareeImageKey: imageKey,
    generatedDesign: data.generatedDesign || null,
    status: "new",
    createdAt: Date.now(),
  };

  const response = await fetch(`${RTDB_URL}/inquiries/${inquiryId}.json`, {
    method: "PUT",
    body: JSON.stringify(inquiry),
  });

  if (!response.ok) {
    throw new Error("Failed to save inquiry");
  }

  return { id: inquiryId, ...inquiry };
}
```

- [ ] **Step 2: Update API route to use service**

Update `app/api/inquiries/route.ts` to import and use `submitInquiry` from the service.

---

## Task 6: Create Feedback Service

**Files:**
- Create: `services/feedback/index.ts`

**Interfaces:**
- Consumes: Firebase RTDB (REST)
- Produces: `getFeedback()`, `submitFeedback(data)`

- [ ] **Step 1: Create services/feedback/index.ts**

```typescript
import { nanoid } from "nanoid";

const RTDB_URL = process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL;

export interface Feedback {
  id: string;
  name: string;
  quote: string;
  rating: number;
  createdAt: number;
}

export async function getFeedback(): Promise<Feedback[]> {
  const response = await fetch(`${RTDB_URL}/feedback.json?orderBy="createdAt"&limitToLast=20`);
  if (!response.ok) return [];

  const data = await response.json();
  if (!data) return [];

  return Object.values(data)
    .map((item: any) => ({ ...item }))
    .sort((a: Feedback, b: Feedback) => b.createdAt - a.createdAt);
}

export async function submitFeedback(data: {
  name: string;
  quote: string;
  rating: number;
}): Promise<Feedback> {
  const id = nanoid();
  const feedback: Feedback = {
    id,
    name: data.name,
    quote: data.quote,
    rating: Math.min(5, Math.max(1, data.rating)),
    createdAt: Date.now(),
  };

  const response = await fetch(`${RTDB_URL}/feedback/${id}.json`, {
    method: "PUT",
    body: JSON.stringify(feedback),
  });

  if (!response.ok) {
    throw new Error("Failed to submit feedback");
  }

  return feedback;
}
```

- [ ] **Step 2: Update API routes to use service**

Update `app/api/feedback/route.ts` to import and use `getFeedback` and `submitFeedback` from the service.

---

## Task 7: Create Model Proxy Service

**Files:**
- Create: `services/model/index.ts`

**Interfaces:**
- Consumes: Cloudflare R2 (public bucket)
- Produces: `proxyModel(path)`

- [ ] **Step 1: Create services/model/index.ts**

```typescript
const R2_BASE = "https://pub-69d925864d0b4a39a1223b2185f89e5c.r2.dev";

const CONTENT_TYPES: Record<string, string> = {
  fbx: "application/octet-stream",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  glb: "model/gltf-binary",
};

export async function proxyModel(path: string): Promise<Response> {
  const r2Path = path.replace(/\\/g, "%5C");
  const res = await fetch(`${R2_BASE}/${r2Path}`);

  if (!res.ok) {
    return new Response(JSON.stringify({ error: "Not found", path }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  const body = await res.arrayBuffer();
  const ext = path.split(".").pop()?.toLowerCase() || "bin";

  return new Response(body, {
    headers: {
      "Content-Type": CONTENT_TYPES[ext] || "application/octet-stream",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
```

- [ ] **Step 2: Update API route to use service**

Update `app/api/model/route.ts` to import and use `proxyModel` from the service.

---

## Task 8: Create Gateway Router

**Files:**
- Create: `services/gateway.ts`

**Interfaces:**
- Consumes: All services
- Produces: `routeRequest(path, method, body)`

- [ ] **Step 1: Create services/gateway.ts**

```typescript
import { createSessionToken, getServerUser, verifyFirebaseToken } from "./auth";
import { getUserCredits, addCredits, deductCredit } from "./credits";
import { generateDressDesign, type StyleKey } from "./generate";
import { createOrder, verifyPaymentSignature, getOrderDetails, type PlanId } from "./payments";

export interface GatewayResponse {
  status: number;
  data: any;
}

export const gateway = {
  auth: {
    createSession: async (idToken: string): Promise<GatewayResponse> => {
      try {
        const decoded = await verifyFirebaseToken(idToken);
        const uid = decoded.sub || decoded.user_id || "";
        if (!uid) return { status: 401, data: { error: "No uid in token" } };

        const sessionToken = await createSessionToken(uid);
        return { status: 200, data: { sessionToken, uid } };
      } catch (error) {
        return { status: 401, data: { error: "Invalid token" } };
      }
    },

    getUser: async () => {
      return getServerUser();
    },
  },

  credits: {
    get: async (uid: string): Promise<GatewayResponse> => {
      const credits = await getUserCredits(uid);
      return { status: 200, data: { credits } };
    },

    add: async (uid: string, amount: number): Promise<GatewayResponse> => {
      const remaining = await addCredits(uid, amount);
      return { status: 200, data: { success: true, uid, credits: remaining } };
    },

    deduct: async (uid: string, style: string, model: string): Promise<GatewayResponse> => {
      const result = await deductCredit(uid, style, model);
      if (!result.success) {
        return { status: 402, data: { error: "Insufficient credits", remaining: result.remaining, creditsNeeded: 1 } };
      }
      return { status: 200, data: result };
    },
  },

  generate: {
    design: async (sareeImageBase64: string, style: StyleKey | "custom", customPrompt?: string): Promise<GatewayResponse> => {
      try {
        const result = await generateDressDesign(sareeImageBase64, style, customPrompt);
        return { status: 200, data: { images: [{ mimeType: result.mimeType, data: result.imageBase64 }] } };
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to generate";
        return { status: 500, data: { error: message } };
      }
    },
  },

  payments: {
    createOrder: async (uid: string, planId: PlanId): Promise<GatewayResponse> => {
      try {
        const order = await createOrder(uid, planId);
        return { status: 200, data: order };
      } catch (error) {
        return { status: 500, data: { error: "Failed to create order" } };
      }
    },

    verify: async (orderId: string, paymentId: string, signature: string): Promise<GatewayResponse> => {
      const isValid = await verifyPaymentSignature(orderId, paymentId, signature);
      return { status: 200, data: { valid: isValid } };
    },
  },
};
```

- [ ] **Step 2: Test gateway works**

Run: `npm run dev` and test auth flow through gateway
Expected: Session creation works, credits work

---

## Task 9: Update API Routes to Use Gateway

**Files:**
- Modify: `app/api/auth/session/route.ts`
- Modify: `app/api/generate/route.ts`
- Modify: `app/api/credits/route.ts`
- Modify: `app/api/checkout/route.ts`
- Modify: `app/api/verify-payment/route.ts`

- [ ] **Step 1: Update app/api/auth/session/route.ts**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { gateway } from "@/services/gateway";

export async function POST(request: NextRequest) {
  const { idToken } = await request.json();
  const result = await gateway.auth.createSession(idToken);

  if (result.status !== 200) {
    return NextResponse.json(result.data, { status: result.status });
  }

  const expiresIn = 60 * 60 * 24 * 14;
  const cookieStore = await cookies();
  cookieStore.set("session", result.data.sessionToken, {
    maxAge: expiresIn,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    sameSite: "lax",
  });

  return NextResponse.json({ status: "success" });
}

export async function DELETE() {
  const cookieStore = await cookies();
  cookieStore.delete("session");
  return NextResponse.json({ status: "success" });
}
```

- [ ] **Step 2: Update app/api/generate/route.ts**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { gateway } from "@/services/gateway";

const VALID_STYLES = ["gown", "lehenga", "cocktail", "fusion", "jumpsuit"];

export async function POST(request: NextRequest) {
  try {
    const user = await gateway.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { sareeImageBase64, style, customPrompt } = await request.json();

    if (!sareeImageBase64) {
      return NextResponse.json({ error: "Missing sareeImageBase64" }, { status: 400 });
    }

    if (!style) {
      return NextResponse.json({ error: "Missing style" }, { status: 400 });
    }

    const isCustom = style === "custom";
    const isPredefined = VALID_STYLES.includes(style);

    if (!isCustom && !isPredefined) {
      return NextResponse.json(
        { error: `Invalid style. Allowed: ${VALID_STYLES.join(", ")}, or custom` },
        { status: 400 }
      );
    }

    if (isCustom && !customPrompt) {
      return NextResponse.json({ error: "Missing customPrompt for custom style" }, { status: 400 });
    }

    const deduction = await gateway.credits.deduct(user.uid, style, "tryon");
    if (deduction.status !== 200) {
      return NextResponse.json(deduction.data, { status: deduction.status });
    }

    const result = await gateway.generate.design(
      sareeImageBase64,
      isCustom ? "custom" : style,
      customPrompt
    );

    return NextResponse.json({
      ...result.data,
      remaining: deduction.data.remaining,
    });
  } catch (error) {
    console.error("Generation error:", error);
    const message = error instanceof Error ? error.message : "Failed to generate design";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
```

- [ ] **Step 3: Update app/api/credits/route.ts**

```typescript
import { NextResponse } from "next/server";
import { gateway } from "@/services/gateway";

export async function GET() {
  const user = await gateway.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await gateway.credits.get(user.uid);
  return NextResponse.json(result.data);
}
```

- [ ] **Step 4: Test all routes work**

Run: `npm run dev` and test auth, credits, generate flows
Expected: All endpoints work correctly

---

## Task 10: Remove Old lib Files

**Files:**
- Modify: `lib/auth-server.ts` (simplified re-export)
- Modify: `lib/firebase-verify.ts` (simplified re-export)
- Modify: `lib/credits.ts` (simplified re-export)
- Modify: `lib/ai.ts` (simplified re-export)
- Modify: `lib/razorpay.ts` (simplified re-export)

- [ ] **Step 1: Update all lib files to re-export from services**

Each lib file becomes a simple re-export:
```typescript
export * from "@/services/[service-name]";
```

- [ ] **Step 2: Verify no circular dependencies**

Run: `npm run build` and check for errors
Expected: No circular dependency warnings

---

## Task 11: Add Gateway Health Check

**Files:**
- Create: `app/api/health/route.ts`

**Interfaces:**
- Consumes: Gateway
- Produces: Health status response

- [ ] **Step 1: Create health check endpoint**

```typescript
import { NextResponse } from "next/server";
import { gateway } from "@/services/gateway";

export async function GET() {
  try {
    // Test auth service
    const user = await gateway.auth.getUser();

    return NextResponse.json({
      status: "healthy",
      services: {
        auth: "operational",
        credits: "operational",
        generate: "operational",
        payments: "operational",
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: "unhealthy",
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    );
  }
}
```

- [ ] **Step 2: Test health check**

Run: `curl http://localhost:3000/api/health`
Expected: Returns healthy status

---

## Task 12: Update Environment Variables Documentation

**Files:**
- Create: `docs/environment-variables.md`

- [ ] **Step 1: Document all required environment variables**

```markdown
# Environment Variables

## Required

| Variable | Description | Example |
|----------|-------------|---------|
| `FIREBASE_PROJECT_ID` | Firebase project ID | `nova-vastara-ee441` |
| `FIREBASE_CLIENT_EMAIL` | Firebase service account email | `firebase-adminsdk-...@...iam.gserviceaccount.com` |
| `FIREBASE_PRIVATE_KEY` | Firebase service account private key | `-----BEGIN PRIVATE KEY-----\n...` |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Firebase web API key | `AIzaSy...` |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Firebase auth domain | `nova-vastara-ee441.firebaseapp.com` |
| `NEXT_PUBLIC_FIREBASE_DATABASE_URL` | Firebase RTDB URL | `https://nova-vastara-ee441-default-rtdb.firebaseio.com` |
| `SESSION_SECRET` | JWT signing secret | `your-secret-key` |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare account ID | `18367979bb284cad02e2a6490160a4ba` |
| `CLOUDFLARE_API_TOKEN` | Cloudflare API token | `cfut_...` |
| `RAZORPAY_KEY_ID` | Razorpay key ID | `rzp_test_...` |
| `RAZORPAY_KEY_SECRET` | Razorpay key secret | `...` |

## Optional

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment mode | `development` |
```

- [ ] **Step 2: Commit all changes**

```bash
git add .
git commit -m "feat: implement microservices gateway architecture

- Create services/auth for Firebase token verification and JWT session
- Create services/credits for credits CRUD
- Create services/generate for AI image generation
- Create services/payments for Razorpay integration
- Create services/inquiries for customer inquiries
- Create services/feedback for feedback CRUD
- Create services/model for R2 proxy
- Create services/gateway for request routing
- Update API routes to use gateway
- Add health check endpoint
- Document environment variables"
```
