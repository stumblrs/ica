'use client';

import React, { useEffect, useState } from 'react';
import { Compass } from 'lucide-react';

export function AppBarMapToolsButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [hasActiveEffects, setHasActiveEffects] = useState(false);

  useEffect(() => {
    function handleState(e: Event) {
      const customEvent = e as CustomEvent<{ isOpen: boolean; hasActiveEffects?: boolean }>;
      if (customEvent.detail) {
        setIsOpen(customEvent.detail.isOpen);
        if (typeof customEvent.detail.hasActiveEffects === 'boolean') {
          setHasActiveEffects(customEvent.detail.hasActiveEffects);
        }
      }
    }

    window.addEventListener('ica:map-controls-state', handleState);
    return () => {
      window.removeEventListener('ica:map-controls-state', handleState);
    };
  }, []);

  function handleToggle() {
    window.dispatchEvent(new CustomEvent('ica:toggle-map-controls'));
  }

  return (
    <button
      type="button"
      onClick={handleToggle}
      className={`w-8 h-8 rounded-full flex items-center justify-center transition-all active:scale-95 relative ${
        isOpen
          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 ring-1 ring-emerald-500/30'
          : 'text-[#e7e9ea] hover:bg-[#16181c]'
      }`}
      title={isOpen ? 'Close Map Tools (Layers, 3D, Zoom)' : 'Open Map Tools (Layers, 3D, Zoom)'}
      aria-label="Toggle Map Tools"
      aria-expanded={isOpen}
    >
      <Compass className="w-4 h-4" />
      {hasActiveEffects && (
        <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-cyan-400 animate-ping ring-2 ring-black" />
      )}
    </button>
  );
}
