import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load .env.local manually
const envPath = resolve(__dirname, "../.env.local");
const envFile = readFileSync(envPath, "utf-8");
envFile.split("\n").forEach((line) => {
  const [key, ...rest] = line.split("=");
  if (key && rest.length) {
    const value = rest.join("=").trim();
    if (!process.env[key.trim()]) {
      process.env[key.trim()] = value.replace(/^["']|["']$/g, "");
    }
  }
});

import { getRTDB } from "@/lib/firebase";
import { ref, push, set } from "firebase/database";

async function seed() {
  const db = getRTDB();

  // 1. Create test inquiry
  const inquiriesRef = ref(db, "inquiries");
  const inquiryRef = push(inquiriesRef);
  const inquiryId = inquiryRef.key!;

  await set(inquiryRef, {
    id: inquiryId,
    name: "Test Customer",
    phone: "+919876543210",
    whatsapp: "+919876543210",
    notes: "Test inquiry for development",
    style: "gown",
    measurements: [
      { param: "Chest", value: "34 inches" },
      { param: "Waist", value: "28 inches" },
      { param: "Length", value: "55 inches" },
    ],
    sareeImageUrl: "/designs/gown.jpg",
    designImageUrl: "/designs/gown.jpg",
    status: "new",
    createdAt: new Date().toISOString(),
  });

  console.log(`Created inquiry: ${inquiryId}`);

  // 2. Create test payment token
  const token = "test_payment_token_abc123";
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  const paymentRef = ref(db, `payments/${token}`);
  await set(paymentRef, {
    token,
    inquiryId,
    amount: 50000, // ₹500 in paise
    status: "pending",
    customerName: "Test Customer",
    customerPhone: "+919876543210",
    style: "gown",
    sareeImageUrl: "/designs/gown.jpg",
    designImageUrl: "/designs/gown.jpg",
    createdAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
  });

  console.log(`Created payment token: ${token}`);
  console.log(`Payment URL: http://localhost:3000/payment?token=${token}`);
  console.log(`Amount: ₹500`);
  console.log(`Expires: ${expiresAt.toLocaleString()}`);

  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
