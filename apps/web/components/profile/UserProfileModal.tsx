'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  User,
  AtSign,
  MapPin,
  Shield,
  Sparkles,
  Check,
  Save,
  Trash2,
  HardDrive,
  Info,
  CheckCircle2,
} from 'lucide-react';
import {
  getUserProfile,
  saveUserProfile,
  cleanUsername,
  DEFAULT_AVATARS,
  type UserProfile,
} from '@/lib/user-profile';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function UserProfileModal({ isOpen, onClose }: UserProfileModalProps) {
  const [profile, setProfile] = useState<UserProfile>(getUserProfile);
  const [usernameInput, setUsernameInput] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [homeTown, setHomeTown] = useState('');
  const [stateOfOrigin, setStateOfOrigin] = useState('');
  const [kindredClan, setKindredClan] = useState('');
  const [bio, setBio] = useState('');
  const [avatarSymbol, setAvatarSymbol] = useState('ọ');
  const [role, setRole] = useState('Native Contributor');
  const [autoSign, setAutoSign] = useState(true);

  const [activeTab, setActiveTab] = useState<'profile' | 'settings'>('profile');
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [cacheCleared, setCacheCleared] = useState(false);

  // Sync state on open
  useEffect(() => {
    if (isOpen) {
      const current = getUserProfile();
      setProfile(current);
      setUsernameInput(current.username || '');
      setDisplayName(current.displayName || '');
      setHomeTown(current.homeTown || '');
      setStateOfOrigin(current.stateOfOrigin || '');
      setKindredClan(current.kindredClan || '');
      setBio(current.bio || '');
      setAvatarSymbol(current.avatarSymbol || 'ọ');
      setRole(current.role || 'Native Contributor');
      setAutoSign(current.autoSignContributions ?? true);
      setSavedSuccess(false);
      setCacheCleared(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const sanitizedHandle = cleanUsername(usernameInput);

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const updated = saveUserProfile({
      username: sanitizedHandle,
      displayName: displayName.trim(),
      homeTown: homeTown.trim(),
      stateOfOrigin: stateOfOrigin.trim(),
      kindredClan: kindredClan.trim(),
      bio: bio.trim(),
      avatarSymbol: avatarSymbol || 'ọ',
      role,
      autoSignContributions: autoSign,
    });

    setProfile(updated);
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 700);
  }

  function handleClearCache() {
    if (confirm('Clear local offline map and tile cache? Your saved username and profile will remain intact.')) {
      try {
        const profileBackup = localStorage.getItem('ica_user_profile');
        const mediaStoreBackup = localStorage.getItem('ica_local_media_store');
        // Clear caches
        if (typeof window !== 'undefined' && 'caches' in window) {
          caches.keys().then((names) => {
            names.forEach((name) => caches.delete(name));
          });
        }
        localStorage.clear();
        if (profileBackup) localStorage.setItem('ica_user_profile', profileBackup);
        if (mediaStoreBackup) localStorage.setItem('ica_local_media_store', mediaStoreBackup);
        setCacheCleared(true);
        setTimeout(() => setCacheCleared(false), 2500);
      } catch (err) {
        console.error('Error clearing cache:', err);
      }
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-xl max-h-[90vh] bg-[#0a0f1d] border border-white/[0.12] rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-100 animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="profile-modal-title"
      >
        {/* Banner with gradient accent */}
        <div className="relative h-20 sm:h-24 bg-gradient-to-r from-emerald-950 via-[#071d18] to-teal-950 px-5 pt-4 flex items-start justify-between border-b border-emerald-500/20">
          <div className="absolute inset-0 bg-[radial-gradient(#10b981_1px,transparent_1px)] [background-size:16px_16px] opacity-15" />
          
          <div className="relative z-10">
            <span className="text-[10px] font-mono tracking-widest uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              Native Contributor Identity
            </span>
            <h2 id="profile-modal-title" className="text-base sm:text-lg font-bold text-white mt-1">
              Profile & Preferences
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="relative z-10 p-1.5 rounded-full bg-black/40 hover:bg-black/60 text-slate-300 hover:text-white transition-colors"
            aria-label="Close Profile modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Avatar Bar (overlaps banner) */}
        <div className="px-5 -mt-8 flex items-end justify-between z-10 shrink-0">
          <div className="flex items-end gap-3.5">
            <div className="relative h-16 w-16 sm:h-20 sm:w-20 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-300 p-[2px] shadow-xl shadow-emerald-500/20">
              <div className="h-full w-full rounded-[14px] bg-[#0a0f1d] flex items-center justify-center font-bold text-emerald-400 text-2xl sm:text-3xl font-['Outfit'] select-none">
                {avatarSymbol || 'ọ'}
              </div>
              <span className="absolute -bottom-1 -right-1 p-1 rounded-full bg-emerald-500 text-black shadow ring-2 ring-[#0a0f1d]" title="Verified Contributor Badge">
                <Check className="w-3 h-3 stroke-[3]" />
              </span>
            </div>

            <div className="pb-1">
              <h3 className="font-bold text-sm sm:text-base text-white flex items-center gap-1.5">
                {displayName.trim() || 'Contributor'}
              </h3>
              <p className="text-xs font-mono text-emerald-400 flex items-center gap-0.5">
                <AtSign className="w-3 h-3 inline" />
                <span>{sanitizedHandle || 'set_username'}</span>
              </p>
            </div>
          </div>

          {/* Navigation Sub-Tabs */}
          <div className="flex items-center gap-1 bg-white/[0.04] p-1 rounded-xl border border-white/[0.08]">
            <button
              type="button"
              onClick={() => setActiveTab('profile')}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'profile'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Profile
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('settings')}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'settings'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Settings
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {activeTab === 'profile' ? (
            <>
              {/* Username Input with @ prefix */}
              <div>
                <label className="block text-xs font-semibold text-slate-200 mb-1.5 flex items-center justify-between">
                  <span>Contributor Handle (@username)</span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {sanitizedHandle ? `@${sanitizedHandle}` : 'Required for attributions'}
                  </span>
                </label>
                <div className="relative flex items-center">
                  <div className="absolute left-3 text-emerald-400 font-mono font-bold text-sm pointer-events-none">
                    @
                  </div>
                  <input
                    type="text"
                    value={usernameInput}
                    onChange={(e) => setUsernameInput(e.target.value)}
                    placeholder="e.g. okafor_native or awka_mapper"
                    required
                    maxLength={30}
                    className="w-full pl-8 pr-3 py-2 bg-white/[0.04] border border-white/[0.12] rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 transition-colors font-mono"
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Unique handle displayed when you attach images, videos, landmarks, or oral records.
                </p>
              </div>

              {/* Display Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-200 mb-1.5">
                  Display Name / Elder Name
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="e.g. Chidi Okafor"
                  maxLength={50}
                  className="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.12] rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 transition-colors"
                />
              </div>

              {/* Home Town & State row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-200 mb-1.5">
                    Town / Community of Origin
                  </label>
                  <input
                    type="text"
                    value={homeTown}
                    onChange={(e) => setHomeTown(e.target.value)}
                    placeholder="e.g. Awka, Nnewi, Owerri"
                    className="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.12] rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-200 mb-1.5">
                    State of Origin
                  </label>
                  <select
                    value={stateOfOrigin}
                    onChange={(e) => setStateOfOrigin(e.target.value)}
                    className="w-full px-3 py-2 bg-[#0d1424] border border-white/[0.12] rounded-xl text-sm text-white focus:outline-none focus:border-emerald-400 transition-colors"
                  >
                    <option value="">Select state...</option>
                    <option value="Abia">Abia</option>
                    <option value="Anambra">Anambra</option>
                    <option value="Ebonyi">Ebonyi</option>
                    <option value="Enugu">Enugu</option>
                    <option value="Imo">Imo</option>
                    <option value="Delta">Delta (Anioma)</option>
                    <option value="Rivers">Rivers</option>
                    <option value="Other">Other Diaspora / Researcher</option>
                  </select>
                </div>
              </div>

              {/* Kindred / Umunna Lineage */}
              <div>
                <label className="block text-xs font-semibold text-slate-200 mb-1.5">
                  Ancestral Kindred / Umunna / Lineage (Optional)
                </label>
                <input
                  type="text"
                  value={kindredClan}
                  onChange={(e) => setKindredClan(e.target.value)}
                  placeholder="e.g. Umubele Kindred, Umuogbuefi"
                  className="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.12] rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400 transition-colors"
                />
              </div>

              {/* Avatar Icon Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-200 mb-1.5">
                  Insignia / Avatar Symbol
                </label>
                <div className="flex flex-wrap items-center gap-2">
                  {DEFAULT_AVATARS.map((sym) => (
                    <button
                      key={sym}
                      type="button"
                      onClick={() => setAvatarSymbol(sym)}
                      className={`h-9 w-9 rounded-xl flex items-center justify-center font-bold text-base transition-all ${
                        avatarSymbol === sym
                          ? 'bg-emerald-500 text-black ring-2 ring-emerald-400/50 scale-105'
                          : 'bg-white/[0.06] text-slate-300 hover:bg-white/[0.1] hover:text-white'
                      }`}
                    >
                      {sym}
                    </button>
                  ))}
                  <input
                    type="text"
                    value={avatarSymbol}
                    onChange={(e) => setAvatarSymbol(e.target.value.slice(0, 2))}
                    placeholder="Custom"
                    maxLength={2}
                    className="w-16 h-9 px-2 text-center bg-white/[0.04] border border-white/[0.12] rounded-xl text-xs text-emerald-400 font-bold focus:outline-none focus:border-emerald-400"
                    title="Type any 1-2 letters or emoji"
                  />
                </div>
              </div>

              {/* Contributor Role & Bio */}
              <div>
                <label className="block text-xs font-semibold text-slate-200 mb-1.5">
                  Contributor Role
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full px-3 py-2 bg-[#0d1424] border border-white/[0.12] rounded-xl text-sm text-white focus:outline-none focus:border-emerald-400 transition-colors"
                >
                  <option value="Native Contributor">Native Contributor (Onye Oganiru)</option>
                  <option value="Elder / Cultural Custodian">Elder / Cultural Custodian (Onye Okenye)</option>
                  <option value="Field Researcher">Field Researcher (Onye Nnyocha)</option>
                  <option value="Oral Historian">Oral Historian (Onye Akuko)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-200 mb-1.5">
                  Bio / Cultural Mission
                </label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Tell other cartographers and kin about your background or documentation focus..."
                  rows={2}
                  maxLength={160}
                  className="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.12] rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400 transition-colors resize-none"
                />
              </div>
            </>
          ) : (
            <>
              {/* Settings Tab */}
              <div className="space-y-4">
                <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.08] flex items-start gap-3">
                  <input
                    type="checkbox"
                    id="auto-sign-checkbox"
                    checked={autoSign}
                    onChange={(e) => setAutoSign(e.target.checked)}
                    className="mt-0.5 rounded border-white/20 bg-slate-900 text-emerald-500 focus:ring-emerald-400 focus:ring-offset-0 h-4 w-4"
                  />
                  <label htmlFor="auto-sign-checkbox" className="text-xs text-slate-300 cursor-pointer">
                    <span className="font-semibold text-white block">Auto-sign contributions with my handle</span>
                    Automatically populate my name and @handle when submitting settlement media, kindred boundaries, and comments.
                  </label>
                </div>

                <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.08] space-y-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-300 font-medium flex items-center gap-1.5">
                      <HardDrive className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Device Storage & Cache</span>
                    </span>
                    <span className="font-mono text-emerald-400 text-[11px]">Active</span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Map vector tiles and settlement index files are cached locally for rapid offline exploration across low-connectivity regions.
                  </p>
                  <button
                    type="button"
                    onClick={handleClearCache}
                    className="px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 text-xs font-medium flex items-center gap-1.5 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Clear Map Tile Cache</span>
                  </button>
                  {cacheCleared && (
                    <p className="text-[11px] text-emerald-400 font-medium flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Cache flushed. Re-fetching fresh tiles on next move.
                    </p>
                  )}
                </div>

                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-[11px] text-emerald-300/90 leading-relaxed flex items-start gap-2">
                  <Info className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>
                    Your profile data is stored on-device and embedded into verified community audit logs when you contribute.
                  </span>
                </div>
              </div>
            </>
          )}

          {/* Action Footer */}
          <div className="pt-2 flex items-center justify-between border-t border-white/[0.08]">
            <span className="text-[11px] text-slate-400 font-mono">
              {savedSuccess ? (
                <span className="text-emerald-400 flex items-center gap-1">
                  <Check className="w-3 h-3" /> Profile saved!
                </span>
              ) : sanitizedHandle ? (
                `Active as @${sanitizedHandle}`
              ) : (
                'Choose a handle to save'
              )}
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-white/[0.05] transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-black shadow-lg shadow-emerald-500/25 active:scale-95 transition-all flex items-center gap-1.5"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save Profile</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
