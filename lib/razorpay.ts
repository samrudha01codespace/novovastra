export const CREDIT_PLANS = [
  { id: "credits_1", credits: 1, amount: 499, label: "1 Credit", price: "₹4.99", badge: "" },
  { id: "credits_5", credits: 5, amount: 1999, label: "5 Credits", price: "₹19.99", badge: "Popular" },
  { id: "credits_15", credits: 15, amount: 4999, label: "15 Credits", price: "₹49.99", badge: "Best Value" },
] as const;

export type CreditPlanId = (typeof CREDIT_PLANS)[number]["id"];
