'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  MapPin,
  Sparkles,
  Send,
  Search,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import type { CommunitySummary } from '@/components/map/AtlasOverview';
import type { SelectedFeature } from '@/components/map/MapContainer';
import { getUserProfile, type UserProfile } from '@/lib/user-profile';
import { getOrCreateDeviceId, getDeviceFingerprintSync } from '@/lib/device';

interface TwitterVoiceModalProps {
  communities: CommunitySummary[];
  selectedFeature?: SelectedFeature | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function TwitterVoiceModal({
  communities,
  selectedFeature,
  onClose,
  onSuccess,
}: TwitterVoiceModalProps) {
  // Find initial community if matched with selectedFeature
  const initialCommunity = useMemo(() => {
    if (selectedFeature?.name) {
      return communities.find(
        (c) => c.name.toLowerCase() === selectedFeature.name.toLowerCase()
      );
    }
    return undefined;
  }, [communities, selectedFeature]);

  const [selectedCommId, setSelectedCommId] = useState<string>(
    initialCommunity?.id || ''
  );
  const [authorName, setAuthorName] = useState('');
  const [authorHandle, setAuthorHandle] = useState('');
  const [affiliation, setAffiliation] = useState('Indigene / Elder');
  const [category, setCategory] = useState<'oral-history' | 'dialect' | 'lineage' | 'tradition' | 'general'>('oral-history');
  const [commentText, setCommentText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Community picker search
  const [isPickerOpen, setIsPickerOpen] = useState(!initialCommunity);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredCommunities = useMemo(() => {
    if (!searchQuery.trim()) return communities.slice(0, 15);
    const q = searchQuery.toLowerCase();
    return communities
      .filter((c) => c.name.toLowerCase().includes(q) || c.stateName?.toLowerCase().includes(q))
      .slice(0, 20);
  }, [communities, searchQuery]);

  const selectedCommunity = useMemo(
    () => communities.find((c) => c.id === selectedCommId),
    [communities, selectedCommId]
  );

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
      setError('Please write an oral history, proverb, or testimony.');
      return;
    }
    if (!selectedCommId) {
      setError('Please select a community to tag.');
      setIsPickerOpen(true);
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
          communityId: selectedCommId,
          authorName: finalAuthor,
          handle: finalHandle,
          affiliation: affiliation.trim() || undefined,
          category,
          comment: commentText.trim(),
          deviceId: effectiveDeviceId,
          fingerprintHash: effectiveFingerprint || undefined,
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
        setError(data.error || 'Failed to post comment');
      }
    } catch (err: any) {
      setError(err.message || 'Network error occurred');
    } finally {
      setSubmitting(false);
    }
  }

  const charCount = commentText.length;
  const maxChars = 600;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/75 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-lg bg-[#000000] border border-[#2f3336] rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[92dvh] overflow-hidden animate-in slide-in-from-bottom-6 duration-200">
        {/* Top Twitter Navigation Bar */}
        <div className="h-[52px] px-4 border-b border-[#2f3336] flex items-center justify-between shrink-0 bg-[#000000]/95 backdrop-blur-md">
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-[#71767b] hover:text-white hover:bg-[#16181c] active:scale-95 transition-all"
            aria-label="Cancel"
          >
            <X className="w-5 h-5" />
          </button>

          <span className="text-xs font-mono font-semibold text-[#71767b] uppercase tracking-wider">
            Oral Testimony
          </span>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting || !commentText.trim() || !selectedCommId}
            className="px-4 py-1.5 rounded-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-45 disabled:pointer-events-none text-black font-bold text-xs shadow-md shadow-emerald-500/20 active:scale-95 transition-all flex items-center gap-1.5"
          >
            {submitting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Send className="w-3.5 h-3.5 fill-black stroke-black" />
            )}
            <span>Post Voice</span>
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

          {/* Community Tag Pill */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-[#71767b] shrink-0 font-medium">Tag Place:</span>
            {selectedCommunity ? (
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-semibold">
                <MapPin className="w-3 h-3 shrink-0" />
                <span className="truncate max-w-[190px]">{selectedCommunity.name}</span>
                {selectedCommunity.stateName && (
                  <span className="text-[10px] text-emerald-400/70 font-mono">
                    ({selectedCommunity.stateName})
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => setIsPickerOpen(true)}
                  className="ml-1 text-[#71767b] hover:text-white"
                  title="Change community"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setIsPickerOpen(true)}
                className="px-3 py-1 rounded-full bg-[#16181c] border border-dashed border-emerald-500/40 text-emerald-400 text-xs font-semibold hover:bg-emerald-500/10 flex items-center gap-1.5"
              >
                <MapPin className="w-3.5 h-3.5" />
                <span>Select Community</span>
              </button>
            )}
          </div>

          {/* Community Picker Dropdown / Search */}
          {isPickerOpen && (
            <div className="p-3 rounded-xl bg-[#16181c] border border-[#2f3336] flex flex-col gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-[#71767b] absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search community name or state..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-[#000000] border border-[#2f3336] rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-[#71767b] focus:outline-none focus:border-emerald-500"
                  autoFocus
                />
              </div>

              <div className="max-h-[140px] overflow-y-auto flex flex-col gap-1 pr-1">
                {filteredCommunities.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      setSelectedCommId(c.id);
                      setIsPickerOpen(false);
                    }}
                    className={`px-2.5 py-1.5 rounded-lg text-left text-xs flex items-center justify-between transition-colors ${
                      c.id === selectedCommId
                        ? 'bg-emerald-500/20 text-emerald-300 font-bold'
                        : 'hover:bg-[#1d1f23] text-slate-300'
                    }`}
                  >
                    <span className="truncate">{c.name}</span>
                    <span className="text-[10px] text-[#71767b] font-mono shrink-0">
                      {c.stateName || 'Southeast'}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
            {[
              { id: 'oral-history', label: 'Oral History', icon: '📜' },
              { id: 'dialect', label: 'Dialect / Phrase', icon: '🗣️' },
              { id: 'tradition', label: 'Tradition / Omenala', icon: '✨' },
              { id: 'lineage', label: 'Lineage / Clan', icon: '🌳' },
              { id: 'general', label: 'General Note', icon: '💬' },
            ].map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setCategory(cat.id as any)}
                className={`shrink-0 px-2.5 py-1 rounded-full text-xs font-semibold transition-all active:scale-95 ${
                  category === cat.id
                    ? 'bg-emerald-500 text-black font-bold'
                    : 'bg-[#16181c] text-[#71767b] hover:text-[#e7e9ea] border border-[#2f3336]'
                }`}
              >
                <span>{cat.icon} {cat.label}</span>
              </button>
            ))}
          </div>

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
                placeholder="What oral testimony, historical event, clan lore, dialect phrase, or image/video URLs belong to this place?"
                rows={4}
                maxLength={maxChars}
                className="w-full bg-transparent text-[#e7e9ea] placeholder-[#71767b] text-sm resize-none focus:outline-none leading-relaxed"
                autoFocus={!isPickerOpen}
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
