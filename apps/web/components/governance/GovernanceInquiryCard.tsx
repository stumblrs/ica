'use client';

import React, { useState, useEffect } from 'react';
import {
  Scale,
  RotateCcw,
  Clock,
  Users,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  BookOpen,
  ThumbsUp,
  ThumbsDown,
  ShieldAlert,
} from 'lucide-react';
import type { GovernanceInquiry } from '@/lib/governance';
import { getOrCreateDeviceId, hasDeviceVoted, recordDeviceVote, getDeviceVote } from '@/lib/device';

interface GovernanceInquiryCardProps {
  inquiry: GovernanceInquiry;
  onVoteCast?: () => void;
}

export function GovernanceInquiryCard({ inquiry: initialInquiry, onVoteCast }: GovernanceInquiryCardProps) {
  const [inquiry, setInquiry] = useState<GovernanceInquiry>(initialInquiry);
  const [timeLeft, setTimeLeft] = useState<string>('');
  const [voting, setVoting] = useState(false);
  const [userVoted, setUserVoted] = useState<string | null>(null);
  const [voteError, setVoteError] = useState<string | null>(null);

  useEffect(() => {
    setInquiry(initialInquiry);
    setUserVoted(getDeviceVote(initialInquiry.id));
  }, [initialInquiry]);

  // Live countdown timer calculation
  useEffect(() => {
    const updateCountdown = () => {
      const expires = new Date(inquiry.expiresAt).getTime();
      const diff = expires - Date.now();
      if (diff <= 0) {
        setTimeLeft('Quorum Closed');
        return;
      }
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      setTimeLeft(`${days}d ${hours}h ${mins}m left`);
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 60000);
    return () => clearInterval(interval);
  }, [inquiry.expiresAt]);

  const totalVotes = inquiry.votesFor + inquiry.votesAgainst;
  const quorumMet = totalVotes >= inquiry.quorumThreshold;
  const quorumProgress = Math.min(100, Math.round((totalVotes / inquiry.quorumThreshold) * 100));

  const forPct = totalVotes > 0 ? Math.round((inquiry.votesFor / totalVotes) * 100) : 50;
  const againstPct = 100 - forPct;

  const isDelist = inquiry.type === 'DELIST';

  const handleVote = async (choice: 'FOR' | 'AGAINST') => {
    setVoting(true);
    setVoteError(null);
    const deviceId = getOrCreateDeviceId();

    try {
      const res = await fetch('/api/governance/votes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-device-id': deviceId,
        },
        body: JSON.stringify({
          inquiryId: inquiry.id,
          choice,
          deviceId,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to submit vote');
      }

      recordDeviceVote(inquiry.id, choice);
      setUserVoted(choice);

      // Update local numbers
      setInquiry((prev) => ({
        ...prev,
        votesFor: choice === 'FOR' ? prev.votesFor + 1 : prev.votesFor,
        votesAgainst: choice === 'AGAINST' ? prev.votesAgainst + 1 : prev.votesAgainst,
      }));

      onVoteCast?.();
    } catch (err: any) {
      setVoteError(err.message || 'Failed to record vote');
    } finally {
      setVoting(false);
    }
  };

  return (
    <div
      className={`rounded-2xl border p-4 space-y-3.5 backdrop-blur-xl ${
        isDelist
          ? 'bg-amber-950/20 border-amber-500/30 shadow-lg shadow-amber-950/30'
          : 'bg-emerald-950/20 border-emerald-500/30 shadow-lg shadow-emerald-950/30'
      }`}
    >
      {/* Header Banner */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div
            className={`p-1.5 rounded-lg ${
              isDelist ? 'bg-amber-500/20 text-amber-400' : 'bg-emerald-500/20 text-emerald-400'
            }`}
          >
            {isDelist ? <Scale className="w-4 h-4" /> : <RotateCcw className="w-4 h-4" />}
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-white">
                {isDelist ? 'Delisting Inquiry' : 'Reinstatement Petition'}
              </span>
              <span
                className={`text-[9px] font-mono px-1.5 py-0.5 rounded-md uppercase font-semibold ${
                  inquiry.status === 'OPEN'
                    ? 'bg-amber-400/20 text-amber-300 border border-amber-400/30'
                    : 'bg-slate-700/50 text-slate-400 border border-white/10'
                }`}
              >
                {inquiry.status}
              </span>
            </div>
            <p className="text-[10px] text-slate-400">
              Community: <span className="text-slate-200 font-medium">{inquiry.communityName}</span>
              {inquiry.lgaName ? ` • ${inquiry.lgaName} LGA` : ''}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-black/40 border border-white/10 text-[10px] font-mono text-slate-300">
          <Clock className="w-3 h-3 text-amber-400" />
          <span>{timeLeft}</span>
        </div>
      </div>

      {/* Rationale & Stated Grounds */}
      <div className="p-3 rounded-xl bg-black/30 border border-white/[0.06] text-xs space-y-2">
        <p className="text-slate-200 leading-relaxed">
          <span className="text-slate-400 font-medium">Stated Grounds: </span>
          {inquiry.reason}
        </p>

        {inquiry.clanLineage && (
          <div className="text-[11px] text-emerald-300/90 font-mono">
            🌱 Claimed Clan/Kindred: {inquiry.clanLineage}
          </div>
        )}

        {inquiry.citations && (
          <div className="text-[11px] text-slate-400 flex items-start gap-1.5 pt-1 border-t border-white/[0.06]">
            <BookOpen className="w-3 h-3 text-amber-400 shrink-0 mt-0.5" />
            <span className="truncate">{inquiry.citations}</span>
          </div>
        )}
      </div>

      {/* Quorum & Consensus Progress Bar */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-slate-400 flex items-center gap-1 font-mono">
            <Users className="w-3 h-3" />
            Quorum: {totalVotes} / {inquiry.quorumThreshold} votes
          </span>
          <span className="font-mono text-slate-300 font-semibold">
            {isDelist
              ? `${forPct}% Delist vs ${againstPct}% Retain`
              : `${forPct}% Restore vs ${againstPct}% Keep Dormant`}
          </span>
        </div>

        {/* Multi-segment Vote Bar */}
        <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden flex">
          <div
            className={`h-full transition-all duration-500 ${
              isDelist ? 'bg-amber-500' : 'bg-emerald-500'
            }`}
            style={{ width: `${forPct}%` }}
          />
          <div
            className={`h-full transition-all duration-500 ${
              isDelist ? 'bg-emerald-500' : 'bg-slate-600'
            }`}
            style={{ width: `${againstPct}%` }}
          />
        </div>

        <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono">
          <span>{inquiry.votesFor} {isDelist ? 'For Delisting' : 'For Restoration'}</span>
          <span>{inquiry.votesAgainst} {isDelist ? 'To Retain' : 'To Keep Dormant'}</span>
        </div>
      </div>

      {voteError && (
        <div className="p-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-300 text-xs flex items-center gap-2">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
          <span>{voteError}</span>
        </div>
      )}

      {/* Action / Voting Buttons */}
      {userVoted ? (
        <div className="p-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-center text-xs text-slate-300 font-mono flex items-center justify-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>
            You voted <strong className="text-white">{userVoted === 'FOR' ? (isDelist ? 'To Delist' : 'To Restore') : (isDelist ? 'To Retain' : 'To Keep Dormant')}</strong> on this device.
          </span>
        </div>
      ) : inquiry.status === 'OPEN' ? (
        <div className="grid grid-cols-2 gap-2 pt-1">
          {isDelist ? (
            <>
              <button
                type="button"
                disabled={voting}
                onClick={() => handleVote('AGAINST')}
                className="py-2 px-3 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 font-bold text-xs flex items-center justify-center gap-1.5 transition-all active:scale-95 disabled:opacity-50"
              >
                <ThumbsUp className="w-3.5 h-3.5" />
                <span>Retain as Igbo</span>
              </button>
              <button
                type="button"
                disabled={voting}
                onClick={() => handleVote('FOR')}
                className="py-2 px-3 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 font-bold text-xs flex items-center justify-center gap-1.5 transition-all active:scale-95 disabled:opacity-50"
              >
                <ThumbsDown className="w-3.5 h-3.5" />
                <span>Approve Delisting</span>
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                disabled={voting}
                onClick={() => handleVote('FOR')}
                className="py-2 px-3 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 font-bold text-xs flex items-center justify-center gap-1.5 transition-all active:scale-95 disabled:opacity-50"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Restore to Atlas</span>
              </button>
              <button
                type="button"
                disabled={voting}
                onClick={() => handleVote('AGAINST')}
                className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-white/10 text-slate-300 font-medium text-xs flex items-center justify-center gap-1.5 transition-all active:scale-95 disabled:opacity-50"
              >
                <span>Maintain Dormant</span>
              </button>
            </>
          )}
        </div>
      ) : (
        <div className="p-2 text-center text-xs text-slate-500 font-mono">
          This community deliberation is closed.
        </div>
      )}
    </div>
  );
}
