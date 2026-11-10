import { asArray, asInteger, asRecord, asString, type ApiEnvelope } from "../../platform/api";
import type { PlatformRuntime } from "../../platform/types";

export type AppNotification = {
  id: number;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
};

function parseNotification(value: unknown): AppNotification {
  const data = asRecord(value) ?? {};
  return {
    id: asInteger(data.id),
    title: asString(data.title, "اعلان"),
    body: asString(data.body),
    read: data.read === true,
    createdAt: asString(data.created_at),
  };
}

export async function getNotifications(runtime: PlatformRuntime): Promise<AppNotification[]> {
  const response = await runtime.request<ApiEnvelope>("/notifications?limit=30");
  const rows = asArray(response.data);
  return rows.map(parseNotification).filter((notification) => notification.id > 0);
}

export async function markNotificationRead(runtime: PlatformRuntime, notificationId: number): Promise<void> {
  await runtime.request<ApiEnvelope>(`/notifications/${notificationId}/read`, {
    method: "POST",
  });
}
