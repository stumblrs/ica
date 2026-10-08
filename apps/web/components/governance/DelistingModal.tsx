'use client';

import React, { useState } from 'react';
import { X, AlertTriangle, Scale, ShieldAlert, BookOpen, Send, CheckCircle2 } from 'lucide-react';
import { getOrCreateDeviceId, recordDevicePetition } from '@/lib/device';

interface DelistingModalProps {
  community: {
    id: string;
    name: string;
    lgaName?: string;
    stateName?: string;
  };
  onClose: () => void;
  onSuccess: () => void;
}

const REASON_OPTIONS = [
  'Indigenous non-Igbo ethnic territory (e.g. Idoma, Igede, Tiv, etc.)',
  'Settlement duplicate / inaccurate orthographic spelling',
  'Geographic error (location falls far outside historical settlement bounds)',
  'Modern administrative enclave without pre-colonial or linguistic heritage',
  'Challenged community status / disputed territory',
];

export function DelistingModal({ community, onClose, onSuccess }: DelistingModalProps) {
  const [selectedReason, setSelectedReason] = useState(REASON_OPTIONS[0]);
  const [customDetails, setCustomDetails] = useState('');
  const [citations, setCitations] = useState('');
  const [evidenceUrl, setEvidenceUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!citations.trim()) {
      setError('Please provide at least one citation, archival reference, or local source.');
      return;
    }

    setSubmitting(true);
    setError(null);

    const deviceId = getOrCreateDeviceId();
    const fullReason = customDetails.trim()
      ? `${selectedReason} - ${customDetails.trim()}`
      : selectedReason;

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
          type: 'DELIST',
          reason: fullReason,
          citations: citations.trim(),
          evidenceUrls: evidenceUrl.trim() ? [evidenceUrl.trim()] : [],
          quorumThreshold: 15,
          durationDays: 7,
          deviceId,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to submit challenge');
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
      <div className="relative w-full max-w-lg bg-[#0a0f1d] border border-amber-500/30 rounded-2xl shadow-2xl shadow-amber-950/40 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 px-5 border-b border-white/[0.08] bg-amber-500/[0.04]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                Challenge Classification
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-400/10 text-amber-300 border border-amber-400/20">
                  Community Quorum
                </span>
              </h2>
              <p className="text-[11px] text-slate-400">
                Petition declassification for <span className="text-amber-200 font-semibold">{community.name}</span>
                {community.lgaName ? ` (${community.lgaName} LGA)` : ''}
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
            <h3 className="text-base font-bold text-white">Quorum Inquiry Opened!</h3>
            <p className="text-xs text-slate-300 max-w-xs">
              {community.name} is now marked as <span className="text-amber-300 font-medium">Contested</span>. The community has 7 days to evaluate citations and cast votes.
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

            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-200/90 text-xs leading-relaxed flex items-start gap-2.5">
              <ShieldAlert className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
              <div>
                <span className="font-semibold text-amber-300">Community Consensus Model: </span>
                Delisting is never an instant single-user erasure. Your petition will initiate a public 7-day community deliberation requiring a 15-device quorum and 70% consensus.
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Primary Ground for Declassification
              </label>
              <select
                value={selectedReason}
                onChange={(e) => setSelectedReason(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[#070b16] border border-white/10 text-xs text-white focus:outline-none focus:border-amber-500/50"
              >
                {REASON_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Context & Rationale Details
              </label>
              <textarea
                value={customDetails}
                onChange={(e) => setCustomDetails(e.target.value)}
                rows={2}
                placeholder="Briefly describe why this settlement is indigenous to a neighboring non-Igbo group..."
                className="w-full px-3 py-2 rounded-xl bg-[#070b16] border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50 resize-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-amber-400" />
                <span>Required Citation / Archival Reference</span>
              </label>
              <input
                type="text"
                required
                value={citations}
                onChange={(e) => setCitations(e.target.value)}
                placeholder="e.g. 1976 State Boundary Commission, District Gazette, Traditional Council record"
                className="w-full px-3 py-2 rounded-xl bg-[#070b16] border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Supporting Photo / Document URL <span className="text-slate-500 font-normal">(Optional)</span>
              </label>
              <input
                type="url"
                value={evidenceUrl}
                onChange={(e) => setEvidenceUrl(e.target.value)}
                placeholder="https://... link to boundary survey, gazetteer scan, or signpost"
                className="w-full px-3 py-2 rounded-xl bg-[#070b16] border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50"
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
                className="flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:brightness-110 text-black font-bold text-xs shadow-lg shadow-amber-500/20 disabled:opacity-50 transition-all"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{submitting ? 'Initiating Inquiry...' : 'Open Community Quorum'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
