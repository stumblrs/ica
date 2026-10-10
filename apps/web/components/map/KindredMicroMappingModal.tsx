'use client';

import React, { useState } from 'react';
import {
  X,
  MapPin,
  Landmark,
  Compass,
  TreePine,
  Droplets,
  Store,
  Shield,
  Sparkles,
  CheckCircle2,
  HardDrive,
  Globe,
  Loader2,
} from 'lucide-react';
import { saveKindredLandmarkOffline, type KindredLandmarkItem } from '@/lib/offlineStorage';

interface KindredMicroMappingModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialCoords?: { lon: number; lat: number };
  initialCommunity?: { id: string; name: string };
  availableCommunities?: Array<{ id: string; name: string }>;
  onLandmarkCreated?: (landmark: KindredLandmarkItem) => void;
}

const CATEGORIES = [
  {
    id: 'village_square',
    label: 'Village Square (Ilo / Obi)',
    igboTerm: 'Ilo / Obi',
    icon: Landmark,
    description: 'Ancestral civic square, title-taking venue, or compound gathering hearth.',
    color: 'emerald',
  },
  {
    id: 'kindred_hall',
    label: 'Kindred Council Hall (Ụlọ Ụmụnna)',
    igboTerm: 'Ụlọ Ụmụnna',
    icon: Shield,
    description: 'Lineage meeting hall for kindred governance, dispute resolution, and covenants.',
    color: 'amber',
  },
  {
    id: 'sacred_grove',
    label: 'Sacred Grove (Ọhịa Mmụọ / Ọsọ)',
    igboTerm: 'Ọhịa Mmụọ',
    icon: TreePine,
    description: 'Protected ancestral forest sanctuary, sacred botanical reserve, or peace boundary.',
    color: 'teal',
  },
  {
    id: 'heritage_spring',
    label: 'Heritage Spring / Stream (Isi Mmiri / Iyi)',
    igboTerm: 'Isi Mmiri / Iyi',
    icon: Droplets,
    description: 'Sacred clean water fountain, communal springhead, or ritual baptismal stream.',
    color: 'sky',
  },
  {
    id: 'market_post',
    label: 'Kindred Market / Hearth (Afia Ụmụnna)',
    igboTerm: 'Afia Ụmụnna',
    icon: Store,
    description: 'Local daily gathering point or village four-day market node.',
    color: 'purple',
  },
  {
    id: 'monument',
    label: 'Ancestral Marker / Monument (Ikwu na Ibe)',
    igboTerm: 'Ikwu na Ibe',
    icon: Sparkles,
    description: 'Peace covenant stone, ancient boundary pillar, or historical memorial tree.',
    color: 'rose',
  },
] as const;

export function KindredMicroMappingModal({
  isOpen,
  onClose,
  initialCoords,
  initialCommunity,
  availableCommunities = [],
  onLandmarkCreated,
}: KindredMicroMappingModalProps) {
  const [name, setName] = useState('');
  const [umunnaName, setUmunnaName] = useState('');
  const [category, setCategory] = useState<typeof CATEGORIES[number]['id']>('village_square');
  const [selectedCommunityId, setSelectedCommunityId] = useState(initialCommunity?.id || '');
  const [description, setDescription] = useState('');
  const [contributorName, setContributorName] = useState('');
  const [lon, setLon] = useState<string>(initialCoords ? initialCoords.lon.toFixed(6) : '');
  const [lat, setLat] = useState<string>(initialCoords ? initialCoords.lat.toFixed(6) : '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isLocating, setIsLocating] = useState(false);

  // Update coords if initialCoords changes
  React.useEffect(() => {
    if (initialCoords) {
      setLon(initialCoords.lon.toFixed(6));
      setLat(initialCoords.lat.toFixed(6));
    }
  }, [initialCoords]);

  React.useEffect(() => {
    if (initialCommunity?.id) {
      setSelectedCommunityId(initialCommunity.id);
    }
  }, [initialCommunity]);

  if (!isOpen) return null;

  const currentCommunity =
    initialCommunity ||
    availableCommunities.find((c) => c.id === selectedCommunityId) || {
      id: selectedCommunityId || 'general',
      name: 'Community Hearth',
    };

  const handleGetGPS = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocating(false);
        setLon(pos.coords.longitude.toFixed(6));
        setLat(pos.coords.latitude.toFixed(6));
      },
      (err) => {
        setIsLocating(false);
        alert('Could not retrieve current location: ' + err.message);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const lonNum = parseFloat(lon);
    const latNum = parseFloat(lat);

    if (!name.trim()) {
      alert('Please provide a landmark name.');
      return;
    }
    if (isNaN(lonNum) || isNaN(latNum)) {
      alert('Please enter valid geographic coordinates.');
      return;
    }

    setIsSubmitting(true);

    const landmarkItem: KindredLandmarkItem = {
      id: `kl-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      communityId: currentCommunity.id,
      communityName: currentCommunity.name,
      name: name.trim(),
      umunnaName: umunnaName.trim() || undefined,
      category,
      description: description.trim() || undefined,
      latitude: latNum,
      longitude: lonNum,
      createdAt: new Date().toISOString(),
      isLocalContribution: true,
    };

    // 1. Always save into local IndexedDB for instant offline availability
    await saveKindredLandmarkOffline(landmarkItem);

    // 2. If online and has valid community ID, attempt API sync
    let syncedOnline = false;
    if (navigator.onLine && currentCommunity.id && currentCommunity.id !== 'general') {
      try {
        const res = await fetch(`/api/communities/${currentCommunity.id}/landmarks`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: landmarkItem.name,
            umunnaName: landmarkItem.umunnaName,
            category: landmarkItem.category,
            description: landmarkItem.description,
            latitude: landmarkItem.latitude,
            longitude: landmarkItem.longitude,
            contributorName: contributorName.trim() || undefined,
          }),
        });
        if (res.ok) syncedOnline = true;
      } catch {
        syncedOnline = false;
      }
    }

    setIsSubmitting(false);
    setSuccessMsg(
      syncedOnline
        ? 'Landmark verified & recorded into community atlas!'
        : 'Landmark preserved in offline field storage. Will sync when online.'
    );

    onLandmarkCreated?.(landmarkItem);

    setTimeout(() => {
      onClose();
      // Reset form
      setName('');
      setUmunnaName('');
      setDescription('');
      setSuccessMsg(null);
    }, 1800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-lg bg-[#0a0f1d] border border-white/10 rounded-2xl shadow-2xl p-5 sm:p-6 text-white my-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/5 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 p-[1px] shadow-lg shadow-emerald-500/20 flex-shrink-0">
            <div className="h-full w-full rounded-[11px] bg-[#0a0f1d] flex items-center justify-center text-emerald-400">
              <Landmark className="w-5 h-5" />
            </div>
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold tracking-tight text-white flex items-center gap-2">
              <span>Micro-Map Kindred (Ụmụnna)</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Offline Capable
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Map ancestral squares (Obi/Ilo), kindred halls, sacred groves & springs.
            </p>
          </div>
        </div>

        {successMsg ? (
          <div className="py-8 flex flex-col items-center justify-center text-center space-y-3">
            <CheckCircle2 className="w-12 h-12 text-emerald-400 animate-bounce" />
            <h3 className="text-lg font-bold text-white">Landmark Recorded</h3>
            <p className="text-sm text-slate-300 max-w-sm">{successMsg}</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Community selector if not locked */}
            {!initialCommunity && availableCommunities.length > 0 && (
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Parent Community / Town
                </label>
                <select
                  value={selectedCommunityId}
                  onChange={(e) => setSelectedCommunityId(e.target.value)}
                  className="w-full bg-[#131b2e] border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="">Select Community...</option>
                  {availableCommunities.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {initialCommunity && (
              <div className="px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-between">
                <span className="text-xs text-slate-400">Community:</span>
                <span className="text-xs font-semibold text-emerald-400">{initialCommunity.name}</span>
              </div>
            )}

            {/* Landmark Category Tiles */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Landmark Category
              </label>
              <div className="grid grid-cols-2 gap-2 max-h-44 overflow-y-auto pr-1">
                {CATEGORIES.map((cat) => {
                  const Icon = cat.icon;
                  const isSelected = category === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setCategory(cat.id)}
                      className={`p-2.5 rounded-xl border text-left flex items-start gap-2.5 transition-all ${
                        isSelected
                          ? 'bg-emerald-500/15 border-emerald-500/50 shadow-sm'
                          : 'bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.06]'
                      }`}
                    >
                      <Icon
                        className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
                          isSelected ? 'text-emerald-400' : 'text-slate-400'
                        }`}
                      />
                      <div className="min-w-0">
                        <div className={`text-xs font-semibold ${isSelected ? 'text-emerald-300' : 'text-slate-200'}`}>
                          {cat.igboTerm}
                        </div>
                        <div className="text-[10px] text-slate-400 truncate">{cat.label}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Landmark Name & Kindred */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Landmark Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Obi Umueze, Ilo Okpuno"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-[#131b2e] border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 placeholder-slate-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Kindred / Quarter (Ụmụnna / Ogbe)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Ụmụ Dike, Umuanuka"
                  value={umunnaName}
                  onChange={(e) => setUmunnaName(e.target.value)}
                  className="w-full bg-[#131b2e] border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 placeholder-slate-500"
                />
              </div>
            </div>

            {/* Coordinates */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-medium text-slate-300">
                  Coordinates (Longitude & Latitude) *
                </label>
                <button
                  type="button"
                  onClick={handleGetGPS}
                  disabled={isLocating}
                  className="text-[11px] text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-mono"
                >
                  {isLocating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Compass className="w-3 h-3" />}
                  <span>{isLocating ? 'Locating...' : 'Use My GPS'}</span>
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  step="any"
                  required
                  placeholder="Longitude (e.g. 7.123)"
                  value={lon}
                  onChange={(e) => setLon(e.target.value)}
                  className="bg-[#131b2e] border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
                <input
                  type="number"
                  step="any"
                  required
                  placeholder="Latitude (e.g. 6.123)"
                  value={lat}
                  onChange={(e) => setLat(e.target.value)}
                  className="bg-[#131b2e] border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            {/* Description / Oral History */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Oral History / Cultural Significance
              </label>
              <textarea
                rows={2}
                placeholder="Traditional custodian lineage, historic festivals, or covenant significance..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-[#131b2e] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 placeholder-slate-500 resize-none"
              />
            </div>

            {/* Contributor Name */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Contributor / Kindred Elder Name (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Mazi C. Okeke"
                value={contributorName}
                onChange={(e) => setContributorName(e.target.value)}
                className="w-full bg-[#131b2e] border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500 placeholder-slate-500"
              />
            </div>

            {/* Submit Action */}
            <div className="pt-2 flex items-center justify-between gap-3 border-t border-white/10">
              <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                <HardDrive className="w-3.5 h-3.5 text-emerald-400" />
                <span>IndexedDB Auto-Cache</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3.5 py-2 text-xs font-medium text-slate-300 hover:text-white rounded-xl hover:bg-white/5 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-black font-semibold text-xs rounded-xl shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving Landmark...</span>
                    </>
                  ) : (
                    <>
                      <MapPin className="w-3.5 h-3.5" />
                      <span>Record Landmark</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
