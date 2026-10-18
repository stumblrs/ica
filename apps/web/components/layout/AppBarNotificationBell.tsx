'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Bell, Quote, CheckCheck, X, ExternalLink, MessageSquare, MapPin, Heart } from 'lucide-react';
import { getUserProfile, type UserProfile } from '@/lib/user-profile';
import type { StoredNotification } from '@/lib/notification-store';
import { supabase } from '@/lib/supabase';

export function AppBarNotificationBell() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [notifications, setNotifications] = useState<StoredNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Load profile and fetch notifications
  useEffect(() => {
    const p = getUserProfile();
    setProfile(p);

    function fetchNotifications() {
      // Egress optimization: skip polling if tab is hidden / backgrounded
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') {
        return;
      }

      const active = getUserProfile();
      if (!active.deviceId && !active.username) return;

      const url = `/api/notifications?deviceId=${encodeURIComponent(active.deviceId || '')}${
        active.username ? `&handle=${encodeURIComponent(active.username)}` : ''
      }`;

      fetch(url)
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data && Array.isArray(data.notifications)) {
            setNotifications(data.notifications);
            setUnreadCount(data.unreadCount || 0);
          }
        })
        .catch(() => {});
    }

    fetchNotifications();

    // 1. Supabase Realtime for instant notification push without polling egress
    let notifChannel: any = null;
    try {
      const channelId = `user-notifs-${p.username || p.deviceId || 'global'}-${Math.random().toString(36).slice(2, 7)}`;
      notifChannel = supabase
        .channel(channelId)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'Notification' },
          (payload) => {
            const newNotif = payload.new as any;
            if (!newNotif) return;

            const currentProfile = getUserProfile();
            const targetUsername = (currentProfile.username || '').toLowerCase().replace(/^@+/, '');
            const targetDeviceId = currentProfile.deviceId;
            const notifHandle = (newNotif.recipientHandle || '').toLowerCase().replace(/^@+/, '');

            const isTargeted =
              (targetDeviceId && newNotif.recipientDeviceId === targetDeviceId) ||
              (targetUsername && notifHandle === targetUsername);

            if (isTargeted) {
              const parsed: StoredNotification = {
                id: String(newNotif.id),
                recipientDeviceId: newNotif.recipientDeviceId || null,
                recipientHandle: String(newNotif.recipientHandle),
                actorHandle: String(newNotif.actorHandle),
                actorName: String(newNotif.actorName),
                commentId: newNotif.commentId || null,
                communityId: newNotif.communityId || null,
                communityName: newNotif.communityName || null,
                coordinates: typeof newNotif.coordinates === 'string' ? JSON.parse(newNotif.coordinates) : newNotif.coordinates,
                snippet: String(newNotif.snippet),
                type: (newNotif.type || 'citation') as 'citation' | 'mention',
                isRead: Boolean(newNotif.isRead),
                createdAt: String(newNotif.createdAt || new Date().toISOString()),
              };
              setNotifications((prev) => [parsed, ...prev.filter((n) => n.id !== parsed.id)]);
              setUnreadCount((c) => c + 1);
            }
          }
        )
        .subscribe();
    } catch (err) {
      console.warn('[Realtime] Notifications channel setup fallback:', err);
    }

    // 2. Low-frequency fallback polling (90 seconds, only active when window is visible)
    const interval = setInterval(fetchNotifications, 90000);

    function handleVisibilityChange() {
      if (document.visibilityState === 'visible') {
        fetchNotifications();
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Close on outside click
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('mousedown', handleClickOutside);
      if (notifChannel) {
        try {
          supabase.removeChannel(notifChannel);
        } catch {}
      }
    };
  }, []);

  async function handleMarkAllRead() {
    if (!profile) return;
    try {
      await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'mark-all-read',
          deviceId: profile.deviceId,
          handle: profile.username,
        }),
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (e) {}
  }

  async function handleClickNotification(n: StoredNotification) {
    if (!n.isRead) {
      fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'mark-read', id: n.id }),
      }).catch(() => {});

      setNotifications((prev) =>
        prev.map((item) => (item.id === n.id ? { ...item, isRead: true } : item))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    }

    setIsOpen(false);

    // Dispatch event to fly to community if coordinates exist
    if (n.coordinates) {
      window.dispatchEvent(
        new CustomEvent('ica:fly-to', {
          detail: { coordinates: n.coordinates, zoom: 12, name: n.communityName },
        })
      );
    }
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-8 h-8 rounded-full flex items-center justify-center transition-all active:scale-95 relative ${
          isOpen
            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
            : 'text-[#e7e9ea] hover:bg-[#16181c]'
        }`}
        title="In-app Notifications & Citations"
        aria-label="In-app Notifications"
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full bg-rose-500 text-[9px] font-bold text-white shadow ring-2 ring-[#0a0f1d] animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Popover */}
      {isOpen && (
        <div className="absolute right-0 top-10 w-80 sm:w-96 max-h-[460px] bg-[#0a0f1d]/95 backdrop-blur-xl border border-white/[0.12] rounded-2xl shadow-2xl z-50 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          {/* Header */}
          <div className="px-4 py-3 border-b border-white/[0.08] flex items-center justify-between bg-white/[0.02]">
            <div className="flex items-center gap-2">
              <span className="font-bold text-xs sm:text-sm text-white">Notifications</span>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 text-[10px] font-mono font-bold">
                  {unreadCount} new
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAllRead}
                  className="text-[11px] text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-medium transition-colors"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  <span>Mark read</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.05]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Notifications List */}
          <div className="flex-1 overflow-y-auto divide-y divide-white/[0.05] p-1">
            {notifications.length === 0 ? (
              <div className="py-8 px-4 text-center">
                <Bell className="w-8 h-8 text-slate-600 mx-auto mb-2 opacity-50" />
                <p className="text-xs font-semibold text-slate-300">No notifications yet</p>
                <p className="text-[11px] text-slate-500 mt-1 max-w-xs mx-auto">
                  When other contributors cite your oral testimonies or mention @{profile?.username || 'your_handle'}, you will be alerted here for free.
                </p>
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => handleClickNotification(n)}
                  className={`p-3 rounded-xl cursor-pointer transition-all flex items-start gap-2.5 ${
                    !n.isRead
                      ? 'bg-emerald-500/[0.08] hover:bg-emerald-500/[0.14]'
                      : 'hover:bg-white/[0.04]'
                  }`}
                >
                  {n.type === 'like' ? (
                    <div className="p-2 rounded-xl bg-rose-500/15 text-rose-400 shrink-0 mt-0.5">
                      <Heart className="w-3.5 h-3.5 fill-rose-400" />
                    </div>
                  ) : n.type === 'mention' ? (
                    <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-400 shrink-0 mt-0.5">
                      <MessageSquare className="w-3.5 h-3.5" />
                    </div>
                  ) : (
                    <div className="p-2 rounded-xl bg-sky-500/15 text-sky-400 shrink-0 mt-0.5">
                      <Quote className="w-3.5 h-3.5" />
                    </div>
                  )}

                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-slate-200 leading-snug">
                      <strong className="text-white">{n.actorName}</strong>{' '}
                      <span className="font-mono text-emerald-400 text-[11px]">{n.actorHandle}</span>{' '}
                      {n.type === 'like'
                        ? 'liked your post'
                        : n.type === 'mention'
                        ? 'mentioned you in a note'
                        : 'cited your post'}
                    </p>

                    <p className="text-[11px] text-slate-400 italic line-clamp-2 mt-1 pl-2 border-l border-white/20">
                      "{n.snippet}"
                    </p>

                    <div className="flex items-center gap-2 mt-1.5 text-[10px] text-slate-500 font-mono">
                      <span>{new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      <span>&bull;</span>
                      <span className="text-slate-400 capitalize">{n.type}</span>
                    </div>
                  </div>

                  {!n.isRead && (
                    <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0 mt-2" />
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
