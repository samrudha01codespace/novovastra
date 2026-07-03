import { getAdminDb } from "@/lib/firebase-admin";

const CREDITS_PER_GENERATION = 1;

export async function getUserCredits(uid: string): Promise<number> {
  const db = getAdminDb();
  const doc = await db.collection("users").doc(uid).get();
  return doc.exists ? (doc.data()?.credits ?? 0) : 0;
}

export async function deductCredit(uid: string, style: string): Promise<{ success: boolean; remaining: number }> {
  const db = getAdminDb();
  const userRef = db.collection("users").doc(uid);

  const result = await db.runTransaction(async (tx) => {
    const doc = await tx.get(userRef);
    const current = doc.exists ? (doc.data()?.credits ?? 0) : 0;

    if (current < CREDITS_PER_GENERATION) {
      return { success: false, remaining: current };
    }

    tx.set(userRef, { credits: current - CREDITS_PER_GENERATION, updatedAt: new Date() }, { merge: true });

    tx.set(userRef.collection("transactions").doc(), {
      type: "usage",
      credits: -CREDITS_PER_GENERATION,
      style,
      createdAt: new Date(),
    });

    return { success: true, remaining: current - CREDITS_PER_GENERATION };
  });

  return result;
}

export async function addCredits(uid: string, credits: number, orderId: string, amount: number): Promise<void> {
  const db = getAdminDb();
  const userRef = db.collection("users").doc(uid);

  await db.runTransaction(async (tx) => {
    const doc = await tx.get(userRef);
    const current = doc.exists ? (doc.data()?.credits ?? 0) : 0;

    tx.set(userRef, {
      credits: current + credits,
      totalPurchased: (doc.data()?.totalPurchased ?? 0) + credits,
      updatedAt: new Date(),
    }, { merge: true });

    tx.set(userRef.collection("transactions").doc(), {
      type: "purchase",
      credits,
      orderId,
      amount,
      createdAt: new Date(),
    });
  });
}
