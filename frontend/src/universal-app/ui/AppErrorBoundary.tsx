"use client";

import { Component, type CSSProperties, type ReactNode } from "react";

import { Button, Card, IconBadge, colors, radii, spacing, typography } from "./index";

/**
 * مرز خطای داخلی اپ یونیورسال — «app-error-boundary».
 *
 * پیش از این مرز، هر خطای رندر در اپ وب تا مرز خطای صفحهٔ وب (error.tsx با
 * نوار و فوتر لندینگ و پیام «بارگذاری این صفحه کامل نشد») بالا می‌رفت و کاربر
 * اپ را با رابطی بیگانه می‌دید. اکنون خطا در همان پوستهٔ اپ با همان توکن‌های
 * طراحی گرفته می‌شود؛ «تلاش دوباره» درخت رندر را بازنشانی می‌کند و مسیر فعلی
 * حفظ می‌شود (رفرش صفحه هم گزینهٔ دوم است).
 */
type Props = { children: ReactNode };
type State = { error: Error | null; nonce: number };

/* متن ثابت دوزبانه — خارج از AppearanceProvider هستیم؛ همان متن فارسی + راهنمای
 * انگلیسی کوتاه تا در هر دو زبان قابل‌فهم باشد. */
const TITLE = "مشکلی پیش آمد";
const HINT = "بارگیری این بخش کامل نشد. می‌توانید دوباره تلاش کنید.";
const EN_HINT = "This section failed to load. You can try again.";

export class AppErrorBoundary extends Component<Props, State> {
  state: State = { error: null, nonce: 0 };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  private reset = () => {
    this.setState((previous) => ({ error: null, nonce: previous.nonce + 1 }));
  };

  render() {
    const { error, nonce } = this.state;
    if (!error) return this.props.children;

    const shell: CSSProperties = {
      minHeight: "60dvh",
      display: "grid",
      placeItems: "center",
      padding: spacing.xl,
    };
    return (
      <div style={shell} key={nonce}>
        <Card elevated style={{ display: "grid", gap: spacing.md, textAlign: "center", maxWidth: 460, width: "100%", padding: 22 }}>
          <div style={{ marginInline: "auto" }}>
            <IconBadge icon="info" tone="clay" size={54} />
          </div>
          <strong style={{ ...typography.sectionTitle, color: colors.ink }}>{TITLE}</strong>
          <p style={{ ...typography.body, color: colors.inkSecondary, margin: 0 }}>
            {HINT}
            <span dir="ltr" style={{ display: "block", marginTop: 4, fontSize: 11.5, color: colors.inkMuted }}>{EN_HINT}</span>
          </p>
          <div style={{ display: "grid", gap: spacing.sm }}>
            <Button fullWidth onClick={this.reset}>تلاش دوباره</Button>
            <Button
              variant="secondary"
              fullWidth
              onClick={() => {
                if (typeof window !== "undefined") window.location.reload();
              }}
            >
              بازخوانی صفحه
            </Button>
          </div>
          <code dir="ltr" style={{ fontSize: 10.5, color: colors.inkFaint, background: colors.sand100, borderRadius: radii.sm, padding: "6px 9px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {error.message || "render error"}
          </code>
        </Card>
      </div>
    );
  }
}
