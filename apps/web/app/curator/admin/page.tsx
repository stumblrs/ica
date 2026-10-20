'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Shield,
  Key,
  Lock,
  Unlock,
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2,
  Copy,
  RefreshCw,
  Power,
  Settings,
  BookOpen,
  MapPin,
  ExternalLink,
  Search,
  Sparkles,
  Sliders,
  Calendar,
  Layers,
  FileCheck,
} from 'lucide-react';

interface PasscodeItem {
  id: string;
  code: string;
  label: string;
  role: string;
  createdAt: string;
  expiresAt?: string | null;
  isActive: boolean;
}

interface CuratorSettingsData {
  publicSubmissionsEnabled: boolean;
  moderationMode: 'direct' | 'require_approval';
  curatorOnlyModeNotice?: string;
  lastUpdated: string;
}

interface HeritageProfile {
  id: string;
  name: string;
  matchKeys: string[];
  nativeName?: string;
  traditionalRulerTitle?: string;
  clanLineage?: string;
  marketDay?: string;
  festivals?: string[];
  sacredLandmarks?: string[];
  historicalSummary?: string;
  customAttributes?: Record<string, string>;
  specificArchivalDocs?: string[];
  updatedAt: string;
  updatedBy?: string;
}

export default function CuratorAdminDashboard() {
  // Authentication State
  const [passcode, setPasscode] = useState('');
  const [authenticated, setAuthenticated] = useState(false);
  const [authRole, setAuthRole] = useState<string>('');
  const [authLabel, setAuthLabel] = useState<string>('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);

  // Active Tab
  const [activeTab, setActiveTab] = useState<'profiles' | 'passcodes' | 'settings'>('profiles');

  // Passcodes State
  const [passcodes, setPasscodes] = useState<PasscodeItem[]>([]);
  const [loadingPasscodes, setLoadingPasscodes] = useState(false);
  const [newPasscodeLabel, setNewPasscodeLabel] = useState('');
  const [newPasscodeCustom, setNewPasscodeCustom] = useState('');
  const [newPasscodeRole, setNewPasscodeRole] = useState<'curator' | 'field_researcher'>('curator');
  const [newPasscodeDays, setNewPasscodeDays] = useState<number>(30);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Settings State
  const [settings, setSettings] = useState<CuratorSettingsData>({
    publicSubmissionsEnabled: true,
    moderationMode: 'direct',
    curatorOnlyModeNotice: 'Atlas contributions are currently paused for authoritative curatorial verification.',
    lastUpdated: new Date().toISOString(),
  });
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settingsSuccess, setSettingsSuccess] = useState(false);

  // Profiles State
  const [profiles, setProfiles] = useState<HeritageProfile[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingProfiles, setLoadingProfiles] = useState(false);
  const [editingProfile, setEditingProfile] = useState<HeritageProfile | null>(null);
  const [isNewProfile, setIsNewProfile] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSaveSuccess, setProfileSaveSuccess] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  // Profile Form Fields
  const [formName, setFormName] = useState('');
  const [formKeys, setFormKeys] = useState('');
  const [formNativeName, setFormNativeName] = useState('');
  const [formTraditionalTitle, setFormTraditionalTitle] = useState('');
  const [formClanLineage, setFormClanLineage] = useState('');
  const [formMarketDay, setFormMarketDay] = useState('');
  const [formFestivals, setFormFestivals] = useState('');
  const [formLandmarks, setFormLandmarks] = useState('');
  const [formSummary, setFormSummary] = useState('');
  const [formCustomKey, setFormCustomKey] = useState('');
  const [formCustomVal, setFormCustomVal] = useState('');
  const [formCustomAttributes, setFormCustomAttributes] = useState<Record<string, string>>({});

  // 1. Check local session storage on mount
  useEffect(() => {
    const savedKey = sessionStorage.getItem('ica_curator_key');
    if (savedKey) {
      handleLogin(savedKey);
    }
  }, []);

  const handleLogin = async (keyToVerify?: string) => {
    const key = (keyToVerify || passcode).trim();
    if (!key) {
      setAuthError('Please enter curator passcode.');
      return;
    }

    try {
      setAuthLoading(true);
      setAuthError(null);

      const res = await fetch('/api/curator/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passcode: key }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Invalid passcode');
      }

      setAuthenticated(true);
      setAuthRole(data.role || 'curator');
      setAuthLabel(data.label || 'Curator Session');
      sessionStorage.setItem('ica_curator_key', key);
      setPasscode(key);

      // Load initial data
      loadAllData(key);
    } catch (err: any) {
      setAuthError(err.message || 'Authentication failed');
      sessionStorage.removeItem('ica_curator_key');
      setAuthenticated(false);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('ica_curator_key');
    setAuthenticated(false);
    setPasscode('');
    setAuthRole('');
    setAuthLabel('');
  };

  // 2. Fetch Data
  const loadAllData = useCallback(async (activeKey: string) => {
    fetchSettings();
    fetchPasscodes(activeKey);
    fetchProfiles();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/curator/settings');
      if (res.ok) {
        const data = await res.json();
        setSettings(data);
      }
    } catch {}
  };

  const fetchPasscodes = async (activeKey: string) => {
    try {
      setLoadingPasscodes(true);
      const res = await fetch('/api/curator/passcodes', {
        headers: { 'x-curator-key': activeKey },
      });
      if (res.ok) {
        const data = await res.json();
        setPasscodes(data.passcodes || []);
      }
    } catch {
    } finally {
      setLoadingPasscodes(false);
    }
  };

  const fetchProfiles = async () => {
    try {
      setLoadingProfiles(true);
      const res = await fetch('/api/curator/profiles');
      if (res.ok) {
        const data = await res.json();
        setProfiles(data.profiles || []);
      }
    } catch {
    } finally {
      setLoadingProfiles(false);
    }
  };

  // 3. Settings Update
  const handleSaveSettings = async (newValues: Partial<CuratorSettingsData>) => {
    try {
      setSettingsSaving(true);
      setSettingsSuccess(false);

      const activeKey = sessionStorage.getItem('ica_curator_key') || passcode;
      const res = await fetch('/api/curator/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-curator-key': activeKey,
        },
        body: JSON.stringify(newValues),
      });

      if (!res.ok) throw new Error('Failed to update settings');
      const data = await res.json();
      setSettings(data.settings);
      setSettingsSuccess(true);
      setTimeout(() => setSettingsSuccess(false), 3000);
    } catch (err: any) {
      alert(err.message || 'Error updating settings');
    } finally {
      setSettingsSaving(false);
    }
  };

  // 4. Passcodes Creation & Revocation
  const handleCreatePasscode = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const activeKey = sessionStorage.getItem('ica_curator_key') || passcode;
      const res = await fetch('/api/curator/passcodes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-curator-key': activeKey,
        },
        body: JSON.stringify({
          customCode: newPasscodeCustom.trim() || undefined,
          label: newPasscodeLabel.trim() || 'Curator Key',
          role: newPasscodeRole,
          expiresInDays: newPasscodeDays > 0 ? newPasscodeDays : undefined,
        }),
      });

      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || 'Failed to create passcode');
      }

      setNewPasscodeCustom('');
      setNewPasscodeLabel('');
      fetchPasscodes(activeKey);
    } catch (err: any) {
      alert(err.message || 'Error creating passcode');
    }
  };

  const handleRevokePasscode = async (id: string) => {
    if (!confirm('Are you sure you want to revoke this passcode? It will immediately stop working.')) return;
    try {
      const activeKey = sessionStorage.getItem('ica_curator_key') || passcode;
      const res = await fetch(`/api/curator/passcodes?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: { 'x-curator-key': activeKey },
      });
      if (!res.ok) throw new Error('Failed to revoke passcode');
      fetchPasscodes(activeKey);
    } catch (err: any) {
      alert(err.message);
    }
  };

  // 5. Profile Editing & Creation
  const openEditProfile = (prof: HeritageProfile) => {
    setEditingProfile(prof);
    setIsNewProfile(false);
    setFormName(prof.name);
    setFormKeys((prof.matchKeys || []).join(', '));
    setFormNativeName(prof.nativeName || '');
    setFormTraditionalTitle(prof.traditionalRulerTitle || '');
    setFormClanLineage(prof.clanLineage || '');
    setFormMarketDay(prof.marketDay || '');
    setFormFestivals((prof.festivals || []).join(', '));
    setFormLandmarks((prof.sacredLandmarks || []).join(', '));
    setFormSummary(prof.historicalSummary || '');
    setFormCustomAttributes(prof.customAttributes || {});
    setProfileError(null);
  };

  const openNewProfile = () => {
    setEditingProfile(null);
    setIsNewProfile(true);
    setFormName('');
    setFormKeys('');
    setFormNativeName('');
    setFormTraditionalTitle('');
    setFormClanLineage('');
    setFormMarketDay('');
    setFormFestivals('');
    setFormLandmarks('');
    setFormSummary('');
    setFormCustomAttributes({});
    setProfileError(null);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      setProfileError('Settlement name is required.');
      return;
    }

    try {
      setProfileSaving(true);
      setProfileError(null);
      const activeKey = sessionStorage.getItem('ica_curator_key') || passcode;

      const rawKeys = formKeys
        .split(',')
        .map((k) => k.trim())
        .filter(Boolean);

      const res = await fetch('/api/curator/profiles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-curator-key': activeKey,
        },
        body: JSON.stringify({
          id: editingProfile?.id,
          name: formName.trim(),
          matchKeys: rawKeys,
          nativeName: formNativeName.trim() || undefined,
          traditionalRulerTitle: formTraditionalTitle.trim() || undefined,
          clanLineage: formClanLineage.trim() || undefined,
          marketDay: formMarketDay.trim() || undefined,
          festivals: formFestivals
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean),
          sacredLandmarks: formLandmarks
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean),
          historicalSummary: formSummary.trim() || undefined,
          customAttributes: formCustomAttributes,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save profile');

      setProfileSaveSuccess(true);
      setTimeout(() => {
        setProfileSaveSuccess(false);
        setEditingProfile(null);
        setIsNewProfile(false);
      }, 1000);

      fetchProfiles();
    } catch (err: any) {
      setProfileError(err.message || 'Error saving profile');
    } finally {
      setProfileSaving(false);
    }
  };

  const handleAddCustomAttribute = () => {
    if (!formCustomKey.trim() || !formCustomVal.trim()) return;
    setFormCustomAttributes((prev) => ({
      ...prev,
      [formCustomKey.trim()]: formCustomVal.trim(),
    }));
    setFormCustomKey('');
    setFormCustomVal('');
  };

  const handleRemoveCustomAttribute = (k: string) => {
    setFormCustomAttributes((prev) => {
      const copy = { ...prev };
      delete copy[k];
      return copy;
    });
  };

  // Filtered Profiles
  const filteredProfiles = profiles.filter((p) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      (p.nativeName && p.nativeName.toLowerCase().includes(q)) ||
      (p.traditionalRulerTitle && p.traditionalRulerTitle.toLowerCase().includes(q)) ||
      p.matchKeys.some((k) => k.toLowerCase().includes(q))
    );
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 1. Password Challenge Gate (If Not Authenticated)
  // ─────────────────────────────────────────────────────────────────────────────
  if (!authenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-[#050811] text-white">
        <div className="w-full max-w-md p-6 sm:p-8 rounded-3xl bg-[#0a0f1d] border border-amber-500/25 shadow-2xl shadow-black/80 space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-bold font-display tracking-tight text-white">
                ICA Curator Console
              </h1>
              <p className="text-xs text-slate-400 font-mono">
                Decoupled Administrative & Knowledge Hub
              </p>
            </div>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleLogin();
            }}
            className="space-y-4"
          >
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Master Key or Curator Passcode
              </label>
              <div className="relative">
                <input
                  type="password"
                  required
                  autoFocus
                  placeholder="Enter passcode to unlock..."
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value)}
                  className="w-full pl-10 pr-3 py-2.5 bg-black/50 border border-white/10 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 font-mono transition-colors"
                />
                <Key className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5 pointer-events-none" />
              </div>
            </div>

            {authError && (
              <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/25 text-red-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{authError}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={authLoading}
              className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-black font-bold text-sm shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {authLoading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Unlock className="w-4 h-4" />
              )}
              <span>Unlock Curator Console</span>
            </button>
          </form>

          <div className="pt-3 border-t border-white/10 flex items-center justify-between text-[11px] text-slate-500 font-mono">
            <span>Stand-alone Module</span>
            <a href="/" className="text-slate-400 hover:text-white underline">
              Return to Public Atlas
            </a>
          </div>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. Authenticated Standalone Dashboard Shell
  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#060913] text-slate-100 flex flex-col font-sans">
      {/* Top Header */}
      <header className="px-4 sm:px-8 py-3.5 border-b border-white/10 bg-[#080d1c]/90 backdrop-blur-md sticky top-0 z-30 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
            <Shield className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-sm sm:text-base font-bold font-display text-white tracking-tight truncate">
                ICA Curator Control Center
              </h1>
              <span className="text-[10px] uppercase font-mono font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 shrink-0">
                {authRole}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 truncate">
              Authoritative Heritage Knowledge & Governance Dashboard
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 text-xs font-semibold text-slate-300 transition-colors"
          >
            <span>Live Atlas</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 text-xs font-semibold transition-colors"
          >
            <Power className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Lock / Exit</span>
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-8 space-y-6">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-black/40 border border-white/10 w-fit">
          <button
            type="button"
            onClick={() => setActiveTab('profiles')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'profiles'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Settlement Knowledge Registry ({profiles.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('passcodes')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'passcodes'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Key className="w-4 h-4" />
            <span>Passcode Generator ({passcodes.filter((p) => p.isActive).length} Active)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('settings')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'settings'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>Contribution Gates (Kill-Switch)</span>
          </button>
        </div>

        {/* ─────────────────────────────────────────────────────────────────── */}
        {/* TAB 1: SETTLEMENT HERITAGE PROFILES & MATCH-KEYS HUB                */}
        {/* ─────────────────────────────────────────────────────────────────── */}
        {activeTab === 'profiles' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                  Settlement Custom Heritage Registry
                </h2>
                <p className="text-xs text-slate-400">
                  Each locality below has unique match keys. When any user selects a location on the atlas matching those keys, it automatically adopts these facts!
                </p>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-64">
                  <input
                    type="text"
                    placeholder="Search by name, key, ruler..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 bg-black/40 border border-white/10 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                  />
                  <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5 pointer-events-none" />
                </div>

                <button
                  type="button"
                  onClick={openNewProfile}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs shadow-md transition-all shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Add Settlement Profile</span>
                </button>
              </div>
            </div>

            {/* Profiles Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {filteredProfiles.map((prof) => (
                <div
                  key={prof.id}
                  className="p-4 rounded-2xl bg-[#090e1d] border border-white/10 hover:border-amber-500/40 transition-all flex flex-col justify-between space-y-3 group shadow-lg"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-bold text-sm text-white group-hover:text-amber-300 transition-colors">
                          {prof.name}
                        </h3>
                        {prof.nativeName && (
                          <p className="text-xs font-mono text-emerald-400">
                            {prof.nativeName}
                          </p>
                        )}
                      </div>
                      {prof.marketDay && (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30">
                          {prof.marketDay}
                        </span>
                      )}
                    </div>

                    {prof.traditionalRulerTitle && (
                      <p className="text-xs text-slate-300 flex items-center gap-1.5">
                        <span className="text-amber-400">👑</span>
                        <span className="font-medium">{prof.traditionalRulerTitle}</span>
                      </p>
                    )}

                    {prof.clanLineage && (
                      <p className="text-[11px] text-slate-400 line-clamp-2">
                        🏛 {prof.clanLineage}
                      </p>
                    )}

                    {prof.historicalSummary && (
                      <p className="text-[11px] text-slate-300/80 line-clamp-2 italic leading-relaxed">
                        &ldquo;{prof.historicalSummary}&rdquo;
                      </p>
                    )}

                    {/* Match Keys Badge Pill Strip */}
                    <div className="pt-1.5 border-t border-white/[0.06] flex items-center gap-1 flex-wrap">
                      <span className="text-[9px] uppercase font-mono text-slate-500 font-bold">
                        Keys:
                      </span>
                      {prof.matchKeys.slice(0, 4).map((k, i) => (
                        <span
                          key={i}
                          className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-white/[0.04] border border-white/10 text-slate-300"
                        >
                          {k}
                        </span>
                      ))}
                      {prof.matchKeys.length > 4 && (
                        <span className="text-[9px] font-mono text-slate-500">
                          +{prof.matchKeys.length - 4} more
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="pt-2 flex items-center justify-between border-t border-white/[0.06]">
                    <span className="text-[10px] font-mono text-slate-500">
                      Updated {new Date(prof.updatedAt).toLocaleDateString()}
                    </span>
                    <button
                      type="button"
                      onClick={() => openEditProfile(prof)}
                      className="px-2.5 py-1 rounded-lg bg-white/[0.05] hover:bg-amber-500/20 text-slate-300 hover:text-amber-300 text-xs font-semibold transition-colors"
                    >
                      Edit Heritage
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────────── */}
        {/* TAB 2: PASSCODES GENERATOR & MANAGEMENT                             */}
        {/* ─────────────────────────────────────────────────────────────────── */}
        {activeTab === 'passcodes' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Create Passcode Form */}
            <div className="p-5 rounded-2xl bg-[#090e1d] border border-white/10 space-y-4 h-fit shadow-xl">
              <div className="flex items-center gap-2">
                <Key className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-sm text-white">Generate Curator Passcode</h3>
              </div>
              <p className="text-xs text-slate-400 leading-normal">
                Create authoritative passcodes for yourself or researchers to unlock editing and override public contribution locks.
              </p>

              <form onSubmit={handleCreatePasscode} className="space-y-3.5">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Passcode Label
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Anambra Field Researcher, Lead Editor"
                    value={newPasscodeLabel}
                    onChange={(e) => setNewPasscodeLabel(e.target.value)}
                    className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Custom Passcode (Leave blank to auto-generate)
                  </label>
                  <input
                    type="text"
                    placeholder="Auto-generated secure crypto code"
                    value={newPasscodeCustom}
                    onChange={(e) => setNewPasscodeCustom(e.target.value)}
                    className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-white placeholder-slate-500 font-mono focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      Role Privilege
                    </label>
                    <select
                      value={newPasscodeRole}
                      onChange={(e: any) => setNewPasscodeRole(e.target.value)}
                      className="w-full px-2.5 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400"
                    >
                      <option value="curator">Curator (Full)</option>
                      <option value="field_researcher">Field Researcher</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      Expires (Days)
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={365}
                      value={newPasscodeDays}
                      onChange={(e) => setNewPasscodeDays(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-white font-mono focus:outline-none focus:border-amber-400"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-2 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs shadow-md transition-all flex items-center justify-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Generate Passcode</span>
                </button>
              </form>
            </div>

            {/* Active Passcodes Table */}
            <div className="lg:col-span-2 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-sm text-white">Active Passcodes & Access Keys</h3>
                <button
                  type="button"
                  onClick={() => fetchPasscodes(sessionStorage.getItem('ica_curator_key') || passcode)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
                  title="Refresh passcodes"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>

              <div className="rounded-2xl bg-[#090e1d] border border-white/10 overflow-hidden shadow-xl">
                <div className="divide-y divide-white/[0.06]">
                  {passcodes.map((p) => (
                    <div
                      key={p.id}
                      className="p-4 flex items-center justify-between gap-3 hover:bg-white/[0.02] transition-colors"
                    >
                      <div className="min-w-0 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-xs text-white">{p.label}</span>
                          <span
                            className={`text-[9px] uppercase font-mono font-bold px-1.5 py-0.5 rounded ${
                              p.isActive
                                ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                                : 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                            }`}
                          >
                            {p.isActive ? 'Active' : 'Revoked'}
                          </span>
                          <span className="text-[10px] font-mono text-slate-400">
                            {p.role}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <code className="text-xs font-mono text-amber-300 bg-black/50 px-2 py-0.5 rounded border border-white/10">
                            {p.code}
                          </code>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(p.code);
                              setCopiedId(p.id);
                              setTimeout(() => setCopiedId(null), 2000);
                            }}
                            className="p-1 text-slate-400 hover:text-white transition-colors"
                            title="Copy Passcode"
                          >
                            {copiedId === p.id ? (
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>

                        <p className="text-[10px] text-slate-500 font-mono">
                          Created {new Date(p.createdAt).toLocaleDateString()}
                          {p.expiresAt && ` · Expires ${new Date(p.expiresAt).toLocaleDateString()}`}
                        </p>
                      </div>

                      {p.isActive && p.role !== 'master' && (
                        <button
                          type="button"
                          onClick={() => handleRevokePasscode(p.id)}
                          className="px-2.5 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/25 text-xs font-semibold transition-colors shrink-0 flex items-center gap-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Revoke</span>
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────────── */}
        {/* TAB 3: CONTRIBUTION GATES & KILL-SWITCH                             */}
        {/* ─────────────────────────────────────────────────────────────────── */}
        {activeTab === 'settings' && (
          <div className="max-w-2xl space-y-6">
            <div className="p-6 rounded-2xl bg-[#090e1d] border border-white/10 space-y-6 shadow-xl">
              <div>
                <h3 className="font-bold text-base text-white">Public Contribution Controls</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Decide when public visitors can upload media or submit settlements to the atlas.
                </p>
              </div>

              {/* Master Toggle */}
              <div className="p-4 rounded-xl bg-black/40 border border-white/10 flex items-center justify-between gap-4">
                <div>
                  <h4 className="text-xs font-bold text-white">Public Contributions Gate</h4>
                  <p className="text-[11px] text-slate-400 leading-normal mt-0.5">
                    {settings.publicSubmissionsEnabled
                      ? 'Public visitors can upload photos/videos and submit new settlements.'
                      : 'Contributions are currently locked. Only users with a curator passcode can add media or make updates.'}
                  </p>
                </div>

                <button
                  type="button"
                  disabled={settingsSaving}
                  onClick={() =>
                    handleSaveSettings({
                      publicSubmissionsEnabled: !settings.publicSubmissionsEnabled,
                    })
                  }
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-md shrink-0 flex items-center gap-1.5 ${
                    settings.publicSubmissionsEnabled
                      ? 'bg-emerald-500 text-black hover:bg-emerald-400'
                      : 'bg-rose-600 text-white hover:bg-rose-500'
                  }`}
                >
                  <Power className="w-3.5 h-3.5" />
                  <span>
                    {settings.publicSubmissionsEnabled ? '🟢 OPEN (Active)' : '🔴 LOCKED (Paused)'}
                  </span>
                </button>
              </div>

              {/* Moderation Mode Toggle */}
              <div className="p-4 rounded-xl bg-black/40 border border-white/10 space-y-2">
                <h4 className="text-xs font-bold text-white">Moderation Policy</h4>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleSaveSettings({ moderationMode: 'direct' })}
                    className={`p-3 rounded-xl border text-left text-xs transition-all ${
                      settings.moderationMode === 'direct'
                        ? 'bg-amber-500/20 border-amber-500/40 text-amber-200'
                        : 'bg-white/[0.02] border-white/10 text-slate-400 hover:text-white'
                    }`}
                  >
                    <strong className="block font-semibold">Direct Publish</strong>
                    <span className="text-[10px] text-slate-400">
                      Contributions publish immediately with peer-confirmation status.
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSaveSettings({ moderationMode: 'require_approval' })}
                    className={`p-3 rounded-xl border text-left text-xs transition-all ${
                      settings.moderationMode === 'require_approval'
                        ? 'bg-amber-500/20 border-amber-500/40 text-amber-200'
                        : 'bg-white/[0.02] border-white/10 text-slate-400 hover:text-white'
                    }`}
                  >
                    <strong className="block font-semibold">Curator Approval Queue</strong>
                    <span className="text-[10px] text-slate-400">
                      Submissions remain hidden until approved in the curator dashboard.
                    </span>
                  </button>
                </div>
              </div>

              {settingsSuccess && (
                <div className="p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>Curator settings updated successfully!</span>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* MODAL: EDIT / CREATE SETTLEMENT PROFILE                             */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {(editingProfile || isNewProfile) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150">
          <div className="relative w-full max-w-2xl rounded-3xl bg-[#090e1e] border border-amber-500/30 shadow-2xl text-white flex flex-col max-h-[92vh] overflow-hidden">
            {/* Header */}
            <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between gap-3 bg-gradient-to-r from-amber-500/10 to-transparent">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <BookOpen className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm sm:text-base text-white">
                    {isNewProfile ? 'Create Settlement Heritage Profile' : `Edit: ${formName}`}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Defines authoritative cultural metadata automatically adopted by match keys
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setEditingProfile(null);
                  setIsNewProfile(false);
                }}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10"
              >
                ✕
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveProfile} className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Settlement Name <span className="text-amber-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Awka North, Onitsha"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Native Orthography / Tone
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Ọka Ebe-Ugwu, Ọnịcha"
                    value={formNativeName}
                    onChange={(e) => setFormNativeName(e.target.value)}
                    className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-white placeholder-slate-500 font-mono focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              {/* Match Keys */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Automatic Match Keys (Comma-separated) <span className="text-amber-400">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. awka north, achalla, amanuke, ebenebe, NG004002"
                  value={formKeys}
                  onChange={(e) => setFormKeys(e.target.value)}
                  className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-white placeholder-slate-500 font-mono focus:outline-none focus:border-amber-400"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Any map feature matching ANY of these keys will automatically adopt this heritage profile!
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Traditional Ruler / Sovereign Title
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Okpara-Ukwu of Achalla, Ezeuzu of Awka"
                    value={formTraditionalTitle}
                    onChange={(e) => setFormTraditionalTitle(e.target.value)}
                    className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Primary 4-Day Market Day
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Orie Achalla, Eke Awka, Afor, Nkwo"
                    value={formMarketDay}
                    onChange={(e) => setFormMarketDay(e.target.value)}
                    className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Clan / Kindred / Ancestral Lineage
                </label>
                <input
                  type="text"
                  placeholder="e.g. Ụmụ-Nehi ancestral clans along the Omambala agrarian basin"
                  value={formClanLineage}
                  onChange={(e) => setFormClanLineage(e.target.value)}
                  className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Traditional Festivals (Comma-separated)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Igu Aro, Otite New Yam Rites, Egwu Imoka"
                    value={formFestivals}
                    onChange={(e) => setFormFestivals(e.target.value)}
                    className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Sacred Landmarks / Shrines (Comma-separated)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Obu Ofor Achalla, Haba Stream Basin"
                    value={formLandmarks}
                    onChange={(e) => setFormLandmarks(e.target.value)}
                    className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Historical Summary & Oral Tradition
                </label>
                <textarea
                  rows={3}
                  placeholder="Historical narrative regarding founding ancestors, precolonial migration, or artisan guild origins..."
                  value={formSummary}
                  onChange={(e) => setFormSummary(e.target.value)}
                  className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                />
              </div>

              {/* Bespoke Key-Value Tags */}
              <div className="p-3 rounded-xl bg-black/40 border border-white/10 space-y-2.5">
                <span className="text-[11px] font-bold text-amber-300 block">
                  Custom Key-Value Attributes
                </span>

                {Object.keys(formCustomAttributes).length > 0 && (
                  <div className="space-y-1.5">
                    {Object.entries(formCustomAttributes).map(([k, v]) => (
                      <div
                        key={k}
                        className="flex items-center justify-between p-2 rounded-lg bg-white/[0.03] border border-white/10 text-xs"
                      >
                        <div>
                          <strong className="text-white font-mono">{k}:</strong>{' '}
                          <span className="text-slate-300">{v}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveCustomAttribute(k)}
                          className="text-slate-400 hover:text-rose-400"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Key (e.g. Iron Guild)"
                    value={formCustomKey}
                    onChange={(e) => setFormCustomKey(e.target.value)}
                    className="w-1/3 px-2.5 py-1.5 bg-black/60 border border-white/10 rounded-lg text-xs text-white placeholder-slate-500"
                  />
                  <input
                    type="text"
                    placeholder="Value (e.g. Ancient smelting furnaces)"
                    value={formCustomVal}
                    onChange={(e) => setFormCustomVal(e.target.value)}
                    className="flex-1 px-2.5 py-1.5 bg-black/60 border border-white/10 rounded-lg text-xs text-white placeholder-slate-500"
                  />
                  <button
                    type="button"
                    onClick={handleAddCustomAttribute}
                    className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-bold text-white shrink-0"
                  >
                    + Add
                  </button>
                </div>
              </div>

              {profileError && (
                <div className="p-2.5 rounded-xl bg-red-500/15 border border-red-500/30 text-red-300 text-xs">
                  {profileError}
                </div>
              )}

              {profileSaveSuccess && (
                <div className="p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>Settlement heritage profile saved successfully!</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => {
                    setEditingProfile(null);
                    setIsNewProfile(false);
                  }}
                  className="px-4 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-xs font-medium text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={profileSaving}
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs shadow-md transition-all flex items-center gap-1.5 disabled:opacity-50"
                >
                  {profileSaving ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  )}
                  <span>Save Profile</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
