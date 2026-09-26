"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send,
  Mic,
  UserPlus,
  Users,
  Crown,
  Wifi,
  X,
  Reply,
  Play,
  Pause,
  MessageCircle,
  Loader2,
  Power,
} from "lucide-react";
import { NoorButton } from "../noor-button";
import { NoorCard } from "../noor-card";
import { NoorAvatar } from "../noor-avatar";
import { BackButton } from "../back-button";
import { useNoorStore } from "@/store/noor-store";
import { useToast } from "@/hooks/use-toast";

interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatarColor: string;
  senderAvatarUrl: string | null;
  text: string;
  timestamp: number;
  type: string;
  voiceDuration?: number | null;
  imageUrl?: string | null;
  inviteSessionId?: string | null;
  inviteSessionTitle?: string | null;
}

interface LoungeInfo {
  id: string;
  name: string;
  description: string;
  category: string;
  color: string;
  memberCount: number;
  onlineCount: number;
  isPrivate: boolean;
  creatorId?: string | null;
  isActive?: boolean;
}

interface Member {
  id: string;
  name: string;
  avatarColor: string;
  avatarUrl: string | null;
  role: string;
  isOnline: boolean;
  lastActiveAt: number;
}

export function LoungeRoomView() {
  const setView = useNoorStore((s) => s.setView);
  const user = useNoorStore((s) => s.user);
  const { toast } = useToast();

  const loungeId =
    typeof window !== "undefined"
      ? localStorage.getItem("currentLoungeId") || ""
      : "";

  const [lounge, setLounge] = useState<LoungeInfo | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [showMembers, setShowMembers] = useState(false);
  const [playingVoice, setPlayingVoice] = useState<string | null>(null);
  const [endingLounge, setEndingLounge] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  async function endLounge() {
    if (!loungeId || !lounge) return;
    const confirm = window.confirm(
      `آیا از پایان دادن تالار «${lounge.name}» مطمئن هستید؟ این تالار بسته شده و از لیست تالارها خارج می‌شود.`,
    );
    if (!confirm) return;
    setEndingLounge(true);
    try {
      const res = await fetch(`/api/lounges/${loungeId}/end`, { method: "POST" });
      const data = await res.json();
      if (data.ok) {
        toast({ title: "تالار پایان یافت ✓" });
        setView("lounge");
      } else {
        throw new Error(data.error);
      }
    } catch (err: any) {
      toast({
        title: "خطا در پایان دادن",
        description: err.message || "لطفاً دوباره تلاش کنید",
        variant: "destructive",
      });
    } finally {
      setEndingLounge(false);
    }
  }

  // Fetch lounge info + messages + members
  const fetchLoungeData = useCallback(async () => {
    if (!loungeId) return;
    try {
      // Fetch lounge list to find this lounge
      const lres = await fetch("/api/lounges", { cache: "no-store" });
      const ldata = await lres.json();
      if (ldata.ok) {
        const found = ldata.lounges.find((l: any) => l.id === loungeId);
        if (found) {
          setLounge(found);
        }
      }

      // Fetch messages
      const mres = await fetch(`/api/lounges/${loungeId}/messages`, {
        cache: "no-store",
      });
      const mdata = await mres.json();
      if (mdata.ok) {
        setMessages(mdata.messages || []);
      }
    } catch (err) {
      console.error("Lounge data fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [loungeId]);

  useEffect(() => {
    fetchLoungeData();
    // Poll for new messages every 5 seconds
    const interval = setInterval(fetchLoungeData, 5000);
    return () => clearInterval(interval);
  }, [fetchLoungeData]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Send text message
  async function sendMessage() {
    if (!input.trim() || !user || !loungeId) return;
    const text = input.trim();
    setInput("");
    setSending(true);
    try {
      const res = await fetch(`/api/lounges/${loungeId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          type: "text",
          replyToId: replyTo?.id,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setMessages((m) => [...m, data.message]);
        setReplyTo(null);
      } else {
        throw new Error(data.error);
      }
    } catch (err: any) {
      toast({
        title: "خطا در ارسال پیام",
        description: err.message || "لطفاً دوباره تلاش کنید",
        variant: "destructive",
      });
      // Restore text on error
      setInput(text);
    } finally {
      setSending(false);
    }
  }

  // Send invite to active session
  async function sendInvite() {
    if (!user || !loungeId) return;
    const activeSession = useNoorStore.getState().activeSession;
    if (!activeSession) {
      toast({
        title: "محفلی فعال نیست",
        description: "ابتدا یک محفل تشکیل دهید یا به محفلی بپیوندید، سپس دعوت بفرستید.",
        variant: "destructive",
      });
      return;
    }
    try {
      const res = await fetch(`/api/lounges/${loungeId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: `دعوت به محفل: ${activeSession.title}`,
          type: "invite",
          inviteSessionId: activeSession.id,
          inviteSessionTitle: activeSession.title,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setMessages((m) => [...m, data.message]);
        toast({
          title: "دعوتنامه ارسال شد 📨",
          description: `دعوت به محفل «${activeSession.title}» در تالار ثبت شد.`,
        });
      }
    } catch {
      toast({
        title: "خطا در ارسال دعوت",
        variant: "destructive",
      });
    }
  }

  function toggleVoicePlay(msgId: string) {
    setPlayingVoice((p) => (p === msgId ? null : msgId));
  }

  function formatTime(ts: number): string {
    const d = new Date(ts);
    return d.toLocaleTimeString("fa-IR", { hour: "2-digit", minute: "2-digit" });
  }

  // Loading state
  if (loading) {
    return (
      <div className="grid min-h-[60vh] place-items-center">
        <Loader2 className="h-8 w-8 animate-spin text-noor-yellow" />
      </div>
    );
  }

  // Not found
  if (!lounge) {
    return (
      <div className="grid min-h-[60vh] place-items-center">
        <div className="text-center">
          <p className="text-muted-foreground">تالاری پیدا نشد.</p>
          <NoorButton
            variant="yellow"
            className="mt-4"
            onClick={() => setView("lounge")}
          >
            بازگشت به تالارها
          </NoorButton>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-noor-hero">
      <div className="mx-auto max-w-4xl px-4 py-4 sm:px-6">
        {/* Back button */}
        <div className="mb-3">
          <BackButton to="lounge" label="بازگشت به تالارها" />
        </div>

        {/* Header — compact */}
        <div className="mb-4 flex items-center justify-between gap-3 rounded-2xl bg-card p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div
              className="grid h-12 w-12 place-items-center rounded-2xl text-noor-navy shadow-md"
              style={{ background: lounge.color }}
            >
              <MessageCircle className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-noor-navy dark:text-white">
                {lounge.name}
              </h1>
              <p className="text-xs text-muted-foreground line-clamp-1">
                {lounge.description}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 rounded-full bg-noor-green/15 px-2.5 py-1 text-xs font-bold text-noor-navy dark:text-lime-300">
              <Wifi className="h-3 w-3" />
              {lounge.onlineCount.toLocaleString("fa-IR")}
            </span>
            <span className="flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs font-bold text-muted-foreground">
              <Users className="h-3 w-3" />
              {lounge.memberCount.toLocaleString("fa-IR")}
            </span>
            {/* End lounge button — only for creator */}
            {lounge.creatorId && user && lounge.creatorId === user.id && (
              <button
                onClick={endLounge}
                disabled={endingLounge}
                className="flex items-center gap-1 rounded-full bg-noor-coral/20 px-3 py-1 text-xs font-bold text-noor-coral transition hover:bg-noor-coral/30 disabled:opacity-50"
                title="پایان دادن تالار — فقط ایجادکننده"
              >
                {endingLounge ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Power className="h-3 w-3" />
                )}
                پایان تالار
              </button>
            )}
          </div>
        </div>

        {/* Chat area */}
        <NoorCard className="overflow-hidden p-0">
          <div className="flex h-[55vh] flex-col">
            {/* Messages */}
            <div className="flex-1 space-y-3 overflow-y-auto p-4">
              {messages.length === 0 ? (
                <div className="grid h-full place-items-center text-center text-sm text-muted-foreground">
                  <div>
                    <div className="mb-2 text-4xl">💬</div>
                    <p>هنوز پیامی ارسال نشده است</p>
                    <p className="mt-1 text-xs">اولین پیام را شما ارسال کنید!</p>
                  </div>
                </div>
              ) : (
                messages.map((msg) => (
                  <MessageBubble
                    key={msg.id}
                    msg={msg}
                    isMine={msg.senderId === user?.id}
                    onReply={() => setReplyTo(msg)}
                    onPlayVoice={() => toggleVoicePlay(msg.id)}
                    isPlayingVoice={playingVoice === msg.id}
                    onJoinSession={() => {
                      toast({
                        title: "در حال اتصال به محفل... 📹",
                        description: msg.inviteSessionTitle,
                      });
                      setView("sessions");
                    }}
                    formatTime={formatTime}
                  />
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Reply preview */}
            <AnimatePresence>
              {replyTo && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="border-t border-muted/30 bg-muted/30 p-2"
                >
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2">
                      <Reply className="h-3 w-3 text-muted-foreground" />
                      <span className="font-bold">{replyTo.senderName}:</span>
                      <span className="text-muted-foreground">
                        {replyTo.text.slice(0, 50)}
                      </span>
                    </div>
                    <button
                      onClick={() => setReplyTo(null)}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Input bar */}
            <div className="border-t border-muted/30 p-3">
              <div className="flex items-center gap-2">
                {/* Invite button */}
                <button
                  onClick={sendInvite}
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-noor-green/20 text-noor-navy transition hover:bg-noor-green/30 dark:text-lime-300"
                  title="دعوت به محفل"
                >
                  <UserPlus className="h-5 w-5" />
                </button>
                {/* Text input */}
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !sending) sendMessage();
                  }}
                  placeholder="پیام بنویس..."
                  disabled={sending}
                  className="flex-1 rounded-full border border-input bg-background px-4 py-2 text-sm focus:border-noor-sky focus:outline-none disabled:opacity-50"
                />
                {/* Send button */}
                <button
                  onClick={sendMessage}
                  disabled={sending || !input.trim()}
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-noor-yellow text-noor-navy transition hover:brightness-105 disabled:opacity-50"
                  title="ارسال"
                >
                  {sending ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Send className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </NoorCard>

        {/* Description card */}
        {lounge.description && (
          <div className="mt-3 rounded-2xl bg-card p-3 text-xs text-muted-foreground">
            {lounge.description}
          </div>
        )}
      </div>
    </div>
  );
}

function MessageBubble({
  msg,
  isMine,
  onReply,
  onPlayVoice,
  isPlayingVoice,
  onJoinSession,
  formatTime,
}: {
  msg: ChatMessage;
  isMine: boolean;
  onReply: () => void;
  onPlayVoice: () => void;
  isPlayingVoice: boolean;
  onJoinSession: () => void;
  formatTime: (ts: number) => string;
}) {
  if (msg.type === "system") {
    return (
      <div className="text-center">
        <span className="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">
          {msg.text}
        </span>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex gap-2 ${isMine ? "flex-row-reverse" : ""}`}
    >
      <NoorAvatar
        name={msg.senderName}
        color={msg.senderAvatarColor}
        avatarUrl={msg.senderAvatarUrl}
        size="sm"
      />
      <div className={`flex-1 ${isMine ? "text-left" : "text-right"}`}>
        <div className="mb-0.5 flex items-center gap-2 text-xs text-muted-foreground">
          <span className="font-bold text-foreground">{msg.senderName}</span>
          <span>{formatTime(msg.timestamp)}</span>
        </div>

        {/* Message content */}
        <div
          className={`inline-block rounded-2xl px-3 py-2 ${
            isMine
              ? "bg-noor-yellow/30 text-foreground"
              : "bg-muted text-foreground"
          }`}
        >
          {msg.type === "text" && (
            <p className="text-sm">{msg.text}</p>
          )}

          {msg.type === "invite" && (
            <div className="flex items-center gap-2">
              <div>
                <div className="text-xs font-bold text-noor-green">
                  📨 دعوت به محفل
                </div>
                <div className="text-sm">{msg.inviteSessionTitle}</div>
              </div>
              <NoorButton
                variant="green"
                size="sm"
                onClick={onJoinSession}
                className="mr-2"
              >
                پیوستن
              </NoorButton>
            </div>
          )}
        </div>

        {/* Reply button */}
        {msg.type !== "invite" && (
          <button
            onClick={onReply}
            className="mt-1 rounded px-1 text-[10px] text-muted-foreground hover:bg-muted"
            title="پاسخ"
          >
            <Reply className="h-3 w-3" />
          </button>
        )}
      </div>
    </motion.div>
  );
}
