interface KVNamespace {
  get(key: string): Promise<string | null>;
  put(key: string, value: string): Promise<void>;
}

function getKV(): KVNamespace {
  const kv = (process.env as any).CREDITS_KV;
  if (!kv) {
    console.warn("CREDITS_KV binding not found, falling back to in-memory store for dev");
    // Simple in-memory fallback for local dev if needed
    return global._devKV || (global._devKV = {
      store: new Map<string, string>(),
      async get(key: string) { return this.store.get(key) || null; },
      async put(key: string, value: string) { this.store.set(key, value); }
    });
  }
  return kv as KVNamespace;
}

declare global {
  var _devKV: any;
}

const CREDITS_PER_GENERATION = 1;

export async function getUserCredits(uid: string): Promise<number> {
  try {
    const kv = getKV();
    const data = await kv.get(`credits:${uid}`);
    return data ? parseInt(data, 10) : 0;
  } catch (e) {
    console.error("KV error", e);
    return 0;
  }
}

export async function deductCredit(uid: string, style: string): Promise<{ success: boolean; remaining: number }> {
  const kv = getKV();
  const current = await getUserCredits(uid);

  if (current < CREDITS_PER_GENERATION) {
    return { success: false, remaining: current };
  }

  const remaining = current - CREDITS_PER_GENERATION;
  await kv.put(`credits:${uid}`, remaining.toString());

  try {
    const txListStr = await kv.get(`tx:${uid}`) || "[]";
    const txList = JSON.parse(txListStr);
    txList.unshift({ type: "usage", credits: -CREDITS_PER_GENERATION, style, createdAt: new Date().toISOString() });
    await kv.put(`tx:${uid}`, JSON.stringify(txList.slice(0, 50))); // Keep last 50
  } catch (e) {
    console.error("Failed to log transaction", e);
  }

  return { success: true, remaining };
}

export async function addCredits(uid: string, credits: number, orderId: string, amount: number): Promise<void> {
  const kv = getKV();
  const current = await getUserCredits(uid);

  await kv.put(`credits:${uid}`, (current + credits).toString());

  try {
    const txListStr = await kv.get(`tx:${uid}`) || "[]";
    const txList = JSON.parse(txListStr);
    txList.unshift({ type: "purchase", credits, orderId, amount, createdAt: new Date().toISOString() });
    await kv.put(`tx:${uid}`, JSON.stringify(txList.slice(0, 50)));
  } catch (e) {
    console.error("Failed to log transaction", e);
  }
}
