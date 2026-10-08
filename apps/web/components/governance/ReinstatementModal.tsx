'use client';

import React, { useState } from 'react';
import { X, RotateCcw, ShieldCheck, HeartHandshake, Send, CheckCircle2, AlertTriangle, Volume2 } from 'lucide-react';
import { getOrCreateDeviceId, recordDevicePetition } from '@/lib/device';

interface ReinstatementModalProps {
  community: {
    id: string;
    name: string;
    lgaName?: string;
    stateName?: string;
  };
  onClose: () => void;
  onSuccess: () => void;
}

export function ReinstatementModal({ community, onClose, onSuccess }: ReinstatementModalProps) {
  const [clanLineage, setClanLineage] = useState('');
  const [testimony, setTestimony] = useState('');
  const [dialectSample, setDialectSample] = useState('');
  const [citations, setCitations] = useState('');
  const [evidenceUrl, setEvidenceUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clanLineage.trim() || !testimony.trim()) {
      setError('Please provide your ancestral clan/lineage and community context.');
      return;
    }

    setSubmitting(true);
    setError(null);

    const deviceId = getOrCreateDeviceId();

    try {
      const res = await fetch('/api/governance/inquiries', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-device-id': deviceId,
        },
        body: JSON.stringify({
          communityId: community.id,
          communityName: community.name,
          lgaName: community.lgaName,
          stateName: community.stateName,
          type: 'REINSTATE',
          reason: testimony.trim(),
          clanLineage: clanLineage.trim(),
          citations: citations.trim() || dialectSample.trim() ? `Dialect Sample: ${dialectSample}. ${citations}` : citations,
          evidenceUrls: evidenceUrl.trim() ? [evidenceUrl.trim()] : [],
          quorumThreshold: 15,
          durationDays: 7,
          deviceId,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to submit reinstatement petition');
      }

      recordDevicePetition(community.id);
      setSuccess(true);
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-[#0a0f1d] border border-emerald-500/30 rounded-2xl shadow-2xl shadow-emerald-950/40 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 px-5 border-b border-white/[0.08] bg-emerald-500/[0.04]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                Petition Reinstatement
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-400/10 text-emerald-300 border border-emerald-400/20">
                  Reclaim Heritage
                </span>
              </h2>
              <p className="text-[11px] text-slate-400">
                Restore <span className="text-emerald-200 font-semibold">{community.name}</span> to the Active Igbo Atlas
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        {success ? (
          <div className="p-8 flex flex-col items-center justify-center text-center gap-3">
            <div className="h-12 w-12 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white">Reinstatement Petition Active!</h3>
            <p className="text-xs text-slate-300 max-w-xs">
              {community.name} is now open for community restoration review. When quorum endorses the petition, it will automatically return to active core status!
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-5 flex-1 overflow-y-auto space-y-4">
            {error && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
                <span>{error}</span>
              </div>
            )}

            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-200/90 text-xs leading-relaxed flex items-start gap-2.5">
              <HeartHandshake className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
              <div>
                <span className="font-semibold text-emerald-300">Indigenous Knowledge Rebuttal: </span>
                Delisted settlements are never destroyed. As a native resident, descendant, or historian, you can bring forward ancestral facts, clan kindreds, and oral testimony to reclaim your home on the atlas.
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Ancestral Clan / Kindred / Sub-Group Lineage <span className="text-emerald-400">*</span>
              </label>
              <input
                type="text"
                required
                value={clanLineage}
                onChange={(e) => setClanLineage(e.target.value)}
                placeholder="e.g. Ezza-Benue Clan (Umuezeoka kindred), Izzi settlement enclave, Ikwerre/Rebisi"
                className="w-full px-3 py-2 rounded-xl bg-[#070b16] border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Context & Indigenous Settlement Testimony <span className="text-emerald-400">*</span>
              </label>
              <textarea
                required
                value={testimony}
                onChange={(e) => setTestimony(e.target.value)}
                rows={3}
                placeholder="Explain the indigenous origins, village square names, kindreds, or pre-colonial heritage of this community..."
                className="w-full px-3 py-2 rounded-xl bg-[#070b16] border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50 resize-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
                <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Indigenous Dialect Greeting / Phrases</span>
              </label>
              <input
                type="text"
                value={dialectSample}
                onChange={(e) => setDialectSample(e.target.value)}
                placeholder='e.g. "Kedu ka i mere?", "Unu abiawa", local market day name (Eke/Orie/Afor/Nkwo)'
                className="w-full px-3 py-2 rounded-xl bg-[#070b16] border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Town Union / Palace / Archival Reference <span className="text-slate-500 font-normal">(Optional)</span>
              </label>
              <input
                type="text"
                value={citations}
                onChange={(e) => setCitations(e.target.value)}
                placeholder="e.g. Amaeke Town Development Union, Traditional Ruler Palace Records"
                className="w-full px-3 py-2 rounded-xl bg-[#070b16] border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Signpost or Community Photo Link <span className="text-slate-500 font-normal">(Optional)</span>
              </label>
              <input
                type="url"
                value={evidenceUrl}
                onChange={(e) => setEvidenceUrl(e.target.value)}
                placeholder="https://... photo of community entrance, market square, or hall"
                className="w-full px-3 py-2 rounded-xl bg-[#070b16] border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50"
              />
            </div>

            <div className="pt-2 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:brightness-110 text-black font-bold text-xs shadow-lg shadow-emerald-500/20 disabled:opacity-50 transition-all"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{submitting ? 'Submitting Petition...' : 'Submit Reinstatement Petition'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
