'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Search, MapPin, X, Loader2 } from 'lucide-react';

interface SearchBarProps {
  onSelectCommunity: (community: any) => void;
}

export function SearchBar({ onSelectCommunity }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard shortcut listener: Cmd/Ctrl + K or "/" opens and focuses search
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      } else if (e.key === '/' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        e.preventDefault();
        inputRef.current?.focus();
      } else if (e.key === 'Escape') {
        setOpen(false);
        inputRef.current?.blur();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setOpen(false);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query.trim())}`);
        if (res.ok) {
          const data = await res.json();
          setResults(data);
          setOpen(true);
        }
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setLoading(false);
      }
    }, 180);

    return () => clearTimeout(timer);
  }, [query]);

  const handleSelectItem = (item: any) => {
    inputRef.current?.blur();
    onSelectCommunity(item);
    setOpen(false);
  };

  return (
    <div ref={searchRef} className="relative">
      <div className="relative flex items-center">
        <input
          ref={inputRef}
          type="search"
          enterKeyHint="search"
          placeholder="Search town, village or LGA… (Ctrl+K)"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => {
            if (results.length > 0) setOpen(true);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && results.length > 0) {
              e.preventDefault();
              handleSelectItem(results[0]);
            }
          }}
          className="w-full h-[36px] sm:h-[34px] pl-9 pr-14 bg-white/[0.04] border border-white/[0.08] rounded-xl text-[13px] text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/70 focus:bg-white/[0.06] focus:ring-2 focus:ring-emerald-500/20 transition-all touch-manipulation"
        />
        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 sm:left-3 pointer-events-none" />

        <div className="absolute right-2 sm:right-2.5 flex items-center gap-1">
          {loading ? (
            <Loader2 className="w-3.5 h-3.5 text-emerald-400 animate-spin" />
          ) : query ? (
            <button
              type="button"
              onClick={() => {
                setQuery('');
                setResults([]);
                setOpen(false);
                inputRef.current?.focus();
              }}
              className="p-1 sm:p-0.5 text-slate-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          ) : (
            <kbd className="hidden sm:inline-flex items-center text-[9px] font-mono text-slate-500 bg-white/[0.06] px-1.5 py-0.5 rounded border border-white/[0.08] pointer-events-none">
              ⌘K
            </kbd>
          )}
        </div>
      </div>

      {/* Autocomplete Dropdown */}
      {open && (
        <div className="absolute top-full mt-2 left-0 right-0 bg-[#080d1a]/95 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50 max-h-[50vh] sm:max-h-84 overflow-y-auto overscroll-contain divide-y divide-white/[0.06]">
          {results.length > 0 ? (
            (() => {
              // Smart Name Disambiguation: detect if any name has multiple entries in different LGAs/States
              const nameGroupMap = new Map<string, any[]>();
              for (const r of results) {
                const cleanName = (r.name || '').trim().toLowerCase();
                if (!nameGroupMap.has(cleanName)) nameGroupMap.set(cleanName, []);
                nameGroupMap.get(cleanName)!.push(r);
              }

              const ambiguousGroups = Array.from(nameGroupMap.entries())
                .filter(([_, items]) => items.length > 1 && items.some((it, _, arr) => it.lgaName !== arr[0].lgaName || it.stateName !== arr[0].stateName));

              const markets = results.filter((r) => r.type === 'market' || r.type === 'marketplace');
              const lgas = results.filter((r) => r.type === 'lga');
              const communities = results.filter((r) => r.source === 'community' || r.type === 'community');
              const settlements = results.filter(
                (r) => r.type !== 'market' && r.type !== 'marketplace' && r.type !== 'lga' && r.source !== 'community' && r.type !== 'community'
              );

              const groups = [
                { title: 'Traditional Markets & Palaces', items: markets, badgeColor: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
                { title: 'Communities', items: communities, badgeColor: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
                { title: 'Local Government Areas (LGAs)', items: lgas, badgeColor: 'text-blue-400 bg-blue-500/10 border-blue-500/20' },
                { title: 'Cities, Towns & Villages', items: settlements, badgeColor: 'text-slate-300 bg-white/5 border-white/10' },
              ].filter((g) => g.items.length > 0);

              return (
                <div>
                  {/* Smart Disambiguation Comparison Banner */}
                  {ambiguousGroups.length > 0 && (
                    <div className="p-3 bg-amber-500/[0.08] border-b border-amber-500/20 space-y-2">
                      <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase tracking-wider text-amber-300">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                        <span>Smart Disambiguation Notice</span>
                      </div>
                      <p className="text-[11px] text-slate-300 leading-tight">
                        Multiple settlements share the name <strong className="text-white">&ldquo;{ambiguousGroups[0][1][0].name}&rdquo;</strong> across different local governments:
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1">
                        {ambiguousGroups[0][1].slice(0, 4).map((ambItem) => (
                          <button
                            key={`amb-${ambItem.id || ambItem.name}-${ambItem.lgaName}`}
                            type="button"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              handleSelectItem(ambItem);
                            }}
                            className="p-2.5 sm:p-2 rounded-xl bg-white/[0.04] hover:bg-emerald-500/15 active:bg-emerald-500/25 border border-white/[0.08] hover:border-emerald-500/40 text-left transition-colors group touch-manipulation min-h-[44px]"
                          >
                            <span className="text-[11px] font-bold text-white group-hover:text-emerald-300 block truncate">
                              {ambItem.name}
                            </span>
                            <span className="text-[10px] text-slate-400 block truncate mt-0.5">
                              {ambItem.lgaName ? `${ambItem.lgaName} LGA` : 'LGA'}, {ambItem.stateName}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {groups.map((g) => (
                    <div key={g.title} className="py-1">
                      <div className="px-3.5 py-1.5 flex items-center justify-between text-[10px] font-mono uppercase tracking-wider font-bold text-slate-400 bg-white/[0.02]">
                        <span>{g.title}</span>
                        <span className="text-slate-400 font-normal">({g.items.length})</span>
                      </div>
                      {g.items.map((item) => (
                        <button
                          key={item.id ?? `${item.name}-${item.latitude}`}
                          type="button"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            handleSelectItem(item);
                          }}
                          onClick={() => {
                            handleSelectItem(item);
                          }}
                          className="w-full px-3.5 py-2.5 sm:py-2 text-left hover:bg-emerald-500/10 active:bg-emerald-500/20 flex items-center justify-between gap-2 text-xs transition-colors group touch-manipulation min-h-[44px]"
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="font-semibold text-white group-hover:text-emerald-300 truncate">
                                {item.name}
                              </span>
                              <span className={`text-[9px] uppercase font-mono px-1 py-0.2 rounded border ${g.badgeColor}`}>
                                {item.typeLabel || (item.type === 'lga' ? 'LGA' : item.type)}
                              </span>
                            </div>
                            <span className="text-[11px] text-slate-400 block truncate mt-0.5">
                              {[item.lgaName && `${item.lgaName} LGA`, item.stateName && `${item.stateName} State`].filter(Boolean).join(', ') || item.stateName || 'Nigeria'}
                            </span>
                          </div>
                          <MapPin className="w-3.5 h-3.5 text-slate-500 group-hover:text-emerald-400 shrink-0" />
                        </button>
                      ))}
                    </div>
                  ))}
                </div>
              );
            })()
          ) : (
            <div className="p-4 text-center text-xs text-slate-400">
              No matching locations found for <span className="text-white">&ldquo;{query}&rdquo;</span>.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
