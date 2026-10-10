'use client';

import React, { useState } from 'react';
import {
  Compass,
  Layers,
  BookOpen,
  MapPin,
  X,
  Plus,
  ShieldCheck,
  Clock,
  Users,
  Map as MapIcon,
  ChevronRight,
  RotateCcw,
  Info,
  CheckCircle2,
  AlertTriangle,
  Landmark,
  Sparkles,
  MessageSquare,
  ThumbsUp,
  Share2,
  Filter,
  Waves,
  Volume2,
  Calendar,
  ArrowUpRight,
  FileCheck,
  ExternalLink,
  Archive,
  Scale,
} from 'lucide-react';
import { SearchBar } from './SearchBar';
import type { SelectedFeature, FilterDotType } from './MapContainer';
import { AudioPronunciationPlayer } from '@/components/cultural/AudioPronunciationPlayer';
import { TraditionalCalendarWidget } from '@/components/cultural/TraditionalCalendarWidget';
import {
  DIALECT_CLUSTERS,
  ANCESTRAL_MIGRATION_ARCS,
  ARCHAEOLOGICAL_SITES,
  WATERWAY_TRADE_CORRIDORS,
  calculateNearestWaterway,
} from '@/lib/cultural';
import { BEYOND_SOUTHEAST_REGIONS, SE_STATES, type BeyondRegionData, type SoutheastStateInfo } from '@/lib/geo';
import { ARCHIVAL_DOCUMENTS, getArchivalDocumentsForFeature, type ArchivalDocument } from '@/lib/archival';
import { InlineCommunityComments } from '@/components/community/InlineCommunityComments';
import { CommunityVoicesTab } from '@/components/community/CommunityVoicesTab';
import { DelistingModal } from '@/components/governance/DelistingModal';
import { ReinstatementModal } from '@/components/governance/ReinstatementModal';
import { GovernanceInquiryCard } from '@/components/governance/GovernanceInquiryCard';
import { CommunityAuditHistory } from '@/components/governance/CommunityAuditHistory';
import type { GovernanceInquiry } from '@/lib/governancePolicy';

export interface CommunitySummary {
  id: string;
  name: string;
  type?: string;
  description?: string | null;
  latitude: number;
  longitude: number;
  stateId?: string;
  stateName?: string;
  lgaId?: string;
  lgaName?: string;
  identityStatus?: string;
  languageStatus?: string | null;
  verificationStatus?: string;
  lifecycleStatus?: string;
  confirmationsCount?: number;
  comments?: any[];
}

interface AtlasOverviewProps {
  communities: CommunitySummary[];
  isAddMode: boolean;
  onToggleAddMode: () => void;
  onSelectCommunity: (community: CommunitySummary) => void;
  onFlyTo: (center: [number, number], zoom: number) => void;
  onResetView: () => void;
  showStates: boolean;
  onToggleStates: (val: boolean) => void;
  showLgas: boolean;
  onToggleLgas: (val: boolean) => void;
  showCommunities: boolean;
  onToggleCommunities: (val: boolean) => void;
  showWaterways: boolean;
  onToggleWaterways: (val: boolean) => void;
  showLandmarks: boolean;
  onToggleLandmarks: (val: boolean) => void;
  showDialects?: boolean;
  onToggleDialects?: (val: boolean) => void;
  showMigrationArcs?: boolean;
  onToggleMigrationArcs?: (val: boolean) => void;
  showHistoricalOverlay?: boolean;
  onToggleHistoricalOverlay?: (val: boolean) => void;
  historicalOpacity?: number;
  onHistoricalOpacityChange?: (val: number) => void;
  showDensity?: boolean;
  onToggleDensity?: (val: boolean) => void;
  selectedFeature: SelectedFeature | null;
  onCloseSelected: () => void;
  onDocumentFeature?: (feature: SelectedFeature) => void;
  onCommunityUpdated?: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  activeFilter?: FilterDotType;
  onFilterChange?: (filter: FilterDotType) => void;
  onSelectFeature?: (feature: SelectedFeature | null) => void;
  onHighlightLgas?: (lgas: string[]) => void;
  onHighlightRegion?: (codes: string[], center: [number, number], zoom: number) => void;
  onSelectLgaByCode?: (code: string) => void;
  onSelectState?: (code: string) => void;
  onInspectMigrationArc?: (arc: any) => void;
  onSelectDialectCluster?: (cluster: any) => void;
  onFilterMarketDay?: (dayName: string | null) => void;
  selectedMarketFilter?: string | null;
  onFlyThroughCorridor?: (corridorId: string) => void;
  onOpenKindredMapping?: (community?: { id: string; name: string }) => void;
  activeTab?: AtlasTab;
  onTabChange?: (tab: AtlasTab) => void;
  hideTopTabs?: boolean;
}

export type AtlasTab = 'explore' | 'culture' | 'voices' | 'archives' | 'key' | 'about';

const SOUTHEAST = [
  { name: 'Abia', capital: 'Umuahia', center: [7.52, 5.45] as [number, number] },
  { name: 'Anambra', capital: 'Awka', center: [6.93, 6.22] as [number, number] },
  { name: 'Ebonyi', capital: 'Abakaliki', center: [8.0, 6.25] as [number, number] },
  { name: 'Enugu', capital: 'Enugu', center: [7.45, 6.6] as [number, number] },
  { name: 'Imo', capital: 'Owerri', center: [7.05, 5.5] as [number, number] },
];

function StatusPill({ status }: { status?: string }) {
  const s = status ?? 'pending';
  const cls =
    s === 'verified'
      ? 'bg-amber-400/10 border-amber-400/30 text-amber-300'
      : s === 'challenged'
      ? 'bg-red-500/10 border-red-500/30 text-red-300'
      : 'bg-slate-500/10 border-slate-400/20 text-slate-300';

  const Icon = s === 'verified' ? CheckCircle2 : s === 'challenged' ? AlertTriangle : Clock;
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-semibold capitalize px-1.5 py-0.5 rounded-md border ${cls}`}>
      <Icon className="w-3 h-3" />
      {s}
    </span>
  );
}

function SectionTitle({ icon: Icon, children, action }: { icon: any; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-2.5">
      <h3 className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">
        <Icon className="w-3.5 h-3.5 text-emerald-400" />
        {children}
      </h3>
      {action}
    </div>
  );
}

export function AtlasOverview(props: AtlasOverviewProps) {
  const {
    communities,
    isAddMode,
    onToggleAddMode,
    onSelectCommunity,
    onFlyTo,
    onResetView,
    selectedFeature,
    onCloseSelected,
    onDocumentFeature,
    onCommunityUpdated,
    onToggleCollapse,
    activeFilter = 'all',
    onFilterChange,
    onSelectFeature,
    onHighlightLgas,
    onHighlightRegion,
    onSelectLgaByCode,
    onSelectState,
    onInspectMigrationArc,
    onSelectDialectCluster,
    onFilterMarketDay,
    selectedMarketFilter,
    onFlyThroughCorridor,
    onOpenKindredMapping,
    showDensity = false,
    onToggleDensity,
    activeTab,
    onTabChange,
    hideTopTabs,
  } = props;

  const [internalTab, setInternalTab] = useState<AtlasTab>('explore');
  const tab = activeTab ?? internalTab;
  const setTab = (newTab: AtlasTab) => {
    setInternalTab(newTab);
    onTabChange?.(newTab);
  };
  const [archiveFilter, setArchiveFilter] = useState<string>('all');
  const [archiveSearch, setArchiveSearch] = useState<string>('');
  const [confirming, setConfirming] = useState(false);
  const [confirmedSuccess, setConfirmedSuccess] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [showDelistModal, setShowDelistModal] = useState(false);
  const [showReinstateModal, setShowReinstateModal] = useState(false);
  const [activeInquiry, setActiveInquiry] = useState<GovernanceInquiry | null>(null);

  React.useEffect(() => {
    if (selectedFeature?.code && selectedFeature.type === 'community') {
      fetch(`/api/governance/inquiries?communityId=${encodeURIComponent(selectedFeature.code)}&status=OPEN`)
        .then((r) => (r.ok ? r.json() : []))
        .then((list: GovernanceInquiry[]) => {
          setActiveInquiry(list[0] || null);
        })
        .catch(() => setActiveInquiry(null));
    } else {
      setActiveInquiry(null);
    }
  }, [selectedFeature?.code, selectedFeature?.type]);

  function handleSelectState(state: SoutheastStateInfo) {
    if (onSelectState) {
      onSelectState(state.code);
    } else {
      onFlyTo(state.center, state.zoom);
    }
  }

  function handleSelectRegion(region: BeyondRegionData) {
    if (onHighlightRegion) {
      onHighlightRegion(region.lgas.map((l) => l.code), region.center, region.zoom);
    } else {
      onHighlightLgas?.(region.lgas.map((l) => l.code));
      onFlyTo(region.center, region.zoom);
    }

    onSelectFeature?.({
      type: 'region',
      name: region.name,
      subtitle: region.subtitle,
      parentName: `${region.stateName} State`,
      regionId: region.id,
      coordinates: region.center,
      placeType: 'Cultural Region',
      zone: 'identified',
      markerColor: '#10b981',
      colorLabel: 'Identified Cultural Area',
      colorExplanation: region.whySignificant,
      whyMarked: `Documented cultural and linguistic continuum in ${region.stateName} State (${region.lgas.length} LGAs).`,
      constituentLgas: region.lgas,
      keyTowns: region.keyTowns,
      historicalNotes: region.historicalContext,
      waterwayContext: region.waterwayContext,
      dialect: region.dialect,
      dialectGreeting: region.dialectGreeting,
      whySignificant: region.whySignificant,
      traditionalMarketsAndLandmarks: region.traditionalMarketsAndLandmarks,
    });
  }

  const verified = communities.filter((c) => c.verificationStatus === 'verified').length;
  const pending = communities.filter((c) => c.verificationStatus !== 'verified' && c.verificationStatus !== 'challenged').length;
  const statesCovered = new Set(communities.map((c) => c.stateId).filter(Boolean)).size;

  async function handleConfirmCommunity(communityId: string) {
    if (confirming) return;
    setConfirming(true);
    try {
      const res = await fetch(`/api/communities/${communityId}`, { method: 'POST' });
      if (res.ok) {
        setConfirmedSuccess(true);
        onCommunityUpdated?.();
        setTimeout(() => setConfirmedSuccess(false), 3000);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setConfirming(false);
    }
  }

  function handleShareLocation() {
    if (!selectedFeature) return;
    const url = new URL(window.location.href);
    if (selectedFeature.coordinates) {
      url.searchParams.set('lng', selectedFeature.coordinates[0].toFixed(4));
      url.searchParams.set('lat', selectedFeature.coordinates[1].toFixed(4));
    }
    url.searchParams.set('name', selectedFeature.name);
    navigator.clipboard.writeText(url.toString());
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2200);
  }

  return (
    <aside className="panel-surface flex flex-col min-h-0 h-full w-full border-t lg:border-t-0 lg:border-r border-white/[0.07]">
      {/* Panel header: search + collapse + primary action */}
      <div className="shrink-0 px-4 pt-3.5 pb-3 space-y-3 border-b border-white/[0.06]">
        <div className="flex items-center gap-2">
          {onToggleCollapse && (
            <button
              type="button"
              onClick={onToggleCollapse}
              className="hidden lg:flex shrink-0 h-[34px] w-[34px] items-center justify-center rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-slate-400 hover:text-white transition-colors"
              title="Collapse sidebar menu"
              aria-label="Collapse sidebar menu"
            >
              <ChevronRight className="w-4 h-4 rotate-180" />
            </button>
          )}
          <div className="flex-1 min-w-0">
            <SearchBar onSelectCommunity={onSelectCommunity} />
          </div>
          <button
            type="button"
            onClick={onToggleAddMode}
            className={`shrink-0 h-[34px] px-3 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
              isAddMode
                ? 'bg-amber-400 text-black ring-2 ring-amber-400/30'
                : 'bg-gradient-to-br from-emerald-400 to-emerald-600 text-[#04120c] shadow-lg shadow-emerald-500/25 hover:brightness-110'
            }`}
          >
            <Plus className={`w-4 h-4 transition-transform ${isAddMode ? 'rotate-45' : ''}`} />
            <span>{isAddMode ? 'Cancel' : 'Add'}</span>
          </button>
        </div>

        {!hideTopTabs && (
          <nav className="seg" aria-label="Panel sections">
            <button type="button" className="seg-btn" data-active={tab === 'explore'} onClick={() => setTab('explore')} title="Explore communities">
              <Compass className="w-3.5 h-3.5" />
              <span className="truncate">Explore</span>
            </button>
            <button type="button" className="seg-btn" data-active={tab === 'culture'} onClick={() => setTab('culture')} title="Linguistic & Cultural Continuum">
              <Sparkles className="w-3.5 h-3.5" />
              <span className="truncate">Culture</span>
            </button>
            <button type="button" className="seg-btn" data-active={tab === 'voices'} onClick={() => setTab('voices')} title="Community Comments & Microblog Feed">
              <MessageSquare className="w-3.5 h-3.5" />
              <span className="truncate">Comments</span>
            </button>
            <button type="button" className="seg-btn" data-active={tab === 'archives'} onClick={() => setTab('archives')} title="Archival & Historical Documents">
              <Archive className="w-3.5 h-3.5" />
              <span className="truncate">Archives</span>
            </button>
            <button type="button" className="seg-btn" data-active={tab === 'key'} onClick={() => setTab('key')} title="Map Key & Filtering">
              <Layers className="w-3.5 h-3.5" />
              <span className="truncate">Key</span>
            </button>
            <button type="button" className="seg-btn" data-active={tab === 'about'} onClick={() => setTab('about')} title="About the Atlas">
              <BookOpen className="w-3.5 h-3.5" />
              <span className="truncate">About</span>
            </button>
          </nav>
        )}
      </div>

      {/* Scrollable body */}
      <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4 space-y-5">
        {/* Selection inspector (always on top when something is selected) */}
        {selectedFeature && (() => {
          const isEmerald = selectedFeature.markerColor === '#10b981' || selectedFeature.zone === 'southeast' || selectedFeature.zone === 'identified';
          const isAmber = selectedFeature.markerColor === '#f59e0b';
          const isRed = selectedFeature.markerColor === '#ef4444';
          const borderCls = isEmerald
            ? 'border-l-4 border-l-emerald-400 border-t-emerald-500/20 border-r-emerald-500/20 border-b-emerald-500/20 bg-gradient-to-br from-emerald-500/[0.12] via-emerald-950/[0.2] to-transparent shadow-lg shadow-emerald-950/40'
            : isAmber
            ? 'border-l-4 border-l-amber-400 border-t-amber-500/20 border-r-amber-500/20 border-b-amber-500/20 bg-gradient-to-br from-amber-500/[0.12] via-amber-950/[0.2] to-transparent shadow-lg shadow-amber-950/40'
            : isRed
            ? 'border-l-4 border-l-rose-500 border-t-rose-500/20 border-r-rose-500/20 border-b-rose-500/20 bg-gradient-to-br from-rose-500/[0.12] via-rose-950/[0.2] to-transparent shadow-lg shadow-rose-950/40'
            : 'border-amber-300/25 bg-gradient-to-br from-amber-300/[0.06] to-transparent';

          return (
            <section key={selectedFeature.code ?? selectedFeature.name} className={`rise card p-4 ${borderCls}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
                    <span className="text-[10px] uppercase font-mono font-bold tracking-wider px-1.5 py-0.5 rounded bg-white/[0.06] text-slate-200 border border-white/[0.08]">
                      {selectedFeature.placeType || (selectedFeature.type === 'lga' ? 'LGA' : selectedFeature.type)}
                    </span>
                    {selectedFeature.verificationStatus && <StatusPill status={selectedFeature.verificationStatus} />}
                    {selectedFeature.zone && selectedFeature.zone !== 'reference' && (
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md border bg-emerald-500/10 border-emerald-500/30 text-emerald-300">
                        {selectedFeature.zone === 'southeast' ? 'Igbo homeland' : 'Identified Igbo LGA'}
                      </span>
                    )}
                    {selectedFeature.markerColor && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-slate-300">
                        <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: selectedFeature.markerColor }} />
                        {selectedFeature.colorLabel?.split('(')[0]?.trim() || 'Marker'}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="font-display text-lg font-bold text-white leading-tight truncate">{selectedFeature.name}</h2>
                    <AudioPronunciationPlayer name={selectedFeature.name} size="sm" />
                  </div>
                  {selectedFeature.parentName && (
                    <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-emerald-400 shrink-0" />
                      <span className="truncate">{selectedFeature.parentName}</span>
                    </p>
                  )}
                  {selectedFeature.subtitle && (
                    <p className="text-[11px] font-mono text-emerald-400/90 mt-0.5">{selectedFeature.subtitle}</p>
                  )}

                  {/* Waterway Proximity Metric / Context */}
                  {(selectedFeature.nearestRiver || selectedFeature.waterwayContext) && (
                    <div className="mt-2 px-2.5 py-1.5 rounded-lg bg-sky-500/10 border border-sky-500/20 text-[11px] text-sky-200 flex items-center justify-between">
                      <span className="flex items-center gap-1.5 font-medium">
                        <Waves className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                        <span>{selectedFeature.nearestRiver?.name || 'Waterway System'}</span>
                      </span>
                      <span className="font-mono text-[10px] text-sky-300">
                        {selectedFeature.nearestRiver
                          ? `~${selectedFeature.nearestRiver.distanceKm} km · ${selectedFeature.nearestRiver.basin}`
                          : selectedFeature.waterwayContext}
                      </span>
                    </div>
                  )}

                  {/* Dialect Classification & Native Greeting (Only for Igbo areas) */}
                  {selectedFeature.zone !== 'reference' && selectedFeature.markerColor !== '#ef4444' && (selectedFeature.dialectCluster || selectedFeature.dialect) && (
                    <div className="mt-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-[11px] text-emerald-200 flex items-center justify-between flex-wrap gap-1">
                      <span className="font-medium truncate">
                        🗣 Dialect: {selectedFeature.dialect || selectedFeature.dialectCluster?.name}
                      </span>
                      {(selectedFeature.dialectGreeting || selectedFeature.dialectCluster?.sampleGreeting) && (
                        <span className="text-[10px] text-emerald-400 font-mono italic">
                          &ldquo;{selectedFeature.dialectGreeting || selectedFeature.dialectCluster?.sampleGreeting}&rdquo;
                        </span>
                      )}
                    </div>
                  )}

                  {/* Non-Igbo Regional Reference Marker Notice */}
                  {(selectedFeature.zone === 'reference' || selectedFeature.markerColor === '#ef4444') && (
                    <div className="mt-1.5 px-2.5 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-[11px] text-red-200 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
                      <span className="leading-tight">
                        <strong>Regional Reference Point:</strong> Located outside documented Igbo-speaking territory (GRID3 / OpenStreetMap baseline).
                      </span>
                    </div>
                  )}

                  {/* Historical Diaspora Notes */}
                  {selectedFeature.historicalNotes && (
                    <div className="mt-2 p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-200 leading-relaxed">
                      <span className="font-bold block text-[10px] uppercase font-mono text-amber-400 mb-0.5">Lineage & Diaspora Context</span>
                      {selectedFeature.historicalNotes}
                    </div>
                  )}

                  {/* Archival Records & Colonial Intelligence Reports */}
                  {(() => {
                    const matchedDocs = getArchivalDocumentsForFeature({
                      stateName: selectedFeature.parentName || selectedFeature.name,
                      lgaCode: selectedFeature.code,
                      regionId: selectedFeature.regionId,
                      territory: selectedFeature.name,
                    });
                    if (matchedDocs.length === 0) return null;

                    return (
                      <div className="mt-2.5 p-2.5 rounded-lg bg-amber-950/20 border border-amber-500/30 text-[11px] space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-[10px] uppercase font-mono text-amber-300 flex items-center gap-1.5">
                            <FileCheck className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                            Archival Evidence ({matchedDocs.length})
                          </span>
                          <span className="text-[9px] font-mono text-amber-400/80">Colonial & Precolonial</span>
                        </div>
                        <div className="space-y-1.5">
                          {matchedDocs.slice(0, 3).map((doc) => (
                            <div key={doc.id} className="p-2 rounded bg-black/40 border border-amber-500/20 space-y-1">
                              <div className="flex items-start justify-between gap-1.5">
                                <span className="font-semibold text-white leading-tight text-[11px]">{doc.title}</span>
                                <span className="text-[9px] font-mono px-1 rounded bg-amber-500/20 text-amber-300 shrink-0">
                                  {doc.year}
                                </span>
                              </div>
                              <p className="text-[10px] text-slate-300 line-clamp-2 leading-relaxed">{doc.significance}</p>
                              {doc.keyFindings && doc.keyFindings.length > 0 && (
                                <ul className="text-[9px] text-amber-200/90 list-disc list-inside space-y-0.5 pt-0.5">
                                  {doc.keyFindings.slice(0, 2).map((finding, idx) => (
                                    <li key={idx} className="line-clamp-1">{finding}</li>
                                  ))}
                                </ul>
                              )}
                              <div className="pt-1 flex items-center justify-between text-[9px] font-mono text-slate-400">
                                <span className="truncate max-w-[170px]" title={doc.archiveReference}>🏛 {doc.archiveReference}</span>
                                {doc.digitalUrl && (
                                  <a
                                    href={doc.digitalUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-amber-300 hover:text-amber-200 flex items-center gap-0.5 underline shrink-0"
                                  >
                                    <span>Source</span>
                                    <ExternalLink className="w-2.5 h-2.5" />
                                  </a>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })()}
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={handleShareLocation}
                    className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
                    title={copiedLink ? 'Link copied!' : 'Share location view'}
                  >
                    <Share2 className="w-4 h-4" />
                  </button>
                  <button type="button" onClick={onCloseSelected} className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/5" aria-label="Clear selection">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {copiedLink && (
                <div className="mt-2 px-2.5 py-1 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-[11px] font-semibold text-emerald-300 animate-fadeIn">
                  Link with coordinates copied to clipboard!
                </div>
              )}

              {/* Why Marked explanation */}
              {selectedFeature.whyMarked && (
                <div className="mt-3 p-2.5 rounded-lg bg-white/[0.03] border border-white/[0.07] text-[11px] text-slate-300 space-y-1">
                  <span className="text-[10px] uppercase font-mono font-bold tracking-wider text-slate-400 block">Why this location is marked</span>
                  <p className="leading-relaxed">{selectedFeature.whyMarked}</p>
                </div>
              )}

              {/* Color meaning explanation */}
              {selectedFeature.colorExplanation ? (
                <div className="mt-2.5 p-2.5 rounded-lg bg-black/40 border border-white/10 text-[11px] space-y-1">
                  <div className="flex items-center gap-1.5 text-[10px] uppercase font-mono font-bold tracking-wider text-amber-300/90">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: selectedFeature.markerColor || '#10b981' }} />
                    <span>Color Representation ({selectedFeature.colorLabel || 'Marker'})</span>
                  </div>
                  <p className="text-slate-300/90 leading-relaxed">{selectedFeature.colorExplanation}</p>
                </div>
              ) : (
                <p className="text-[12px] text-slate-300/90 leading-relaxed mt-3">
                  {selectedFeature.type === 'community'
                    ? 'A community-documented settlement. Its status reflects peer confirmations and moderator review.'
                    : selectedFeature.zone === 'southeast'
                    ? 'Part of the Southeast geopolitical zone, shown as the contiguous Igbo homeland baseline on this atlas.'
                    : selectedFeature.zone === 'identified'
                    ? 'Outside the Southeast, but home to documented communities that identify as Igbo — so it carries the homeland colour.'
                    : 'No Igbo-identifying communities documented here yet. Know one? Add it to the atlas.'}
                </p>
              )}

              {selectedFeature.type === 'community' ? (
                <div className="mt-3 pt-3 border-t border-white/[0.07] space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[11px] text-slate-400 flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5" />
                      <strong className="text-white font-mono">{selectedFeature.confirmationsCount ?? 0}</strong> confirmations
                    </span>
                    <a
                      href={`/communities/${selectedFeature.code}`}
                      className="text-[11px] text-slate-400 hover:text-emerald-300 underline transition-colors"
                      title="Open dedicated standalone record page"
                    >
                      Full page view &rarr;
                    </a>
                  </div>

                  {/* Active Governance Quorum Inquiry */}
                  {activeInquiry && (
                    <div className="pt-1">
                      <GovernanceInquiryCard
                        inquiry={activeInquiry}
                        onVoteCast={() => {
                          onCommunityUpdated?.();
                          if (selectedFeature.code) {
                            fetch(`/api/governance/inquiries?communityId=${encodeURIComponent(selectedFeature.code)}&status=OPEN`)
                              .then((r) => (r.ok ? r.json() : []))
                              .then((list: GovernanceInquiry[]) => setActiveInquiry(list[0] || null))
                              .catch(() => {});
                          }
                        }}
                      />
                    </div>
                  )}

                  {/* Status Banner & Action Buttons */}
                  {selectedFeature.lifecycleStatus === 'DELISTED' ? (
                    <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-700/60 space-y-2.5">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                        <div className="text-xs text-slate-300">
                          <strong className="text-white block font-medium">Delisted Settlement (Dormant)</strong>
                          This settlement was declassified via community quorum. Native residents or descendants may submit an ancestral reinstatement petition.
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowReinstateModal(true)}
                        className="w-full py-2 px-3 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center justify-center gap-2 transition-all active:scale-95 shadow-sm"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Petition Reinstatement (Claim Igbo Heritage)</span>
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        {/* Interactive Peer Confirmation Action */}
                        <button
                          type="button"
                          disabled={confirming}
                          onClick={() => selectedFeature.code && handleConfirmCommunity(selectedFeature.code)}
                          className="py-2 px-2.5 rounded-xl bg-gradient-to-r from-emerald-600/30 to-teal-600/30 hover:from-emerald-600/50 hover:to-teal-600/50 border border-emerald-500/40 text-emerald-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-sm disabled:opacity-50"
                        >
                          <ThumbsUp className={`w-3.5 h-3.5 ${confirmedSuccess ? 'text-amber-400 scale-125' : ''} transition-transform`} />
                          <span className="truncate">{confirmedSuccess ? 'Confirmed!' : 'Confirm (+1)'}</span>
                        </button>

                        {/* Challenge / Delisting Trigger */}
                        <button
                          type="button"
                          onClick={() => setShowDelistModal(true)}
                          className="py-2 px-2.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all active:scale-95"
                          title="Challenge classification and open a community quorum deliberation"
                        >
                          <Scale className="w-3.5 h-3.5" />
                          <span className="truncate">Challenge / Delist</span>
                        </button>
                      </div>

                      {/* Micro-Map Kindred (Ụmụnna) & Village Landmarks Trigger */}
                      <button
                        type="button"
                        onClick={() => {
                          onOpenKindredMapping?.({
                            id: selectedFeature.code || '',
                            name: selectedFeature.name,
                          });
                        }}
                        className="w-full py-2 px-3 rounded-xl bg-teal-500/15 hover:bg-teal-500/25 border border-teal-500/35 text-teal-300 text-xs font-semibold flex items-center justify-center gap-2 transition-all shadow-sm"
                      >
                        <Landmark className="w-3.5 h-3.5 text-teal-400" />
                        <span>Micro-Map Kindred (Ụmụnna) & Landmarks</span>
                      </button>
                    </div>
                  )}

                  {/* Public Living Audit Trail */}
                  {selectedFeature.code && (
                    <div className="pt-2 border-t border-white/[0.06]">
                      <CommunityAuditHistory communityId={selectedFeature.code} />
                    </div>
                  )}

                  {/* Inline Community Comments & Oral Histories */}
                  {selectedFeature.code && (
                    <InlineCommunityComments
                      communityId={selectedFeature.code}
                      communityName={selectedFeature.name}
                      onCommentAdded={onCommunityUpdated}
                    />
                  )}
                </div>
              ) : selectedFeature.type === 'region' ? (
                <div className="mt-3 pt-3 border-t border-white/[0.08] space-y-3">
                  {/* Constituent LGAs interactive grid/chips */}
                  {selectedFeature.constituentLgas && selectedFeature.constituentLgas.length > 0 && (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] uppercase font-mono font-bold tracking-wider text-slate-300">
                          Constituent LGAs ({selectedFeature.constituentLgas.length})
                        </span>
                        <span className="text-[9px] text-slate-400">Click to isolate & inspect</span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-48 overflow-y-auto pr-1">
                        {selectedFeature.constituentLgas.map((lga) => (
                          <button
                            key={lga.code}
                            type="button"
                            onClick={() => {
                              if (onSelectLgaByCode) {
                                onSelectLgaByCode(lga.code);
                              } else {
                                onHighlightLgas?.([lga.code]);
                                if (lga.center) onFlyTo(lga.center, 10);
                              }
                            }}
                            className="px-2 py-1.5 rounded-lg bg-white/[0.04] hover:bg-emerald-500/15 border border-white/[0.08] hover:border-emerald-500/40 text-left transition-all group"
                          >
                            <span className="text-[11px] font-semibold text-white group-hover:text-emerald-300 block truncate">
                              {lga.name}
                            </span>
                            <span className="text-[9px] font-mono text-slate-400 block">
                              {lga.code}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Key Settlements */}
                  {selectedFeature.keyTowns && selectedFeature.keyTowns.length > 0 && (
                    <div className="p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.06] space-y-1.5">
                      <span className="text-[10px] uppercase font-mono font-bold text-slate-400 block">
                        Historic Towns & Centers
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {selectedFeature.keyTowns.map((town) => (
                          <span
                            key={town}
                            className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-slate-300"
                          >
                            {town}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Traditional Markets & Cultural Landmarks */}
                  {selectedFeature.traditionalMarketsAndLandmarks && selectedFeature.traditionalMarketsAndLandmarks.length > 0 && (
                    <div className="p-2.5 rounded-lg bg-amber-500/[0.04] border border-amber-500/20 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] uppercase font-mono font-bold text-amber-300 flex items-center gap-1.5">
                          <Landmark className="w-3 h-3 text-amber-400" />
                          Traditional Markets & Landmarks ({selectedFeature.traditionalMarketsAndLandmarks.length})
                        </span>
                        <span className="text-[9px] text-amber-400/80 font-mono">4-Day Cycle & Heritage</span>
                      </div>
                      <div className="flex flex-wrap gap-1 max-h-36 overflow-y-auto pr-1">
                        {selectedFeature.traditionalMarketsAndLandmarks.map((item) => (
                          <span
                            key={item}
                            className="text-[10px] px-2 py-0.5 rounded bg-black/40 border border-amber-500/20 text-amber-200/90 leading-tight"
                          >
                            {item}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Documented communities in this region */}
                  {(() => {
                    const regComm = communities.filter((c) =>
                      selectedFeature.constituentLgas?.some(
                        (l) => l.code === c.lgaId || l.name.toLowerCase() === c.lgaName?.toLowerCase()
                      ) ||
                      c.stateName?.toLowerCase() === selectedFeature.parentName?.replace(' State', '').toLowerCase()
                    );
                    return (
                      <div className="space-y-1.5 pt-2 border-t border-white/[0.06]">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] uppercase font-mono font-bold tracking-wider text-slate-300 flex items-center gap-1.5">
                            <Users className="w-3 h-3 text-emerald-400" />
                            Documented Settlements ({regComm.length})
                          </span>
                        </div>
                        {regComm.length === 0 ? (
                          <div className="p-2.5 rounded-lg bg-white/[0.02] border border-dashed border-white/10 text-center text-[11px] text-slate-400">
                            No settlements documented in this region yet. Know an autonomous community here? Document it below!
                          </div>
                        ) : (
                          <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                            {regComm.map((c) => (
                              <button
                                key={c.id}
                                type="button"
                                onClick={() => onSelectCommunity(c)}
                                className="w-full p-2 rounded-lg bg-white/[0.03] hover:bg-emerald-500/10 border border-white/[0.06] hover:border-emerald-500/30 text-left flex items-center justify-between transition-all"
                              >
                                <div className="min-w-0">
                                  <span className="text-[11px] font-semibold text-white block truncate">{c.name}</span>
                                  <span className="text-[9px] text-slate-400 block truncate">{c.lgaName || c.stateName}</span>
                                </div>
                                <StatusPill status={c.verificationStatus} />
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* Document Community Action */}
                  <button
                    type="button"
                    onClick={() => {
                      if (onDocumentFeature && selectedFeature) {
                        onDocumentFeature({
                          ...selectedFeature,
                          name: '',
                          coordinates: selectedFeature.coordinates,
                        });
                      } else {
                        onToggleAddMode();
                      }
                    }}
                    className="mt-3 w-full text-[11px] font-semibold py-2.5 rounded-lg border border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 transition-all flex items-center justify-center gap-1.5 shadow-sm"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Document Community in {selectedFeature.name}</span>
                  </button>
                </div>
              ) : (
                (selectedFeature.zone === 'reference' || selectedFeature.type === 'settlement' || selectedFeature.type === 'landmark' || selectedFeature.type === 'lga') && (
                  <button
                    type="button"
                    onClick={() => {
                      if (onDocumentFeature && selectedFeature) {
                        onDocumentFeature(selectedFeature);
                      } else {
                        onToggleAddMode();
                      }
                    }}
                    className="mt-3 w-full text-[11px] font-semibold py-2.5 rounded-lg border border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 transition-all flex items-center justify-center gap-1.5 shadow-sm"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Document as Igbo Community</span>
                  </button>
                )
              )}
            </section>
          );
        })()}

        {tab === 'explore' && (
          <div className="space-y-4 sm:space-y-5 rise">
            {/* Intro */}
            <section className="space-y-1">
              <div className="flex items-center justify-between text-[11px] font-mono">
                <span className="text-emerald-400 uppercase tracking-wider font-bold text-[10px]">Participatory Geographic Atlas</span>
                <span className="text-slate-400">{communities.length} Communities</span>
              </div>
              <h2 className="font-display text-lg sm:text-[22px] leading-snug font-bold text-white">
                Where Igbo communities live — <span className="bg-gradient-to-r from-emerald-300 to-teal-300 bg-clip-text text-transparent">mapped by the people who know.</span>
              </h2>
              <p className="hidden sm:block text-[13px] text-slate-400 leading-relaxed mt-1.5">
                The five Southeast states form the shaded homeland baseline. Beyond them, any LGA where communities identify as Igbo takes on the same colour — as residents document and confirm them.
              </p>
            </section>

            {/* Stats Ribbon: Compact 4-col ribbon on mobile, 2x2 grid on desktop */}
            <section className="grid grid-cols-4 sm:grid-cols-2 gap-1.5 sm:gap-2.5">
              {[
                { label: 'Documented', fullLabel: 'Documented communities', value: communities.length, icon: MapPin, glow: 'rgba(16,185,129,0.22)' },
                { label: 'Verified', fullLabel: 'Verified', value: verified, icon: ShieldCheck, glow: 'rgba(251,191,36,0.22)' },
                { label: 'Review', fullLabel: 'Awaiting review', value: pending, icon: Clock, glow: 'rgba(148,163,184,0.2)' },
                { label: 'States', fullLabel: 'States represented', value: `${statesCovered}/37`, icon: Landmark, glow: 'rgba(45,212,191,0.2)' },
              ].map((s) => (
                <div key={s.label} className="card stat-card p-2 sm:p-3 text-center sm:text-left" style={{ ['--glow' as any]: s.glow }}>
                  <s.icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-400 mx-auto sm:mx-0 mb-1 sm:mb-2" />
                  <p className="font-display text-base sm:text-2xl font-bold text-white leading-none">{s.value}</p>
                  <p className="text-[9px] sm:text-[11px] text-slate-400 mt-0.5 sm:mt-1 truncate">
                    <span className="sm:hidden">{s.label}</span>
                    <span className="hidden sm:inline">{s.fullLabel}</span>
                  </p>
                </div>
              ))}
            </section>

            {/* Quick jumps to states and cultural regions */}
            <section>
              <SectionTitle
                icon={MapIcon}
                action={
                  <button type="button" onClick={onResetView} className="text-[11px] text-slate-400 hover:text-white flex items-center gap-1">
                    <RotateCcw className="w-3 h-3" /> All Nigeria
                  </button>
                }
              >
                Southeast homeland
              </SectionTitle>
              <div className="grid grid-cols-3 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3 gap-1.5 sm:gap-2">
                {SE_STATES.map((s) => {
                  const isSelected = selectedFeature?.type === 'state' && selectedFeature.code === s.code;
                  return (
                    <button
                      key={s.code}
                      type="button"
                      onClick={() => handleSelectState(s)}
                      className={`card card-interactive text-left px-2.5 py-1.5 sm:px-3 sm:py-2.5 transition-all ${
                        isSelected
                          ? 'border-emerald-400 bg-emerald-500/[0.14] ring-1 ring-emerald-400/50 shadow-md shadow-emerald-950/40'
                          : 'hover:border-white/20'
                      }`}
                      title={`Inspect ${s.name} State (${s.lgasCount} LGAs)`}
                    >
                      <span className="flex items-center gap-1.5 text-xs sm:text-[13px] font-semibold text-white">
                        <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-sm bg-emerald-500 shrink-0" />
                        <span className="truncate">{s.name}</span>
                      </span>
                      <span className="hidden sm:block text-[10px] text-slate-400 mt-0.5 truncate">Capital · {s.capital}</span>
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center justify-between mt-4 sm:mt-5 mb-2">
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">Beyond the Southeast</p>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                  {BEYOND_SOUTHEAST_REGIONS.length} Regions · {BEYOND_SOUTHEAST_REGIONS.reduce((acc, r) => acc + r.lgas.length, 0)} LGAs
                </span>
              </div>
              <div className="space-y-2 sm:space-y-2.5">
                {BEYOND_SOUTHEAST_REGIONS.map((b) => {
                  const isSelected = selectedFeature?.type === 'region' && selectedFeature.regionId === b.id;
                  const regCommCount = communities.filter((c) =>
                    b.lgas.some((l) => l.code === c.lgaId || l.name.toLowerCase() === c.lgaName?.toLowerCase()) ||
                    c.stateName?.toLowerCase() === b.stateName.toLowerCase()
                  ).length;

                  return (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => handleSelectRegion(b)}
                      className={`card card-interactive w-full text-left p-2.5 sm:p-3 transition-all ${
                        isSelected
                          ? 'border-emerald-400 bg-emerald-500/[0.12] ring-1 ring-emerald-400/50 shadow-md shadow-emerald-950/40'
                          : 'hover:border-white/20'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                            <span className="text-[10px] font-bold uppercase font-mono px-1.5 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-300">
                              {b.stateName}
                            </span>
                            <span className="text-[10px] font-mono text-slate-400">
                              {b.lgas.length} LGAs
                            </span>
                            <span className="text-[10px] font-mono text-slate-400">
                              · {regCommCount > 0 ? `${regCommCount} documented` : 'Open'}
                            </span>
                          </div>
                          <span className="block text-xs sm:text-[13px] font-bold text-white group-hover:text-emerald-300 truncate">
                            {b.name}
                          </span>
                          <span className="block text-[11px] text-slate-400 mt-0.5 leading-snug line-clamp-1 sm:line-clamp-2">
                            {b.note}
                          </span>
                        </div>
                        <ChevronRight className={`w-4 h-4 shrink-0 transition-transform ${isSelected ? 'text-emerald-400 translate-x-0.5' : 'text-slate-500'}`} />
                      </div>
                      <div className="mt-1.5 sm:mt-2 pt-1.5 sm:pt-2 border-t border-white/[0.06] flex items-center justify-between text-[10px] text-slate-400">
                        <span className="truncate italic text-slate-400/90 max-w-[200px]">🗣 {b.dialect.split('dialects')[0].trim()}</span>
                        <span className="text-emerald-400 font-semibold font-mono shrink-0 ml-2">Inspect &rarr;</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>

            {/* Documented communities feed */}
            <section>
              <SectionTitle icon={Users}>Recent documentation activity</SectionTitle>
              {communities.length === 0 ? (
                <div className="card p-3 sm:p-4 text-center text-xs text-slate-400">Loading communities…</div>
              ) : (
                <ul className="space-y-1.5 sm:space-y-2">
                  {communities.slice(0, 10).map((c) => (
                    <li key={c.id}>
                      <button
                        type="button"
                        onClick={() => onSelectCommunity(c)}
                        className="card card-interactive w-full text-left p-2.5 sm:p-3 flex gap-2.5 sm:gap-3"
                      >
                        <span className="h-8 w-8 sm:h-9 sm:w-9 shrink-0 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center font-display font-bold text-emerald-300 text-xs sm:text-sm">
                          {c.name.charAt(0)}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center justify-between gap-2">
                            <span className="text-xs sm:text-[13px] font-semibold text-white truncate">{c.name}</span>
                            <StatusPill status={c.verificationStatus} />
                          </span>
                          <span className="block text-[10px] sm:text-[11px] text-slate-400 truncate mt-0.5">
                            {c.lgaName} · {c.stateName}
                            {c.languageStatus ? ` · ${c.languageStatus}` : ''}
                          </span>
                          {c.description && <span className="block text-[10px] sm:text-[11px] text-slate-500 mt-0.5 line-clamp-1 sm:line-clamp-2">{c.description}</span>}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {/* CTA */}
            <section className="card p-3 sm:p-4 relative overflow-hidden">
              <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-emerald-500/20 blur-3xl pointer-events-none" />
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="w-4 h-4 text-emerald-300 shrink-0" />
                <h3 className="font-display text-sm sm:text-base font-bold text-white">Is your community missing?</h3>
              </div>
              <p className="text-[11px] sm:text-[12px] text-slate-400 leading-relaxed">
                Drop a pin, add short descriptions and historical evidence. Neighbours confirm it, moderators verify it.
              </p>
              <button
                type="button"
                onClick={onToggleAddMode}
                className="mt-2.5 sm:mt-3 w-full py-2 sm:py-2.5 rounded-xl bg-white text-[#060911] text-xs font-bold hover:bg-emerald-100 transition-colors"
              >
                Document a community
              </button>
            </section>
          </div>
        )}

        {tab === 'culture' && (
          <div className="space-y-6 rise">
            {/* Traditional 4-Day Calendar & Festivals */}
            <section>
              <SectionTitle icon={Calendar}>Igbo Calendar & Four Market Days</SectionTitle>
              <TraditionalCalendarWidget
                onFilterMarketDay={onFilterMarketDay}
                selectedMarketFilter={selectedMarketFilter}
              />
            </section>

            {/* Dialect Continuum & Linguistic Clusters */}
            <section>
              <SectionTitle icon={Sparkles}>Linguistic Dialect Clusters</SectionTitle>
              <p className="text-[12px] text-slate-400 mb-3 leading-relaxed">
                The Igbo language forms a continuum across Southeastern Nigeria and contiguous borderlands.
              </p>
              <div className="space-y-2.5">
                {Object.values(DIALECT_CLUSTERS).map((cluster) => {
                  const isSelected = selectedFeature?.type === 'region' && selectedFeature.code === cluster.id;
                  return (
                    <div
                      key={cluster.id}
                      onClick={() => onSelectDialectCluster?.(cluster)}
                      className={`p-3 rounded-xl border transition-all space-y-2 cursor-pointer ${
                        isSelected
                          ? 'border-emerald-400 bg-emerald-500/[0.12] ring-1 ring-emerald-400/50 shadow-md shadow-emerald-950/40'
                          : 'bg-white/[0.03] border-white/[0.08] hover:border-white/20 hover:bg-white/[0.05]'
                      }`}
                      title={`Click to locate & inspect ${cluster.name} continuum`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cluster.color }} />
                          <h4 className="text-[13px] font-bold text-white font-display">{cluster.name}</h4>
                        </div>
                        <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-white/5 border border-white/10 text-slate-300">
                          {cluster.igboName}
                        </span>
                      </div>

                      <p className="text-[11px] text-slate-300 leading-relaxed">
                        {cluster.description}
                      </p>

                      <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between flex-wrap gap-2 text-xs">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] text-slate-400 font-mono">Sample Greeting:</span>
                          <span className="text-[11px] font-semibold text-emerald-300 font-mono">
                            &ldquo;{cluster.sampleGreeting}&rdquo;
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-emerald-400/90 font-mono font-semibold">Inspect Continuum &rarr;</span>
                          <AudioPronunciationPlayer name={cluster.sampleGreeting.split('/')[0].trim()} size="sm" />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Ancestral Kinship & Migration Diaspora Arcs */}
            <section>
              <SectionTitle icon={Compass}>Ancestral Migration Arcs</SectionTitle>
              <p className="text-[12px] text-slate-400 mb-3 leading-relaxed">
                Documented migration corridors, title networks, and diaspora settlements tracing ancestral sister communities.
              </p>
              <div className="space-y-2.5">
                {ANCESTRAL_MIGRATION_ARCS.map((arc) => {
                  const isSelected = selectedFeature?.type === 'migration' && selectedFeature.code === arc.id;
                  return (
                    <div
                      key={arc.id}
                      className={`p-3 rounded-xl border transition-all space-y-2 ${
                        isSelected
                          ? 'border-amber-400 bg-amber-500/[0.12] ring-1 ring-amber-400/50 shadow-md shadow-amber-950/40'
                          : 'bg-gradient-to-br from-white/[0.04] to-white/[0.01] border-white/[0.08] hover:border-amber-500/40'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: arc.color }} />
                          <h4 className="text-[12px] font-bold text-white">{arc.name}</h4>
                        </div>
                        <span className="text-[9px] font-mono text-amber-300 px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/20">
                          {arc.era}
                        </span>
                      </div>

                      <div className="text-[11px] text-slate-300 flex items-center gap-1.5 font-mono">
                        <span className="text-emerald-400 font-semibold">{arc.origin.name}</span>
                        <span className="text-slate-500">&rarr;</span>
                        <span className="text-amber-400 font-semibold">{arc.destination.name}</span>
                      </div>

                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        {arc.description}
                      </p>

                      <div className="pt-2 border-t border-white/[0.06] flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            if (onFlyThroughCorridor) {
                              onFlyThroughCorridor(arc.id);
                            }
                          }}
                          className="px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 text-[10px] font-semibold flex items-center gap-1 transition-all"
                        >
                          <span>✈️ Fly in 3D</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (onInspectMigrationArc) {
                              onInspectMigrationArc(arc);
                            } else {
                              onFlyTo(arc.origin.coordinates, 8.5);
                            }
                          }}
                          className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-emerald-500/15 border border-white/10 hover:border-emerald-500/30 text-emerald-300 text-[10px] font-semibold flex items-center gap-1 transition-all"
                        >
                          <span>Inspect Corridor</span>
                          <ArrowUpRight className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Archaeological Sites & Ancient Metallurgy */}
            <section>
              <SectionTitle icon={Landmark}>Archaeology & Ancient Metallurgy</SectionTitle>
              <p className="text-[12px] text-slate-400 mb-3 leading-relaxed">
                Excavated scientific proof of early African metallurgy, lost-wax bronze casting, stone tool industries, and indigenous ideographic writing.
              </p>
              <div className="space-y-2.5">
                {ARCHAEOLOGICAL_SITES.map((site) => (
                  <div
                    key={site.id}
                    className="p-3 rounded-xl border border-white/[0.08] bg-white/[0.03] hover:border-amber-400/40 transition-all space-y-2 group"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className="text-[9px] font-mono uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-amber-400/10 text-amber-300 border border-amber-400/20">
                            {site.era}
                          </span>
                        </div>
                        <h4 className="text-[13px] font-bold text-white group-hover:text-amber-300 transition-colors font-display">
                          {site.name}
                        </h4>
                        <p className="text-[11px] text-slate-400 font-sans mt-0.5">
                          {site.location}
                        </p>
                      </div>
                    </div>

                    <p className="text-[11px] text-slate-300/90 leading-relaxed font-sans">
                      {site.description}
                    </p>

                    <div className="flex flex-wrap gap-1 pt-1">
                      {site.keyArtifacts.map((art) => (
                        <span
                          key={art}
                          className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-black/40 border border-white/10 text-emerald-300"
                        >
                          {art}
                        </span>
                      ))}
                    </div>

                    <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between">
                      <span className="text-[10px] text-slate-400 font-mono italic">
                        {site.significance.slice(0, 70)}...
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          onFlyTo(site.coordinates, 10.5);
                          onSelectFeature?.({
                            type: 'landmark',
                            name: site.name,
                            parentName: site.location,
                            coordinates: site.coordinates,
                            placeType: 'Archaeological Excavation Site',
                            markerColor: '#f59e0b',
                            colorLabel: 'Archaeological Site',
                            colorExplanation: site.significance,
                            whyMarked: `Excavation era: ${site.era}. Scientific proof of early metallurgy and craftsmanship. Key artifacts: ${site.keyArtifacts.join(', ')}.`,
                            historicalNotes: site.description,
                            nearestRiver: site.coordinates ? calculateNearestWaterway(site.coordinates[0], site.coordinates[1]) : undefined,
                          });
                        }}
                        className="px-2.5 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 text-[10px] font-semibold flex items-center gap-1 transition-colors"
                      >
                        <MapPin className="w-3 h-3" />
                        <span>Inspect Site</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Inland Waterway Superhighways & Ports */}
            <section>
              <SectionTitle icon={Waves}>Precolonial Waterway Trade Highways</SectionTitle>
              <p className="text-[12px] text-slate-400 mb-3 leading-relaxed">
                Ancient river routes connecting inland agricultural breadbaskets with coastal Atlantic trading ports.
              </p>
              <div className="space-y-2.5">
                {WATERWAY_TRADE_CORRIDORS.map((corridor) => (
                  <div
                    key={corridor.id}
                    className="p-3 rounded-xl border border-white/[0.08] bg-sky-950/20 hover:border-sky-400/40 transition-all space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <h4 className="text-[12px] font-bold text-white font-display flex items-center gap-1.5">
                        <Waves className="w-3.5 h-3.5 text-sky-400" />
                        {corridor.name}
                      </h4>
                      <span className="text-[9px] font-mono text-sky-300 px-1.5 py-0.5 rounded bg-sky-500/10 border border-sky-500/20">
                        {corridor.basin}
                      </span>
                    </div>

                    <p className="text-[11px] text-emerald-300 font-mono font-medium">
                      Route: {corridor.route}
                    </p>

                    <p className="text-[11px] text-slate-300 leading-relaxed">
                      {corridor.description}
                    </p>

                    <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between flex-wrap gap-2">
                      <div className="flex flex-wrap gap-1">
                        {corridor.keyPorts.map((port) => (
                          <span
                            key={port}
                            className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-sky-950/40 border border-sky-500/30 text-sky-200"
                          >
                            ⚓ {port}
                          </span>
                        ))}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            if (onFlyThroughCorridor) {
                              onFlyThroughCorridor(corridor.id);
                            }
                          }}
                          className="px-2.5 py-1 rounded-lg bg-sky-500/25 hover:bg-sky-500/35 border border-sky-500/50 text-sky-200 text-[10px] font-semibold flex items-center gap-1 transition-all"
                        >
                          <span>✈️ Fly in 3D</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            onFlyTo(corridor.center, corridor.zoom);
                            onSelectFeature?.({
                              type: 'landmark',
                              name: corridor.name,
                              parentName: `${corridor.basin} Basin`,
                              coordinates: corridor.center,
                              placeType: 'Precolonial Waterway Highway',
                              markerColor: '#0284c7',
                              colorLabel: 'Waterway Trade Highway',
                              colorExplanation: corridor.description,
                              whyMarked: `Navigable trade artery. Route: ${corridor.route}. Key ports: ${corridor.keyPorts.join(', ')}.`,
                              waterwayContext: corridor.route,
                              historicalNotes: corridor.description,
                            });
                          }}
                          className="px-2.5 py-1 rounded-lg bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/30 text-sky-300 text-[10px] font-semibold flex items-center gap-1 transition-colors"
                        >
                          <Waves className="w-3 h-3" />
                          <span>Inspect Corridor</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}

        {tab === 'voices' && (
          <CommunityVoicesTab
            communities={communities}
            onFlyTo={onFlyTo}
            onSelectCommunityByName={(name) => {
              const matched = communities.find((c) => c.name.toLowerCase() === name.toLowerCase());
              if (matched) {
                onSelectCommunity(matched);
              }
            }}
            selectedFeature={selectedFeature}
          />
        )}

        {tab === 'archives' && (
          <div className="space-y-5 rise">
            <section>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-amber-400/90 font-bold">Primary Historical Records</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300">
                  {ARCHIVAL_DOCUMENTS.length} Documents
                </span>
              </div>
              <h2 className="font-display text-xl font-bold text-white leading-tight">
                Historical Records & <span className="bg-gradient-to-r from-amber-300 to-yellow-400 bg-clip-text text-transparent">Archival Evidence</span>
              </h2>
              <p className="text-[12px] text-slate-400 leading-relaxed mt-2">
                Official British colonial Intelligence Reports (NAI, NAE, NAK, Kew), Ekumeku resistance warfare despatches, provincial boundary adjustment decrees (1914–1939), Aro confederacy corridors, pre-1967 population censuses, and Igbo-Ukwu 9th-century archaeology.
              </p>
            </section>

            {/* Search & Category Filter Pills */}
            <div className="space-y-2">
              <input
                type="text"
                placeholder="Search archives by keyword, clan, or author..."
                value={archiveSearch}
                onChange={(e) => setArchiveSearch(e.target.value)}
                className="w-full px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400/50"
              />

              <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar text-[10px]">
                {[
                  { id: 'all', label: 'All Records' },
                  { id: 'intelligence_report', label: 'Intelligence Reports' },
                  { id: 'resistance', label: 'Resistance & Ekumeku' },
                  { id: 'boundary_decree', label: 'Boundary Decrees' },
                  { id: 'pre_civil_war', label: 'Census & Willink' },
                  { id: 'ancient', label: 'Igbo-Ukwu' },
                  { id: 'precolonial', label: 'Precolonial' },
                ].map((pill) => (
                  <button
                    key={pill.id}
                    type="button"
                    onClick={() => setArchiveFilter(pill.id)}
                    className={`px-2.5 py-1 rounded-lg shrink-0 font-medium transition-all ${
                      archiveFilter === pill.id
                        ? 'bg-amber-400 text-black font-bold shadow'
                        : 'bg-white/[0.04] text-slate-400 hover:text-white border border-white/[0.07]'
                    }`}
                  >
                    {pill.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Archival List */}
            <div className="space-y-3">
              {ARCHIVAL_DOCUMENTS.filter((doc) => {
                if (archiveFilter !== 'all' && doc.era !== archiveFilter) return false;
                if (archiveSearch) {
                  const q = archiveSearch.toLowerCase();
                  const match =
                    doc.title.toLowerCase().includes(q) ||
                    (doc.author && doc.author.toLowerCase().includes(q)) ||
                    (doc.significance && doc.significance.toLowerCase().includes(q)) ||
                    (doc.fileReference && doc.fileReference.toLowerCase().includes(q)) ||
                    (doc.settlements && doc.settlements.some((s) => s.toLowerCase().includes(q))) ||
                    (doc.states && doc.states.some((st) => st.toLowerCase().includes(q)));
                  if (!match) return false;
                }
                return true;
              }).map((doc) => (
                <div
                  key={doc.id}
                  className="card p-3 space-y-2 border-white/[0.08] hover:border-amber-500/30 transition-all group"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                        <span className="text-[9px] uppercase font-mono font-bold tracking-wider px-1.5 py-0.5 rounded bg-amber-400/10 text-amber-300 border border-amber-400/20">
                          {doc.era}
                        </span>
                        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-white/[0.05] text-slate-300 border border-white/[0.08]">
                          {doc.documentType}
                        </span>
                        <span className="text-[9px] font-mono text-slate-400">{doc.year}</span>
                      </div>
                      <h3 className="font-display text-sm font-bold text-white group-hover:text-amber-300 transition-colors leading-snug">
                        {doc.title}
                      </h3>
                      {doc.author && (
                        <p className="text-[11px] text-slate-400 mt-0.5 font-sans">
                          Recorded by: <strong className="text-slate-300">{doc.author}</strong>
                        </p>
                      )}
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-300/90 leading-relaxed font-sans">
                    {doc.significance}
                  </p>

                  {doc.keyFindings && doc.keyFindings.length > 0 && (
                    <div className="p-2 rounded bg-black/30 border border-white/5 space-y-1">
                      <span className="text-[9px] font-mono uppercase font-bold text-amber-400 block">Key Historical Findings:</span>
                      <ul className="text-[10px] text-slate-300 space-y-1 list-disc list-inside">
                        {doc.keyFindings.map((finding, idx) => (
                          <li key={idx} className="leading-snug">{finding}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {doc.territoriesCovered && (
                    <div className="flex flex-wrap gap-1 pt-1">
                      {doc.territoriesCovered.map((t) => (
                        <span
                          key={t}
                          className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-black/40 border border-white/10 text-slate-400"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between text-[10px] font-mono text-slate-400 flex-wrap gap-1">
                    <div className="flex items-center gap-1.5 truncate max-w-[210px]" title={doc.archiveReference}>
                      <Archive className="w-3 h-3 text-amber-400 shrink-0" />
                      <span className="truncate">{doc.archiveReference}</span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {doc.coordinates && (
                        <button
                          type="button"
                          onClick={() => {
                            onFlyTo(doc.coordinates!, 9);
                            onSelectFeature?.({
                              type: 'landmark',
                              name: doc.title,
                              parentName: doc.territoriesCovered?.join(', ') || doc.states.join(', '),
                              coordinates: doc.coordinates,
                              placeType: 'Archival Historical Record',
                              markerColor: '#d97706',
                              colorLabel: 'Colonial & Precolonial Intelligence',
                              colorExplanation: doc.significance,
                              whyMarked: `Archival record: ${doc.archiveReference} (${doc.year}). ${doc.documentType}.`,
                              historicalNotes: doc.keyFindings ? doc.keyFindings.join(' • ') : doc.significance,
                              nearestRiver: doc.coordinates ? calculateNearestWaterway(doc.coordinates[0], doc.coordinates[1]) : undefined,
                            });
                          }}
                          className="px-2 py-0.5 rounded bg-white/5 hover:bg-amber-500/20 text-slate-300 hover:text-amber-300 border border-white/10 transition-colors text-[10px]"
                        >
                          View Area
                        </button>
                      )}
                      {doc.digitalUrl && (
                        <a
                          href={doc.digitalUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2 py-0.5 rounded bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 text-[10px] font-semibold flex items-center gap-1 transition-colors"
                        >
                          <span>{doc.digitalUrl.includes('discovery.nationalarchives.gov.uk') ? 'UK Archives Record' : 'Read Full Text'}</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'key' && (
          <div className="space-y-5 rise">
            {/* Interactive Dot Filter Bar */}
            <section>
              <SectionTitle
                icon={Filter}
                action={
                  activeFilter !== 'all' ? (
                    <button
                      type="button"
                      onClick={() => onFilterChange?.('all')}
                      className="text-[10px] text-emerald-400 hover:underline"
                    >
                      Clear filter
                    </button>
                  ) : undefined
                }
              >
                Interactive Map Filter
              </SectionTitle>
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { id: 'all' as FilterDotType, label: 'All Markers', desc: 'Display all dots' },
                  { id: 'verified' as FilterDotType, label: 'Verified Only', desc: 'Isolate verified' },
                  { id: 'homeland' as FilterDotType, label: 'Homeland Only', desc: 'Highlight SE baseline' },
                  { id: 'reference' as FilterDotType, label: 'Reference Dots', desc: 'Neighbor states' },
                ].map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => onFilterChange?.(f.id)}
                    className={`p-2 rounded-xl text-left border transition-all ${
                      activeFilter === f.id
                        ? 'bg-emerald-500/20 border-emerald-500/50 text-white ring-1 ring-emerald-500/30'
                        : 'bg-white/[0.03] border-white/[0.07] text-slate-400 hover:text-white hover:bg-white/[0.06]'
                    }`}
                  >
                    <span className="text-[11px] font-bold block">{f.label}</span>
                    <span className="text-[9px] text-slate-500 block">{f.desc}</span>
                  </button>
                ))}
              </div>
            </section>

            <section>
              <SectionTitle icon={MapIcon}>What the colours mean</SectionTitle>
              <div className="space-y-2">
                <div className="card p-3 flex gap-3">
                  <span className="w-8 h-8 rounded-lg bg-emerald-600 border border-emerald-300/60 shrink-0" />
                  <div>
                    <p className="text-[13px] font-semibold text-white">Igbo homeland & identified areas</p>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      The five Southeast states (100% baseline) plus any LGA elsewhere with documented Igbo-identifying communities.
                    </p>
                  </div>
                </div>
                <div className="card p-3 flex gap-3">
                  <span className="w-8 h-8 rounded-lg bg-[#162032] border border-slate-600 shrink-0" />
                  <div>
                    <p className="text-[13px] font-semibold text-white">Reference geography</p>
                    <p className="text-[11px] text-slate-400 leading-relaxed">Other states and LGAs, shown for context.</p>
                  </div>
                </div>
              </div>
            </section>

            <section>
              <SectionTitle icon={MapPin}>Settlements & Markers</SectionTitle>
              <div className="card divide-y divide-white/[0.06]">
                <div className="flex items-center gap-3 px-3 py-2.5">
                  <span className="w-3.5 h-3.5 rounded-full ring-2 ring-[#0b1120] shrink-0 bg-emerald-500" style={{ boxShadow: '0 0 10px rgba(16,185,129,0.7)' }} />
                  <span className="text-[12px] font-semibold text-white w-28">Igbo settlement</span>
                  <span className="text-[11px] text-slate-400">Homeland & identified Igbo areas (Emerald green)</span>
                </div>
                <div className="flex items-center gap-3 px-3 py-2.5">
                  <span className="w-3.5 h-3.5 rounded-full ring-2 ring-[#0b1120] shrink-0 bg-red-500" style={{ boxShadow: '0 0 10px rgba(239,68,68,0.7)' }} />
                  <span className="text-[12px] font-semibold text-white w-28">Non-Igbo settlement</span>
                  <span className="text-[11px] text-slate-400">Regional reference settlements in neighbor states (Crimson red)</span>
                </div>
                <div className="flex items-center gap-3 px-3 py-2.5">
                  <span className="w-3.5 h-3.5 rounded-full ring-2 ring-[#0b1120] shrink-0 bg-amber-400" style={{ boxShadow: '0 0 10px rgba(251,191,36,0.7)' }} />
                  <span className="text-[12px] font-semibold text-white w-28">Cultural landmark</span>
                  <span className="text-[11px] text-slate-400">Traditional markets (Eke, Orie, Afor, Nkwo), palaces & halls (Amber)</span>
                </div>
                <div className="flex items-center gap-3 px-3 py-2.5">
                  <span className="w-3.5 h-3.5 rounded-full ring-2 ring-[#0b1120] shrink-0 bg-amber-500/80" />
                  <span className="text-[12px] font-semibold text-white w-28">Pending review</span>
                  <span className="text-[11px] text-slate-400">Newly added community awaiting confirmation (Amber)</span>
                </div>
              </div>
            </section>

            <section>
              <SectionTitle icon={Layers}>Layers & Overlays</SectionTitle>
              <div className="card divide-y divide-white/[0.06]">
                {[
                  { label: 'State boundaries', sub: '37 states incl. FCT', on: props.showStates, set: props.onToggleStates },
                  { label: 'LGA boundaries', sub: '774 local government areas', on: props.showLgas, set: props.onToggleLgas },
                  { label: 'Waterways & Rivers', sub: 'Niger, Anambra, Imo rivers', on: props.showWaterways, set: props.onToggleWaterways },
                  { label: 'Cultural landmarks', sub: 'Palaces, town halls, markets', on: props.showLandmarks, set: props.onToggleLandmarks },
                  { label: 'Community markers', sub: `${communities.length} documented`, on: props.showCommunities, set: props.onToggleCommunities },
                  { label: 'Settlement Density Heatmap', sub: 'Intensity derived from verified settlements', on: showDensity, set: onToggleDensity ?? (() => {}) },
                  { label: 'Dialect Continuum Zones', sub: 'Waawa, Central, Anioma, Southern zones', on: props.showDialects ?? false, set: props.onToggleDialects ?? (() => {}) },
                  { label: 'Ancestral Migration Arcs', sub: 'Nri, Aro, Ezechima diaspora routes', on: props.showMigrationArcs ?? false, set: props.onToggleMigrationArcs ?? (() => {}) },
                  { label: 'Historical Survey Overlay', sub: 'Archival regional administrative survey', on: props.showHistoricalOverlay ?? false, set: props.onToggleHistoricalOverlay ?? (() => {}) },
                ].map((l) => (
                  <button
                    key={l.label}
                    type="button"
                    onClick={() => l.set(!l.on)}
                    className="w-full flex items-center justify-between px-3 py-3 text-left hover:bg-white/[0.02]"
                    role="switch"
                    aria-checked={l.on}
                  >
                    <span>
                      <span className="block text-[13px] font-semibold text-white">{l.label}</span>
                      <span className="block text-[11px] text-slate-500">{l.sub}</span>
                    </span>
                    <span className="switch" data-on={l.on} />
                  </button>
                ))}
              </div>

              {/* Historical Opacity Slider */}
              {props.showHistoricalOverlay && (
                <div className="p-3 mt-2 rounded-xl bg-white/[0.03] border border-white/[0.08] space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-white font-medium">Historical Overlay Transparency</span>
                    <span className="text-emerald-400 font-mono text-[11px] font-bold">
                      {Math.round((props.historicalOpacity ?? 0.45) * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.1"
                    max="1"
                    step="0.05"
                    value={props.historicalOpacity ?? 0.45}
                    onChange={(e) => props.onHistoricalOpacityChange?.(parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-400"
                  />
                </div>
              )}

              <p className="flex items-start gap-1.5 text-[11px] text-slate-500 mt-2.5 leading-relaxed">
                <Info className="w-3.5 h-3.5 shrink-0 mt-px" />
                Administrative lines are reference only. They are not ethnic boundaries.
              </p>
            </section>
          </div>
        )}

        {tab === 'about' && (
          <div className="space-y-5 rise text-[13px] text-slate-300 leading-relaxed">
            <section>
              <h2 className="font-display text-xl font-bold text-white mb-2">About the atlas</h2>
              <p>
                The Igbo Community Atlas is an open, community-driven record of where Igbo communities are. It pairs fixed administrative
                geography (states and LGAs) with a living layer of settlements contributed by residents, historians and diaspora members.
              </p>
            </section>

            <section className="space-y-2">
              <h3 className="font-display text-sm font-bold text-white">Keyboard Shortcuts</h3>
              <div className="grid grid-cols-2 gap-2 text-xs font-mono text-slate-400">
                <div className="p-2 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                  <kbd className="text-white bg-white/10 px-1 py-0.5 rounded">⌘K</kbd> or <kbd className="text-white bg-white/10 px-1 py-0.5 rounded">/</kbd>
                  <p className="text-[10px] mt-1 font-sans">Focus search</p>
                </div>
                <div className="p-2 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                  <kbd className="text-white bg-white/10 px-1 py-0.5 rounded">[</kbd> or <kbd className="text-white bg-white/10 px-1 py-0.5 rounded">]</kbd>
                  <p className="text-[10px] mt-1 font-sans">Toggle sidebar</p>
                </div>
                <div className="p-2 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                  <kbd className="text-white bg-white/10 px-1 py-0.5 rounded">Esc</kbd>
                  <p className="text-[10px] mt-1 font-sans">Clear selection</p>
                </div>
                <div className="p-2 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                  <kbd className="text-white bg-white/10 px-1 py-0.5 rounded">A</kbd>
                  <p className="text-[10px] mt-1 font-sans">Add community pin</p>
                </div>
              </div>
            </section>
          </div>
        )}
      </div>

      {showDelistModal && selectedFeature?.code && (
        <DelistingModal
          community={{
            id: selectedFeature.code,
            name: selectedFeature.name,
            lgaName: selectedFeature.parentName,
          }}
          onClose={() => setShowDelistModal(false)}
          onSuccess={() => {
            onCommunityUpdated?.();
            if (selectedFeature.code) {
              fetch(`/api/governance/inquiries?communityId=${encodeURIComponent(selectedFeature.code)}&status=OPEN`)
                .then((r) => (r.ok ? r.json() : []))
                .then((list) => setActiveInquiry(list[0] || null))
                .catch(() => {});
            }
          }}
        />
      )}

      {showReinstateModal && selectedFeature?.code && (
        <ReinstatementModal
          community={{
            id: selectedFeature.code,
            name: selectedFeature.name,
            lgaName: selectedFeature.parentName,
          }}
          onClose={() => setShowReinstateModal(false)}
          onSuccess={() => {
            onCommunityUpdated?.();
            if (selectedFeature.code) {
              fetch(`/api/governance/inquiries?communityId=${encodeURIComponent(selectedFeature.code)}&status=OPEN`)
                .then((r) => (r.ok ? r.json() : []))
                .then((list) => setActiveInquiry(list[0] || null))
                .catch(() => {});
            }
          }}
        />
      )}
    </aside>
  );
}
