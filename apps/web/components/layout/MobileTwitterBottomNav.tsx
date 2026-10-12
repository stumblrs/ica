'use client';

import React from 'react';
import {
  Compass,
  Search,
  MessageSquare,
  Sparkles,
  Archive,
  Map as MapIcon,
} from 'lucide-react';

import type { AtlasTab } from '@/components/map/AtlasOverview';

export type MobileTab = 'map' | 'explore' | 'culture' | 'voices' | 'archives';

interface MobileTwitterBottomNavProps {
  activeTab: MobileTab;
  onTabSelect: (tab: MobileTab) => void;
  hasNewVoices?: boolean;
}

export function MobileTwitterBottomNav({
  activeTab,
  onTabSelect,
  hasNewVoices = false,
}: MobileTwitterBottomNavProps) {
  const tabs = [
    {
      id: 'map' as MobileTab,
      label: 'Atlas',
      icon: MapIcon,
      isActive: activeTab === 'map',
    },
    {
      id: 'explore' as MobileTab,
      label: 'Explore',
      icon: Search,
      isActive: activeTab === 'explore',
    },
    {
      id: 'voices' as MobileTab,
      label: 'Voices',
      icon: MessageSquare,
      isActive: activeTab === 'voices',
      hasBadge: hasNewVoices,
    },
    {
      id: 'culture' as MobileTab,
      label: 'Culture',
      icon: Sparkles,
      isActive: activeTab === 'culture',
    },
    {
      id: 'archives' as MobileTab,
      label: 'Archives',
      icon: Archive,
      isActive: activeTab === 'archives',
    },
  ];

  return (
    <nav
      aria-label="Twitter Bottom Navigation"
      className="lg:hidden fixed bottom-0 left-0 right-0 h-[53px] z-40 bg-[#000000]/90 backdrop-blur-xl border-t border-[#2f3336] px-2 flex items-center justify-around select-none pb-[env(safe-area-inset-bottom)] transition-all"
    >
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const active = tab.isActive;

        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onTabSelect(tab.id)}
            className="flex-1 h-full flex flex-col items-center justify-center relative group py-1 active:scale-90 transition-transform duration-150"
            aria-label={tab.label}
            aria-selected={active}
          >
            <div className="relative flex items-center justify-center">
              <Icon
                className={`w-[22px] h-[22px] transition-all duration-200 ${
                  active
                    ? 'text-emerald-400 stroke-[2.35] scale-105'
                    : 'text-[#71767b] group-hover:text-[#e7e9ea] stroke-[1.8]'
                }`}
              />

              {/* Twitter notification badge dot */}
              {tab.hasBadge && (
                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-black animate-pulse" />
              )}
            </div>

            <span
              className={`text-[10px] mt-0.5 tracking-tight font-medium transition-colors ${
                active ? 'text-emerald-400 font-bold' : 'text-[#71767b]'
              }`}
            >
              {tab.label}
            </span>

            {/* Subtle active pill indicator at bottom */}
            {active && (
              <span className="absolute bottom-1 w-4 h-[2.5px] rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
            )}
          </button>
        );
      })}
    </nav>
  );
}
