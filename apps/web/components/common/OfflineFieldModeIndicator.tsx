'use client';

import React, { useState, useEffect } from 'react';
import {
  Wifi,
  WifiOff,
  Download,
  HardDrive,
  CheckCircle2,
  RefreshCw,
  X,
  AlertTriangle,
  Trash2,
  Sparkles,
  MapPin,
  Compass,
} from 'lucide-react';
import {
  cacheAtlasForOffline,
  getOfflineStorageStats,
  clearOfflineStorage,
  syncPendingOfflineContributions,
  type OfflineStorageStats,
} from '@/lib/offlineStorage';

export function OfflineFieldModeIndicator() {
  const [isOnline, setIsOnline] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [progressPct, setProgressPct] = useState(0);
  const [progressMsg, setProgressMsg] = useState('');
  const [stats, setStats] = useState<OfflineStorageStats>({
    isAvailable: false,
    communitiesCount: 0,
    settlementsCount: 0,
    landmarksCount: 0,
    pendingSyncCount: 0,
    lastSyncTimestamp: null,
    estimatedSizeMB: 0,
  });

  const refreshStats = async () => {
    const s = await getOfflineStorageStats();
    setStats(s);
  };

  useEffect(() => {
    setIsOnline(navigator.onLine);

    const handleOnline = async () => {
      setIsOnline(true);
      await refreshStats();
      // Auto-sync pending offline field contributions when back online
      const s = await getOfflineStorageStats();
      if (s.pendingSyncCount > 0) {
        setSyncing(true);
        setProgressPct(40);
        setProgressMsg(`Auto-syncing ${s.pendingSyncCount} offline field contribution(s)...`);
        await syncPendingOfflineContributions();
        setSyncing(false);
        setProgressMsg('Contributions synced successfully!');
        setTimeout(() => setProgressMsg(''), 2500);
        await refreshStats();
      }
    };
    const handleOffline = () => {
      setIsOnline(false);
      refreshStats();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    refreshStats();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleSyncPendingNow = async () => {
    if (!isOnline) return;
    setSyncing(true);
    setProgressPct(50);
    setProgressMsg(`Syncing ${stats.pendingSyncCount} offline record(s) to server...`);
    const res = await syncPendingOfflineContributions();
    setSyncing(false);
    if (res.success) {
      setProgressMsg(`Synced ${res.syncedCount} record(s)!`);
      setTimeout(() => setProgressMsg(''), 2500);
    } else {
      setProgressMsg(res.error || 'Sync error');
    }
    await refreshStats();
  };

  const handleDownload = async () => {
    setSyncing(true);
    setProgressPct(5);
    setProgressMsg('Initializing field pack download...');

    const res = await cacheAtlasForOffline((pct, msg) => {
      setProgressPct(pct);
      setProgressMsg(msg);
    });

    setSyncing(false);
    refreshStats();

    if (res.success) {
      setTimeout(() => {
        setProgressMsg('');
        setProgressPct(0);
      }, 2500);
    }
  };

  const handleClear = async () => {
    if (confirm('Clear offline database? You will need internet to browse when disconnected.')) {
      await clearOfflineStorage();
      refreshStats();
    }
  };

  const hasOfflinePack = stats.settlementsCount > 0 || stats.communitiesCount > 0;

  return (
    <>
      {/* Header Pill Button */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono transition-all cursor-pointer ${
          !isOnline
            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-lg shadow-amber-950/40'
            : hasOfflinePack
            ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/20'
            : 'bg-white/[0.04] text-slate-300 border border-white/[0.08] hover:bg-white/[0.08]'
        }`}
        title={!isOnline ? 'Offline Field Mode Active' : 'Offline Storage & Field Pack'}
      >
        {!isOnline ? (
          <>
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-ping" />
            <WifiOff className="w-3.5 h-3.5 text-amber-400" />
            <span className="font-bold">Offline Field Mode</span>
            {stats.pendingSyncCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-amber-500/30 text-amber-200 text-[10px] font-bold">
                {stats.pendingSyncCount} pending
              </span>
            )}
          </>
        ) : stats.pendingSyncCount > 0 ? (
          <>
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" />
            <RefreshCw className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-cyan-300 font-bold">{stats.pendingSyncCount} to sync</span>
          </>
        ) : hasOfflinePack ? (
          <>
            <HardDrive className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">Offline Ready</span>
            <span className="text-[10px] text-emerald-400 font-bold">✓</span>
          </>
        ) : (
          <>
            <Download className="w-3.5 h-3.5 text-slate-400" />
            <span className="hidden sm:inline">Download Field Pack</span>
          </>
        )}
      </button>

      {/* Offline Field Pack Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-md bg-[#0a0f1d] border border-emerald-500/30 rounded-2xl shadow-2xl shadow-emerald-950/50 overflow-hidden flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/[0.08] bg-emerald-500/[0.04]">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
                  {!isOnline ? <WifiOff className="w-5 h-5 text-amber-400" /> : <HardDrive className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    Offline Field Mode
                    <span
                      className={`text-[9px] font-mono px-2 py-0.5 rounded-full font-semibold border ${
                        !isOnline
                          ? 'bg-amber-400/20 text-amber-300 border-amber-400/30'
                          : hasOfflinePack
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                          : 'bg-slate-700/50 text-slate-400 border-white/10'
                      }`}
                    >
                      {!isOnline ? 'Disconnected' : hasOfflinePack ? 'Package Cached' : 'Not Cached'}
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Full spatial atlas for low-connectivity rural communities
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 space-y-4 text-xs">
              {/* Network Status Card */}
              <div
                className={`p-3 rounded-xl border flex items-center justify-between gap-3 ${
                  !isOnline
                    ? 'bg-amber-500/10 border-amber-500/30 text-amber-200'
                    : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-200'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  {!isOnline ? (
                    <WifiOff className="w-4 h-4 text-amber-400 shrink-0" />
                  ) : (
                    <Wifi className="w-4 h-4 text-emerald-400 shrink-0" />
                  )}
                  <div>
                    <div className="font-bold text-white">
                      {!isOnline ? 'Device is Currently Offline' : 'Connected to Network'}
                    </div>
                    <div className="text-[10px] text-slate-300">
                      {!isOnline
                        ? 'Serving communities and coordinates directly from local IndexedDB storage.'
                        : 'You can download the full offline pack to use the atlas without cellular data.'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Offline Storage Metrics */}
              <div className="grid grid-cols-4 gap-1.5">
                <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06] text-center space-y-0.5">
                  <MapPin className="w-3.5 h-3.5 text-emerald-400 mx-auto" />
                  <div className="text-xs font-bold text-white font-mono">
                    {stats.communitiesCount || stats.settlementsCount || 0}
                  </div>
                  <div className="text-[8.5px] text-slate-400">Settlements</div>
                </div>

                <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06] text-center space-y-0.5">
                  <Compass className="w-3.5 h-3.5 text-teal-400 mx-auto" />
                  <div className="text-xs font-bold text-white font-mono">7 / 7</div>
                  <div className="text-[8.5px] text-slate-400">Continua</div>
                </div>

                <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06] text-center space-y-0.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400 mx-auto" />
                  <div className="text-xs font-bold text-white font-mono">
                    {stats.landmarksCount}
                  </div>
                  <div className="text-[8.5px] text-slate-400">Landmarks</div>
                </div>

                <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06] text-center space-y-0.5">
                  <HardDrive className="w-3.5 h-3.5 text-purple-400 mx-auto" />
                  <div className="text-xs font-bold text-white font-mono">
                    {hasOfflinePack ? `${stats.estimatedSizeMB}M` : '0M'}
                  </div>
                  <div className="text-[8.5px] text-slate-400">Cache Size</div>
                </div>
              </div>

              {/* Pending Offline Contributions Alert & Action */}
              {stats.pendingSyncCount > 0 && (
                <div className="p-3 rounded-xl bg-cyan-950/30 border border-cyan-500/40 flex items-center justify-between gap-3">
                  <div>
                    <div className="text-xs font-bold text-cyan-200 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                      <span>{stats.pendingSyncCount} Field Contribution(s) Pending</span>
                    </div>
                    <div className="text-[10px] text-cyan-300/70">
                      Recorded locally while offline. Ready for server sync.
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={syncing || !isOnline}
                    onClick={handleSyncPendingNow}
                    className="px-3 py-1.5 rounded-lg bg-cyan-500/25 hover:bg-cyan-500/40 border border-cyan-400/50 text-cyan-200 text-xs font-bold transition-all disabled:opacity-50 shrink-0"
                  >
                    Sync Now
                  </button>
                </div>
              )}

              {/* Feature Checklist */}
              <div className="p-3 rounded-xl bg-black/40 border border-white/[0.06] space-y-2">
                <div className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Offline Capabilities Included:</span>
                </div>
                <div className="space-y-1.5 text-[10px] text-slate-400">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                    <span>Search and inspect ancestral communities across all 37 States & 774 LGAs</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                    <span>Traditional 4-day market cycle calculation (Eke, Orie, Afọ, Nkwọ)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                    <span>Kindred (Ụmụnna) village landmarks and sacred grove coordinates</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                    <span>Dialect greetings and oral history records</span>
                  </div>
                </div>
              </div>

              {/* Progress Bar (During Sync) */}
              {syncing && (
                <div className="space-y-1.5 p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/30">
                  <div className="flex items-center justify-between text-[11px] font-mono">
                    <span className="text-emerald-300 font-semibold">{progressMsg}</span>
                    <span className="text-white font-bold">{progressPct}%</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-300"
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/[0.08]">
                {hasOfflinePack ? (
                  <button
                    type="button"
                    onClick={handleClear}
                    disabled={syncing}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Clear Cache</span>
                  </button>
                ) : (
                  <div className="text-[10px] text-slate-500 font-mono">
                    Zero offline data stored
                  </div>
                )}

                <button
                  type="button"
                  disabled={syncing || !isOnline}
                  onClick={handleDownload}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:brightness-110 text-black font-bold text-xs shadow-lg shadow-emerald-500/25 active:scale-95 disabled:opacity-50 transition-all cursor-pointer ml-auto"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
                  <span>
                    {syncing
                      ? 'Downloading Field Pack...'
                      : hasOfflinePack
                      ? 'Re-Sync Offline Data'
                      : 'Download Field Pack'}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
