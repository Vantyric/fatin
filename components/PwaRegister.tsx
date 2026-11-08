"use client";

import { useEffect } from "react";

export function PwaRegister() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }

    // In development: actively unregister all existing service workers and delete caches
    // to prevent any hydration freeze, blocked clicks, or stale chunks.
    if (process.env.NODE_ENV !== "production") {
      navigator.serviceWorker
        .getRegistrations()
        .then((registrations) => {
          for (const reg of registrations) {
            reg.unregister();
          }
        })
        .catch(() => {});

      if ("caches" in window) {
        window.caches
          .keys()
          .then((keys) => {
            for (const key of keys) {
              window.caches.delete(key);
            }
          })
          .catch(() => {});
      }
      return;
    }

    // In production: safely register the service worker
    navigator.serviceWorker
      .register("/sw.js")
      .then((reg) => {
        reg.update().catch(() => {});
      })
      .catch(() => {
        // Gracefully continue without PWA if blocked by sandbox or browser settings
      });
  }, []);

  return null;
}
