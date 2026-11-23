import { asNumber, asRecord, asString } from "../../platform/api";

export type WalletTransaction = {
  id: number;
  type: string;
  title: string;
  amount: number;
  createdAt: string;
};

export function parseWalletTransaction(input: unknown): WalletTransaction | null {
  const value = asRecord(input);
  if (!value) return null;

  const id = asNumber(value.id);
  const amount = asNumber(value.amount);
  if (id <= 0 || !Number.isFinite(amount)) return null;

  return {
    id,
    type: asString(value.type),
    title: asString(value.title),
    amount,
    createdAt: asString(value.created_at),
  };
}
