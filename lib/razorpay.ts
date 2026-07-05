export const CREDIT_PLANS = [
  { id: "credits_5", credits: 5, amount: 1999, label: "5 Credits", price: "₹19.99", badge: "" },
  { id: "credits_15", credits: 15, amount: 4999, label: "15 Credits", price: "₹49.99", badge: "Popular" },
  { id: "credits_30", credits: 30, amount: 9999, label: "30 Credits", price: "₹99.99", badge: "Best Value" },
] as const;

export type CreditPlanId = (typeof CREDIT_PLANS)[number]["id"];
