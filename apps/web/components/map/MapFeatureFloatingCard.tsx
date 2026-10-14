'use client';

import React from 'react';
import { X, MapPin, Sparkles, ChevronRight, Waves, MessageSquarePlus, Navigation, Play, Film } from 'lucide-react';
import type { SelectedFeature } from './MapContainer';
import { AudioPronunciationPlayer } from '@/components/cultural/AudioPronunciationPlayer';

interface MapFeatureFloatingCardProps {
  feature: SelectedFeature;
  onClose: () => void;
  onDocumentFeature: (feature: SelectedFeature) => void;
  onPinNearby: (feature: SelectedFeature) => void;
  onViewLore: () => void;
  onAddVoice?: () => void;
}

export function MapFeatureFloatingCard({
  feature,
  onClose,
  onDocumentFeature,
  onPinNearby,
  onViewLore,
  onAddVoice,
}: MapFeatureFloatingCardProps) {
  const isCommunity = feature.type === 'community';
  const isReference = !isCommunity;

  // Determine badge styling
  const badgeCls = isCommunity
    ? feature.verificationStatus === 'challenged'
      ? 'text-red-400 bg-red-500/10 border-red-500/30'
      : feature.verificationStatus === 'pending'
      ? 'text-amber-400 bg-amber-500/10 border-amber-500/30'
      : 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30'
    : feature.type === 'lga'
    ? 'text-blue-400 bg-blue-500/10 border-blue-500/30'
    : feature.type === 'landmark' || (feature.placeType && feature.placeType.toLowerCase().includes('market'))
    ? 'text-amber-400 bg-amber-500/10 border-amber-500/30'
    : 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30';

  const typeLabel = isCommunity
    ? feature.verificationStatus === 'challenged'
      ? 'Disputed Community'
      : feature.verificationStatus === 'pending'
      ? 'Pending Verification'
      : 'Verified Community'
    : feature.placeType || (feature.type === 'lga' ? 'Local Government Area' : feature.type ? feature.type.charAt(0).toUpperCase() + feature.type.slice(1) : 'Settlement');

  return (
    <div
      role="region"
      aria-label={`Details for ${feature.name}`}
      className="fixed bottom-[65px] lg:bottom-6 left-3 right-3 sm:left-auto sm:right-4 sm:w-[400px] z-30 p-4 rounded-2xl bg-[#090e1c]/95 border border-white/15 shadow-2xl backdrop-blur-2xl animate-in slide-in-from-bottom-4 duration-200 select-none text-white"
    >
      {/* Top Header Row */}
      <div className="flex items-start justify-between gap-2.5">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className="w-2.5 h-2.5 rounded-full shrink-0 ring-2 ring-white/20 animate-pulse"
            style={{ backgroundColor: feature.markerColor || (isCommunity ? '#10b981' : '#38bdf8') }}
          />
          <span className={`text-[10px] font-mono uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full border ${badgeCls} truncate`}>
            {typeLabel}
          </span>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 active:scale-95 transition-all"
          title="Dismiss location card"
          aria-label="Dismiss location card"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Title & Audio Pronunciation */}
      <div className="mt-2.5 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <h3 className="font-display text-base sm:text-lg font-bold text-white tracking-tight truncate leading-tight">
            {feature.name}
          </h3>
          {feature.parentName && (
            <p className="text-[11px] text-slate-400 font-medium truncate mt-0.5">
              {feature.parentName}
            </p>
          )}
        </div>
        <div className="shrink-0">
          <AudioPronunciationPlayer name={feature.name} size="sm" />
        </div>
      </div>

      {/* Cultural Context Badges */}
      <div className="mt-2.5 flex flex-wrap items-center gap-1.5 text-[10px] text-slate-300 font-mono">
        {feature.nearestRiver && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-500/10 border border-blue-500/20 text-blue-300">
            <Waves className="w-3 h-3 text-blue-400" />
            <span>~{feature.nearestRiver.distanceKm}km to {feature.nearestRiver.name}</span>
          </span>
        )}

        {(feature.dialectCluster || feature.dialect) && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-300">
            <span>🗣 {feature.dialect || feature.dialectCluster?.name}</span>
          </span>
        )}
      </div>

      {/* Dialect Greeting or Lore Quote */}
      {(feature.dialectGreeting || feature.dialectCluster?.sampleGreeting) && (
        <div className="mt-2 px-2.5 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.06] text-[11px] text-emerald-300 italic">
          &ldquo;{feature.dialectGreeting || feature.dialectCluster?.sampleGreeting}&rdquo;
        </div>
      )}

      {/* Attached Media Photos & Videos Preview */}
      {feature.media && feature.media.length > 0 && (
        <div className="mt-2.5 flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
          {feature.media.slice(0, 4).map((m: any, idx: number) => (
            <div
              key={m.id || idx}
              onClick={onViewLore}
              className="relative w-12 h-10 rounded-lg overflow-hidden bg-black/60 border border-white/10 shrink-0 cursor-pointer hover:border-emerald-400 transition-colors"
              title={m.caption || 'Attached visual record'}
            >
              {m.thumbnailUrl || m.url ? (
                <img
                  src={m.thumbnailUrl || m.url}
                  alt="Thumb"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src =
                      'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="48" height="40" viewBox="0 0 48 40"><rect fill="%23111827" width="48" height="40"/></svg>';
                  }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-slate-900 text-cyan-400">
                  <Film className="w-3.5 h-3.5" />
                </div>
              )}
              {m.type === 'video' && (
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                  <Play className="w-3 h-3 text-cyan-300 fill-cyan-300" />
                </div>
              )}
            </div>
          ))}
          {feature.media.length > 4 && (
            <button
              type="button"
              onClick={onViewLore}
              className="h-10 px-2 rounded-lg bg-white/5 border border-white/10 text-[10px] text-slate-300 shrink-0 font-mono hover:bg-white/10"
            >
              +{feature.media.length - 4} more
            </button>
          )}
        </div>
      )}

      {/* Action Buttons Row */}
      <div className="mt-3.5 pt-3 border-t border-white/10 flex flex-col gap-2">
        {isReference ? (
          <>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => onDocumentFeature(feature)}
                className="w-full py-2 px-2.5 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 hover:brightness-110 active:scale-95 text-[#04120c] font-bold text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-500/20 transition-all"
                title={`Document ${feature.name} directly into the atlas`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span className="truncate">Document {feature.name}</span>
              </button>

              <button
                type="button"
                onClick={() => onPinNearby(feature)}
                className="w-full py-2 px-2.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.14] active:scale-95 border border-white/15 text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition-all"
                title={`Drop a pin for your village or kindred near ${feature.name}`}
              >
                <MapPin className="w-3.5 h-3.5 text-cyan-400" />
                <span className="truncate">Pin Village Nearby</span>
              </button>
            </div>

            <button
              type="button"
              onClick={onViewLore}
              className="w-full py-1 text-[11px] text-slate-400 hover:text-white flex items-center justify-center gap-1 transition-colors"
            >
              <span>Explore full historical context</span>
              <ChevronRight className="w-3 h-3" />
            </button>
          </>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={onViewLore}
                className="w-full py-2 px-2.5 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 hover:brightness-110 active:scale-95 text-[#04120c] font-bold text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-500/20 transition-all"
                title="View community lineage and historical evidence"
              >
                <ChevronRight className="w-3.5 h-3.5" />
                <span className="truncate">Community Dossier</span>
              </button>

              {onAddVoice && (
                <button
                  type="button"
                  onClick={onAddVoice}
                  className="w-full py-2 px-2.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.14] active:scale-95 border border-white/15 text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition-all"
                  title="Submit an oral testimony or dialect note"
                >
                  <MessageSquarePlus className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="truncate">Add Oral Note</span>
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={() => onPinNearby(feature)}
              className="w-full py-1.5 rounded-lg bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.06] text-[11px] text-slate-300 hover:text-white flex items-center justify-center gap-1.5 transition-all"
              title="Pin an unmapped kindred, umunna, or village near this community"
            >
              <Navigation className="w-3 h-3 text-cyan-400" />
              <span>+ Add Kindred / Village in {feature.name}</span>
            </button>
          </>
        )}
      </div>
    </div>
  );
}
