"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageCircle,
  Users,
  Mic,
  Music,
  MapPin,
  BookOpen,
  Search,
  ArrowLeft,
  Lock,
  Sparkles,
  Plus,
  Crown,
  Wifi,
  X,
  Flame,
  Loader2,
  Radio,
} from "lucide-react";
import { NoorButton } from "../noor-button";
import { NoorCard } from "../noor-card";
import { NoorBadge } from "../noor-badge";
import { BackButtons } from "../back-buttons";
import { useNoorStore } from "@/store/noor-store";
import { useToast } from "@/hooks/use-toast";
import type { Lounge, LoungeCategory } from "@/lib/noorcraft/types";

const CATEGORY_LABELS: Record<LoungeCategory | "all", string> = {
  all: "همه تالارها",
  "reciter-fans": "هواداران قاری",
  "maqam-lovers": "علاقمندان مقام",
  "city-group": "گروه‌های شهری",
  "skill-group": "گروه‌های مهارتی",
  "age-group": "گروه‌های سنی",
  general: "عمومی",
};

const CATEGORY_ICONS: Record<LoungeCategory, React.ReactNode> = {
  "reciter-fans": <Mic className="h-5 w-5" />,
  "maqam-lovers": <Music className="h-5 w-5" />,
  "city-group": <MapPin className="h-5 w-5" />,
  "skill-group": <BookOpen className="h-5 w-5" />,
  "age-group": <Users className="h-5 w-5" />,
  general: <MessageCircle className="h-5 w-5" />,
};

const CATEGORY_COLORS: Record<LoungeCategory, string> = {
  "reciter-fans": "#FFD700",
  "maqam-lovers": "#FF7F7F",
  "city-group": "#87CEEB",
  "skill-group": "#7CFC00",
  "age-group": "#9d4edd",
  general: "#FFD700",
};

const CATEGORY_CARD_CLASS: Record<LoungeCategory, string> = {
  "reciter-fans": "noor-card-yellow",
  "maqam-lovers": "noor-card-coral",
  "city-group": "noor-card-sky",
  "skill-group": "noor-card-green",
  "age-group": "noor-card-rainbow",
  general: "noor-card-yellow",
};

export function LoungeView() {
  const setView = useNoorStore((s) => s.setView);
  const user = useNoorStore((s) => s.user);
  const { toast } = useToast();
  const [filter, setFilter] = useState<LoungeCategory | "all">("all");
  const [search, setSearch] = useState("");
  const [apiLounges, setApiLounges] = useState<Lounge[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);

  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newCategory, setNewCategory] = useState<LoungeCategory>("general");

  async function refreshLounges() {
    try {
      const res = await fetch("/api/lounges", { cache: "no-store" });
      const d = await res.json();
      if (d.ok) setApiLounges(d.lounges);
    } catch {}
  }

  useEffect(() => {
    refreshLounges().finally(() => setLoading(false));
    const interval = setInterval(refreshLounges, 10000);
    return () => clearInterval(interval);
  }, []);

  async function handleCreateLounge() {
    if (!newName.trim() || !newDesc.trim()) {
      toast({
        title: "اطلاعات ناقص",
        description: "نام و توضیحات تالار الزامی است",
        variant: "destructive",
      });
      return;
    }
    setCreating(true);
    try {
      const res = await fetch("/api/lounges", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName.trim(),
          description: newDesc.trim(),
          category: newCategory,
          color: CATEGORY_COLORS[newCategory],
        }),
      });
      const data = await res.json();
      if (data.ok) {
        toast({
          title: "تالار ساخته شد! 🎉",
          description: `تالار «${newName}» با موفقیت ایجاد شد.`,
        });
        setNewName("");
        setNewDesc("");
        setNewCategory("general");
        setShowCreateModal(false);
        await refreshLounges();
      } else {
        throw new Error(data.error);
      }
    } catch (err: any) {
      toast({
        title: "خطا در ساخت تالار",
        description: err.message || "لطفاً دوباره تلاش کنید",
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  }

  const filtered = useMemo(() => {
    return apiLounges.filter((l) => {
      if (filter !== "all" && l.category !== filter) return false;
      if (search && !`${l.name} ${l.description} ${l.tags.join(" ")}`.includes(search))
        return false;
      return true;
    });
  }, [filter, search, apiLounges]);

  const totalOnline = apiLounges.reduce((sum, l) => sum + l.onlineCount, 0);
  const totalMembers = apiLounges.reduce((sum, l) => sum + l.memberCount, 0);

  function handleJoinLounge(lounge: Lounge) {
    setView("lounge-room");
    localStorage.setItem("currentLoungeId", lounge.id);
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-noor-hero">
      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
        {/* Back buttons */}
        <div className="mb-4">
          <BackButtons />
        </div>

        {/* === HEADER === */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <div className="flex items-center justify-between gap-4">
            <div>
              <NoorBadge variant="yellow" icon={<Sparkles className="h-3 w-3" />}>
                فضای هم‌نشینی قاریان
              </NoorBadge>
              <h1 className="mt-3 text-3xl font-extrabold text-noor-navy dark:text-white">
                تالار گفتگو
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                با قاریان هم‌ذوق گفتگو کن، دعوت بفرست و محفلی بساز
              </p>
            </div>
            <NoorButton
              variant="green"
              size="md"
              onClick={() => setShowCreateModal(true)}
              leftIcon={<Plus className="h-4 w-4" />}
              className="shrink-0"
            >
              تالار جدید
            </NoorButton>
          </div>

          {/* Quick stats */}
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="flex items-center gap-1.5 rounded-full bg-noor-green/15 px-3 py-1.5 text-xs font-bold text-noor-navy dark:text-lime-300">
              <Wifi className="h-3 w-3" />
              {totalOnline.toLocaleString("fa-IR")} نفر آنلاین
            </span>
            <span className="flex items-center gap-1.5 rounded-full bg-muted px-3 py-1.5 text-xs font-bold text-muted-foreground">
              <Users className="h-3 w-3" />
              {totalMembers.toLocaleString("fa-IR")} عضو کل
            </span>
            <span className="flex items-center gap-1.5 rounded-full bg-noor-sky/15 px-3 py-1.5 text-xs font-bold text-noor-navy dark:text-sky-300">
              <MessageCircle className="h-3 w-3" />
              {apiLounges.length.toLocaleString("fa-IR")} تالار فعال
            </span>
          </div>
        </motion.div>

        {/* === CATEGORY FILTER PILLS === */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-4 flex flex-wrap gap-2"
        >
          <button
            onClick={() => setFilter("all")}
            className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition ${
              filter === "all"
                ? "bg-noor-navy text-white"
                : "bg-white/70 text-noor-navy hover:bg-white dark:bg-white/10 dark:text-white dark:hover:bg-white/20"
            }`}
          >
            همه
          </button>
          {(Object.entries(CATEGORY_LABELS) as [LoungeCategory | "all", string][])
            .filter(([k]) => k !== "all")
            .map(([key, label]) => (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition ${
                  filter === key
                    ? "bg-noor-navy text-white"
                    : "bg-white/70 text-noor-navy hover:bg-white dark:bg-white/10 dark:text-white dark:hover:bg-white/20"
                }`}
              >
                <span style={{ color: filter === key ? CATEGORY_COLORS[key] : undefined }}>
                  {CATEGORY_ICONS[key]}
                </span>
                {label}
              </button>
            ))}
        </motion.div>

        {/* === SEARCH === */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="mb-4"
        >
          <div className="relative">
            <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="جستجو در تالارها..."
              className="w-full rounded-full border border-input bg-background py-2 pr-10 pl-4 text-sm focus:border-noor-sky focus:outline-none"
            />
          </div>
        </motion.div>

        {/* === LOUNGES GRID === */}
        {loading ? (
          <div className="grid place-items-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-noor-yellow" />
          </div>
        ) : filtered.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="rounded-3xl bg-card p-10 text-center"
          >
            <motion.div
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="mx-auto mb-4 grid h-20 w-20 place-items-center rounded-full bg-noor-sky/20"
            >
              <MessageCircle className="h-10 w-10 text-noor-sky" />
            </motion.div>
            <h3 className="font-display text-xl text-noor-navy dark:text-white">
              هنوز تالاری ساخته نشده
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              اولین تالار را تو بساز و قاریان را دور هم جمع کن
            </p>
            <NoorButton
              variant="green"
              size="lg"
              className="mt-4"
              onClick={() => setShowCreateModal(true)}
              leftIcon={<Plus className="h-5 w-5" />}
            >
              ساخت تالار جدید
            </NoorButton>
          </motion.div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <AnimatePresence mode="popLayout">
              {filtered.map((lounge, i) => (
                <motion.div
                  key={lounge.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ delay: i * 0.05, type: "spring", stiffness: 300, damping: 25 }}
                  whileHover={{ y: -4 }}
                >
                  <LoungeCard lounge={lounge} onJoin={() => handleJoinLounge(lounge)} />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}

        {/* === INFO CARD === */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-6 rounded-2xl bg-card p-4 text-center text-xs text-muted-foreground"
        >
          <p>
            📢 تالارها فضایی برای گفتگوی قاریان است. در تالارها می‌توانید پیام بفرستید،
            به محافل دعوت کنید و با هم‌فکران ارتباط برقرار کنید.
          </p>
        </motion.div>
      </div>

      {/* === CREATE MODAL === */}
      <AnimatePresence>
        {showCreateModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => !creating && setShowCreateModal(false)}
            className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, y: 30 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 30 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md"
            >
              <NoorCard className="noor-card-green">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="flex items-center gap-2 text-lg font-bold">
                    <Plus className="h-5 w-5 text-noor-green" />
                    ساخت تالار جدید
                  </h3>
                  <button
                    onClick={() => !creating && setShowCreateModal(false)}
                    className="grid h-8 w-8 place-items-center rounded-full bg-muted text-muted-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="flex items-center gap-1.5 text-sm font-bold">
                      <Sparkles className="h-4 w-4" />
                      نام تالار
                    </label>
                    <input
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      placeholder="مثال: انجمن علاقمندان عبدالباسط"
                      className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:border-noor-sky focus:outline-none"
                      autoFocus
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="flex items-center gap-1.5 text-sm font-bold">
                      <MessageCircle className="h-4 w-4" />
                      توضیحات
                    </label>
                    <textarea
                      value={newDesc}
                      onChange={(e) => setNewDesc(e.target.value)}
                      placeholder="درباره این تالار..."
                      rows={2}
                      className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:border-noor-sky focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="flex items-center gap-1.5 text-sm font-bold">
                      <Sparkles className="h-4 w-4" />
                      دسته‌بندی
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {(Object.entries(CATEGORY_LABELS) as [LoungeCategory | "all", string][])
                        .filter(([k]) => k !== "all")
                        .map(([key, label]) => (
                          <button
                            key={key}
                            type="button"
                            onClick={() => setNewCategory(key)}
                            className={`flex items-center gap-1.5 rounded-xl border-2 p-2.5 text-xs font-bold transition ${
                              newCategory === key
                                ? "border-noor-green bg-noor-green/15"
                                : "border-muted-foreground/20 hover:border-noor-sky"
                            }`}
                          >
                            <span style={{ color: CATEGORY_COLORS[key] }}>
                              {CATEGORY_ICONS[key]}
                            </span>
                            {label}
                          </button>
                        ))}
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <NoorButton
                      variant="ghost"
                      size="md"
                      className="flex-1"
                      onClick={() => setShowCreateModal(false)}
                      disabled={creating}
                    >
                      انصراف
                    </NoorButton>
                    <NoorButton
                      variant="green"
                      size="md"
                      className="flex-1"
                      onClick={handleCreateLounge}
                      disabled={creating}
                    >
                      {creating ? (
                        <span className="flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          در حال ساخت...
                        </span>
                      ) : (
                        "ساخت تالار"
                      )}
                    </NoorButton>
                  </div>
                </div>
              </NoorCard>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// === LOUNGE CARD — fancy ===
function LoungeCard({
  lounge,
  onJoin,
}: {
  lounge: Lounge;
  onJoin: () => void;
}) {
  const cardClass = CATEGORY_CARD_CLASS[lounge.category];
  const color = CATEGORY_COLORS[lounge.category];
  const hasActivity = lounge.onlineCount > 0;

  return (
    <div className={`relative overflow-hidden rounded-3xl p-4 ${cardClass}`}>
      {/* Top: icon + status */}
      <div className="mb-3 flex items-start justify-between">
        <div
          className="grid h-12 w-12 place-items-center rounded-2xl text-noor-navy shadow-md"
          style={{ background: color }}
        >
          {CATEGORY_ICONS[lounge.category]}
        </div>
        {hasActivity ? (
          <span className="flex items-center gap-1 rounded-full bg-noor-green/15 px-2 py-0.5 text-[10px] font-bold text-noor-green">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-noor-green opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-noor-green" />
            </span>
            فعال
          </span>
        ) : (
          <span className="rounded-full bg-muted/30 px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
            آرام
          </span>
        )}
      </div>

      {/* Name */}
      <h3 className="mb-1 text-base font-bold leading-tight text-noor-navy dark:text-white">
        {lounge.name}
      </h3>

      {/* Description */}
      <p className="mb-3 line-clamp-2 text-xs text-muted-foreground">
        {lounge.description}
      </p>

      {/* Tags */}
      {lounge.tags.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-1">
          {lounge.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-muted/30 px-2 py-0.5 text-[9px] font-bold text-muted-foreground"
            >
              #{tag}
            </span>
          ))}
        </div>
      )}

      {/* Stats */}
      <div className="mb-3 flex items-center justify-between text-xs">
        <span className="flex items-center gap-1 text-muted-foreground">
          <Users className="h-3 w-3" />
          {lounge.memberCount.toLocaleString("fa-IR")}
        </span>
        <span className="flex items-center gap-1 text-noor-green">
          <Wifi className="h-3 w-3" />
          {lounge.onlineCount.toLocaleString("fa-IR")} آنلاین
        </span>
      </div>

      {/* Join button */}
      <button
        onClick={onJoin}
        className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-noor-navy/10 px-3 py-2 text-xs font-bold text-noor-navy transition hover:bg-noor-navy/20 dark:text-white dark:hover:bg-white/10"
      >
        ورود به تالار
        <ArrowLeft className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
