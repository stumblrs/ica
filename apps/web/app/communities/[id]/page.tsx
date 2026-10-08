'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  MapPin,
  ShieldCheck,
  AlertTriangle,
  Clock,
  ThumbsUp,
  FileText,
  History,
  ArrowLeft,
  CheckCircle,
  MessageSquare,
  Send,
  Waves,
  Sparkles,
  Archive,
  ExternalLink,
} from 'lucide-react';
import { AudioPronunciationPlayer } from '@/components/cultural/AudioPronunciationPlayer';
import { calculateNearestWaterway, getDialectForLocation } from '@/lib/cultural';
import { getArchivalDocumentsForFeature } from '@/lib/archival';

export default function CommunityDetailPage({ params }: { params: { id: string } }) {
  const [community, setCommunity] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [confirmNote, setConfirmNote] = useState('');
  const [confirming, setConfirming] = useState(false);

  const [challengeReason, setChallengeReason] = useState('');
  const [challenging, setChallenging] = useState(false);
  const [showChallengeModal, setShowChallengeModal] = useState(false);

  const [commentText, setCommentText] = useState('');
  const [commentAuthor, setCommentAuthor] = useState('');
  const [commentAffiliation, setCommentAffiliation] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [commentError, setCommentError] = useState<string | null>(null);

  useEffect(() => {
    fetchCommunity();
  }, [params.id]);

  async function fetchCommunity() {
    try {
      setLoading(true);
      const res = await fetch(`/api/communities/${params.id}`);
      if (!res.ok) throw new Error('Community not found');
      const data = await res.json();
      setCommunity(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirm() {
    try {
      setConfirming(true);
      const res = await fetch(`/api/communities/${params.id}/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note: confirmNote }),
      });
      if (res.ok) {
        setConfirmNote('');
        fetchCommunity();
      }
    } finally {
      setConfirming(false);
    }
  }

  async function handleChallenge(e: React.FormEvent) {
    e.preventDefault();
    if (!challengeReason.trim()) return;
    try {
      setChallenging(true);
      const res = await fetch(`/api/communities/${params.id}/challenge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: challengeReason }),
      });
      if (res.ok) {
        setChallengeReason('');
        setShowChallengeModal(false);
        fetchCommunity();
      }
    } finally {
      setChallenging(false);
    }
  }

  async function handleCommentSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!commentText.trim()) {
      setCommentError('Comment text is required');
      return;
    }
    try {
      setSubmittingComment(true);
      setCommentError(null);
      const res = await fetch(`/api/communities/${params.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          authorName: commentAuthor.trim() || undefined,
          affiliation: commentAffiliation.trim() || undefined,
          comment: commentText.trim(),
        }),
      });
      if (res.ok) {
        setCommentText('');
        fetchCommunity();
      } else {
        const err = await res.json().catch(() => ({}));
        setCommentError(err.error || 'Failed to post comment');
      }
    } catch (err: any) {
      setCommentError(err.message || 'Error posting comment');
    } finally {
      setSubmittingComment(false);
    }
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center text-slate-400 text-xs font-mono">
        LOADING COMMUNITY RECORD...
      </div>
    );
  }

  if (error || !community) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3 p-6 text-center">
        <AlertTriangle className="w-8 h-8 text-amber-500" />
        <h2 className="text-lg font-bold text-white">Record Not Found</h2>
        <p className="text-xs text-slate-400">The requested community record does not exist.</p>
        <Link
          href="/"
          className="mt-2 px-4 py-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs"
        >
          Return to Map
        </Link>
      </div>
    );
  }

  return (
    <div className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 space-y-6">
      {/* Back Button */}
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-xs font-medium text-slate-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Atlas Map
      </Link>

      {/* Main Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                {community.type}
              </span>
              <span
                className={`text-[10px] uppercase font-mono px-2 py-0.5 rounded border ${
                  community.verificationStatus === 'verified'
                    ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
                    : community.verificationStatus === 'challenged'
                    ? 'bg-red-950/60 border-red-500/40 text-red-300'
                    : 'bg-amber-950/60 border-amber-500/40 text-amber-300'
                }`}
              >
                {community.verificationStatus}
              </span>
              <span className="text-[10px] font-mono text-slate-400">
                Identity: <span className="text-emerald-400 font-semibold">{community.identityStatus}</span>
              </span>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold text-white tracking-tight">{community.name}</h1>
              <AudioPronunciationPlayer name={community.name} />
            </div>
            <p className="text-xs text-slate-400 mt-1 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>
                {community.lgaName} LGA, {community.stateName} State • {community.latitude?.toFixed(4)}° N,{' '}
                {community.longitude?.toFixed(4)}° E
              </span>
            </p>
            {community.longitude && community.latitude && (() => {
              const river = calculateNearestWaterway(community.longitude, community.latitude);
              const dialect = getDialectForLocation(community.stateName, community.lgaName);
              return (
                <div className="flex items-center gap-3 mt-2 flex-wrap text-xs">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-sky-500/10 border border-sky-500/20 text-sky-300">
                    <Waves className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                    <span>{river.name} (~{river.distanceKm} km · {river.basin})</span>
                  </span>
                  {dialect && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300">
                      <Sparkles className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>Dialect: {dialect.name}</span>
                    </span>
                  )}
                </div>
              );
            })()}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleConfirm()}
              disabled={confirming}
              className="px-3 py-1.5 rounded-lg bg-emerald-600/90 text-white hover:bg-emerald-500 text-xs font-medium flex items-center gap-1.5 transition-colors disabled:opacity-50"
            >
              <ThumbsUp className="w-3.5 h-3.5" />
              <span>Confirm ({community.confirmationsCount || 0})</span>
            </button>
            <button
              onClick={() => setShowChallengeModal(true)}
              className="px-3 py-1.5 rounded-lg bg-red-950/60 border border-red-700/60 text-red-300 hover:bg-red-900/40 text-xs font-medium flex items-center gap-1.5 transition-colors"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Challenge ({community.challengesCount || 0})</span>
            </button>
          </div>
        </div>

        {community.verificationStatus === 'challenged' && (
          <div className="p-3 rounded-xl bg-red-950/40 border border-red-500/40 text-red-300 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
            <p>
              This community record is currently under challenge regarding administrative or identity claims.
              Historical submissions remain in the audit record.
            </p>
          </div>
        )}

        {community.description && (
          <div className="text-xs text-slate-300 leading-relaxed pt-2 border-t border-slate-800">
            {community.description}
          </div>
        )}
      </div>

      {/* Grid: Details & Evidence */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Cultural & Linguistic Record */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-200 flex items-center gap-2">
            <FileText className="w-4 h-4 text-emerald-400" />
            Cultural & Dialect Notes
          </h3>
          <div className="space-y-2 text-xs">
            <div>
              <span className="text-slate-500 block text-[11px]">Dialect / Language</span>
              <span className="text-slate-300">{community.languageStatus || 'Not specified'}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[11px]">Historical Classification</span>
              <span className="text-slate-300">{community.historicalStatus || 'Standard settlement'}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[11px]">Confidence Score</span>
              <span className="font-mono text-emerald-400">{(community.confidence * 100).toFixed(0)}%</span>
            </div>
          </div>
        </div>

        {/* Evidence & Sources */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-200 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-blue-400" />
            Documented Evidence ({community.evidence?.length || 0})
          </h3>
          <div className="space-y-2">
            {community.evidence?.length > 0 ? (
              community.evidence.map((ev: any, i: number) => (
                <div key={i} className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800 text-xs">
                  <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                    <span className="uppercase font-mono text-emerald-400">{ev.sourceType}</span>
                    {ev.citationOrUrl && (
                      <span className="truncate max-w-[150px]">{ev.citationOrUrl}</span>
                    )}
                  </div>
                  <p className="text-slate-300">{ev.description}</p>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-500 italic">No user-uploaded evidence attached yet.</p>
            )}

            {/* Matched Regional Archival Records */}
            {(() => {
              const matchedArchives = getArchivalDocumentsForFeature({
                stateName: community.stateName || community.stateId,
                lgaCode: community.lgaId,
                territory: community.name,
              });
              if (matchedArchives.length === 0) return null;

              return (
                <div className="pt-3 border-t border-slate-800 space-y-2">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                    <Archive className="w-3.5 h-3.5 text-amber-400" />
                    Corroborating Colonial Archival Records ({matchedArchives.length})
                  </span>
                  <div className="space-y-2">
                    {matchedArchives.map((doc) => (
                      <div key={doc.id} className="p-2.5 rounded-lg bg-amber-950/20 border border-amber-500/20 text-xs space-y-1">
                        <div className="flex items-start justify-between gap-1 text-[11px]">
                          <span className="font-semibold text-white leading-tight">{doc.title}</span>
                          <span className="text-[9px] font-mono px-1 rounded bg-amber-500/20 text-amber-300 shrink-0">{doc.year}</span>
                        </div>
                        <p className="text-[11px] text-slate-300 leading-relaxed">{doc.significance}</p>
                        <div className="pt-1 flex items-center justify-between text-[10px] font-mono text-slate-400">
                          <span className="truncate max-w-[200px]" title={doc.archiveReference}>🏛 {doc.archiveReference}</span>
                          {doc.digitalUrl && (
                            <a
                              href={doc.digitalUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-amber-300 hover:text-amber-200 underline flex items-center gap-0.5"
                            >
                              <span>Record</span>
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
        </div>
      </div>

      {/* Community Comments & Discussion Section */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl space-y-5">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-bold text-white font-['Outfit']">
              Community Discussion & Comments
            </h3>
          </div>
          <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded-md bg-white/[0.04] text-slate-300 border border-white/[0.08]">
            {community.comments?.length || 0} {community.comments?.length === 1 ? 'comment' : 'comments'}
          </span>
        </div>

        {/* Comment Submission Form */}
        <form onSubmit={handleCommentSubmit} className="space-y-3 bg-slate-950/60 border border-slate-800/80 rounded-xl p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-slate-400 mb-1">
                Your Name / Alias (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Chukwuemeka, Elder Nnamdi"
                value={commentAuthor}
                onChange={(e) => setCommentAuthor(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700/80 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-400 mb-1">
                Affiliation / Role (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Indigene, Historian, Neighboring Clan"
                value={commentAffiliation}
                onChange={(e) => setCommentAffiliation(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700/80 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1">
              Add Comment / Oral History / Perspective *
            </label>
            <textarea
              required
              rows={3}
              placeholder="Share cultural context, local dialect details, historical notes, or commentary about this settlement..."
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700/80 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>

          {commentError && (
            <p className="text-xs text-red-400">{commentError}</p>
          )}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={submittingComment || !commentText.trim()}
              className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs flex items-center gap-1.5 shadow-md shadow-emerald-500/20 disabled:opacity-50 transition-all"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{submittingComment ? 'Posting...' : 'Post Comment'}</span>
            </button>
          </div>
        </form>

        {/* Comments Feed */}
        <div className="space-y-3">
          {community.comments && community.comments.length > 0 ? (
            community.comments.map((cmt: any) => (
              <div key={cmt.id} className="p-3.5 rounded-xl bg-slate-950/40 border border-slate-800/80 space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white font-['Outfit']">
                      {cmt.authorName}
                    </span>
                    {cmt.affiliation && (
                      <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                        {cmt.affiliation}
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] font-mono text-slate-500">
                    {new Date(cmt.createdAt).toLocaleDateString(undefined, {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">
                  {cmt.comment}
                </p>
              </div>
            ))
          ) : (
            <div className="p-6 text-center text-xs text-slate-500 italic bg-slate-950/20 border border-dashed border-slate-800 rounded-xl">
              No comments yet. Be the first to share knowledge or feedback about {community.name}.
            </div>
          )}
        </div>
      </div>

      {/* Challenge Modal */}
      {showChallengeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-md rounded-2xl p-6 shadow-2xl space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-400" />
              File Community Challenge
            </h3>
            <p className="text-xs text-slate-400">
              Disputes are logged to the public audit trail and do not automatically delete records.
            </p>
            <form onSubmit={handleChallenge} className="space-y-3">
              <textarea
                required
                rows={3}
                placeholder="Reason for dispute (e.g. historical boundary, naming, clan alignment)..."
                value={challengeReason}
                onChange={(e) => setChallengeReason(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-red-500"
              />
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowChallengeModal(false)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={challenging}
                  className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-medium hover:bg-red-500 disabled:opacity-50"
                >
                  {challenging ? 'Filing...' : 'Submit Challenge'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
