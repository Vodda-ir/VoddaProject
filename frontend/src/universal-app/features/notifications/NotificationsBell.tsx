"use client";

// زنگ اعلان‌ها + شیت فهرست — مشترک بین پنل قرآن‌آموز و پنل استاد.
// برای استاد، اعلان «فراخوان مراسم» با لمس به صفحهٔ پذیرش مراسم می‌رود.

import { useEffect, useState } from "react";
import type { UniversalAppConfig } from "../../config";
import { usePlatform } from "../../platform/context";
import { navigateApp } from "../../router";
import { toFaDigits } from "../../ui/persian";
import {
  Button,
  Icon,
  IconBadge,
  LoadingState,
  Sheet,
  colors,
  radii,
  spacing,
  typography,
} from "../../ui";
import { getNotifications, markNotificationRead, type AppNotification } from "./api";

export function NotificationsBell({ config }: { config: UniversalAppConfig }) {
  const runtime = usePlatform();
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<AppNotification[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [marking, setMarking] = useState(false);

  useEffect(() => {
    let active = true;
    getNotifications(runtime)
      .then((list) => {
        if (active) setUnread(list.filter((notification) => !notification.read).length);
      })
      .catch(() => {});
    const timer = window.setInterval(() => {
      getNotifications(runtime)
        .then((list) => {
          if (active) setUnread(list.filter((notification) => !notification.read).length);
        })
        .catch(() => {});
    }, 15000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [runtime]);

  const openSheet = async () => {
    setOpen(true);
    setLoading(true);
    try {
      const list = await getNotifications(runtime);
      setItems(list);
      setUnread(list.filter((notification) => !notification.read).length);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  const markAllRead = async () => {
    if (!items) return;
    setMarking(true);
    for (const notification of items.filter((item) => !item.read)) {
      try {
        await markNotificationRead(runtime, notification.id);
      } catch {
        // تلاش برای بقیه ادامه پیدا می‌کند
      }
    }
    setItems(items.map((item) => ({ ...item, read: true })));
    setUnread(0);
    setMarking(false);
  };

  /** لمس اعلان: خواندن + هدایت به مقصد مرتبط (فراخوان مراسم → پذیرش مراسم). */
  const openNotification = async (notification: AppNotification) => {
    if (!notification.read) {
      try {
        await markNotificationRead(runtime, notification.id);
      } catch {
        // خواندن ناموفق، هدایت همچنان انجام می‌شود
      }
      setItems((current) =>
        current ? current.map((item) => (item.id === notification.id ? { ...item, read: true } : item)) : current,
      );
      setUnread((value) => Math.max(0, value - 1));
    }
    if (notification.title.includes("فراخوان مراسم") || notification.title.includes("پذیرش")) {
      setOpen(false);
      navigateApp("/t/ceremony", config);
    }
  };

  return (
    <>
      <button
        type="button"
        aria-label={`اعلان‌ها${unread > 0 ? ` (${toFaDigits(unread)} خوانده‌نشده)` : ""}`}
        className="vodda-tappable"
        onClick={openSheet}
        style={{
          position: "relative",
          width: 46,
          height: 46,
          display: "grid",
          placeItems: "center",
          flex: "0 0 46px",
          padding: 0,
          border: `1px solid ${colors.olive100}`,
          borderRadius: 16,
          color: colors.olive700,
          background: colors.olive50,
          cursor: "pointer",
        }}
      >
        <Icon name="bell" size={20} />
        {unread > 0 ? (
          <span
            style={{
              position: "absolute",
              top: -5,
              insetInlineEnd: -5,
              minWidth: 18,
              height: 18,
              display: "grid",
              placeItems: "center",
              padding: "0 4px",
              borderRadius: 999,
              border: `2px solid ${colors.surface}`,
              background: colors.danger,
              color: colors.surface,
              fontSize: 11,
              fontWeight: 800,
              lineHeight: 1,
            }}
          >
            {unread > 9 ? "۹+" : toFaDigits(unread)}
          </span>
        ) : null}
      </button>
      <Sheet open={open} title="اعلان‌ها" onClose={() => setOpen(false)}>
        <div style={{ display: "grid", gap: spacing.md }}>
          {loading ? (
            <LoadingState label="در حال دریافت اعلان‌ها…" style={{ minHeight: 140 }} />
          ) : items === null || items.length === 0 ? (
            <div style={{ display: "grid", justifyItems: "center", gap: spacing.sm, paddingBlock: spacing.xl, textAlign: "center" }}>
              <IconBadge icon="bell" tone="olive" size={52} />
              <strong style={{ ...typography.body, color: colors.ink }}>اعلانی نداری</strong>
              <span style={{ ...typography.caption, color: colors.inkMuted }}>
                وقتی خبر تازه‌ای داشته باشیم اینجا می‌بینی.
              </span>
            </div>
          ) : (
            <>
              <div style={{ display: "grid", gap: 8, maxHeight: 320, overflowY: "auto" }}>
                {items.map((notification) => (
                  <button
                    key={notification.id}
                    type="button"
                    onClick={() => void openNotification(notification)}
                    style={{
                      display: "grid",
                      gap: 3,
                      padding: "10px 12px",
                      borderRadius: radii.md,
                      textAlign: "right",
                      cursor: "pointer",
                      fontFamily: typography.fontFamily,
                      background: notification.read ? colors.surface : colors.olive50,
                      border: `1px solid ${notification.read ? colors.sand150 : colors.olive100}`,
                    }}
                  >
                    <span style={{ ...typography.bodySmall, display: "flex", alignItems: "center", gap: 6, color: colors.ink, fontWeight: notification.read ? 700 : 900 }}>
                      {!notification.read ? (
                        <span aria-hidden="true" style={{ width: 6, height: 6, borderRadius: "50%", background: colors.olive600, flex: "0 0 auto" }} />
                      ) : null}
                      {notification.title}
                    </span>
                    {notification.body ? (
                      <span style={{ ...typography.caption, color: colors.inkMuted, lineHeight: 1.7 }}>{notification.body}</span>
                    ) : null}
                  </button>
                ))}
              </div>
              {unread > 0 ? (
                <Button variant="secondary" disabled={marking} onClick={() => void markAllRead()} style={{ minHeight: 42 }}>
                  {marking ? "در حال ثبت…" : "علامت‌گذاری همه به‌عنوان خوانده‌شده"}
                </Button>
              ) : null}
            </>
          )}
        </div>
      </Sheet>
    </>
  );
}
