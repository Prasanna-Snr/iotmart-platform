'use client';

import { useReportWebVitals } from 'next/web-vitals';

export default function WebVitals() {
  useReportWebVitals((metric) => {
    // In production, send to your analytics endpoint
    if (process.env.NODE_ENV === 'production') {
      const body = JSON.stringify(metric);
      const url = '/api/vitals'; // create this endpoint when ready
      // Use sendBeacon when available for non-blocking delivery
      if (navigator.sendBeacon) {
        navigator.sendBeacon(url, body);
      } else {
        fetch(url, { body, method: 'POST', keepalive: true });
      }
    } else {
      // Log in development for debugging
      console.log('[WebVitals]', metric.name, Math.round(metric.value), metric.rating);
    }
  });
  return null;
}
