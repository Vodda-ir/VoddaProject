export type WalletTransaction = {
  id: number;
  type: string;
  title: string;
  amount: number;
  createdAt: string;
};

export function parseWalletTransaction(input: unknown): WalletTransaction | null {
  if (!input || typeof input !== "object") return null;
  const value = input as Record<string, unknown>;
  const id = Number(value.id ?? 0);
  const amount = Number(value.amount ?? 0);
  if (!Number.isFinite(id) || id <= 0 || !Number.isFinite(amount)) return null;
  return {
    id,
    type: String(value.type ?? ""),
    title: String(value.title ?? ""),
    amount,
    createdAt: String(value.created_at ?? ""),
  };
}
