'use client';

import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import dynamic from 'next/dynamic';
import {
  ChevronRight,
  ChevronUp,
  ChevronDown,
  Search,
  Plus,
  ShieldCheck,
  Clock,
  Compass,
  Layers,
  Waves,
  Landmark,
  MapPin,
  Globe2,
  Filter,
  Sparkles,
  MessageSquare,
  Archive,
  X,
  Map as MapIcon,
  Scale,
} from 'lucide-react';
import { AtlasOverview, type CommunitySummary, type AtlasTab } from '@/components/map/AtlasOverview';
import type { MapContainerHandle, SelectedFeature, BasemapMode, FilterDotType } from '@/components/map/MapContainer';
import { AddCommunityModal } from '@/components/forms/AddCommunityModal';
import { MobileTwitterBottomNav, type MobileTab } from '@/components/layout/MobileTwitterBottomNav';
import { TwitterComposeFAB } from '@/components/layout/TwitterComposeFAB';
import { TwitterVoiceModal } from '@/components/community/TwitterVoiceModal';
import { MapFeatureFloatingCard } from '@/components/map/MapFeatureFloatingCard';
import { SE_STATE_CODES, IGBO_IDENTIFIED_LGAS, BEYOND_SOUTHEAST_REGIONS } from '@/lib/geo';
import { DIALECT_CLUSTERS, getIgboMarketDay, IGBO_MARKET_DAYS } from '@/lib/cultural';
import { getOfflineSettlementsList } from '@/lib/offlineStorage';

const MapContainer = dynamic(() => import('@/components/map/MapContainer'), {
  ssr: false,
  loading: () => (
    <div className="map-stage w-full h-full flex flex-col items-center justify-center gap-3">
      <div className="h-8 w-8 rounded-full border-2 border-emerald-500/20 border-t-emerald-400 animate-spin" />
      <p className="text-[11px] font-mono tracking-[0.2em] text-slate-400">LOADING ATLAS</p>
    </div>
  ),
});

export default function HomePage() {
  const mapRef = useRef<MapContainerHandle>(null);

  const [showStates, setShowStates] = useState(true);
  const [showLgas, setShowLgas] = useState(true);
  const [showCommunities, setShowCommunities] = useState(true);
  const [showWaterways, setShowWaterways] = useState(true);
  const [showLandmarks, setShowLandmarks] = useState(true);
  const [showDialects, setShowDialects] = useState(false);
  const [showMigrationArcs, setShowMigrationArcs] = useState(false);
  const [showHistoricalOverlay, setShowHistoricalOverlay] = useState(false);
  const [historicalOpacity, setHistoricalOpacity] = useState(0.45);
  const [showDensity, setShowDensity] = useState(false);
  const [isAddMode, setIsAddMode] = useState(false);
  const [selectedFeature, setSelectedFeature] = useState<SelectedFeature | null>(null);
  const [communities, setCommunities] = useState<CommunitySummary[]>([]);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isFiltersCollapsed, setIsFiltersCollapsed] = useState(false);
  const [mobileTab, setMobileTab] = useState<MobileTab>('map');
  const [activeTab, setActiveTab] = useState<AtlasTab>('explore');
  const [basemapMode, setBasemapMode] = useState<BasemapMode>('dark');
  const [activeFilter, setActiveFilter] = useState<FilterDotType>('all');
  const [selectedDialect, setSelectedDialect] = useState<string | null>(null);
  const [selectedMarketFilter, setSelectedMarketFilter] = useState<string | null>(null);
  const todayMarket = useMemo(() => getIgboMarketDay(new Date()), []);
  const [pendingModal, setPendingModal] = useState<{
    coords: { lon: number; lat: number };
    name: string;
  } | null>(null);
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);

  const loadCommunities = useCallback(async () => {
    try {
      const res = await fetch('/api/communities', { cache: 'no-store' });
      if (res.ok) {
        setCommunities(await res.json());
      } else {
        const offlineList = await getOfflineSettlementsList();
        if (offlineList.length > 0) setCommunities(offlineList);
      }
    } catch {
      const offlineList = await getOfflineSettlementsList();
      if (offlineList.length > 0) setCommunities(offlineList);
    }
  }, []);

  useEffect(() => {
    loadCommunities();
  }, [loadCommunities]);

  const handleToggleAddMode = useCallback(() => {
    setIsAddMode((prev) => {
      const next = !prev;
      if (next) {
        setMobileTab('map');
        setTimeout(() => mapRef.current?.resize(), 50);
      }
      return next;
    });
  }, []);

  const handlePinNearby = useCallback((feature: SelectedFeature) => {
    if (feature.coordinates) {
      mapRef.current?.flyTo(feature.coordinates, 15.0);
    }
    setSelectedFeature(null);
    setIsAddMode(true);
    setMobileTab('map');
  }, []);

  // Global Keyboard shortcuts: "[" or "]" toggles sidebar collapse, Esc clears selection, "f" toggles filters
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') {
        return;
      }
      if (e.key === '[' || e.key === ']') {
        e.preventDefault();
        setIsSidebarCollapsed((prev) => !prev);
      } else if (e.key === 'Escape') {
        setSelectedFeature(null);
        mapRef.current?.resetView();
      } else if (e.key.toLowerCase() === 'a' && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        handleToggleAddMode();
      } else if (e.key.toLowerCase() === 'f' && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        setIsFiltersCollapsed((prev) => !prev);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleToggleAddMode]);

  // Sync filter collapse and active status with top AppBarFilterButton
  useEffect(() => {
    const hasActive = activeFilter !== 'all' || !!selectedDialect || !!selectedMarketFilter;
    window.dispatchEvent(
      new CustomEvent('ica:filters-state', {
        detail: { isCollapsed: isFiltersCollapsed, hasActive },
      })
    );
  }, [isFiltersCollapsed, activeFilter, selectedDialect, selectedMarketFilter]);

  useEffect(() => {
    function handleToggleFilters() {
      setIsFiltersCollapsed((prev) => !prev);
    }
    window.addEventListener('ica:toggle-filters', handleToggleFilters);
    return () => {
      window.removeEventListener('ica:toggle-filters', handleToggleFilters);
    };
  }, []);

  // Smoothly trigger map resizing throughout the desktop sidebar width transition
  useEffect(() => {
    let animId: number;
    const start = performance.now();
    const duration = 350; // matches 300ms transition + buffer

    const step = (now: number) => {
      mapRef.current?.resize();
      if (now - start < duration) {
        animId = requestAnimationFrame(step);
      } else {
        mapRef.current?.resize();
      }
    };

    animId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animId);
  }, [isSidebarCollapsed]);

  // Baseline Igbo areas outside the Southeast + any additional LGA with documented communities
  const identifiedLgas = useMemo(() => {
    const set = new Set(IGBO_IDENTIFIED_LGAS);
    communities.forEach((c) => {
      if (
        c.lgaId &&
        c.stateId &&
        !SE_STATE_CODES.includes(c.stateId) &&
        !c.stateId.startsWith('NG032') && // Exclude Plateau State
        !c.stateId.startsWith('NG002') && // Exclude Adamawa State
        !c.lgaId.startsWith('NG032') &&
        !c.lgaId.startsWith('NG002') &&
        (c.stateName || '').toLowerCase() !== 'plateau' &&
        (c.stateName || '').toLowerCase() !== 'adamawa' &&
        c.identityStatus === 'igbo' &&
        c.verificationStatus !== 'challenged'
      ) {
        set.add(c.lgaId);
      }
    });
    return Array.from(set);
  }, [communities]);

  const verifiedCount = useMemo(
    () => communities.filter((c) => c.verificationStatus === 'verified').length,
    [communities]
  );
  const pendingCount = useMemo(
    () =>
      communities.filter(
        (c) => c.verificationStatus !== 'verified' && c.verificationStatus !== 'challenged'
      ).length,
    [communities]
  );
  const statesCovered = useMemo(
    () => new Set(communities.map((c) => c.stateId).filter(Boolean)).size,
    [communities]
  );
  const contestedCount = useMemo(
    () =>
      communities.filter(
        (c) => c.lifecycleStatus === 'CONTESTED_DELIST' || c.lifecycleStatus === 'CONTESTED_REINSTATE'
      ).length,
    [communities]
  );
  const dormantCount = useMemo(
    () => communities.filter((c) => c.lifecycleStatus === 'DELISTED').length,
    [communities]
  );

  return (
    <div className="w-full h-full min-h-0 flex flex-col lg:flex-row overflow-hidden relative select-none bg-[#000000]">
      {/* Map Section: On mobile visible when mobileTab === 'map', on desktop always right flex-1 panel */}
      <section
        aria-label="Interactive Map of Nigeria"
        className={`w-full flex-1 lg:h-full lg:order-2 relative min-h-0 overflow-hidden ${
          mobileTab !== 'map' ? 'hidden lg:block' : 'block'
        }`}
      >
        {/* Quick Filter Controls: Sleek Twitter Pill on Desktop, Clean 0-clutter header toggle on Mobile */}
        {isFiltersCollapsed ? (
          <>
            {/* Mobile Active Filter Badge (renders only when an active filter is active; 0 clutter otherwise) */}
            {(activeFilter !== 'all' || selectedDialect || selectedMarketFilter) && (
              <div className="lg:hidden absolute top-2.5 left-3 z-20 flex items-center gap-1.5 pointer-events-auto animate-in fade-in zoom-in-95 duration-150">
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/85 backdrop-blur-md border border-emerald-500/40 text-[10px] font-mono text-emerald-300 shadow-xl">
                  <span className="capitalize">{activeFilter !== 'all' ? activeFilter : selectedDialect || selectedMarketFilter}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveFilter('all');
                      setSelectedDialect(null);
                      setSelectedMarketFilter(null);
                    }}
                    className="ml-1 text-slate-400 hover:text-white"
                    title="Clear filter"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              </div>
            )}

            {/* Desktop Twitter Pill Trigger */}
            <div className="hidden lg:flex absolute top-3.5 left-4 z-20 items-center gap-2 pointer-events-auto animate-in fade-in zoom-in-95 duration-150">
              <button
                type="button"
                onClick={() => setIsFiltersCollapsed(false)}
                className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#000000]/85 hover:bg-[#16181c] border border-[#2f3336] hover:border-emerald-500/40 text-xs font-semibold text-[#e7e9ea] shadow-xl backdrop-blur-xl transition-all active:scale-95 group"
                title="Filter Settlements & Dialects (Shortcut: F)"
                aria-label="Filter Settlements"
              >
                <Filter className="w-3.5 h-3.5 text-emerald-400 group-hover:scale-110 transition-transform" />
                <span>Filters & Continua</span>
                {(activeFilter !== 'all' || selectedDialect || selectedMarketFilter) && (
                  <span className="px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-mono font-semibold capitalize">
                    {activeFilter !== 'all' ? activeFilter : selectedDialect || selectedMarketFilter}
                  </span>
                )}
              </button>
            </div>
          </>
        ) : (
          <div className="absolute top-2 left-0 right-0 z-20 px-3 py-1 flex flex-col gap-1.5 pointer-events-none animate-in fade-in slide-in-from-top-2 duration-200 lg:top-3.5 lg:left-4 lg:right-20 lg:p-3 lg:rounded-2xl lg:bg-[#000000]/90 lg:backdrop-blur-xl lg:border lg:border-[#2f3336] lg:shadow-2xl">
            {/* Row 1: Primary Status & Geographic Focal Zones */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pointer-events-auto w-full max-w-full pr-4 sm:pr-8">
              <button
                type="button"
                onClick={() => setIsFiltersCollapsed(true)}
                className="shrink-0 flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/80 hover:bg-white/10 border border-[#2f3336] text-slate-300 hover:text-white text-[11px] font-semibold backdrop-blur-md transition-all active:scale-95"
                title="Collapse filters for clean map focus (Shortcut: F)"
              >
                <ChevronUp className="w-3.5 h-3.5 text-emerald-400" />
                <span>Hide</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveFilter('all')}
                className={`shrink-0 px-2.5 py-1 rounded-full text-[11px] font-semibold backdrop-blur-md transition-all active:scale-95 ${
                  activeFilter === 'all'
                    ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/30 font-bold'
                    : 'bg-[#090e1c]/85 text-slate-300 border border-white/10 hover:border-white/20'
                }`}
              >
                ✨ All ({communities.length})
              </button>
            <button
              type="button"
              onClick={() => setActiveFilter('verified')}
              className={`shrink-0 px-2.5 py-1 rounded-full text-[11px] font-semibold backdrop-blur-md transition-all active:scale-95 ${
                activeFilter === 'verified'
                  ? 'bg-amber-400 text-black shadow-lg shadow-amber-400/30 font-bold'
                  : 'bg-[#090e1c]/85 text-slate-300 border border-white/10 hover:border-white/20'
              }`}
            >
              🛡️ Verified ({verifiedCount})
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter('contested')}
              className={`shrink-0 px-2.5 py-1 rounded-full text-[11px] font-semibold backdrop-blur-md transition-all active:scale-95 ${
                activeFilter === 'contested'
                  ? 'bg-amber-400 text-black shadow-lg shadow-amber-400/30 font-bold'
                  : 'bg-[#090e1c]/85 text-amber-300 border border-amber-500/30'
              }`}
            >
              ⚖️ Reviews ({contestedCount})
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter('dormant')}
              className={`shrink-0 px-2.5 py-1 rounded-full text-[11px] font-semibold backdrop-blur-md transition-all active:scale-95 ${
                activeFilter === 'dormant'
                  ? 'bg-slate-300 text-black shadow-lg font-bold'
                  : 'bg-[#090e1c]/85 text-slate-400 border border-white/10'
              }`}
            >
              👻 Dormant ({dormantCount})
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter('homeland')}
              className={`shrink-0 px-2.5 py-1 rounded-full text-[11px] font-semibold backdrop-blur-md transition-all active:scale-95 ${
                activeFilter === 'homeland'
                  ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/30 font-bold'
                  : 'bg-[#090e1c]/85 text-slate-300 border border-white/10 hover:border-white/20'
              }`}
            >
              🌿 Homeland
            </button>
            <button
              type="button"
              onClick={() => {
                const anioma = BEYOND_SOUTHEAST_REGIONS.find((r) => r.id === 'delta-anioma');
                if (anioma) mapRef.current?.highlightRegion(anioma.lgas.map((l) => l.code), anioma.center, anioma.zoom);
              }}
              className="shrink-0 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-[#090e1c]/85 text-emerald-300 border border-emerald-500/30 backdrop-blur-md active:scale-95 hover:border-emerald-500/60"
            >
              🏛️ Anioma (Delta)
            </button>
            <button
              type="button"
              onClick={() => {
                const benue = BEYOND_SOUTHEAST_REGIONS.find((r) => r.id === 'benue-borderlands');
                if (benue) mapRef.current?.highlightRegion(benue.lgas.map((l) => l.code), benue.center, benue.zoom);
              }}
              className="shrink-0 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-[#090e1c]/85 text-emerald-300 border border-emerald-500/30 backdrop-blur-md active:scale-95 hover:border-emerald-500/60"
            >
              📍 Benue Borderlands
            </button>
            <button
              type="button"
              onClick={() => {
                const rivers = BEYOND_SOUTHEAST_REGIONS.find((r) => r.id === 'rivers-upland');
                if (rivers) mapRef.current?.highlightRegion(rivers.lgas.map((l) => l.code), rivers.center, rivers.zoom);
              }}
              className="shrink-0 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-[#090e1c]/85 text-emerald-300 border border-emerald-500/30 backdrop-blur-md active:scale-95 hover:border-emerald-500/60"
            >
              🌊 Rivers Mainland
            </button>
            <button
              type="button"
              onClick={() => setShowDensity((prev) => !prev)}
              className={`shrink-0 px-2.5 py-1 rounded-full text-[11px] font-semibold backdrop-blur-md transition-all active:scale-95 ${
                showDensity
                  ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/30 font-bold'
                  : 'bg-[#090e1c]/85 text-slate-300 border border-white/10 hover:border-white/20'
              }`}
            >
              🔥 Density ({showDensity ? 'On' : 'Off'})
            </button>
            <button
              type="button"
              onClick={() => setShowLandmarks((prev) => !prev)}
              className={`shrink-0 px-2.5 py-1 rounded-full text-[11px] font-semibold backdrop-blur-md transition-all active:scale-95 ${
                showLandmarks
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  : 'bg-[#090e1c]/85 text-slate-400 border border-white/10'
              }`}
            >
              🏪 Markets ({showLandmarks ? 'On' : 'Off'})
            </button>
            <button
              type="button"
              onClick={() => setShowWaterways((prev) => !prev)}
              className={`shrink-0 px-2.5 py-1 rounded-full text-[11px] font-semibold backdrop-blur-md transition-all active:scale-95 ${
                showWaterways
                  ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                  : 'bg-[#090e1c]/85 text-slate-400 border border-white/10'
              }`}
            >
              🌊 Rivers ({showWaterways ? 'On' : 'Off'})
            </button>
            <button
              type="button"
              onClick={() => setShowMigrationArcs((prev) => !prev)}
              className={`shrink-0 px-2.5 py-1 rounded-full text-[11px] font-semibold backdrop-blur-md transition-all active:scale-95 ${
                showMigrationArcs
                  ? 'bg-amber-400 text-black shadow-lg shadow-amber-400/30 font-bold'
                  : 'bg-[#090e1c]/85 text-slate-300 border border-white/10 hover:border-white/20'
              }`}
              title="Pre-colonial migration corridors and ancient trade axes"
            >
              🏹 Migrations ({showMigrationArcs ? 'On' : 'Off'})
            </button>
          </div>

          {/* Row 2: Dialect Continuum & Transition Zones Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pointer-events-auto w-full max-w-full pr-4 sm:pr-8">
            <div className="shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#090e1c]/90 border border-white/10 text-[10px] font-mono text-slate-400 shadow-md">
              <Sparkles className="w-3 h-3 text-amber-400" />
              <span>Dialect Continua:</span>
            </div>

            {Object.values(DIALECT_CLUSTERS).map((cluster) => {
              const isActive = selectedDialect === cluster.id;
              return (
                <button
                  key={cluster.id}
                  type="button"
                  onClick={() => {
                    if (isActive) {
                      setSelectedDialect(null);
                      setShowDialects(false);
                    } else {
                      setSelectedDialect(cluster.id);
                      setShowDialects(true);
                      mapRef.current?.highlightDialectCluster(cluster);
                      setIsSidebarCollapsed(false);
                    }
                  }}
                  className={`shrink-0 px-2.5 py-1 rounded-full text-[11px] font-semibold backdrop-blur-md transition-all active:scale-95 flex items-center gap-1.5 ${
                    isActive
                      ? 'shadow-lg border ring-1 font-bold'
                      : 'bg-[#090e1c]/85 text-slate-300 border border-white/10 hover:border-white/25 hover:text-white'
                  }`}
                  style={{
                    borderColor: isActive ? cluster.color : undefined,
                    backgroundColor: isActive ? `${cluster.color}33` : undefined,
                    color: isActive ? '#ffffff' : undefined,
                    boxShadow: isActive ? `0 0 12px ${cluster.color}40` : undefined,
                  }}
                  title={`${cluster.name} (${cluster.igboName}): "${cluster.sampleGreeting}" - Covering ${cluster.states.join(', ')}`}
                >
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: cluster.color }} />
                  <span>{cluster.name.split('/')[0].trim()}</span>
                  {isActive && <span className="text-[9px] font-mono px-1 rounded bg-white/20">Active</span>}
                </button>
              );
            })}

            {selectedDialect && (
              <button
                type="button"
                onClick={() => {
                  setSelectedDialect(null);
                  setShowDialects(false);
                }}
                className="shrink-0 px-2.5 py-1 rounded-full text-[10px] font-mono text-slate-300 hover:text-white bg-white/10 border border-white/20 flex items-center gap-1 transition-all"
              >
                <X className="w-3 h-3 text-slate-400" />
                <span>Reset</span>
              </button>
            )}
          </div>

          {/* Row 3: Traditional 4-Day Market Cycle (Izu) Filter */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pointer-events-auto w-full max-w-full pr-4 sm:pr-8">
            <div className="shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#090e1c]/90 border border-amber-500/30 text-[10px] font-mono text-amber-300 shadow-md">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
              <span>Taata: <strong>{todayMarket.name}</strong> {todayMarket.symbol}</span>
              <span className="text-[9px] text-amber-400/70 font-sans hidden sm:inline">({todayMarket.element.split('/')[0].trim()})</span>
            </div>

            {IGBO_MARKET_DAYS.map((d, idx) => {
              const isSelected = selectedMarketFilter === d.name;
              const isToday = idx === todayMarket.index;
              return (
                <button
                  key={d.name}
                  type="button"
                  onClick={() => {
                    const next = isSelected ? null : d.name;
                    setSelectedMarketFilter(next);
                    setShowLandmarks(true);
                    mapRef.current?.filterLandmarksByMarketDay(next);
                  }}
                  className={`shrink-0 px-2.5 py-1 rounded-full text-[11px] font-semibold backdrop-blur-md transition-all active:scale-95 flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-amber-400 text-black font-bold shadow-lg shadow-amber-400/30 ring-1 ring-amber-300'
                      : isToday
                      ? 'bg-amber-500/15 text-amber-300 border border-amber-500/40 hover:bg-amber-500/25'
                      : 'bg-[#090e1c]/85 text-slate-300 border border-white/10 hover:border-white/25 hover:text-white'
                  }`}
                  title={`${d.name} Market Cycle (${d.spirit}): ${d.element}`}
                >
                  <span>{d.symbol}</span>
                  <span>{d.name}</span>
                  {isToday && (
                    <span className={`text-[8px] font-mono uppercase px-1 rounded ${isSelected ? 'bg-black/20 text-black' : 'bg-amber-400/20 text-amber-300'}`}>
                      Today
                    </span>
                  )}
                  {isSelected && (
                    <span className="text-[9px] font-mono font-bold">✓</span>
                  )}
                </button>
              );
            })}

            {selectedMarketFilter && (
              <button
                type="button"
                onClick={() => {
                  setSelectedMarketFilter(null);
                  mapRef.current?.filterLandmarksByMarketDay(null);
                }}
                className="shrink-0 px-2.5 py-1 rounded-full text-[10px] font-mono text-amber-300 hover:text-white bg-amber-500/20 border border-amber-500/40 flex items-center gap-1 transition-all"
                title="Clear market day filter"
              >
                <X className="w-3 h-3" />
                <span>Clear ({selectedMarketFilter})</span>
              </button>
            )}
          </div>
        </div>
      )}

        <MapContainer
          ref={mapRef}
          showStates={showStates}
          showLgas={showLgas}
          showCommunities={showCommunities}
          showWaterways={showWaterways}
          showLandmarks={showLandmarks}
          showDialects={showDialects}
          activeDialectCluster={selectedDialect}
          showMigrationArcs={showMigrationArcs}
          showHistoricalOverlay={showHistoricalOverlay}
          historicalOpacity={historicalOpacity}
          showDensity={showDensity}
          onToggleDensity={setShowDensity}
          identifiedLgas={identifiedLgas}
          isAddMode={isAddMode}
          setIsAddMode={setIsAddMode}
          onSelectFeature={(feature) => {
            setSelectedFeature(feature);
            if (feature) {
              setIsSidebarCollapsed(false);
            }
          }}
          onCommunityAdded={loadCommunities}
          onOpenAddModal={(coords, name) => {
            setPendingModal({ coords, name: name || '' });
            setIsAddMode(false);
          }}
          basemapMode={basemapMode}
          onBasemapChange={setBasemapMode}
          activeFilter={activeFilter}
          onFilterChange={setActiveFilter}
          isFiltersCollapsed={isFiltersCollapsed}
        />

        {/* Floating Quick Map HUD / Expand Trigger (visible on desktop when collapsed) */}
        {isSidebarCollapsed && (
          <div className={`hidden lg:flex absolute ${isFiltersCollapsed ? 'top-14 left-3' : 'top-4 left-4'} z-20 items-center gap-2 transition-all duration-200`}>
            <button
              type="button"
              onClick={() => setIsSidebarCollapsed(false)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#090e1c]/90 hover:bg-[#0f172a] text-white text-xs font-semibold border border-white/10 shadow-2xl backdrop-blur-xl transition-all hover:scale-[1.02]"
              title="Expand Sidebar Dashboard ([ key])"
            >
              <ChevronRight className="w-4 h-4 text-emerald-400 rotate-180" />
              <span>Expand Dashboard</span>
            </button>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#090e1c]/80 border border-white/[0.08] text-[11px] font-mono text-slate-300 backdrop-blur-xl">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>{communities.length} Communities Documented</span>
            </div>
          </div>
        )}

        {/* Mobile & Collapsed Floating Map Feature Preview & Quick Add Card */}
        {selectedFeature && (mobileTab === 'map' || isSidebarCollapsed) && (
          <MapFeatureFloatingCard
            feature={selectedFeature}
            onClose={() => {
              setSelectedFeature(null);
              mapRef.current?.resetView();
            }}
            onDocumentFeature={(f) => {
              const coords = f.coordinates
                ? { lon: f.coordinates[0], lat: f.coordinates[1] }
                : mapRef.current?.getCenter?.() || { lon: 7.05, lat: 5.5 };
              setPendingModal({
                coords,
                name: f.name || '',
              });
              setIsAddMode(false);
            }}
            onPinNearby={handlePinNearby}
            onViewLore={() => {
              setActiveTab('explore');
              setMobileTab('explore');
              setIsSidebarCollapsed(false);
            }}
            onAddVoice={() => setIsVoiceModalOpen(true)}
          />
        )}
      </section>

      {/* Desktop Dashboard Side Menu / Rail: Left column on desktop (lg:flex) */}
      <aside
        className={`hidden lg:flex shrink-0 transition-[width] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] will-change-[width] border-r border-white/[0.08] bg-[#070b16] lg:order-1 relative overflow-hidden ${
          isSidebarCollapsed ? 'w-[72px] h-full' : 'w-[410px] xl:w-[440px] h-full'
        }`}
      >
        {/* COLLAPSED DASHBOARD RAIL (Desktop vertical dock) */}
        <div
          className={`absolute inset-0 w-[72px] h-full flex flex-col items-center justify-between p-3 overflow-hidden transition-opacity duration-200 ${
            isSidebarCollapsed ? 'opacity-100 pointer-events-auto z-10' : 'opacity-0 pointer-events-none z-0'
          }`}
          aria-hidden={!isSidebarCollapsed}
        >
          <div className="flex flex-col items-center gap-2">
            <button
              type="button"
              onClick={() => setIsSidebarCollapsed(false)}
              className="h-10 w-10 rounded-xl bg-white/[0.05] hover:bg-emerald-500/15 border border-white/[0.1] hover:border-emerald-500/40 text-slate-300 hover:text-emerald-300 flex items-center justify-center transition-all group"
              title="Expand full dashboard menu ([ key])"
              aria-label="Expand dashboard"
            >
              <ChevronRight className="w-5 h-5 text-emerald-400 group-hover:scale-110 transition-transform" />
            </button>

            <button
              type="button"
              onClick={() => setIsSidebarCollapsed(false)}
              className="h-9 w-9 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.06] text-slate-400 hover:text-white flex items-center justify-center transition-all"
              title="Open Search (Cmd+K)"
              aria-label="Open Search"
            >
              <Search className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => {
                setIsSidebarCollapsed(false);
                setIsAddMode(true);
              }}
              className="h-9 w-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 hover:brightness-110 text-black font-bold flex items-center justify-center shadow-lg shadow-emerald-500/25 transition-all"
              title="Document a Community (A key)"
              aria-label="Document Community"
            >
              <Plus className="w-4 h-" />
            </button>
          </div>

          <div className="flex flex-col items-center gap-3 py-1">
            <div
              className="flex flex-col items-center justify-center p-2 rounded-xl bg-white/[0.03] border border-white/[0.06] text-center cursor-pointer hover:bg-white/[0.06] transition-colors"
              onClick={() => setIsSidebarCollapsed(false)}
              title={`${communities.length} documented Igbo communities across ${statesCovered} states`}
            >
              <Globe2 className="w-3.5 h-3.5 text-emerald-400 mb-0.5" />
              <span className="text-[11px] font-mono font-bold text-white leading-none">
                {communities.length}
              </span>
              <span className="text-[8px] font-mono uppercase tracking-wider text-slate-500 mt-0.5">
                Atlas
              </span>
            </div>

            <div
              className="flex flex-col items-center justify-center p-2 rounded-xl bg-amber-400/[0.04] border border-amber-400/20 text-center cursor-pointer hover:bg-amber-400/10 transition-colors"
              onClick={() => {
                setActiveFilter('verified');
                setIsSidebarCollapsed(false);
              }}
              title={`${verifiedCount} Verified Communities (Click to filter)`}
            >
              <ShieldCheck className="w-3.5 h-3.5 text-amber-400 mb-0.5" />
              <span className="text-[11px] font-mono font-bold text-amber-300 leading-none">
                {verifiedCount}
              </span>
              <span className="text-[8px] font-mono uppercase tracking-wider text-amber-400/60 mt-0.5">
                Verif
              </span>
            </div>

            <div
              className="flex flex-col items-center justify-center p-2 rounded-xl bg-purple-500/[0.05] border border-purple-500/20 text-center cursor-pointer hover:bg-purple-500/15 transition-colors"
              onClick={() => {
                setActiveFilter('contested');
                setIsSidebarCollapsed(false);
              }}
              title={`${contestedCount} Settlements under community review & quorum`}
            >
              <Scale className="w-3.5 h-3.5 text-purple-400 mb-0.5" />
              <span className="text-[11px] font-mono font-bold text-purple-300 leading-none">
                {contestedCount}
              </span>
              <span className="text-[8px] font-mono uppercase tracking-wider text-purple-400/70 mt-0.5">
                Review
              </span>
            </div>

            <div className="flex flex-col items-center gap-1.5 pt-2 border-t border-white/[0.06]">
              <button
                type="button"
                onClick={() => setShowWaterways((v) => !v)}
                className={`h-7 w-7 rounded-lg flex items-center justify-center transition-all ${
                  showWaterways
                    ? 'bg-sky-500/15 border border-sky-400/30 text-sky-300'
                    : 'text-slate-600 hover:text-slate-400'
                }`}
                title={showWaterways ? 'Rivers active' : 'Rivers hidden'}
              >
                <Waves className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={() => setShowLandmarks((v) => !v)}
                className={`h-7 w-7 rounded-lg flex items-center justify-center transition-all ${
                  showLandmarks
                    ? 'bg-amber-500/15 border border-amber-400/30 text-amber-300'
                    : 'text-slate-600 hover:text-slate-400'
                }`}
                title={showLandmarks ? 'Markets active' : 'Markets hidden'}
              >
                <Landmark className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="flex flex-col items-center gap-1.5">
            {selectedFeature ? (
              <button
                type="button"
                onClick={() => setIsSidebarCollapsed(false)}
                className="p-2 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 animate-pulse"
                title={`Selected: ${selectedFeature.name}. Click to view details.`}
              >
                <MapPin className="w-3.5 h-3.5 shrink-0" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => mapRef.current?.resetView()}
                className="h-8 w-8 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-white/5 flex items-center justify-center transition-colors"
                title="Reset Map View (Esc)"
                aria-label="Reset Map View"
              >
                <Compass className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* EXPANDED FULL DASHBOARD PANEL (Desktop) */}
        <div
          className={`absolute inset-0 w-[410px] xl:w-[440px] h-full min-h-0 flex flex-col transition-opacity duration-200 ${
            isSidebarCollapsed ? 'opacity-0 pointer-events-none z-0' : 'opacity-100 pointer-events-auto z-10'
          }`}
          aria-hidden={isSidebarCollapsed}
        >
          <AtlasOverview
            communities={communities}
            isAddMode={isAddMode}
            onToggleAddMode={handleToggleAddMode}
            onSelectCommunity={(c) => {
              mapRef.current?.flyToCommunity(c);
            }}
            onFlyTo={(center, zoom) => mapRef.current?.flyTo(center, zoom)}
            onResetView={() => {
              setSelectedFeature(null);
              mapRef.current?.resetView();
            }}
            showStates={showStates}
            onToggleStates={setShowStates}
            showLgas={showLgas}
            onToggleLgas={setShowLgas}
            showCommunities={showCommunities}
            onToggleCommunities={setShowCommunities}
            showWaterways={showWaterways}
            onToggleWaterways={setShowWaterways}
            showLandmarks={showLandmarks}
            onToggleLandmarks={setShowLandmarks}
            showDialects={showDialects}
            onToggleDialects={setShowDialects}
            showMigrationArcs={showMigrationArcs}
            onToggleMigrationArcs={setShowMigrationArcs}
            showHistoricalOverlay={showHistoricalOverlay}
            onToggleHistoricalOverlay={setShowHistoricalOverlay}
            historicalOpacity={historicalOpacity}
            onHistoricalOpacityChange={setHistoricalOpacity}
            showDensity={showDensity}
            onToggleDensity={setShowDensity}
            selectedFeature={selectedFeature}
            onCloseSelected={() => {
              setSelectedFeature(null);
              mapRef.current?.resetView();
            }}
            onDocumentFeature={(feature) => {
              let coords = feature.coordinates
                ? { lon: feature.coordinates[0], lat: feature.coordinates[1] }
                : mapRef.current?.getCenter?.() || { lon: 7.05, lat: 5.5 };
              setPendingModal({
                coords,
                name: feature.name || '',
              });
              setIsAddMode(false);
            }}
            onPinNearby={handlePinNearby}
            onCommunityUpdated={loadCommunities}
            isCollapsed={isSidebarCollapsed}
            onToggleCollapse={() => setIsSidebarCollapsed(true)}
            activeFilter={activeFilter}
            onFilterChange={setActiveFilter}
            onSelectFeature={setSelectedFeature}
            onHighlightLgas={(lgas) => mapRef.current?.highlightLgas(lgas)}
            onHighlightRegion={(codes, center, zoom) => mapRef.current?.highlightRegion(codes, center, zoom)}
            onSelectLgaByCode={(code) => mapRef.current?.selectLgaByCode(code)}
            onSelectState={(code) => mapRef.current?.selectStateByCode(code)}
            onInspectMigrationArc={(arc) => {
              setShowMigrationArcs(true);
              mapRef.current?.inspectMigrationArc(arc);
            }}
            onSelectDialectCluster={(cluster) => {
              setShowDialects(true);
              mapRef.current?.highlightDialectCluster(cluster);
            }}
            onFilterMarketDay={(dayName) => {
              const next = selectedMarketFilter === dayName ? null : dayName;
              setSelectedMarketFilter(next);
              setShowLandmarks(true);
              mapRef.current?.filterLandmarksByMarketDay(next);
            }}
            onFlyThroughCorridor={(corridorId) => {
              setIsSidebarCollapsed(true);
              mapRef.current?.startCinematicFlyThrough(corridorId);
            }}
            onOpenKindredMapping={(community) => mapRef.current?.openKindredMappingModal(undefined, community)}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            hideTopTabs={false}
          />
        </div>
      </aside>

      {/* Mobile Dedicated Screen Views: In Twitter, every nav opens its own screen */}
      {mobileTab !== 'map' && (
        <main className="lg:hidden flex-1 min-h-0 w-full overflow-hidden flex flex-col bg-[#000000] pb-[53px]">
          <AtlasOverview
            communities={communities}
            isAddMode={isAddMode}
            onToggleAddMode={handleToggleAddMode}
            onSelectCommunity={(c) => {
              setMobileTab('map');
              mapRef.current?.flyToCommunity(c);
            }}
            onFlyTo={(center, zoom) => {
              setMobileTab('map');
              mapRef.current?.flyTo(center, zoom);
            }}
            onResetView={() => {
              setSelectedFeature(null);
              mapRef.current?.resetView();
            }}
            showStates={showStates}
            onToggleStates={setShowStates}
            showLgas={showLgas}
            onToggleLgas={setShowLgas}
            showCommunities={showCommunities}
            onToggleCommunities={setShowCommunities}
            showWaterways={showWaterways}
            onToggleWaterways={setShowWaterways}
            showLandmarks={showLandmarks}
            onToggleLandmarks={setShowLandmarks}
            showDialects={showDialects}
            onToggleDialects={setShowDialects}
            showMigrationArcs={showMigrationArcs}
            onToggleMigrationArcs={setShowMigrationArcs}
            showHistoricalOverlay={showHistoricalOverlay}
            onToggleHistoricalOverlay={setShowHistoricalOverlay}
            historicalOpacity={historicalOpacity}
            onHistoricalOpacityChange={setHistoricalOpacity}
            showDensity={showDensity}
            onToggleDensity={setShowDensity}
            selectedFeature={selectedFeature}
            onCloseSelected={() => {
              setSelectedFeature(null);
              mapRef.current?.resetView();
            }}
            onDocumentFeature={(feature) => {
              let coords = feature.coordinates
                ? { lon: feature.coordinates[0], lat: feature.coordinates[1] }
                : mapRef.current?.getCenter?.() || { lon: 7.05, lat: 5.5 };
              setPendingModal({
                coords,
                name: feature.name || '',
              });
              setIsAddMode(false);
            }}
            onPinNearby={handlePinNearby}
            onCommunityUpdated={loadCommunities}
            activeFilter={activeFilter}
            onFilterChange={setActiveFilter}
            onSelectFeature={setSelectedFeature}
            onHighlightLgas={(lgas) => mapRef.current?.highlightLgas(lgas)}
            onHighlightRegion={(codes, center, zoom) => mapRef.current?.highlightRegion(codes, center, zoom)}
            onSelectLgaByCode={(code) => mapRef.current?.selectLgaByCode(code)}
            onSelectState={(code) => mapRef.current?.selectStateByCode(code)}
            onInspectMigrationArc={(arc) => {
              setShowMigrationArcs(true);
              setMobileTab('map');
              mapRef.current?.inspectMigrationArc(arc);
            }}
            onSelectDialectCluster={(cluster) => {
              setShowDialects(true);
              mapRef.current?.highlightDialectCluster(cluster);
            }}
            onFilterMarketDay={(dayName) => {
              const next = selectedMarketFilter === dayName ? null : dayName;
              setSelectedMarketFilter(next);
              setShowLandmarks(true);
              mapRef.current?.filterLandmarksByMarketDay(next);
            }}
            selectedMarketFilter={selectedMarketFilter}
            onFlyThroughCorridor={(corridorId) => {
              setMobileTab('map');
              mapRef.current?.startCinematicFlyThrough(corridorId);
            }}
            onOpenKindredMapping={(community) => {
              setMobileTab('map');
              mapRef.current?.openKindredMappingModal(undefined, community);
            }}
            activeTab={mobileTab as AtlasTab}
            onTabChange={(tab) => {
              if (tab === 'explore' || tab === 'culture' || tab === 'voices' || tab === 'archives') {
                setMobileTab(tab);
              }
              setActiveTab(tab);
            }}
            hideTopTabs={true}
          />
        </main>
      )}

      {/* Pre-2023 Twitter Floating Action Button (FAB) */}
      <TwitterComposeFAB
        onAddLocation={() => {
          setMobileTab('map');
          setIsAddMode(true);
          setPendingModal({ coords: { lon: 7.05, lat: 5.5 }, name: '' });
        }}
        onAddVoice={() => setIsVoiceModalOpen(true)}
      />

      {/* Pre-2023 Twitter Mobile Bottom Navigation Dock */}
      <MobileTwitterBottomNav
        activeTab={mobileTab}
        onTabSelect={(tab: MobileTab) => {
          setMobileTab(tab);
          if (tab === 'map') {
            setTimeout(() => mapRef.current?.resize(), 50);
          }
        }}
        hasNewVoices={false}
      />

      {/* Quick Twitter Voice Compose Modal */}
      {isVoiceModalOpen && (
        <TwitterVoiceModal
          communities={communities}
          selectedFeature={selectedFeature}
          onClose={() => setIsVoiceModalOpen(false)}
          onSuccess={() => {
            setIsVoiceModalOpen(false);
            loadCommunities();
            setActiveTab('voices');
            setMobileTab('voices');
          }}
        />
      )}

      {/* Global Add Community Documentation Modal */}
      {pendingModal && (
        <AddCommunityModal
          coordinates={pendingModal.coords}
          initialName={pendingModal.name}
          onClose={() => setPendingModal(null)}
          onSuccess={() => {
            setPendingModal(null);
            loadCommunities();
            mapRef.current?.refreshCommunities();
          }}
        />
      )}
    </div>
  );
}
