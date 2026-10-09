'use client';

import React, { useState, useEffect } from 'react';
import { X, MapPin, ShieldAlert, CheckCircle, AlertTriangle } from 'lucide-react';
import { CommunityType, IdentityStatus, EvidenceSourceType } from '@/lib/types';
import { getOrCreateDeviceId } from '@/lib/device';

interface AddCommunityModalProps {
  coordinates: { lon: number; lat: number } | null;
  initialName?: string;
  initialType?: CommunityType;
  onClose: () => void;
  onSuccess: () => void;
}

export function AddCommunityModal({
  coordinates,
  initialName = '',
  initialType = 'community',
  onClose,
  onSuccess,
}: AddCommunityModalProps) {
  const [name, setName] = useState(initialName);
  const [type, setType] = useState<CommunityType>(initialType);
  const [identityStatus, setIdentityStatus] = useState<IdentityStatus>('igbo');

  useEffect(() => {
    if (initialName) setName(initialName);
  }, [initialName]);

  useEffect(() => {
    if (initialType) setType(initialType);
  }, [initialType]);
  const [description, setDescription] = useState('');
  const [languageStatus, setLanguageStatus] = useState('');
  const [historicalStatus, setHistoricalStatus] = useState('');
  const [evidenceType, setEvidenceType] = useState<EvidenceSourceType>('community_submission');
  const [evidenceDesc, setEvidenceDesc] = useState('');
  const [citationUrl, setCitationUrl] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!coordinates) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError('Community name is required.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const deviceId = getOrCreateDeviceId();
      const res = await fetch('/api/communities', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-device-id': deviceId,
        },
        body: JSON.stringify({
          name: name.trim(),
          type,
          identityStatus,
          deviceId,
          description: description.trim() || undefined,
          languageStatus: languageStatus.trim() || undefined,
          historicalStatus: historicalStatus.trim() || undefined,
          latitude: coordinates?.lat,
          longitude: coordinates?.lon,
          evidence: evidenceDesc.trim()
            ? {
                sourceType: evidenceType,
                description: evidenceDesc.trim(),
                citationOrUrl: citationUrl.trim() || undefined,
              }
            : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit community');
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-md animate-in fade-in">
      <div className="w-full sm:max-w-lg glass-panel rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 shadow-2xl max-h-[92vh] sm:max-h-[88vh] overflow-y-auto space-y-4 border-emerald-500/30">
        <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
              <MapPin className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white font-['Outfit']">Document Community</h2>
              <p className="text-[10px] text-slate-400">Contribute cultural and geographic settlement knowledge</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Location Banner */}
        <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-between text-xs font-mono">
          <span className="text-slate-400">Target Coordinates:</span>
          <span className="text-emerald-400 font-bold">
            {coordinates.lat.toFixed(5)}° N, {coordinates.lon.toFixed(5)}° E
          </span>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-red-950/60 border border-red-500/40 text-red-300 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              Community / Village Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Umuahia, Nnewi, Owerri, Asaba"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-black/40 border border-white/[0.1] rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/40 transition-all font-medium"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Settlement Type *
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as CommunityType)}
                className="w-full px-3 py-2.5 bg-black/40 border border-white/[0.1] rounded-xl text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="village">Village</option>
                <option value="town">Town</option>
                <option value="city">City</option>
                <option value="settlement">Settlement</option>
                <option value="community">Community</option>
                <option value="historical_settlement">Historical Settlement</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Identity Classification *
              </label>
              <select
                value={identityStatus}
                onChange={(e) => setIdentityStatus(e.target.value as IdentityStatus)}
                className="w-full px-3 py-2.5 bg-black/40 border border-white/[0.1] rounded-xl text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="igbo">Igbo</option>
                <option value="mixed">Mixed</option>
                <option value="historically_igbo">Historically Igbo</option>
                <option value="igbo_associated">Igbo Associated</option>
                <option value="uncertain">Uncertain</option>
                <option value="disputed">Disputed</option>
                <option value="not_igbo">Not Igbo</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              Description & Settlement Context
            </label>
            <textarea
              rows={2}
              placeholder="Brief historical overview, quarters/kindreds, or traditional institutions..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3.5 py-2 bg-black/40 border border-white/[0.1] rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-all"
            />
          </div>

          <div className="p-3.5 bg-black/30 border border-white/[0.06] rounded-2xl space-y-2.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-['Outfit']">
              Supporting Evidence (Recommended)
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <select
                value={evidenceType}
                onChange={(e) => setEvidenceType(e.target.value as EvidenceSourceType)}
                className="w-full px-2.5 py-2 bg-black/40 border border-white/[0.08] rounded-xl text-slate-200"
              >
                <option value="community_submission">Community Knowledge</option>
                <option value="oral_history">Oral History / Elder Account</option>
                <option value="historical_source">Historical Document / Treaty</option>
                <option value="academic_source">Academic / Linguistic Citation</option>
              </select>
              <input
                type="text"
                placeholder="Citation / URL / Reference"
                value={citationUrl}
                onChange={(e) => setCitationUrl(e.target.value)}
                className="w-full px-2.5 py-2 bg-black/40 border border-white/[0.08] rounded-xl text-slate-200 placeholder-slate-500"
              />
            </div>
            <input
              type="text"
              placeholder="Brief summary of reference evidence..."
              value={evidenceDesc}
              onChange={(e) => setEvidenceDesc(e.target.value)}
              className="w-full px-2.5 py-2 bg-black/40 border border-white/[0.08] rounded-xl text-slate-200 placeholder-slate-500"
            />
          </div>

          <p className="text-[10px] text-slate-400 leading-normal">
            Server PostGIS spatial queries automatically derive the administrative State and LGA. Status begins as <strong className="text-amber-400 font-medium">Pending</strong> for community review.
          </p>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-white/[0.08]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.08] text-slate-300 font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-1.5 disabled:opacity-50"
            >
              {loading ? 'Deriving...' : 'Submit Settlement'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
