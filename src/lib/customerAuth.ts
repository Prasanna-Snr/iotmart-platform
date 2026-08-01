"use client";

import { useState, useEffect, useCallback } from "react";

interface CustomerUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

const TOKEN_KEY = "customer_token";
const USER_KEY  = "customer_user";

export function useCustomerAuth() {
  const [token, setTokenState] = useState<string | null>(null);
  const [user, setUserState]   = useState<CustomerUser | null>(null);
  const [ready, setReady]      = useState(false);

  useEffect(() => {
    const t = localStorage.getItem(TOKEN_KEY);
    const u = localStorage.getItem(USER_KEY);
    if (t) setTokenState(t);
    if (u) { try { setUserState(JSON.parse(u)); } catch { /* ignore */ } }
    setReady(true);
  }, []);

  const setAuth = useCallback((t: string, u: CustomerUser) => {
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

export function getCustomerToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}
