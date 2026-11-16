"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "../../ui/Icon";
import { colors, gradients, radii, shadows, typography } from "../../ui/theme";
import { useAppearance } from "../../ui/appearance";

/**
 * دستیار هوشمند وُدّا — چت‌بات شناور پشتیبانی (سمت فراگیر).
 * گفتگو از مسیر /api/ai/chat (BFF) پاسخ می‌گیرد؛ کلید هوش مصنوعی
 * فقط سمت سرور است. فقط در پوستهٔ قرآن‌آموز (learner) نمایش داده می‌شود.
 */

type ChatMessage = { role: "user" | "assistant"; content: string };

const WELCOME: ChatMessage = {
  role: "assistant",
  content:
    "سلام! من دستیار هوشمند وُدّا هستم 🌿\nدربارهٔ رزرو جلسه، فراخوان اساتید، مراسم حضوری، کیف پول یا هر بخش از اپ سؤال دارید، بپرسید.",
};

const QUICK_CHIPS: string[] = [
  "چطور استاد رزرو کنم؟",
  "فراخوان چیست؟",
  "خدمات رایگان چی هست؟",
  "مراسم حضوری چطور رزرو می‌شود؟",
];

const HIDDEN_ROUTES = new Set<string>(["book"]);

export function AssistantChat({ routeName }: { routeName: string }) {
  const { L } = useAppearance();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const listRef = useRef<HTMLDivElement | null>(null);

  // اسکرول خودکار به آخرین پیام
  useEffect(() => {
    const node = listRef.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, [messages, busy, open]);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || busy) return;
    const next: ChatMessage[] = [...messages, { role: "user", content: trimmed }];
    setMessages(next);
    setInput("");
    setBusy(true);
    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ messages: next.filter((m, i) => !(i === 0 && m.role === "assistant" && m === WELCOME)) }),
      });
      const payload = (await response.json().catch(() => ({}))) as { reply?: string };
      const reply = typeof payload.reply === "string" && payload.reply.trim()
        ? payload.reply.trim()
        : "الان امکان پاسخ‌گویی نیست؛ کمی بعد دوباره امتحان کنید.";
      setMessages((current) => [...current, { role: "assistant", content: reply }]);
    } catch {
      setMessages((current) => [
        ...current,
        { role: "assistant", content: "ارتباط برقرار نشد؛ لطفاً اتصال اینترنت را بررسی و دوباره تلاش کنید." },
      ]);
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    setMessages([WELCOME]);
    setInput("");
  }

  if (HIDDEN_ROUTES.has(routeName)) return null;

  return (
    <div
      aria-hidden={!open}
      style={{
        position: "fixed",
        zIndex: 40,
        left: "50%",
        transform: "translateX(-50%)",
        width: "min(100%, 600px)",
        top: 0,
        bottom: 0,
        pointerEvents: "none",
        fontFamily: typography.fontFamily,
      }}
    >
      {/* دکمهٔ شناور گفتگو */}
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label={L("گفتگو با دستیار هوشمند وُدّا")}
          className="vodda-tappable"
          style={{
            pointerEvents: "auto",
            position: "absolute",
            bottom: "calc(96px + env(safe-area-inset-bottom))",
            insetInlineStart: 14,
            width: 48,
            height: 48,
            display: "grid",
            placeItems: "center",
            padding: 0,
            border: `1.5px solid ${colors.goldSoft}`,
            borderRadius: "50%",
            color: "#fffaf0",
            background: gradients.goldRich,
            boxShadow: "0 10px 24px rgba(139,104,31,.35), 0 3px 8px rgba(46,54,34,.18)",
            cursor: "pointer",
          }}
        >
          <Icon name="message" size={21} stroke={2} />
          <span
            aria-hidden="true"
            style={{
              position: "absolute",
              top: -4,
              insetInlineEnd: -4,
              width: 18,
              height: 18,
              display: "grid",
              placeItems: "center",
              borderRadius: "50%",
              background: colors.olive600,
              border: "2px solid #fffaf0",
              color: "#fffaf0",
            }}
          >
            <Icon name="sparkle" size={9} stroke={2.4} />
          </span>
        </button>
      ) : null}

      {/* پنل گفتگو */}
      {open ? (
        <section
          role="dialog"
          aria-label={L("گفتگو با دستیار هوشمند وُدّا")}
          className="vodda-enter"
          style={{
            pointerEvents: "auto",
            position: "absolute",
            insetInline: 10,
            bottom: "calc(84px + env(safe-area-inset-bottom))",
            maxHeight: "min(72dvh, 560px)",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            background: colors.surface,
            border: `1px solid ${colors.sand150}`,
            borderRadius: radii.lg,
            boxShadow: shadows.lg,
          }}
        >
          <header
            style={{
              display: "flex",
              alignItems: "center",
              gap: 9,
              padding: "11px 13px",
              borderBottom: `1px solid ${colors.sand100}`,
              background: `linear-gradient(180deg, ${colors.olive50}, ${colors.surface})`,
              flex: "0 0 auto",
            }}
          >
            <span
              aria-hidden="true"
              style={{
                width: 34,
                height: 34,
                display: "grid",
                placeItems: "center",
                borderRadius: 12,
                background: gradients.goldRich,
                color: "#fffaf0",
                flex: "0 0 auto",
              }}
            >
              <Icon name="sparkle" size={17} stroke={2} />
            </span>
            <div style={{ minWidth: 0, flex: 1 }}>
              <strong style={{ display: "block", fontSize: 13, color: colors.ink }}>{L("دستیار هوشمند وُدّا")}</strong>
              <span style={{ display: "block", fontSize: 10.5, color: colors.inkMuted }}>{L("پاسخ‌گوی خودکار سؤالات اپ")}</span>
            </div>
            <button
              type="button"
              onClick={reset}
              aria-label={L("شروع دوبارهٔ گفتگو")}
              style={{ background: "none", border: 0, color: colors.inkMuted, cursor: "pointer", padding: 6, fontFamily: typography.fontFamily }}
            >
              <Icon name="refresh" size={16} />
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label={L("بستن گفتگو")}
              style={{ background: "none", border: 0, color: colors.inkMuted, cursor: "pointer", padding: 6, fontFamily: typography.fontFamily }}
            >
              <Icon name="x" size={17} />
            </button>
          </header>

          <div
            ref={listRef}
            aria-live="polite"
            aria-label={L("پیام‌های گفتگو")}
            style={{
              flex: "1 1 auto",
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              gap: 8,
              padding: "12px 12px 6px",
            }}
          >
            {messages.map((message, index) => {
              const mine = message.role === "user";
              return (
                <div
                  key={index}
                  style={{
                    display: "flex",
                    justifyContent: mine ? "flex-start" : "flex-end",
                  }}
                >
                  <div
                    style={{
                      maxWidth: "86%",
                      padding: "8px 12px",
                      borderRadius: 15,
                      borderEndEndRadius: mine ? 15 : 5,
                      borderEndStartRadius: mine ? 5 : 15,
                      fontSize: 12.6,
                      lineHeight: 1.9,
                      whiteSpace: "pre-wrap",
                      wordBreak: "break-word",
                      color: mine ? colors.surface : colors.ink,
                      background: mine ? colors.olive600 : colors.olive50,
                      border: mine ? "none" : `1px solid ${colors.olive100}`,
                    }}
                  >
                    {L(message.content)}
                  </div>
                </div>
              );
            })}
            {busy ? (
              <div style={{ display: "flex", justifyContent: "flex-end" }} aria-label={L("در حال نوشتن پاسخ")}>
                <div
                  style={{
                    padding: "10px 14px",
                    borderRadius: 15,
                    borderEndStartRadius: 5,
                    background: colors.olive50,
                    border: `1px solid ${colors.olive100}`,
                  }}
                >
                  <span className="vodda-skeleton" style={{ display: "block", width: 74, height: 12, borderRadius: 8 }} />
                </div>
              </div>
            ) : null}
          </div>

          {messages.length <= 1 && !busy ? (
            <div
              style={{
                flex: "0 0 auto",
                display: "flex",
                gap: 6,
                overflowX: "auto",
                padding: "4px 12px 8px",
              }}
              aria-label={L("پیشنهادهای گفتگو")}
            >
              {QUICK_CHIPS.map((chip) => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => send(chip)}
                  style={{
                    flex: "0 0 auto",
                    minHeight: 32,
                    padding: "5px 11px",
                    borderRadius: 999,
                    border: `1px solid ${colors.olive200}`,
                    background: colors.olive50,
                    color: colors.olive700,
                    fontSize: 11.3,
                    fontWeight: 700,
                    cursor: "pointer",
                    fontFamily: typography.fontFamily,
                  }}
                >
                  {L(chip)}
                </button>
              ))}
            </div>
          ) : null}

          <form
            onSubmit={(event) => {
              event.preventDefault();
              void send(input);
            }}
            style={{
              flex: "0 0 auto",
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "9px 10px max(10px, env(safe-area-inset-bottom))",
              borderTop: `1px solid ${colors.sand100}`,
              background: colors.surface,
            }}
          >
            <input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder={L("سؤال خود را بنویسید…")}
              aria-label={L("متن پیام")}
              maxLength={800}
              className="vodda-input"
              style={{
                flex: 1,
                minWidth: 0,
                minHeight: 42,
                padding: "8px 13px",
                border: `1px solid ${colors.sand200}`,
                borderRadius: 14,
                outline: "none",
                background: colors.sand50,
                color: colors.ink,
                fontSize: 12.8,
                fontFamily: typography.fontFamily,
              }}
            />
            <button
              type="submit"
              disabled={busy || !input.trim()}
              aria-label={L("ارسال پیام")}
              style={{
                flex: "0 0 auto",
                width: 42,
                height: 42,
                display: "grid",
                placeItems: "center",
                padding: 0,
                border: 0,
                borderRadius: 14,
                color: colors.surface,
                background: input.trim() && !busy ? colors.olive600 : colors.sand200,
                cursor: input.trim() && !busy ? "pointer" : "default",
              }}
            >
              <Icon name="arrowL" size={19} stroke={2.2} />
            </button>
          </form>
        </section>
      ) : null}
    </div>
  );
}
