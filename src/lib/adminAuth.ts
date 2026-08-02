"use client";

import { useState, useEffect, useCallback } from "react";

interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

const TOKEN_KEY      = "admin_token";
const USER_KEY       = "admin_user";
const LOGIN_TIME_KEY = "admin_login_time";
const SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

function isSessionExpired(): boolean {
  const loginTime = localStorage.getItem(LOGIN_TIME_KEY);
  if (!loginTime) return true;
  return Date.now() - Number(loginTime) > SESSION_TTL_MS;
}

function clearStorage() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(LOGIN_TIME_KEY);
}

export function useAdminAuth() {
  const [token, setTokenState] = useState<string | null>(null);
  const [user, setUserState]   = useState<AdminUser | null>(null);
  const [ready, setReady]      = useState(false);

  // Load from localStorage on mount, clear immediately if expired
  useEffect(() => {
    const t = localStorage.getItem(TOKEN_KEY);
    const u = localStorage.getItem(USER_KEY);

    if (t && !isSessionExpired()) {
      setTokenState(t);
      if (u) { try { setUserState(JSON.parse(u)); } catch { /* ignore */ } }
    } else if (t) {
      // Token exists but session expired — clean up
      clearStorage();
    }
    setReady(true);
  }, []);

  // Check expiry every 60 seconds while tab is open
  useEffect(() => {
    if (!token) return;
    const interval = setInterval(() => {
      if (isSessionExpired()) {
        clearStorage();
        setTokenState(null);
        setUserState(null);
      }
    }, 60 * 1000);
    return () => clearInterval(interval);
  }, [token]);

  const setAuth = useCallback((t: string, u: AdminUser) => {
    localStorage.setItem(TOKEN_KEY,      t);
    localStorage.setItem(USER_KEY,       JSON.stringify(u));
    localStorage.setItem(LOGIN_TIME_KEY, String(Date.now()));
    setTokenState(t);
    setUserState(u);
  }, []);

  const clearAuth = useCallback(() => {
    clearStorage();
    setTokenState(null);
    setUserState(null);
  }, []);

  return { token, user, setAuth, clearAuth, ready };
}

// Plain getter for use outside React components (e.g. API calls)
export function getAdminToken(): string | null {
  if (typeof window === "undefined") return null;
  const t = localStorage.getItem(TOKEN_KEY);
  if (!t) return null;
  if (isSessionExpired()) {
    clearStorage();
    return null;
  }
  return t;
}
