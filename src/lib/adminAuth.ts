"use client";

import { useState, useEffect, useCallback } from "react";

interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

// NOTE: Access + refresh tokens are httpOnly cookies set by the backend
// (access_token / refresh_token). Nothing secret is stored here — only the
// user profile, kept for instant UI state. The cookie is the real session.

const USER_KEY       = "admin_user";
const LOGIN_TIME_KEY = "admin_login_time";
const SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

function isSessionExpired(): boolean {
  const loginTime = localStorage.getItem(LOGIN_TIME_KEY);
  if (!loginTime) return true;
  return Date.now() - Number(loginTime) > SESSION_TTL_MS;
}

function clearStorage() {
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(LOGIN_TIME_KEY);
}

export function useAdminAuth() {
  const [user, setUserState]   = useState<AdminUser | null>(null);
  const [ready, setReady]      = useState(false);

  // Load from localStorage on mount, clear immediately if expired
  useEffect(() => {
    const u = localStorage.getItem(USER_KEY);
    if (u && !isSessionExpired()) {
      try { setUserState(JSON.parse(u)); } catch { /* ignore */ }
    } else if (u) {
      // User profile exists but session expired — clean up
      clearStorage();
    }
    setReady(true);
  }, []);

  // Check expiry every 60 seconds while tab is open
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(() => {
      if (isSessionExpired()) {
        clearStorage();
        setUserState(null);
      }
    }, 60 * 1000);
    return () => clearInterval(interval);
  }, [user]);

  const setAuth = useCallback((_t: string, u: AdminUser) => {
    localStorage.setItem(USER_KEY,       JSON.stringify(u));
    localStorage.setItem(LOGIN_TIME_KEY, String(Date.now()));
    setUserState(u);
  }, []);

  const clearAuth = useCallback(() => {
    clearStorage();
    setUserState(null);
    if (typeof window !== "undefined") {
      // Server clears the httpOnly cookies via the proxy on /api/auth/logout.
      fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    }
  }, []);

  return { user, setAuth, clearAuth, ready };
}

// For components that gate UI on login state outside React hooks.
export function getAdminSession(): AdminUser | null {
  if (typeof window === "undefined") return null;
  const u = localStorage.getItem(USER_KEY);
  if (!u) return null;
  if (isSessionExpired()) {
    clearStorage();
    return null;
  }
  try { return JSON.parse(u); } catch { return null; }
}

// Deprecated: tokens are httpOnly cookies now, never stored in localStorage.
export function getAdminToken(): string | null {
  return null;
}
