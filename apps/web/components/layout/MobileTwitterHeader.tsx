'use client';

import React, { useState } from 'react';
import {
  Sparkles,
  Filter,
  X,
  Compass,
  MapPin,
  ShieldCheck,
  Download,
  Info,
  Wifi,
  WifiOff,
  ChevronRight,
  BookOpen,
  Layers,
  Search,
  User,
} from 'lucide-react';
import type { MobileTab } from './MobileTwitterBottomNav';
import type { AtlasTab } from '@/components/map/AtlasOverview';
import { getUserProfile, type UserProfile } from '@/lib/user-profile';

interface MobileTwitterHeaderProps {
  activeTab: MobileTab;
  onSelectTab: (tab: MobileTab) => void;
  communitiesCount: number;
  verifiedCount: number;
  isFiltersCollapsed: boolean;
  hasActiveFilters?: boolean;
  onToggleFilters: () => void;
  onOpenSearch: () => void;
  onResetView: () => void;
}

export function MobileTwitterHeader({
  activeTab,
  onSelectTab,
  communitiesCount,
  verifiedCount,
  isFiltersCollapsed,
  hasActiveFilters = false,
  onToggleFilters,
  onOpenSearch,
  onResetView,
}: MobileTwitterHeaderProps) {
  const [isProfileDrawerOpen, setIsProfileDrawerOpen] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);

  React.useEffect(() => {
    setProfile(getUserProfile());
    function handleUpdate(e: Event) {
      const customEvent = e as CustomEvent<UserProfile>;
      if (customEvent.detail) setProfile(customEvent.detail);
      else setProfile(getUserProfile());
    }
    window.addEventListener('ica:profile-updated', handleUpdate);
    return () => window.removeEventListener('ica:profile-updated', handleUpdate);
  }, []);

  // Determine current title/view text
  const getHeaderTitle = () => {
    switch (activeTab) {
      case 'map':
        return 'Igbo Cultural Atlas';
      case 'explore':
        return 'Explore Settlements';
      case 'voices':
        return 'Community Voices';
      case 'culture':
        return 'Dialects & Continua';
      case 'archives':
        return 'Archival Records';
      default:
        return 'Cultural Atlas';
    }
  };

  return (
    <>
      {/* Top Sticky Twitter Header */}
      <header className="lg:hidden sticky top-0 left-0 right-0 h-[48px] z-30 bg-[#000000]/85 backdrop-blur-xl border-b border-[#2f3336] px-3 flex items-center justify-between select-none">
        {/* Left: Avatar / ICA Insignia Trigger */}
        <button
          type="button"
          onClick={() => setIsProfileDrawerOpen(true)}
          className="relative w-8 h-8 rounded-full bg-gradient-to-tr from-emerald-600 via-teal-700 to-emerald-400 p-[1.5px] focus:outline-none active:scale-95 transition-transform"
          aria-label="Open Atlas menu"
        >
          <div className="w-full h-full rounded-full bg-[#070b16] flex items-center justify-center overflow-hidden">
            <span className="font-mono text-[11px] font-black text-emerald-300">ICA</span>
          </div>
          {/* Status dot */}
          <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-black" />
        </button>

        {/* Center: Contextual Title or Search Input */}
        {activeTab === 'explore' ? (
          <button
            type="button"
            onClick={onOpenSearch}
            className="flex-1 max-w-[230px] mx-2 h-[32px] px-3 rounded-full bg-[#16181c] border border-[#2f3336] text-xs text-[#71767b] flex items-center gap-2 active:bg-[#1d1f23] transition-colors"
          >
            <Search className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span className="truncate">Search towns, clans...</span>
          </button>
        ) : (
          <div
            className="flex flex-col items-center cursor-pointer active:opacity-75 transition-opacity"
            onClick={() => {
              if (activeTab === 'map') onResetView();
            }}
          >
            <h1 className="text-sm font-bold text-[#e7e9ea] font-display tracking-tight flex items-center gap-1.5 leading-none">
              <span>{getHeaderTitle()}</span>
            </h1>
            <span className="text-[10px] text-[#71767b] font-mono leading-none mt-0.5">
              {communitiesCount.toLocaleString()} locations documented
            </span>
          </div>
        )}

        {/* Right: Quick Action Filter Button */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onToggleFilters}
            className={`w-8 h-8 rounded-full flex items-center justify-center transition-all active:scale-95 relative ${
              !isFiltersCollapsed
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                : 'text-[#e7e9ea] hover:bg-[#16181c]'
            }`}
            title="Toggle Quick Filters & Dialects"
            aria-label="Toggle Quick Filters"
          >
            <Filter className="w-4 h-4" />
            {hasActiveFilters && (
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-black" />
            )}
          </button>
        </div>
      </header>

      {/* Slide-out Twitter Profile Drawer (Pre-2023 Twitter Mobile Menu) */}
      {isProfileDrawerOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          {/* Backdrop Scrim */}
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity animate-in fade-in"
            onClick={() => setIsProfileDrawerOpen(false)}
            aria-hidden="true"
          />

          {/* Drawer Content */}
          <div className="relative w-[285px] max-w-[85vw] h-full bg-[#000000] border-r border-[#2f3336] shadow-2xl flex flex-col z-10 animate-in slide-in-from-left duration-200">
            {/* Header info */}
            <div className="p-4 border-b border-[#2f3336]">
              <div className="flex items-center justify-between mb-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-400 p-[2px]">
                  <div className="w-full h-full rounded-full bg-[#070b16] flex items-center justify-center font-bold text-emerald-400 font-['Outfit'] text-xl">
                    {profile?.avatarSymbol || 'ọ'}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsProfileDrawerOpen(false)}
                  className="p-1.5 rounded-full text-[#71767b] hover:text-white hover:bg-[#16181c]"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <h2 className="text-base font-bold text-[#e7e9ea] leading-tight">
                {profile?.displayName || 'Igbo Cultural Atlas'}
              </h2>
              <p className="text-xs text-emerald-400 font-mono mt-0.5">
                {profile?.username ? `@${profile.username}` : '@anonymous_contributor'}
              </p>

              {/* Edit Profile Button */}
              <button
                type="button"
                onClick={() => {
                  setIsProfileDrawerOpen(false);
                  window.dispatchEvent(new CustomEvent('ica:open-profile'));
                }}
                className="mt-3 w-full py-1.5 px-3 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-xs font-semibold text-emerald-300 flex items-center justify-center gap-1.5 transition-colors"
              >
                <User className="w-3.5 h-3.5" />
                <span>{profile?.username ? 'Edit Profile & Settings' : 'Set Your @username'}</span>
              </button>

              {/* Stats row like Twitter followers/following */}
              <div className="flex items-center gap-4 mt-3 pt-2 text-xs border-t border-[#2f3336]/60">
                <div>
                  <span className="font-bold text-[#e7e9ea]">{communitiesCount.toLocaleString()}</span>{' '}
                  <span className="text-[#71767b]">Places</span>
                </div>
                <div>
                  <span className="font-bold text-emerald-400">{verifiedCount.toLocaleString()}</span>{' '}
                  <span className="text-[#71767b]">Verified</span>
                </div>
              </div>
            </div>

            {/* Menu Items */}
            <div className="flex-1 overflow-y-auto py-2">
              <button
                type="button"
                onClick={() => {
                  onSelectTab('map');
                  setIsProfileDrawerOpen(false);
                }}
                className="w-full px-4 py-3 flex items-center gap-3 text-sm font-semibold text-[#e7e9ea] hover:bg-[#16181c] active:bg-[#1d1f23] transition-colors"
              >
                <Compass className="w-5 h-5 text-emerald-400" />
                <span>Interactive Homeland Map</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onSelectTab('explore');
                  setIsProfileDrawerOpen(false);
                }}
                className="w-full px-4 py-3 flex items-center gap-3 text-sm font-semibold text-[#e7e9ea] hover:bg-[#16181c] active:bg-[#1d1f23] transition-colors"
              >
                <MapPin className="w-5 h-5 text-[#71767b]" />
                <span>Town & LGA Gazetteer</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onSelectTab('voices');
                  setIsProfileDrawerOpen(false);
                }}
                className="w-full px-4 py-3 flex items-center gap-3 text-sm font-semibold text-[#e7e9ea] hover:bg-[#16181c] active:bg-[#1d1f23] transition-colors"
              >
                <Sparkles className="w-5 h-5 text-amber-400" />
                <span>Oral Testimonies Feed</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onSelectTab('archives');
                  setIsProfileDrawerOpen(false);
                }}
                className="w-full px-4 py-3 flex items-center gap-3 text-sm font-semibold text-[#e7e9ea] hover:bg-[#16181c] active:bg-[#1d1f23] transition-colors"
              >
                <BookOpen className="w-5 h-5 text-sky-400" />
                <span>Archival Documents & Maps</span>
              </button>

              <div className="h-px bg-[#2f3336] my-2" />

              <div className="px-4 py-2">
                <p className="text-[11px] font-mono uppercase text-[#71767b] tracking-wider mb-1">
                  Atlas Engine
                </p>
                <div className="p-3 rounded-xl bg-[#16181c] border border-[#2f3336] flex flex-col gap-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#71767b]">Reference Settlements</span>
                    <span className="text-white font-mono font-bold">13 States</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#71767b]">Map Engine</span>
                    <span className="text-emerald-400 font-mono">MapLibre GL</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#71767b]">3D Terrain Corridor</span>
                    <span className="text-amber-300 font-mono">Active</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer / Reset button */}
            <div className="p-3 border-t border-[#2f3336] bg-[#000000]">
              <button
                type="button"
                onClick={() => {
                  onResetView();
                  setIsProfileDrawerOpen(false);
                }}
                className="w-full py-2 px-3 rounded-xl bg-[#16181c] hover:bg-[#1d1f23] border border-[#2f3336] text-xs font-semibold text-[#e7e9ea] flex items-center justify-center gap-2"
              >
                <Compass className="w-4 h-4 text-emerald-400" />
                <span>Reset Map to Southeast Center</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
