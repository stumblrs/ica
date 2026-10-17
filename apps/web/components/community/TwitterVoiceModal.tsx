'use client';

import React, { useState, useEffect } from 'react';
import { X, Send, AlertCircle, Loader2 } from 'lucide-react';
import type { CommunitySummary } from '@/components/map/AtlasOverview';
import type { SelectedFeature } from '@/components/map/MapContainer';
import { getUserProfile, type UserProfile } from '@/lib/user-profile';
import { getOrCreateDeviceId, getDeviceFingerprintSync } from '@/lib/device';

interface TwitterVoiceModalProps {
  /** @deprecated Comments are global; no longer used. */
  communities?: CommunitySummary[];
  /** @deprecated Comments are global; no longer used. */
  selectedFeature?: SelectedFeature | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function TwitterVoiceModal({ onClose, onSuccess }: TwitterVoiceModalProps) {
  const [authorName, setAuthorName] = useState('');
  const [authorHandle, setAuthorHandle] = useState('');
  const [affiliation, setAffiliation] = useState('Indigene / Elder');
  const [commentText, setCommentText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [profile, setProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    const p = getUserProfile();
    setProfile(p);
    if (p.displayName) setAuthorName(p.displayName);
    if (p.username) setAuthorHandle(`@${p.username}`);

    function handleProfileUpdate(e: Event) {
      const customEvent = e as CustomEvent<UserProfile>;
      const updated = customEvent.detail || getUserProfile();
      setProfile(updated);
      if (updated.displayName) setAuthorName(updated.displayName);
      if (updated.username) setAuthorHandle(`@${updated.username}`);
    }

    window.addEventListener('ica:profile-updated', handleProfileUpdate);
    return () => window.removeEventListener('ica:profile-updated', handleProfileUpdate);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!commentText.trim()) {
      setError('Please write your note before posting.');
      return;
    }

    const effectiveDeviceId = profile?.deviceId || getOrCreateDeviceId();
    const effectiveFingerprint = profile?.fingerprintHash || getDeviceFingerprintSync();
    const finalAuthor = profile?.displayName || authorName.trim() || 'Contributor';
    const finalHandle = profile?.username ? `@${profile.username}` : (authorHandle.trim() || undefined);

    try {
      setSubmitting(true);
      setError(null);

      const res = await fetch('/api/comments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-device-id': effectiveDeviceId,
          ...(effectiveFingerprint ? { 'x-device-fingerprint': effectiveFingerprint } : {}),
        },
        body: JSON.stringify({
          authorName: finalAuthor,
          handle: finalHandle,
          affiliation: affiliation.trim() || undefined,
          comment: commentText.trim(),
        }),
      });

      if (res.ok) {
        const newCmt = await res.json().catch(() => null);
        if (newCmt) {
          window.dispatchEvent(new CustomEvent('ica:comment-posted', { detail: newCmt }));
        }
        onSuccess();
        onClose();
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error || 'Failed to post note to database.');
      }
    } catch (err: any) {
      setError(err.message || 'Network error occurred. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  const charCount = commentText.length;
  const maxChars = 600;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-3 sm:p-4 pt-4 sm:pt-10 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-lg bg-[#000000] border border-[#2f3336] rounded-2xl shadow-2xl flex flex-col max-h-[92dvh] overflow-hidden animate-in slide-in-from-top-4 duration-200 z-10">
        {/* Top Navigation Bar */}
        <div className="h-[48px] px-4 border-b border-[#2f3336] flex items-center justify-between shrink-0 bg-[#000000]/95 backdrop-blur-md">
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-[#71767b] hover:text-white hover:bg-[#16181c] active:scale-95 transition-all"
            aria-label="Cancel"
          >
            <X className="w-5 h-5" />
          </button>

          <span className="text-xs font-mono font-semibold text-emerald-400 uppercase tracking-wider">
            Share Note
          </span>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting || !commentText.trim()}
            className="px-4 py-1.5 rounded-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-45 disabled:pointer-events-none text-black font-bold text-xs shadow-md shadow-emerald-500/20 active:scale-95 transition-all flex items-center gap-1.5"
          >
            {submitting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Send className="w-3.5 h-3.5 fill-black stroke-black" />
            )}
            <span>Post</span>
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Main Content Area */}
          <div className="flex gap-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-400 p-[1.5px] shrink-0 mt-1">
              <div className="w-full h-full rounded-full bg-[#000000] flex items-center justify-center font-mono text-xs font-bold text-emerald-300">
                {authorName ? authorName[0].toUpperCase() : 'Ụ'}
              </div>
            </div>

            <div className="flex-1 flex flex-col gap-2">
              <textarea
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Share your note, history, testimony, clan lore, or proverb..."
                rows={4}
                maxLength={maxChars}
                className="w-full bg-transparent text-[#e7e9ea] placeholder-[#71767b] text-sm resize-none focus:outline-none leading-relaxed"
                autoFocus
              />

              {/* Contributor Details row */}
              {profile?.username ? (
                <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-white/[0.04] border border-emerald-500/30 text-xs mt-1">
                  <div className="flex items-center gap-2">
                    <span className="h-6 w-6 rounded-full bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center text-xs">
                      {profile.avatarSymbol || 'ọ'}
                    </span>
                    <div className="flex flex-col">
                      <span className="font-semibold text-white leading-tight">
                        {profile.displayName || `@${profile.username}`}
                      </span>
                      <span className="text-[10px] text-emerald-400 font-mono">
                        @{profile.username} • Linked to Device
                      </span>
                    </div>
                  </div>
                  <span className="text-[10px] text-slate-400 bg-white/[0.06] px-2 py-0.5 rounded-full font-mono">
                    Auto-Signed
                  </span>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#2f3336]/60">
                  <input
                    type="text"
                    placeholder="Your Name (Optional)"
                    value={authorName}
                    onChange={(e) => setAuthorName(e.target.value)}
                    className="bg-[#16181c] border border-[#2f3336] rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-[#71767b] focus:outline-none focus:border-emerald-500"
                  />
                  <input
                    type="text"
                    placeholder="@handle (Optional)"
                    value={authorHandle}
                    onChange={(e) => setAuthorHandle(e.target.value)}
                    className="bg-[#16181c] border border-[#2f3336] rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-[#71767b] focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Character counter / Progress */}
          <div className="flex items-center justify-between pt-2 border-t border-[#2f3336] text-[11px] text-[#71767b] font-mono">
            <span>Igbo Cultural Atlas Archive Protocol</span>
            <span className={charCount > maxChars * 0.9 ? 'text-amber-400 font-bold' : ''}>
              {charCount} / {maxChars}
            </span>
          </div>
        </form>
      </div>
    </div>
  );
}
