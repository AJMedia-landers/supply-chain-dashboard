"use client";
import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import type { User } from "@/types";
import * as authApi from "@/lib/auth.api";

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (data: {
    first_name: string;
    last_name: string;
    email: string;
    password: string;
  }) => Promise<{ email: string; verification_required: boolean }>;
  verifyEmail: (email: string, code: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Bootstrap: handles three cases in order —
  //   1. ?token=... in the URL → one-time login token, exchange it for a JWT.
  //   2. existing JWT in localStorage → validate via /auth/profile.
  //   3. no auth → leave logged-out.
  useEffect(() => {
    let cancelled = false;

    const stripTokenFromUrl = () => {
      const params = new URLSearchParams(window.location.search);
      if (!params.has("token")) return;
      params.delete("token");
      const search = params.toString();
      const url =
        window.location.pathname +
        (search ? `?${search}` : "") +
        window.location.hash;
      window.history.replaceState(null, "", url);
    };

    (async () => {
      const urlToken = new URLSearchParams(window.location.search).get("token");
      // Strip immediately so a hard refresh doesn't re-trigger the exchange.
      stripTokenFromUrl();

      if (urlToken) {
        try {
          const res = await authApi.loginWithToken(urlToken);
          const { user: u, token: t } = res.data.data;
          localStorage.setItem("token", t);
          if (!cancelled) {
            setToken(t);
            setUser(u);
            setIsLoading(false);
          }
          return;
        } catch {
          // fall through to the existing-token path
        }
      }

      const existing = localStorage.getItem("token");
      if (!existing) {
        if (!cancelled) setIsLoading(false);
        return;
      }

      if (!cancelled) setToken(existing);

      try {
        const res = await authApi.getProfile();
        if (!cancelled) setUser(res.data.data.user);
      } catch {
        localStorage.removeItem("token");
        if (!cancelled) {
          setToken(null);
          setUser(null);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await authApi.login(email, password);
    const { user: u, token: t } = res.data.data;
    localStorage.setItem("token", t);
    setToken(t);
    setUser(u);
  }, []);

  const signup = useCallback(
    async (data: {
      first_name: string;
      last_name: string;
      email: string;
      password: string;
    }) => {
      // Signup no longer auto-logs-in — user must verify email first.
      const res = await authApi.signup(data);
      return res.data.data;
    },
    []
  );

  const verifyEmail = useCallback(async (email: string, code: string) => {
    const res = await authApi.verifyEmail(email, code);
    const { user: u, token: t } = res.data.data;
    localStorage.setItem("token", t);
    setToken(t);
    setUser(u);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("token");
    setToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isAuthenticated: !!user,
        login,
        signup,
        verifyEmail,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
