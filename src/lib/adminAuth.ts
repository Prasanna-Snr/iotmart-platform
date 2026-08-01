"use client";

import { useState, useEffect, useCallback } from "react";

interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

const TOKEN_KEY = "admin_token";
const USER_KEY  = "admin_user";

export function useAdminAuth() {
  const [token, setTokenState] = useState<string | null>(null);
  const [user, setUserState]   = useState<AdminUser | null>(null);
  const [ready, setReady]      = useState(false);

  useEffect(() => {
    const t = localStorage.getItem(TOKEN_KEY);
    const u = localStorage.getItem(USER_KEY);
    if (t) setTokenState(t);
    if (u) { try { setUserState(JSON.parse(u)); } catch { /* ignore */ } }
    setReady(true);
  }, []);

  const setAuth = useCallback((t: string, u: AdminUser) => {
    localStorage.setItem(TOKEN_KEY, t);
    localStorage.setItem(USER_KEY, JSON.stringify(u));
    setTokenState(t);
    setUserState(u);
  }, []);

  const clearAuth = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setTokenState(null);
    setUserState(null);
  }, []);

  return { token, user, setAuth, clearAuth, ready };
}

// Plain getter for use outside React components (e.g. API calls)
export function getAdminToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}
