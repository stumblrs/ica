'use client';

import React, { useEffect, useState } from 'react';
import { Filter } from 'lucide-react';

export function AppBarFilterButton() {
  const [isFiltersCollapsed, setIsFiltersCollapsed] = useState(false);
  const [hasActiveFilters, setHasActiveFilters] = useState(false);

  useEffect(() => {
    function handleFiltersState(e: Event) {
      const customEvent = e as CustomEvent<{ isCollapsed: boolean; hasActive: boolean }>;
      if (customEvent.detail) {
        setIsFiltersCollapsed(customEvent.detail.isCollapsed);
        setHasActiveFilters(customEvent.detail.hasActive);
      }
    }

    window.addEventListener('ica:filters-state', handleFiltersState);
    return () => {
      window.removeEventListener('ica:filters-state', handleFiltersState);
    };
  }, []);

  function handleToggle() {
    window.dispatchEvent(new CustomEvent('ica:toggle-filters'));
  }

  return (
    <button
      type="button"
      onClick={handleToggle}
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
  );
}
