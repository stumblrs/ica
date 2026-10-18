'use client';

import React, { useState, useEffect } from 'react';
import {
  Plus,
  MapPin,
  MessageSquare,
  X,
  Feather,
  Sparkles,
} from 'lucide-react';

interface TwitterComposeFABProps {
  onAddLocation: () => void;
  onAddVoice: () => void;
}

export function TwitterComposeFAB({
  onAddLocation,
  onAddVoice,
}: TwitterComposeFABProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Close on Escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const handleSelectAction = (action: () => void) => {
    setIsOpen(false);
    action();
  };

  return (
    <>
      {/* Dimmed backdrop when speed dial is active */}
      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/65 backdrop-blur-sm transition-opacity duration-200 animate-in fade-in"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Floating compose container */}
      <div className="lg:hidden fixed bottom-[68px] right-4 z-40 flex flex-col items-end pointer-events-auto select-none">
        {/* Speed Dial Options */}
        {isOpen && (
          <div className="flex flex-col items-end gap-3 mb-3 animate-in fade-in slide-in-from-bottom-4 duration-200">
            {/* 1. Share Community Voice / Testimony */}
            <div
              className="flex items-center gap-2.5 cursor-pointer group"
              onClick={() => handleSelectAction(onAddVoice)}
              role="button"
              tabIndex={0}
            >
              {/*<span className="px-3 py-1.5 rounded-xl bg-[#16181c] border border-[#2f3336] text-xs font-semibold text-[#e7e9ea] shadow-xl shadow-black/50 group-hover:border-emerald-500/40 transition-all">
                Post Voice & Comment
              </span>*/}
              <button
                type="button"
                className="w-11 h-11 rounded-full bg-emerald-500 text-black flex items-center justify-center shadow-lg shadow-emerald-500/30 group-hover:scale-105 active:scale-95 transition-all"
                title="Post Oral History / Community Voice"
              >
                <MessageSquare className="w-5 h-5 fill-black stroke-black" />
              </button>
            </div>

            {/* 2. Add Location / Community to Atlas */}
            <div
              className="flex items-center gap-2.5 cursor-pointer group"
              onClick={() => handleSelectAction(onAddLocation)}
              role="button"
              tabIndex={0}
            >
              {/*<span className="px-3 py-1.5 rounded-xl bg-[#16181c] border border-[#2f3336] text-xs font-semibold text-[#e7e9ea] shadow-xl shadow-black/50 group-hover:border-emerald-500/40 transition-all">
                Add Location to Atlas
              </span>*/}
              <button
                type="button"
                className="w-11 h-11 rounded-full bg-gradient-to-tr from-teal-500 to-emerald-400 text-black flex items-center justify-center shadow-lg shadow-emerald-500/30 group-hover:scale-105 active:scale-95 transition-all"
                title="Add Community or Landmark"
              >
                <MapPin className="w-5 h-5 fill-black stroke-black" />
              </button>
            </div>
          </div>
        )}

        {/* Primary Circular FAB Button (Twitter Compose Quill Style) */}
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className={`w-[54px] h-[54px] rounded-full flex items-center justify-center shadow-2xl transition-all duration-200 active:scale-90 ${
            isOpen
              ? 'bg-[#2f3336] text-white hover:bg-[#3e4144] shadow-black/80'
              : 'bg-emerald-500 hover:bg-emerald-400 text-black shadow-emerald-500/35 hover:shadow-emerald-500/50'
          }`}
          aria-label={isOpen ? 'Close compose options' : 'Compose: Add location or voice'}
          aria-expanded={isOpen}
        >
          {isOpen ? (
            <X className="w-6 h-6 stroke-[2.5]" />
          ) : (
            <div className="relative flex items-center justify-center">
              <Feather className="w-6 h-6 stroke-[2.35] fill-current" />
              <Plus className="w-3.5 h-3.5 stroke-[3] absolute -top-1 -right-1 text-black" />
            </div>
          )}
        </button>
      </div>
    </>
  );
}
