'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
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
  Camera,
  Layers,
  Compass,
  FileText,
  Clock,
  ExternalLink,
} from 'lucide-react';
import {
  getUserProfile,
  saveUserProfile,
  cleanUsername,
  DEFAULT_AVATARS,
  type UserProfile,
} from '@/lib/user-profile';

export default function ProfilePage() {
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

  const [savedSuccess, setSavedSuccess] = useState(false);
  const [cacheCleared, setCacheCleared] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<'details' | 'activity' | 'settings'>('details');

  // Load profile on mount
  useEffect(() => {
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
  }, []);

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
    }, 2500);
  }

  function handleClearCache() {
    if (confirm('Clear local offline map and tile cache? Your saved username and profile will remain intact.')) {
      try {
        const profileBackup = localStorage.getItem('ica_user_profile');
        const mediaStoreBackup = localStorage.getItem('ica_local_media_store');
        if (typeof window !== 'undefined' && 'caches' in window) {
          caches.keys().then((names) => {
            names.forEach((name) => caches.delete(name));
          });
        }
        localStorage.clear();
        if (profileBackup) localStorage.setItem('ica_user_profile', profileBackup);
        if (mediaStoreBackup) localStorage.setItem('ica_local_media_store', mediaStoreBackup);
        setCacheCleared(true);
        setTimeout(() => setCacheCleared(false), 3000);
      } catch (err) {
        console.error('Error clearing cache:', err);
      }
    }
  }

  return (
    <div className="flex-1 w-full overflow-y-auto bg-[#060911] text-slate-100 flex flex-col">
      {/* Top Sticky Header */}
      <div className="sticky top-0 z-30 bg-[#0a0f1d]/90 backdrop-blur-xl border-b border-white/[0.08] px-4 sm:px-8 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-slate-300 hover:text-white text-xs font-semibold border border-white/[0.08] transition-all active:scale-95"
            title="Return to Atlas Map"
          >
            <ArrowLeft className="w-4 h-4 text-emerald-400" />
            <span>Back to Map</span>
          </Link>
          <div className="h-4 w-px bg-white/10 hidden sm:block" />
          <h1 className="text-sm sm:text-base font-bold text-white tracking-tight flex items-center gap-2">
            <span>Contributor Profile</span>
            {sanitizedHandle && (
              <span className="font-mono text-xs text-emerald-400 font-normal">
                @{sanitizedHandle}
              </span>
            )}
          </h1>
        </div>

        <button
          type="button"
          onClick={handleSave}
          className="px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-black shadow-lg shadow-emerald-500/25 active:scale-95 transition-all flex items-center gap-1.5"
        >
          {savedSuccess ? (
            <>
              <Check className="w-4 h-4 stroke-[3]" />
              <span>Saved!</span>
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              <span>Save Changes</span>
            </>
          )}
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-8 space-y-6">
        {/* Hero Profile Card */}
        <div className="relative rounded-2xl bg-[#0a0f1d] border border-white/[0.12] overflow-hidden shadow-2xl">
          {/* Cover Banner */}
          <div className="h-32 sm:h-44 w-full bg-gradient-to-r from-emerald-950 via-[#071f1a] to-teal-950 relative overflow-hidden border-b border-emerald-500/20">
            <div className="absolute inset-0 bg-[radial-gradient(#10b981_1.5px,transparent_1.5px)] [background-size:24px_24px] opacity-20" />
            <div className="absolute top-4 right-4 flex items-center gap-2">
              <span className="text-[10px] sm:text-xs font-mono tracking-widest uppercase px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 backdrop-blur-md">
                {role}
              </span>
            </div>
          </div>

          {/* Avatar & Hero Details */}
          <div className="px-5 sm:px-8 pb-6 pt-0 relative flex flex-col sm:flex-row sm:items-end justify-between gap-4 -mt-12 sm:-mt-16">
            <div className="flex items-end gap-4">
              <div className="relative h-24 w-24 sm:h-28 sm:w-28 rounded-2xl bg-gradient-to-tr from-emerald-500 via-teal-400 to-emerald-300 p-[2px] shadow-2xl shadow-emerald-500/30 shrink-0">
                <div className="h-full w-full rounded-[14px] bg-[#0a0f1d] flex items-center justify-center font-bold text-emerald-400 text-4xl sm:text-5xl font-['Outfit'] select-none">
                  {avatarSymbol || 'ọ'}
                </div>
                <span
                  className="absolute -bottom-1 -right-1 p-1.5 rounded-full bg-emerald-500 text-black shadow ring-4 ring-[#0a0f1d]"
                  title="Verified Native Contributor Badge"
                >
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                </span>
              </div>

              <div className="pb-1 min-w-0">
                <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight truncate flex items-center gap-2">
                  <span>{displayName.trim() || 'Contributor'}</span>
                </h2>
                <p className="text-sm font-mono text-emerald-400 flex items-center gap-1 mt-0.5">
                  <AtSign className="w-3.5 h-3.5" />
                  <span>{sanitizedHandle || 'unassigned_handle'}</span>
                </p>
                {bio && <p className="text-xs text-slate-300 mt-2 max-w-lg leading-relaxed">{bio}</p>}
              </div>
            </div>

            {/* Quick Metadata Badges */}
            <div className="flex flex-wrap items-center gap-2 self-start sm:self-end">
              {homeTown && (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-white/[0.04] border border-white/[0.08] text-xs text-slate-200">
                  <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                  <span>
                    {homeTown}
                    {stateOfOrigin ? `, ${stateOfOrigin}` : ''}
                  </span>
                </span>
              )}
              {kindredClan && (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-white/[0.04] border border-white/[0.08] text-xs text-slate-300">
                  <Shield className="w-3.5 h-3.5 text-amber-400" />
                  <span>{kindredClan}</span>
                </span>
              )}
            </div>
          </div>

          {/* Sub Navigation Tabs */}
          <div className="px-5 sm:px-8 border-t border-white/[0.08] flex items-center gap-6">
            <button
              type="button"
              onClick={() => setActiveSubTab('details')}
              className={`py-3 text-xs sm:text-sm font-semibold border-b-2 transition-all flex items-center gap-2 ${
                activeSubTab === 'details'
                  ? 'border-emerald-400 text-emerald-400'
                  : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              <User className="w-4 h-4" />
              <span>Identity & Cultural Lineage</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveSubTab('activity')}
              className={`py-3 text-xs sm:text-sm font-semibold border-b-2 transition-all flex items-center gap-2 ${
                activeSubTab === 'activity'
                  ? 'border-emerald-400 text-emerald-400'
                  : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              <Camera className="w-4 h-4" />
              <span>Device Contributions</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveSubTab('settings')}
              className={`py-3 text-xs sm:text-sm font-semibold border-b-2 transition-all flex items-center gap-2 ${
                activeSubTab === 'settings'
                  ? 'border-emerald-400 text-emerald-400'
                  : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              <HardDrive className="w-4 h-4" />
              <span>Storage & Engine</span>
            </button>
          </div>
        </div>

        {/* Tab 1: Profile Details Form */}
        {activeSubTab === 'details' && (
          <form onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left 2 Cols: Form fields */}
            <div className="lg:col-span-2 rounded-2xl bg-[#0a0f1d] border border-white/[0.12] p-5 sm:p-7 space-y-5">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono text-emerald-400 flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                <span>Contributor Identity Details</span>
              </h3>

              {/* Handle (@username) */}
              <div>
                <label className="block text-xs font-semibold text-slate-200 mb-1.5 flex items-center justify-between">
                  <span>Contributor Handle (@username)</span>
                  <span className="text-[11px] text-emerald-400 font-mono">
                    {sanitizedHandle ? `@${sanitizedHandle}` : 'Required'}
                  </span>
                </label>
                <div className="relative flex items-center">
                  <div className="absolute left-3.5 text-emerald-400 font-mono font-bold text-base pointer-events-none">
                    @
                  </div>
                  <input
                    type="text"
                    value={usernameInput}
                    onChange={(e) => setUsernameInput(e.target.value)}
                    placeholder="e.g. okafor_native or awka_mapper"
                    required
                    maxLength={30}
                    className="w-full pl-9 pr-3 py-2.5 bg-white/[0.04] border border-white/[0.12] rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 transition-colors font-mono"
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1.5">
                  Your public handle attached when you link photos, upload settlement videos, mark kindred obi, or post oral histories.
                </p>
              </div>

              {/* Display Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-200 mb-1.5">
                  Full Name / Elder Title
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="e.g. Chidi Okafor"
                  maxLength={50}
                  className="w-full px-3.5 py-2.5 bg-white/[0.04] border border-white/[0.12] rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 transition-colors"
                />
              </div>

              {/* Town of Origin & State */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-200 mb-1.5">
                    Town / Community of Origin
                  </label>
                  <input
                    type="text"
                    value={homeTown}
                    onChange={(e) => setHomeTown(e.target.value)}
                    placeholder="e.g. Awka, Nnewi, Owerri"
                    className="w-full px-3.5 py-2.5 bg-white/[0.04] border border-white/[0.12] rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-200 mb-1.5">
                    State of Origin
                  </label>
                  <select
                    value={stateOfOrigin}
                    onChange={(e) => setStateOfOrigin(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#0d1424] border border-white/[0.12] rounded-xl text-sm text-white focus:outline-none focus:border-emerald-400 transition-colors"
                  >
                    <option value="">Select State...</option>
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

              {/* Kindred / Clan */}
              <div>
                <label className="block text-xs font-semibold text-slate-200 mb-1.5">
                  Ancestral Kindred / Umunna / Lineage (Optional)
                </label>
                <input
                  type="text"
                  value={kindredClan}
                  onChange={(e) => setKindredClan(e.target.value)}
                  placeholder="e.g. Umubele Kindred, Umuogbuefi"
                  className="w-full px-3.5 py-2.5 bg-white/[0.04] border border-white/[0.12] rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400 transition-colors"
                />
              </div>

              {/* Contributor Role */}
              <div>
                <label className="block text-xs font-semibold text-slate-200 mb-1.5">
                  Contributor Role / Designation
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#0d1424] border border-white/[0.12] rounded-xl text-sm text-white focus:outline-none focus:border-emerald-400 transition-colors"
                >
                  <option value="Native Contributor">Native Contributor (Onye Oganiru)</option>
                  <option value="Elder / Cultural Custodian">Elder / Cultural Custodian (Onye Okenye)</option>
                  <option value="Field Researcher">Field Researcher (Onye Nnyocha)</option>
                  <option value="Oral Historian">Oral Historian (Onye Akuko)</option>
                </select>
              </div>

              {/* Bio */}
              <div>
                <label className="block text-xs font-semibold text-slate-200 mb-1.5">
                  Bio / Documentation Mission
                </label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Tell kin and cartographers about your documentation focus..."
                  rows={3}
                  maxLength={160}
                  className="w-full px-3.5 py-2.5 bg-white/[0.04] border border-white/[0.12] rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400 transition-colors resize-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end">
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-black shadow-lg shadow-emerald-500/25 active:scale-95 transition-all flex items-center gap-1.5"
                >
                  <Save className="w-4 h-4" />
                  <span>Save Profile</span>
                </button>
              </div>
            </div>

            {/* Right 1 Col: Insignia picker & Live Card Preview */}
            <div className="space-y-6">
              {/* Insignia Symbol Picker */}
              <div className="rounded-2xl bg-[#0a0f1d] border border-white/[0.12] p-5 space-y-4">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono text-emerald-400">
                  Avatar Insignia Symbol
                </h3>
                <p className="text-[11px] text-slate-400">
                  Select a traditional Igbo symbol or type custom initials for your map emblem.
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  {DEFAULT_AVATARS.map((sym) => (
                    <button
                      key={sym}
                      type="button"
                      onClick={() => setAvatarSymbol(sym)}
                      className={`h-10 w-10 rounded-xl flex items-center justify-center font-bold text-base transition-all ${
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
                    className="w-16 h-10 px-2 text-center bg-white/[0.04] border border-white/[0.12] rounded-xl text-xs text-emerald-400 font-bold focus:outline-none focus:border-emerald-400"
                    title="Type any 1-2 letters or emoji"
                  />
                </div>
              </div>

              {/* Attribution Preview Card */}
              <div className="rounded-2xl bg-[#0a0f1d] border border-white/[0.12] p-5 space-y-3">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">
                  Live Attribution Preview
                </h3>
                <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.08] flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 p-[1px] shrink-0">
                    <div className="h-full w-full rounded-[11px] bg-[#0a0f1d] flex items-center justify-center font-bold text-emerald-400 font-['Outfit'] text-base">
                      {avatarSymbol || 'ọ'}
                    </div>
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-white truncate">
                      {displayName.trim() || 'Contributor Name'}
                    </p>
                    <p className="text-[11px] font-mono text-emerald-400 truncate">
                      @{sanitizedHandle || 'handle'}
                    </p>
                  </div>
                </div>
                <p className="text-[10px] text-slate-500 leading-relaxed">
                  This signature will be embedded in public audit records and media cards you upload.
                </p>
              </div>
            </div>
          </form>
        )}

        {/* Tab 2: Activity & Uploads */}
        {activeSubTab === 'activity' && (
          <div className="rounded-2xl bg-[#0a0f1d] border border-white/[0.12] p-6 space-y-5">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono text-emerald-400 flex items-center gap-2">
              <Camera className="w-4 h-4" />
              <span>Your Contributions on this Device</span>
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              All visual media links, kindred micro-boundaries, and oral testimonies documented from this browser device are registered under your handle.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.08] flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-400">
                  <Camera className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-lg font-bold text-white font-mono">Active</span>
                  <p className="text-[11px] text-slate-400">Photo & Video Links</p>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.08] flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-cyan-500/10 text-cyan-400">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-lg font-bold text-white font-mono">100</span>
                  <p className="text-[11px] text-slate-400">Trust Score</p>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.08] flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-amber-500/10 text-amber-400">
                  <Compass className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-lg font-bold text-white font-mono">Verified</span>
                  <p className="text-[11px] text-slate-400">Registration-Free</p>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-white/[0.08] flex items-center justify-between">
              <span className="text-xs text-slate-400">
                Want to document more settlements or kindred lines?
              </span>
              <Link
                href="/"
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-white/[0.06] hover:bg-white/[0.1] text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5 transition-colors"
              >
                <span>Open Map to Contribute</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        )}

        {/* Tab 3: Storage & Preferences */}
        {activeSubTab === 'settings' && (
          <div className="rounded-2xl bg-[#0a0f1d] border border-white/[0.12] p-6 space-y-6">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono text-emerald-400 flex items-center gap-2">
              <HardDrive className="w-4 h-4" />
              <span>Storage & Engine Preferences</span>
            </h3>

            {/* Auto-sign toggle */}
            <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.08] flex items-start gap-3">
              <input
                type="checkbox"
                id="page-auto-sign"
                checked={autoSign}
                onChange={(e) => setAutoSign(e.target.checked)}
                className="mt-0.5 rounded border-white/20 bg-slate-900 text-emerald-500 focus:ring-emerald-400 focus:ring-offset-0 h-4 w-4"
              />
              <label htmlFor="page-auto-sign" className="text-xs text-slate-300 cursor-pointer">
                <span className="font-semibold text-white block text-sm">
                  Auto-sign uploads with my handle
                </span>
                Automatically pre-fill my name and @handle when submitting settlement media, kindred boundaries, and comments.
              </label>
            </div>

            {/* Device Identity Binding Box */}
            <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.08] space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300 font-medium flex items-center gap-1.5">
                  <Shield className="w-4 h-4 text-cyan-400" />
                  <span>Device Identity & Backend Binding</span>
                </span>
                <span className="font-mono text-cyan-400 text-xs px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/20">
                  Bound
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-black/40 border border-white/[0.06] flex items-center justify-between text-xs font-mono">
                <span className="text-slate-400">Device ID</span>
                <span className="text-emerald-400 truncate max-w-sm" title={profile?.deviceId}>
                  {profile?.deviceId || 'Generating...'}
                </span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Your browser device is bound to handle <strong className="text-white">@{sanitizedHandle || 'handle'}</strong>. Profiles are saved locally and synced with the backend API via <code className="text-emerald-400">/api/profile</code>.
              </p>
            </div>

            {/* Offline Cache Box */}
            <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.08] space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300 font-medium flex items-center gap-1.5">
                  <HardDrive className="w-4 h-4 text-emerald-400" />
                  <span>Offline Map & Vector Tile Cache</span>
                </span>
                <span className="font-mono text-emerald-400 text-xs">Active</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Administrative boundaries and settlement index data are cached on this device for zero-latency browsing across remote field zones.
              </p>
              <button
                type="button"
                onClick={handleClearCache}
                className="px-4 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                <span>Clear Map Tile Cache</span>
              </button>
              {cacheCleared && (
                <p className="text-xs text-emerald-400 font-medium flex items-center gap-1.5 pt-1">
                  <CheckCircle2 className="w-4 h-4" /> Local tile cache successfully flushed.
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
