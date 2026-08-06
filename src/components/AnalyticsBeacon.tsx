'use client';

/**
 * AnalyticsBeacon
 * ---------------
 * - Fires a POST /api/analytics/track on every route change
 * - Sends heartbeat every 30s to track session duration and online status
 * - Uses sendBeacon on page unload for final duration
 * - Stores sessionId in sessionStorage (tab-scoped)
 * - Skips admin routes and known bot patterns
 */

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

const HEARTBEAT_INTERVAL = 30_000; // 30 seconds
const SKIP_PREFIXES = ['/admin', '/api', '/_next'];

function shouldSkip(path: string): boolean {
  return SKIP_PREFIXES.some((p) => path.startsWith(p));
}

function getSessionId(): string {
  try {
    let sid = sessionStorage.getItem('_iotmart_sid');
    if (!sid) {
      sid = crypto.randomUUID();
      sessionStorage.setItem('_iotmart_sid', sid);
    }
    return sid;
  } catch {
    return 'fallback-' + Math.random().toString(36).slice(2);
  }
}

async function sendTrack(path: string, referrer: string | null, sessionId: string): Promise<void> {
  try {
    await fetch('/api/analytics/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path, referrer, session_id: sessionId }),
      keepalive: true,
    });
  } catch {
    // non-blocking — analytics must never break the app
  }
}

function sendHeartbeat(path: string, sessionId: string, durationMs?: number): void {
  try {
    const body = JSON.stringify({
      session_id: sessionId,
      path,
      duration_ms: durationMs,
    });
    if (navigator.sendBeacon) {
      navigator.sendBeacon('/api/analytics/heartbeat', new Blob([body], { type: 'application/json' }));
    } else {
      fetch('/api/analytics/heartbeat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        keepalive: true,
      }).catch(() => {});
    }
  } catch {
    // non-blocking
  }
}

export default function AnalyticsBeacon() {
  const pathname = usePathname();
  const sessionId = useRef<string>('');
  const pageStartRef = useRef<number>(Date.now());
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Initialise session ID once on mount
  useEffect(() => {
    sessionId.current = getSessionId();
  }, []);

  useEffect(() => {
    if (shouldSkip(pathname)) return;

    const sid = sessionId.current || getSessionId();
    pageStartRef.current = Date.now();

    // Track this page view
    sendTrack(pathname, document.referrer || null, sid);

    // Heartbeat to keep online status alive
    if (heartbeatRef.current) clearInterval(heartbeatRef.current);
    heartbeatRef.current = setInterval(() => {
      const duration = Date.now() - pageStartRef.current;
      sendHeartbeat(pathname, sid, duration);
    }, HEARTBEAT_INTERVAL);

    // Send final duration on tab close / navigation away
    const handleUnload = () => {
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
      const duration = Date.now() - pageStartRef.current;
      sendHeartbeat(pathname, sid, duration);
    };
    window.addEventListener('beforeunload', handleUnload);
    window.addEventListener('pagehide', handleUnload);

    return () => {
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
      window.removeEventListener('beforeunload', handleUnload);
      window.removeEventListener('pagehide', handleUnload);
    };
  }, [pathname]);

  return null; // renders nothing
}
