import { getRTDB } from "./firebase";
import { ref, get, set, runTransaction } from "firebase/database";
import { AI_MODELS, type ModelKey } from "./ai";

export function getCreditsForModel(model: ModelKey): number {
  return AI_MODELS[model]?.credits ?? 1;
}

export async function getUserCredits(uid: string): Promise<number> {
  try {
    const db = getRTDB();
    const snapshot = await get(ref(db, `users/${uid}/credits`));
    return snapshot.exists() ? snapshot.val() : 0;
  } catch (e) {
    console.error("RTDB read error", e);
    return 0;
  }
}

export async function deductCredit(uid: string, style: string, model: ModelKey = "standard"): Promise<{ success: boolean; remaining: number }> {
  const db = getRTDB();
  const creditsRef = ref(db, `users/${uid}/credits`);
  const creditsNeeded = getCreditsForModel(model);

  const result = await runTransaction(creditsRef, (currentCredits) => {
    const current = currentCredits || 0;
    if (current < creditsNeeded) {
      return current;
    }
    return current - creditsNeeded;
  });

  if (!result.committed) {
    return { success: false, remaining: result.snapshot.val() || 0 };
  }

  const remaining = result.snapshot.val() || 0;

  try {
    const txRef = ref(db, `users/${uid}/transactions`);
    const txSnapshot = await get(txRef);
    const txList = txSnapshot.exists() ? txSnapshot.val() : [];
    const newTx = { type: "usage", credits: -creditsNeeded, style, model, createdAt: new Date().toISOString() };
    const updatedTx = [newTx, ...txList].slice(0, 50);
    await set(txRef, updatedTx);
  } catch (e) {
    console.error("Failed to log transaction", e);
  }

  return { success: true, remaining };
}

export async function addCredits(uid: string, credits: number, orderId: string, amount: number): Promise<void> {
  const db = getRTDB();
  const creditsRef = ref(db, `users/${uid}/credits`);

  await runTransaction(creditsRef, (currentCredits) => {
    return (currentCredits || 0) + credits;
  });

  try {
    const txRef = ref(db, `users/${uid}/transactions`);
    const txSnapshot = await get(txRef);
    const txList = txSnapshot.exists() ? txSnapshot.val() : [];
    const newTx = { type: "purchase", credits, orderId, amount, createdAt: new Date().toISOString() };
    const updatedTx = [newTx, ...txList].slice(0, 50);
    await set(txRef, updatedTx);
  } catch (e) {
    console.error("Failed to log transaction", e);
  }
}
