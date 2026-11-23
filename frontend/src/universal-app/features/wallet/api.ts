import type { ApiEnvelope } from "../../platform/api";
import type { AuthUser, PlatformRuntime } from "../../platform/types";
import { APP_LANDING_WALLET } from "../payments/landing";
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

export type WalletTopup = { token: string; res_num: string; amount: number };

/** Opens a Saman Sep order for the wallet charge; the client posts the token form to OnlinePG. */
export async function createWalletTopup(runtime: PlatformRuntime, amount: number): Promise<WalletTopup> {
  const response = await runtime.request<ApiEnvelope<{ token?: string; res_num?: string; amount?: number }>>(
    "/wallet/topup",
    {
      method: "POST",
      body: JSON.stringify({
        amount,
        // بعد از راند‌تریپ درگاه، کاربر به کیف پول اپ یونیورسال برمی‌گردد
        // (نه پنل قدیمی) — قرارداد در backend: sanitizeReturnPath.
        return_to: APP_LANDING_WALLET,
      }),
    },
  );
  if (!response.data?.token) throw new Error("توکن درگاه پرداخت دریافت نشد.");
  return {
    token: response.data.token,
    res_num: response.data.res_num ?? "",
    amount: response.data.amount ?? 0,
  };
}
