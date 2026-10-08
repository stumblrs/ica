'use client';

import React, { useState, useEffect } from 'react';
import { MessageSquare, Send, User, Sparkles, ChevronDown, ChevronUp, CheckCircle2 } from 'lucide-react';

interface InlineComment {
  id: string;
  authorName: string;
  affiliation?: string;
  comment: string;
  createdAt: string;
  category?: string;
}

interface InlineCommunityCommentsProps {
  communityId: string;
  communityName: string;
  onCommentAdded?: () => void;
}

export function InlineCommunityComments({
  communityId,
  communityName,
  onCommentAdded,
}: InlineCommunityCommentsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [comments, setComments] = useState<InlineComment[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [authorName, setAuthorName] = useState('');
  const [affiliation, setAffiliation] = useState('');
  const [commentText, setCommentText] = useState('');
  const [successMsg, setSuccessMsg] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (communityId) {
      loadComments();
    }
  }, [communityId]);

  async function loadComments() {
    try {
      setLoading(true);
      const res = await fetch(`/api/communities/${communityId}/comments`);
      if (res.ok) {
        const data = await res.json();
        setComments(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Failed to load comments:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!commentText.trim()) return;

    try {
      setSubmitting(true);
      setErrorMsg(null);
      const res = await fetch(`/api/communities/${communityId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          authorName: authorName.trim() || undefined,
          affiliation: affiliation.trim() || undefined,
          comment: commentText.trim(),
        }),
      });

      if (res.ok) {
        setCommentText('');
        setSuccessMsg(true);
        setTimeout(() => setSuccessMsg(false), 3000);
        await loadComments();
        onCommentAdded?.();
      } else {
        const err = await res.json().catch(() => ({}));
        setErrorMsg(err.error || 'Failed to submit comment');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error submitting comment');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mt-3 pt-3 border-t border-white/[0.08] space-y-2">
      {/* Accordion trigger button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="w-full flex items-center justify-between p-2.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.08] transition-all text-left group"
      >
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="text-xs font-bold text-white group-hover:text-emerald-300 transition-colors">
            Community Voices & Oral Notes
          </span>
          <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300">
            {comments.length}
          </span>
        </div>
        {isOpen ? (
          <ChevronUp className="w-4 h-4 text-slate-400 group-hover:text-white" />
        ) : (
          <ChevronDown className="w-4 h-4 text-slate-400 group-hover:text-white" />
        )}
      </button>

      {/* Expanded Comments & In-Place Form */}
      {isOpen && (
        <div className="space-y-3 pt-1 animate-fadeIn">
          {/* Quick Submission Form */}
          <form onSubmit={handleSubmit} className="p-3 rounded-xl bg-[#080d1a] border border-emerald-500/20 space-y-2.5">
            <div className="flex items-center gap-1.5 text-[10px] uppercase font-mono font-bold text-emerald-400">
              <Sparkles className="w-3 h-3 text-emerald-400" />
              <span>Share Knowledge or Oral Tradition for {communityName}</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                placeholder="Name / Alias (Optional)"
                value={authorName}
                onChange={(e) => setAuthorName(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-white/[0.04] border border-white/[0.1] rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
              <input
                type="text"
                placeholder="Role (e.g. Indigene, Elder)"
                value={affiliation}
                onChange={(e) => setAffiliation(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-white/[0.04] border border-white/[0.1] rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <textarea
              required
              rows={2}
              placeholder={`Share dialect peculiarities, clan lineage, market days, or oral traditions of ${communityName}...`}
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-white/[0.04] border border-white/[0.1] rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />

            {errorMsg && <p className="text-[11px] text-red-400">{errorMsg}</p>}
            {successMsg && (
              <p className="text-[11px] text-emerald-400 flex items-center gap-1 font-semibold">
                <CheckCircle2 className="w-3 h-3" /> Note added to public community archive!
              </p>
            )}

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={submitting || !commentText.trim()}
                className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs flex items-center gap-1 shadow-sm disabled:opacity-50 transition-all"
              >
                <Send className="w-3 h-3" />
                <span>{submitting ? 'Posting…' : 'Post Note'}</span>
              </button>
            </div>
          </form>

          {/* List of existing comments for this community */}
          <div className="space-y-2 max-h-56 overflow-y-auto pr-0.5">
            {loading ? (
              <p className="text-[11px] text-slate-500 text-center py-2">Loading notes…</p>
            ) : comments.length === 0 ? (
              <p className="text-[11px] text-slate-400 text-center py-2 italic bg-white/[0.02] rounded-lg border border-white/[0.05]">
                No oral histories or notes recorded yet. Be the first to share one above!
              </p>
            ) : (
              comments.map((cmt) => (
                <div key={cmt.id} className="p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06] space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <div className="flex items-center gap-1.5 truncate">
                      <span className="font-semibold text-white truncate">{cmt.authorName}</span>
                      {cmt.affiliation && (
                        <span className="text-[9px] font-mono text-emerald-400 bg-emerald-500/10 px-1 py-0.2 rounded border border-emerald-500/20 shrink-0">
                          {cmt.affiliation}
                        </span>
                      )}
                    </div>
                    <span className="text-[9px] font-mono text-slate-500 shrink-0">
                      {new Date(cmt.createdAt).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300 leading-relaxed whitespace-pre-wrap">
                    {cmt.comment}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
