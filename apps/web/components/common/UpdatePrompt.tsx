'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Sparkles,
  RefreshCw,
  X,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  Box,
  Layers,
  ArrowRight,
} from 'lucide-react';

interface VersionInfo {
  version: string;
  buildTimestamp: string;
  highlights: string[];
}

export function UpdatePrompt() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);
  const [versionInfo, setVersionInfo] = useState<VersionInfo | null>(null);
  const [updating, setUpdating] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [showChangelog, setShowChangelog] = useState(false);

  // Trigger service worker update check
  const checkForUpdates = useCallback(async (registration?: ServiceWorkerRegistration) => {
    try {
      // 1. Trigger Service Worker update check
      if (registration) {
        await registration.update();
      }

      // 2. Query Version API
      const res = await fetch('/api/version', {
        headers: { 'Cache-Control': 'no-cache' },
      });
      if (res.ok) {
        const data: VersionInfo = await res.json();
        setVersionInfo(data);

        const currentVersion = localStorage.getItem('ica_app_version');
        if (currentVersion && currentVersion !== data.version) {
          setUpdateAvailable(true);
        }
      }
    } catch {
      // Silent error - continue offline
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return;
    }

    let regRef: ServiceWorkerRegistration | null = null;
    let refreshing = false;

    // Listen for controllerchange to reload into new SW
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!refreshing) {
        refreshing = true;
        window.location.reload();
      }
    });

    // Register Service Worker
    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .then((registration) => {
        regRef = registration;

        // Check if there is already a waiting service worker
        if (registration.waiting) {
          setWaitingWorker(registration.waiting);
          setUpdateAvailable(true);
        }

        // Listen for new worker installing
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // New worker ready to take over
                setWaitingWorker(newWorker);
                setUpdateAvailable(true);
              }
            });
          }
        });

        // Initial version check
        checkForUpdates(registration);
      })
      .catch((err) => {
        console.warn('[SW] Registration failed:', err);
      });

    // Event 1: Waking up or returning to installed PWA (visibility change)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && regRef) {
        checkForUpdates(regRef);
      }
    };

    // Event 2: Window regaining focus
    const handleFocus = () => {
      if (regRef) {
        checkForUpdates(regRef);
      }
    };

    // Event 3: Periodic check every 15 minutes
    const interval = setInterval(() => {
      if (regRef) {
        checkForUpdates(regRef);
      }
    }, 15 * 60 * 1000);

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      clearInterval(interval);
    };
  }, [checkForUpdates]);

  const handleApplyUpdate = async () => {
    setUpdating(true);

    try {
      if (versionInfo?.version) {
        localStorage.setItem('ica_app_version', versionInfo.version);
      }

      // Clear any outdated cache buckets
      if ('caches' in window) {
        const keys = await caches.keys();
        await Promise.all(
          keys
            .filter((k) => k !== `ica-v${versionInfo?.version || '1.2.0'}`)
            .map((k) => caches.delete(k))
        );
      }

      // Tell waiting service worker to skip waiting and activate
      if (waitingWorker) {
        waitingWorker.postMessage({ type: 'SKIP_WAITING' });
      } else {
        // Fallback hard reload
        window.location.reload();
      }
    } catch {
      window.location.reload();
    }
  };

  if (!updateAvailable) {
    return null;
  }

  // Minimized pill in top-right or header
  if (minimized) {
    return (
      <aside aria-label="Update notification" className="fixed top-14 right-3 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
        <button
          type="button"
          onClick={() => setMinimized(false)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/25 text-xs font-bold font-mono shadow-xl backdrop-blur-xl transition-all cursor-pointer"
        >
          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
          <span>Update Ready ({versionInfo?.version || 'v1.2'})</span>
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </aside>
    );
  }

  return (
    <aside aria-label="Update notification" className="fixed bottom-3 right-3 left-3 sm:left-auto sm:right-5 sm:bottom-5 sm:max-w-md z-50 animate-in fade-in slide-in-from-bottom-3 duration-300">
      <div className="relative rounded-2xl bg-[#0a0f1d]/95 border border-emerald-500/40 p-4 shadow-2xl shadow-emerald-950/50 backdrop-blur-2xl text-slate-100 flex flex-col gap-3 overflow-hidden">
        {/* Glow ambient background */}
        <div className="absolute -top-12 -right-12 w-28 h-28 bg-emerald-500/15 rounded-full blur-2xl pointer-events-none" />

        {/* Top Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 p-[1px] shadow-lg shadow-emerald-500/20 shrink-0">
              <div className="h-full w-full rounded-[11px] bg-[#060911] flex items-center justify-center text-emerald-400">
                <Sparkles className="w-5 h-5 animate-pulse" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-xs sm:text-sm font-bold text-white font-['Outfit']">
                  Atlas Update Available
                </h4>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-semibold">
                  {versionInfo?.version ? `v${versionInfo.version}` : 'New Release'}
                </span>
              </div>
              <p className="text-[11px] text-slate-300">
                A new version of Igbo Community Atlas is ready for this device.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setMinimized(true)}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
            aria-label="Minimize update prompt"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Feature Highlights Accordion */}
        <div className="rounded-xl bg-black/40 border border-white/[0.08] p-2.5 space-y-2">
          <button
            type="button"
            onClick={() => setShowChangelog(!showChangelog)}
            className="w-full flex items-center justify-between text-[11px] font-semibold text-emerald-300 hover:text-emerald-200 transition-colors cursor-pointer"
          >
            <span className="flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5" />
              <span>See What&apos;s New in this Version</span>
            </span>
            {showChangelog ? (
              <ChevronUp className="w-3.5 h-3.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" />
            )}
          </button>

          {showChangelog && (
            <div className="pt-2 border-t border-white/[0.06] space-y-1.5 text-[10px] text-slate-300 animate-in fade-in duration-200">
              {versionInfo?.highlights ? (
                versionInfo.highlights.map((item, idx) => (
                  <div key={idx} className="flex items-start gap-1.5">
                    <span className="text-emerald-400 mt-0.5">✦</span>
                    <span className="leading-relaxed">{item}</span>
                  </div>
                ))
              ) : (
                <>
                  <div className="flex items-start gap-1.5">
                    <ShieldCheck className="w-3 h-3 text-emerald-400 shrink-0 mt-0.5" />
                    <span>Hybrid Conservation Governance Quorum Model (25/35/50/75 votes)</span>
                  </div>
                  <div className="flex items-start gap-1.5">
                    <Box className="w-3 h-3 text-emerald-400 shrink-0 mt-0.5" />
                    <span>3D DEM terrain mesh, atmospheric sky, & volumetric settlement extrusion</span>
                  </div>
                  <div className="flex items-start gap-1.5">
                    <span className="text-emerald-400 mt-0.5">✦</span>
                    <span>Traditional 4-day market cycle & dialect parity across all 7 continua</span>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={() => setMinimized(true)}
            className="px-3 py-1.5 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
          >
            Later
          </button>

          <button
            type="button"
            disabled={updating}
            onClick={handleApplyUpdate}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:brightness-110 text-black font-bold text-xs shadow-lg shadow-emerald-500/25 active:scale-95 disabled:opacity-50 transition-all cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${updating ? 'animate-spin' : ''}`} />
            <span>{updating ? 'Applying Update...' : 'Update Now'}</span>
            {!updating && <ArrowRight className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>
    </aside>
  );
}
