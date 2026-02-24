"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { api, type MeResponse } from "@/lib/api/client";
import { clearAccessToken, getAccessToken, setAccessToken } from "@/lib/auth/token";

type AuthState = {
  user: MeResponse | null;
  loading: boolean;
};

type AuthContextValue = AuthState & {
  login: (accessToken: string) => Promise<void>;
  switchRole: (role: "learner" | "teacher" | "admin") => Promise<boolean>;
  logout: () => void;
  refetchMe: (opts?: { clearTokenOnError?: boolean }) => Promise<boolean>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<MeResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const refetchMe = useCallback(async (opts?: { clearTokenOnError?: boolean }) => {
    const clearOnError = opts?.clearTokenOnError !== false;
    const token = getAccessToken();
    if (!token) {
      setUser(null);
      return false;
    }
    try {
      const me = await api.auth.getMe();
      setUser(me);
      return true;
    } catch {
      if (clearOnError) {
        clearAccessToken();
      }
      setUser(null);
      return false;
    }
  }, []);

  const login = useCallback(
    async (accessToken: string) => {
      setAccessToken(accessToken);
      let ok = await refetchMe({ clearTokenOnError: false });
      if (!ok && getAccessToken()) {
        await new Promise((r) => setTimeout(r, 500));
        await refetchMe({ clearTokenOnError: false });
      }
    },
    [refetchMe]
  );

  const switchRole = useCallback(
    async (role: "learner" | "teacher" | "admin") => {
      try {
        const res = await api.auth.setActiveRole(role);
        setAccessToken(res.access_token);
        return refetchMe({ clearTokenOnError: false });
      } catch {
        return false;
      }
    },
    [refetchMe]
  );

  const logout = useCallback(() => {
    clearAccessToken();
    setUser(null);
  }, []);

  useEffect(() => {
    const token = getAccessToken();
    if (!token) {
      setLoading(false);
      return;
    }
    refetchMe()
      .finally(() => setLoading(false));
  }, [refetchMe]);

  const value: AuthContextValue = {
    user,
    loading,
    login,
    switchRole,
    logout,
    refetchMe,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
