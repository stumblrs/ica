'use client';

import React, { useState, useEffect } from 'react';
import { Download, X, Share } from 'lucide-react';

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // 1. Never show if already running in standalone mode (installed as PWA)
    const isStandalone =
      (window.navigator as any).standalone === true ||
      window.matchMedia('(display-mode: standalone)').matches ||
      window.matchMedia('(display-mode: fullscreen)').matches ||
      window.matchMedia('(display-mode: minimal-ui)').matches;

    if (isStandalone) {
      return;
    }

    // 2. Never show if recorded as already installed or dismissed
    if (
      localStorage.getItem('ica_app_installed') === 'true' ||
      sessionStorage.getItem('ica_install_dismissed') === 'true'
    ) {
      return;
    }

    // 3. Screen detection: Only show on tablets and phones (small/touch screens, max-width < 1024px)
    // Tablets and phones typically have max width < 1024px or match pointer: coarse
    const checkIsSmallScreen = () => {
      const isNarrowWidth = window.innerWidth < 1024;
      const isTouchDevice = window.matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
      return isNarrowWidth || isTouchDevice;
    };

    if (!checkIsSmallScreen()) {
      return;
    }

    // Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);

    if (isIosDevice) {
      setIsIOS(true);
      // Show prompt after a slight delay on iOS mobile/tablet
      const timer = setTimeout(() => {
        if (checkIsSmallScreen()) {
          setShowPrompt(true);
        }
      }, 1500);
      return () => clearTimeout(timer);
    }

    // Android / Chromium beforeinstallprompt event
    const handleBeforeInstall = (e: Event) => {
      if (!checkIsSmallScreen()) return;
      e.preventDefault();
      setDeferredPrompt(e);
      setShowPrompt(true);
    };

    // App installed event listener
    const handleAppInstalled = () => {
      setShowPrompt(false);
      localStorage.setItem('ica_app_installed', 'true');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowPrompt(false);
      localStorage.setItem('ica_app_installed', 'true');
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    sessionStorage.setItem('ica_install_dismissed', 'true');
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-3 left-3 right-3 sm:bottom-4 sm:right-4 sm:left-4 lg:hidden z-50 animate-in fade-in slide-in-from-bottom-3 duration-300">
      <div className="glass-panel rounded-2xl p-3.5 sm:p-4 shadow-2xl border-emerald-500/40 bg-[#0a0f1d]/95 backdrop-blur-2xl flex items-center justify-between gap-3">
        {/* App Icon */}
        <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-400 p-[1.5px] shadow-lg shadow-emerald-500/25 shrink-0">
          <div className="h-full w-full rounded-[10px] bg-[#060911] flex items-center justify-center font-bold text-emerald-400 text-lg font-['Outfit']">
            ọ
          </div>
        </div>

        {/* Text */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <h4 className="text-xs font-bold text-white truncate font-['Outfit']">
              Install Igbo Atlas App
            </h4>
            <span className="text-[9px] uppercase font-mono px-1 py-0.2 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 font-semibold">
              App
            </span>
          </div>
          <p className="text-[10px] text-slate-300 truncate mt-0.5">
            {isIOS
              ? 'Tap Share then "Add to Home Screen"'
              : 'Add to Home Screen for full native experience'}
          </p>
        </div>

        {/* Action Button */}
        <div className="flex items-center gap-1.5 shrink-0">
          {isIOS ? (
            <div className="flex items-center gap-1 text-[11px] text-emerald-400 font-semibold px-2.5 py-1.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30">
              <Share className="w-3.5 h-3.5" />
              <span>Share</span>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleInstallClick}
              className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs flex items-center gap-1.5 shadow-md shadow-emerald-500/20 transition-all"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Install</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleDismiss}
            className="p-1 rounded-lg text-slate-400 hover:text-white"
            aria-label="Dismiss app install prompt"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
