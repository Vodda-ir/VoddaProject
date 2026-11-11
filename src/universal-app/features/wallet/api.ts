import type { ApiEnvelope } from "../../platform/api";
import type { AuthUser, PlatformRuntime } from "../../platform/types";
import { parseWalletTransaction, type WalletTransaction } from "./types";

export async function getWalletSnapshot(runtime: PlatformRuntime): Promise<{ user: AuthUser; transactions: WalletTransaction[] }> {
  const [meResponse, transactionsResponse] = await Promise.all([
    runtime.request<ApiEnvelope<AuthUser>>("/me"),
    runtime.request<ApiEnvelope<unknown[]>>("/wallet/transactions"),
  ]);

  if (!meResponse.data) throw new Error("اطلاعات کیف پول دریافت نشد.");

  const transactions = (transactionsResponse.data ?? [])
    .map(parseWalletTransaction)
    .filter((item): item is WalletTransaction => item !== null);

  return { user: meResponse.data, transactions };
}
