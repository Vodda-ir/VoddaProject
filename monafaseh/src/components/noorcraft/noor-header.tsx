"use client";

import { motion } from "framer-motion";
import { Sparkles, Shield, Flame } from "lucide-react";
import { NoorLogo } from "./noor-logo";
import { NoorButton } from "./noor-button";
import { useNoorStore } from "@/store/noor-store";
import { NoorAvatar } from "./noor-avatar";
import { OnlineUsersBar } from "./online-users-bar";
import { InvitationBell } from "./invitation-bell";

export function NoorHeader() {
  const user = useNoorStore((s) => s.user);
  const setView = useNoorStore((s) => s.setView);
  const signOut = useNoorStore((s) => s.signOut);
  const view = useNoorStore((s) => s.view);

  return (
    <header className="sticky top-0 z-40 w-full">
      <div className="glass-panel border-b border-white/30">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
          <button
            onClick={() => setView(user ? "dashboard" : "landing")}
            className="flex items-center gap-2 transition hover:scale-[1.02]"
          >
            <NoorLogo size={42} withText />
          </button>

          <nav className="hidden items-center gap-1 lg:flex">
            {user && (
              <>
                <NavChip
                  active={view === "dashboard"}
                  onClick={() => setView("dashboard")}
                >
                  داشبورد
                </NavChip>
                <NavChip
                  active={view === "sessions"}
                  onClick={() => setView("sessions")}
                >
                  محفل‌ها
                </NavChip>
                <NavChip
                  active={view === "create-session"}
                  onClick={() => setView("create-session")}
                >
                  محفل جدید
                </NavChip>
                <NavChip
                  active={view === "challenge"}
                  onClick={() => setView("challenge")}
                  icon={<Flame className="h-3.5 w-3.5" />}
                >
                  چالش رقابت
                </NavChip>
                <NavChip
                  active={view === "lounge" || view === "lounge-room"}
                  onClick={() => setView("lounge")}
                >
                  تالار گفتگو
                </NavChip>
              </>
            )}
          </nav>

          {/* Online users bar — shown when logged in */}
          {user && (
            <div className="hidden xl:block">
              <OnlineUsersBar maxVisible={6} />
            </div>
          )}

          <div className="flex items-center gap-2">
            {user && <InvitationBell />}

            {user ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setView("dashboard")}
                  className="flex items-center gap-2 rounded-full bg-white/70 px-2 py-1 transition hover:bg-white dark:bg-white/10"
                >
                  <NoorAvatar name={user.fullName} color={user.avatarColor} avatarUrl={user.avatarUrl} gender={user.gender} size="sm" />
                  <div className="hidden flex-col text-right sm:flex">
                    <span className="text-xs font-bold leading-tight">
                      {user.fullName}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {user.stats.noorPoints} نور
                    </span>
                  </div>
                </button>
                <NoorButton
                  variant="coral"
                  size="sm"
                  onClick={async () => {
                    await fetch("/api/auth/logout", { method: "POST" });
                    signOut();
                  }}
                  className="hidden sm:inline-flex"
                >
                  خروج
                </NoorButton>
              </div>
            ) : (
              <NoorButton
                variant="yellow"
                size="sm"
                onClick={() => setView("auth")}
                leftIcon={<Sparkles className="h-4 w-4" />}
              >
                ورود به محفل
              </NoorButton>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

function NavChip({
  active,
  onClick,
  children,
  icon,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <motion.button
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-bold transition ${
        active
          ? "bg-noor-navy text-white"
          : "text-noor-navy hover:bg-noor-sky/20 dark:text-white dark:hover:bg-noor-sky/20"
      }`}
    >
      {icon}
      {children}
    </motion.button>
  );
}
