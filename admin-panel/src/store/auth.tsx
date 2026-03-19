import { createContext, useContext, useMemo, useState } from "react";
import type { PropsWithChildren } from "react";
import { api } from "@/lib/api";
import type { AdminUser } from "@/types";

interface AuthContextValue {
  token: string | null;
  user: AdminUser | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: PropsWithChildren) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem("admin_token"));
  const [user, setUser] = useState<AdminUser | null>(() => {
    const raw = localStorage.getItem("admin_user");
    return raw ? (JSON.parse(raw) as AdminUser) : null;
  });

  const login = async (email: string, password: string) => {
    const { data } = await api.post("/admin/auth/login", { email, password });
    const nextToken = data?.data?.token as string;
    const nextUser = data?.data?.admin as AdminUser;
    setToken(nextToken);
    setUser(nextUser);
    localStorage.setItem("admin_token", nextToken);
    localStorage.setItem("admin_user", JSON.stringify(nextUser));
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem("admin_token");
    localStorage.removeItem("admin_user");
  };

  const value = useMemo(() => ({ token, user, login, logout }), [token, user]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}

