'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { getUserProfile, type UserProfile } from '@/lib/user-profile';

export function AppBarProfileButton() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const pathname = usePathname();
  const isProfileActive = pathname === '/profile';

  useEffect(() => {
    // Initial load
    setProfile(getUserProfile());

    // Listen to profile updates
    function handleProfileUpdate(e: Event) {
      const customEvent = e as CustomEvent<UserProfile>;
      if (customEvent.detail) {
        setProfile(customEvent.detail);
      } else {
        setProfile(getUserProfile());
      }
    }

    window.addEventListener('ica:profile-updated', handleProfileUpdate);
    return () => {
      window.removeEventListener('ica:profile-updated', handleProfileUpdate);
    };
  }, []);

  const symbol = profile?.avatarSymbol || 'ọ';
  const hasUsername = Boolean(profile?.username);
  const tooltipText = hasUsername
    ? `Contributor Profile: @${profile!.username} (${profile!.displayName || 'Contributor'})`
    : 'Click to open your Profile page and set your @username';

  return (
    <Link
      href="/profile"
      className={`relative group focus:outline-none focus:ring-2 focus:ring-emerald-400 rounded-xl transition-all active:scale-95 block shrink-0 ${
        isProfileActive ? 'ring-2 ring-emerald-400' : ''
      }`}
      title={tooltipText}
      aria-label={tooltipText}
    >
      <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 p-[1px] shadow-lg shadow-emerald-500/20 shrink-0 group-hover:shadow-emerald-500/40 transition-shadow">
        <div className="h-full w-full rounded-[11px] bg-[#0a0f1d] flex items-center justify-center font-bold text-emerald-400 text-sm sm:text-base font-['Outfit'] select-none group-hover:text-emerald-300 transition-colors">
          {symbol}
        </div>
      </div>

      {/* Pulse dot if no username is set yet */}
      {!hasUsername ? (
        <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500 border border-[#0a0f1d]"></span>
        </span>
      ) : (
        <span className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full bg-emerald-400 ring-1 ring-[#0a0f1d]" />
      )}
    </Link>
  );
}
