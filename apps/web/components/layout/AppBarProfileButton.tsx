'use client';

import React, { useState, useEffect } from 'react';
import { getUserProfile, type UserProfile } from '@/lib/user-profile';
import { UserProfileModal } from '@/components/profile/UserProfileModal';

export function AppBarProfileButton() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isOpen, setIsOpen] = useState(false);

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

    // Listen to open profile requests from elsewhere (e.g., mobile drawer)
    function handleOpenRequest() {
      setIsOpen(true);
    }

    window.addEventListener('ica:profile-updated', handleProfileUpdate);
    window.addEventListener('ica:open-profile', handleOpenRequest);

    return () => {
      window.removeEventListener('ica:profile-updated', handleProfileUpdate);
      window.removeEventListener('ica:open-profile', handleOpenRequest);
    };
  }, []);

  const symbol = profile?.avatarSymbol || 'ọ';
  const hasUsername = Boolean(profile?.username);
  const tooltipText = hasUsername
    ? `Profile: @${profile!.username} (${profile!.displayName || 'Contributor'})`
    : 'Click to set your contributor @username & profile';

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="relative group focus:outline-none focus:ring-2 focus:ring-emerald-400 rounded-xl transition-transform active:scale-95"
        title={tooltipText}
        aria-label={tooltipText}
      >
        <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 p-[1px] shadow-lg shadow-emerald-500/20 shrink-0 group-hover:shadow-emerald-500/40 transition-shadow">
          <div className="h-full w-full rounded-[11px] bg-[#0a0f1d] flex items-center justify-center font-bold text-emerald-400 text-sm sm:text-base font-['Outfit'] select-none group-hover:text-emerald-300 transition-colors">
            {symbol}
          </div>
        </div>

        {/* Pulse dot if no username is set yet, alerting user to configure their identity */}
        {!hasUsername ? (
          <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500 border border-[#0a0f1d]"></span>
          </span>
        ) : (
          <span className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full bg-emerald-400 ring-1 ring-[#0a0f1d]" />
        )}
      </button>

      {/* The Profile Modal */}
      <UserProfileModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}
