"use client";

import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useNoorStore } from "@/store/noor-store";
import { NoorHeader } from "@/components/noorcraft/noor-header";
import { NoorFooter } from "@/components/noorcraft/noor-footer";
import { ErrorBoundary } from "@/components/noorcraft/error-boundary";
import { LandingView } from "@/components/noorcraft/views/landing-view";
import { AuthView } from "@/components/noorcraft/views/auth-view";
import { DashboardView } from "@/components/noorcraft/views/dashboard-view";
import { SessionsView } from "@/components/noorcraft/views/sessions-view";
import { CreateSessionView } from "@/components/noorcraft/views/create-session-view";
import { SessionRoomView } from "@/components/noorcraft/views/session-room-view";
import { ResultsView } from "@/components/noorcraft/views/results-view";
import { LoungeView } from "@/components/noorcraft/views/lounge-view";
import { LoungeRoomView } from "@/components/noorcraft/views/lounge-room-view";
import { ChallengeView } from "@/components/noorcraft/views/challenge-view";
import { BlogView } from "@/components/noorcraft/views/blog-view";
import { AdminView } from "@/components/noorcraft/views/admin-view";

export default function Home() {
  const view = useNoorStore((s) => s.view);
  const user = useNoorStore((s) => s.user);
  const setView = useNoorStore((s) => s.setView);
  const signIn = useNoorStore((s) => s.signIn);

  // Auto-restore user from cookie on mount — so users stay logged in across reloads.
  useEffect(() => {
    fetch("/api/auth/me", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        if (data.ok && data.user) {
          signIn(data.user);
          // کاربران لاگین‌شده روی لندینگ می‌مانند — خودشان انتخاب می‌کنند کجا بروند
        }
      })
      .catch(() => {
        // Not logged in — silently ignore; user can still use landing page.
      });
  }, [signIn, view, setView]);

  // Guard: protected views require a user
  useEffect(() => {
    const needsAuth =
      view === "dashboard" ||
      view === "create-session" ||
      view === "session-room" ||
      view === "results" ||
      view === "lounge" ||
      view === "lounge-room" ||
      view === "challenge";
    if (needsAuth && !user) {
      setView("auth");
    }
  }, [view, user, setView]);

  // Hide footer for immersive views
  const immersive = view === "session-room";

  return (
    <div className="flex min-h-screen flex-col">
      <NoorHeader />
      <main className="flex-1">
        <ErrorBoundary>
          <AnimatePresence mode="wait">
            <motion.div
              key={view}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25 }}
            >
              {view === "landing" && <LandingView />}
              {view === "auth" && <AuthView />}
              {view === "dashboard" && user && <DashboardView />}
              {view === "sessions" && <SessionsView />}
              {view === "create-session" && user && <CreateSessionView />}
              {view === "session-room" && user && <SessionRoomView />}
              {view === "results" && user && <ResultsView />}
              {view === "lounge" && user && <LoungeView />}
              {view === "lounge-room" && user && <LoungeRoomView />}
              {view === "challenge" && user && <ChallengeView />}
              {view === "blog" && <BlogView />}
              {view === "blog-post" && <BlogView />}
              {view === "admin" && user && <AdminView />}
            </motion.div>
          </AnimatePresence>
        </ErrorBoundary>
      </main>
      {!immersive && <NoorFooter />}
    </div>
  );
}
