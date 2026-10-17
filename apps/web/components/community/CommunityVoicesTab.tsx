'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import {
  MessageSquare,
  Sparkles,
  MapPin,
  Send,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  X,
  Clock,
  BookOpen,
  ArrowUpRight,
  Heart,
  Share2,
  RefreshCw,
  Loader2,
  ChevronDown,
  Quote,
} from 'lucide-react';
import type { EnrichedComment } from '@/app/api/comments/route';
import type { CommunitySummary } from '@/components/map/AtlasOverview';
import type { SelectedFeature } from '@/components/map/MapContainer';
import { MediaGallery } from '@/components/common/MediaGallery';
import { extractMediaFromText } from '@/lib/media';
import { getUserProfile, type UserProfile } from '@/lib/user-profile';
import { getOrCreateDeviceId, getDeviceFingerprintSync } from '@/lib/device';
import { supabase } from '@/lib/supabase';
import { SocialShareModal } from './SocialShareModal';

interface CommunityVoicesTabProps {
  /** @deprecated Comments are global; these props are no longer used. */
  communities?: CommunitySummary[];
  onFlyTo?: (center: [number, number], zoom: number) => void;
  onSelectCommunityByName?: (name: string) => void;
  selectedFeature?: SelectedFeature | null;
}

function timeAgo(dateString: string): string {
  try {
    const now = Date.now();
    const past = new Date(dateString).getTime();
    const diffSec = Math.floor((now - past) / 1000);

    if (diffSec < 60) return 'Just now';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours}h`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d`;

    return new Date(dateString).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return 'Recent';
  }
}

const LOCAL_CITES_MAP_KEY = 'ica_local_cites_map_v2';

function getLocalCitesMap(): Record<string, number> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(LOCAL_CITES_MAP_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveLocalCiteCount(id: string, count: number) {
  if (typeof window === 'undefined') return;
  try {
    const current = getLocalCitesMap();
    current[id] = count;
    localStorage.setItem(LOCAL_CITES_MAP_KEY, JSON.stringify(current));
  } catch {}
}

export function CommunityVoicesTab(_props: CommunityVoicesTabProps) {
  const [comments, setComments] = useState<EnrichedComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Composer state
  const [authorName, setAuthorName] = useState<string>('');
  const [authorHandle, setAuthorHandle] = useState<string>('');
  const [affiliation, setAffiliation] = useState<string>('Indigene');
  const [commentText, setCommentText] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [isComposerExpanded, setIsComposerExpanded] = useState(false);

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [replyTarget, setReplyTarget] = useState<EnrichedComment | null>(null);

  useEffect(() => {
    const p = getUserProfile();
    setProfile(p);
    if (p.displayName) setAuthorName(p.displayName);
    if (p.username) setAuthorHandle(`@${p.username}`);

    function handleProfileUpdate(e: Event) {
      const customEvent = e as CustomEvent<UserProfile>;
      const updated = customEvent.detail || getUserProfile();
      setProfile(updated);
      if (updated.displayName) setAuthorName(updated.displayName);
      if (updated.username) setAuthorHandle(`@${updated.username}`);
    }

    window.addEventListener('ica:profile-updated', handleProfileUpdate);
    return () => window.removeEventListener('ica:profile-updated', handleProfileUpdate);
  }, []);

  // Social interactions
  const [likedMap, setLikedMap] = useState<Record<string, boolean>>({});
  const [likesCountMap, setLikesCountMap] = useState<Record<string, number>>({});
  const [citesCountMap, setCitesCountMap] = useState<Record<string, number>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [shareTarget, setShareTarget] = useState<EnrichedComment | null>(null);

  const composerTextareaRef = useRef<HTMLTextAreaElement>(null);
  const topFeedRef = useRef<HTMLDivElement>(null);

  // Listen for externally posted comments (e.g. from TwitterVoiceModal or InlineCommunityComments)
  useEffect(() => {
    function handleExternalComment(e: Event) {
      const customEvent = e as CustomEvent<EnrichedComment>;
      const newCmt = customEvent.detail;
      if (!newCmt) return;

      setComments((prev) => [newCmt, ...prev.filter((c) => c.id !== newCmt.id)]);
      setLikesCountMap((prev) => ({ ...prev, [newCmt.id]: newCmt.likes || 0 }));
      setCitesCountMap((prev) => ({ ...prev, [newCmt.id]: newCmt.citesCount || 0 }));

      if (newCmt.replyToCommentId) {
        setCitesCountMap((prev) => {
          const newCount = (prev[newCmt.replyToCommentId!] || 0) + 1;
          saveLocalCiteCount(newCmt.replyToCommentId!, newCount);
          return {
            ...prev,
            [newCmt.replyToCommentId!]: newCount,
          };
        });
      }

      setSearchQuery('');
      topFeedRef.current?.scrollIntoView({ behavior: 'smooth' });
    }

    window.addEventListener('ica:comment-posted', handleExternalComment);
    return () => window.removeEventListener('ica:comment-posted', handleExternalComment);
  }, []);

  // Realtime live subscription with 1200ms batching buffer (conserve free tier egress)
  useEffect(() => {
    let buffer: any[] = [];
    let flushTimer: NodeJS.Timeout | null = null;
    const channelName = `comments-feed-${Math.random().toString(36).slice(2, 9)}`;

    let channel: any = null;
    try {
      channel = supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'Comment' },
          (payload) => {
            const newRecord = payload.new;
            if (!newRecord) return;

            buffer.push(newRecord);

            // Batch rapid incoming comments into a single state update
            if (!flushTimer) {
              flushTimer = setTimeout(() => {
                if (buffer.length > 0) {
                  const toAdd = [...buffer];
                  buffer = [];
                  flushTimer = null;

                  setComments((prev) => {
                    const existingIds = new Set(prev.map((c) => c.id));
                    const newEnriched: EnrichedComment[] = [];

                    for (const item of toAdd) {
                      if (!existingIds.has(item.id)) {
                        newEnriched.push({
                          id: item.id,
                          authorName: item.author || 'Contributor',
                          handle: item.handle || `@${item.author?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'resident'}`,
                          affiliation: 'Community Member',
                          comment: item.content || '',
                          likes: item.likes || 0,
                          citesCount: item.citesCount || 0,
                          createdAt: item.createdAt || new Date().toISOString(),
                        });
                      }
                    }

                    if (newEnriched.length === 0) return prev;
                    return [...newEnriched, ...prev];
                  });
                }
              }, 1200);
            }
          }
        )
        .subscribe();
    } catch (subErr) {
      console.warn('[Realtime] Failed to subscribe to comments feed:', subErr);
    }

    return () => {
      if (flushTimer) clearTimeout(flushTimer);
      if (channel) {
        try {
          supabase.removeChannel(channel);
        } catch {}
      }
    };
  }, []); // Mounts once to prevent subscription teardown collisions

  useEffect(() => {
    loadInitialComments();
  }, []);

  async function loadInitialComments() {
    try {
      setLoading(true);
      const url = `/api/comments?limit=15`;
      const res = await fetch(url, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' },
      });
      if (res.ok) {
        const data = await res.json();
        const items: EnrichedComment[] = Array.isArray(data) ? data : (data.comments || []);
        setComments(items);
        setNextCursor(data.nextCursor || null);
        setHasMore(Boolean(data.hasMore));

        // Restore likes & cites maps
        const localCites = getLocalCitesMap();
        setCitesCountMap((prev) => {
          const next = { ...localCites, ...prev };
          items.forEach((c) => {
            const serverVal = c.citesCount ?? 0;
            const currentVal = next[c.id] ?? 0;
            next[c.id] = Math.max(serverVal, currentVal);
          });
          return next;
        });

        setLikesCountMap((prev) => {
          const next = { ...prev };
          items.forEach((c) => {
            if (next[c.id] === undefined) {
              next[c.id] = c.likes ?? 0;
            } else {
              next[c.id] = Math.max(next[c.id], c.likes ?? 0);
            }
          });
          return next;
        });
      }
    } catch (err) {
      console.error('Failed to load comments from server:', err);
    } finally {
      setLoading(false);
    }
  }

  async function loadMoreComments() {
    if (loadingMore || !hasMore || !nextCursor) return;
    try {
      setLoadingMore(true);
      const url = `/api/comments?limit=15&cursor=${encodeURIComponent(nextCursor)}`;
      const res = await fetch(url, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        const newItems: EnrichedComment[] = Array.isArray(data) ? data : (data.comments || []);
        setComments((prev) => {
          const seen = new Set(prev.map((c) => c.id));
          return [...prev, ...newItems.filter((c) => !seen.has(c.id))];
        });
        setNextCursor(data.nextCursor || null);
        setHasMore(Boolean(data.hasMore));

        setLikesCountMap((prev) => {
          const next = { ...prev };
          newItems.forEach((c) => {
            next[c.id] = c.likes ?? 0;
          });
          return next;
        });

        setCitesCountMap((prev) => {
          const next = { ...prev };
          newItems.forEach((c) => {
            next[c.id] = c.citesCount ?? 0;
          });
          return next;
        });
      }
    } catch (err) {
      console.error('Failed to load more comments:', err);
    } finally {
      setLoadingMore(false);
    }
  }

  // Like comment handler
  async function handleLike(commentId: string) {
    if (likedMap[commentId]) return;

    // Optimistic update
    setLikedMap((prev) => ({ ...prev, [commentId]: true }));
    setLikesCountMap((prev) => ({
      ...prev,
      [commentId]: (prev[commentId] || 0) + 1,
    }));

    try {
      await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'like', commentId }),
      });
    } catch (e) {
      console.error('Failed to save like:', e);
    }
  }

  // Direct Social Share
  function handleShareComment(comment: EnrichedComment) {
    setShareTarget(comment);
  }

  // Reply / Cite an existing author's comment
  function handleReply(comment: EnrichedComment) {
    setIsComposerExpanded(true);
    setReplyTarget(comment);
    const handle = comment.handle || `@${comment.authorName.replace(/\s+/g, '')}`;
    setCommentText((prev) => (prev ? `${prev} ${handle} ` : `${handle} `));
    composerTextareaRef.current?.focus();
    topFeedRef.current?.scrollIntoView({ behavior: 'smooth' });
  }

  // Post Tweet / Comment
  async function handlePostComment(e: React.FormEvent) {
    e.preventDefault();
    if (!commentText.trim()) {
      setFormError('Please write your note before posting.');
      return;
    }

    // Automatically resolve identity from user's device profile
    const activeProfile = profile || getUserProfile();
    const effectiveDeviceId = activeProfile?.deviceId || getOrCreateDeviceId();
    const effectiveFingerprint = activeProfile?.fingerprintHash || getDeviceFingerprintSync();
    const finalAuthor = activeProfile?.displayName || activeProfile?.username || authorName.trim() || 'Contributor';
    const finalHandle = activeProfile?.username ? `@${activeProfile.username}` : (authorHandle.trim() || undefined);

    try {
      setSubmitting(true);
      setFormError(null);

      const res = await fetch('/api/comments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-device-id': effectiveDeviceId,
          ...(effectiveFingerprint ? { 'x-device-fingerprint': effectiveFingerprint } : {}),
        },
        body: JSON.stringify({
          authorName: finalAuthor,
          handle: finalHandle,
          affiliation: affiliation.trim() || undefined,
          comment: commentText.trim(),
          deviceId: effectiveDeviceId,
          fingerprintHash: effectiveFingerprint || undefined,
          replyToHandle: replyTarget?.handle || undefined,
          replyToCommentId: replyTarget?.id || undefined,
        }),
      });

      if (res.ok) {
        const newEnriched: EnrichedComment = await res.json();

        // Push new comment to the top of feed immediately
        setComments((prev) => [newEnriched, ...prev.filter((c) => c.id !== newEnriched.id)]);
        setLikesCountMap((prev) => ({ ...prev, [newEnriched.id]: 0 }));
        setCitesCountMap((prev) => ({ ...prev, [newEnriched.id]: 0 }));

        if (replyTarget?.id) {
          setCitesCountMap((prev) => {
            const newCount = (prev[replyTarget.id] || 0) + 1;
            saveLocalCiteCount(replyTarget.id, newCount);
            return {
              ...prev,
              [replyTarget.id]: newCount,
            };
          });
        }

        setSearchQuery('');
        setSubmitSuccess(true);
        setCommentText('');
        setReplyTarget(null);
        setIsComposerExpanded(false);

        topFeedRef.current?.scrollIntoView({ behavior: 'smooth' });
        setTimeout(() => setSubmitSuccess(false), 3000);
      } else {
        const err = await res.json().catch(() => ({}));
        setFormError(err.error || 'Failed to post note to database');
      }
    } catch (err: any) {
      setFormError(err.message || 'Error submitting comment');
    } finally {
      setSubmitting(false);
    }
  }


  // Filtered comments timeline (search by keyword/handle/author)
  const filteredComments = useMemo(() => {
    if (!searchQuery.trim()) return comments;
    const q = searchQuery.toLowerCase();
    return comments.filter((cmt) => {
      const matchesContent = cmt.comment.toLowerCase().includes(q);
      const matchesAuthor = cmt.authorName.toLowerCase().includes(q);
      const matchesHandle = cmt.handle?.toLowerCase().includes(q);
      return matchesContent || matchesAuthor || matchesHandle;
    });
  }, [comments, searchQuery]);

  return (
    <div className="space-y-4 rise select-text">
      <div ref={topFeedRef} />

      {/* TWEET-STYLE COMPOSER (Top of Feed) */}
      <section className="card p-3.5 border-emerald-500/25 bg-gradient-to-b from-white/[0.04] to-white/[0.01] shadow-xl">
        <form onSubmit={handlePostComment} className="space-y-3">


          {/* Citation Banner if replying */}
          {replyTarget && (
            <div className="flex items-center justify-between px-2.5 py-1.5 rounded-xl bg-sky-500/10 border border-sky-500/25 text-xs text-sky-300 animate-in fade-in duration-150">
              <div className="flex items-center gap-1.5 truncate">
                <Quote className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                <span className="truncate">
                  Citing <strong className="text-white">{replyTarget.handle}</strong>
                </span>
              </div>
              <button
                type="button"
                onClick={() => setReplyTarget(null)}
                className="p-0.5 text-sky-400 hover:text-white hover:bg-sky-500/20 rounded-md text-xs"
                title="Remove citation"
              >
                ✕
              </button>
            </div>
          )}

          {/* Textarea Composer */}
          <div className="relative">
            <textarea
              ref={composerTextareaRef}
              rows={isComposerExpanded ? 3 : 2}
              maxLength={500}
              placeholder="What's happening in your community? Share an oral tradition, lineage note, dialect phrase, or paste photo/video URLs…"
              value={commentText}
              onFocus={() => setIsComposerExpanded(true)}
              onChange={(e) => setCommentText(e.target.value)}
              className="w-full bg-transparent border-0 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none resize-none leading-relaxed"
            />
          </div>

          {/* Automatically Bound Device Identity */}
          {isComposerExpanded && (
            <div className="space-y-2 pt-2 border-t border-white/[0.06] text-xs animate-in fade-in duration-200">
              {profile?.username ? (
                <div className="flex items-center justify-between p-2 rounded-xl bg-white/[0.04] border border-white/[0.08]">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="h-6 w-6 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs shrink-0">
                      {profile.avatarSymbol || 'ọ'}
                    </div>
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="font-bold text-white text-xs truncate">
                        {profile.displayName || profile.username}
                      </span>
                      <span className="font-mono text-emerald-400 text-[11px] truncate">
                        @{profile.username}
                      </span>
                      <span className="hidden sm:inline-flex text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/25 font-mono">
                        Device Linked
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <select
                      value={affiliation}
                      onChange={(e) => setAffiliation(e.target.value)}
                      className="h-7 px-2 rounded-lg bg-[#090e1c] border border-white/10 text-slate-300 text-[11px] focus:outline-none focus:border-emerald-500"
                    >
                      <option value="Indigene">Indigene</option>
                      <option value="Clan Elder">Clan Elder</option>
                      <option value="Youth Leader">Youth Leader</option>
                      <option value="Linguist / Oral Historian">Linguist / Historian</option>
                      <option value="Resident">Resident</option>
                      <option value="Diaspora Member">Diaspora Member</option>
                    </select>
                    <Link
                      href="/profile"
                      className="text-[10px] text-slate-400 hover:text-emerald-400 underline font-mono shrink-0"
                      title="Edit Profile"
                    >
                      Profile
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-amber-200 text-xs truncate">
                      No global @username claimed on this device yet.
                    </span>
                  </div>
                  <Link
                    href="/profile"
                    className="px-2.5 py-1 rounded-lg bg-emerald-500 text-black font-bold text-[11px] shrink-0 hover:bg-emerald-400 transition-colors"
                  >
                    Claim @username →
                  </Link>
                </div>
              )}
            </div>
          )}

          {formError && (
            <div className="text-[11px] text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2 py-1 rounded-lg">
              {formError}
            </div>
          )}

          {submitSuccess && (
            <div className="text-[11px] text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 px-2 py-1 rounded-lg flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Note posted to the public feed! Older comments pushed down.</span>
            </div>
          )}

          {/* Action Row */}
          <div className="flex items-center justify-between pt-1">
            <span className="text-[10px] font-mono text-slate-500">
              {commentText.length}/500
            </span>
            <div className="flex items-center gap-2">
              {isComposerExpanded && (
                <button
                  type="button"
                  onClick={() => setIsComposerExpanded(false)}
                  className="px-2.5 py-1 text-[11px] text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
              )}
              <button
                type="submit"
                disabled={submitting || !commentText.trim()}
                className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:brightness-110 text-black font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-emerald-500/20 disabled:opacity-50 transition-all active:scale-95"
              >
                {submitting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Send className="w-3.5 h-3.5" />
                )}
                <span>Post Note</span>
              </button>
            </div>
          </div>
        </form>
      </section>

      {/* FILTER & TIMELINE SEARCH BAR */}
      <div className="space-y-2">
        <div className="relative">
          <input
            type="text"
            placeholder="Search feed by town, clan, handle, or keyword…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-8 pl-8 pr-3 bg-white/[0.04] border border-white/[0.08] rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5 pointer-events-none" />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-2 text-slate-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* State Filter Chips with Compact Refresh Action */}
        <div className="flex items-center justify-between gap-1.5 py-0.5">
          <span className="text-[11px] font-mono text-slate-400">
            Global Public Timeline ({comments.length} posts)
          </span>
          <button
            type="button"
            onClick={() => loadInitialComments()}
            className="shrink-0 p-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-slate-400 hover:text-white transition-all active:scale-95 flex items-center gap-1.5 text-[11px]"
            title="Refresh Timeline"
            aria-label="Refresh Timeline"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-emerald-400' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* FEED TIMELINE: SCROLL STREAM OF TWEETS */}
      <div className="space-y-3">
        {loading ? (
          <div className="p-8 text-center text-xs text-slate-500 font-mono flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
            <span>Loading community feed…</span>
          </div>
        ) : filteredComments.length === 0 ? (
          <div className="p-6 text-center rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-2">
            <BookOpen className="w-6 h-6 text-slate-500 mx-auto" />
            <p className="text-xs text-slate-400">
              No comments found {searchQuery ? `matching "${searchQuery}"` : ''}.
            </p>
            <button
              type="button"
              onClick={() => setIsComposerExpanded(true)}
              className="px-3.5 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 text-xs font-semibold"
            >
              Post the first note on this timeline
            </button>
          </div>
        ) : (
          filteredComments.map((cmt) => {
            const isLiked = !!likedMap[cmt.id];
            const currentLikes = likesCountMap[cmt.id] ?? (cmt.likes || 0);
            const currentCites = citesCountMap[cmt.id] ?? (cmt.citesCount || 0);
            const citedItem = cmt.citedComment || (cmt.replyToCommentId ? comments.find((c) => c.id === cmt.replyToCommentId) : null);

            return (
              <article
                key={cmt.id}
                className="p-3.5 rounded-2xl bg-[#090e1c]/80 hover:bg-[#0c1326] border border-white/[0.08] hover:border-emerald-500/40 transition-all space-y-2.5 group shadow-md"
              >
                {/* TWEET HEADER: Avatar + Name + Handle + Date + Category */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    {/* Circle Avatar with gradient */}
                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-400 p-[1px] shrink-0 shadow-md">
                      <div className="w-full h-full rounded-full bg-[#070c18] flex items-center justify-center text-emerald-300 font-bold text-xs">
                        {cmt.authorName.charAt(0).toUpperCase()}
                      </div>
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-bold text-white leading-tight truncate">
                          {cmt.authorName}
                        </span>
                        {cmt.handle && (
                          <span className="text-[10px] text-slate-400 font-mono truncate">
                            {cmt.handle}
                          </span>
                        )}
                        <span className="text-slate-600 text-[10px]">&bull;</span>
                        <span className="text-[10px] font-mono text-slate-400">
                          {timeAgo(cmt.createdAt)}
                        </span>
                      </div>
                      {cmt.affiliation && (
                        <span className="text-[10px] text-emerald-400/80 font-mono block leading-tight">
                          {cmt.affiliation}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Replying indicator */}
                {cmt.replyToHandle && (
                  <div className="flex items-center gap-1 text-[11px] text-sky-400 font-mono pl-1">
                    <Quote className="w-3 h-3 shrink-0" />
                    <span>Citing <span className="font-semibold text-sky-300">{cmt.replyToHandle}</span></span>
                  </div>
                )}


                {/* TWEET BODY TEXT & EXTRACTED MEDIA GALLERY */}
                {(() => {
                  const { cleanText, media } = extractMediaFromText(cmt.comment);
                  return (
                    <div className="space-y-2">
                      <p className="text-xs sm:text-[13px] text-slate-200 leading-relaxed whitespace-pre-wrap pl-2 border-l-2 border-emerald-500/40">
                        {cleanText}
                      </p>
                      {media.length > 0 && (
                        <div className="pl-2">
                          <MediaGallery media={media} />
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Embedded Citation / Quoted Tweet Card */}
                {citedItem && (
                  <div
                    className="mt-2 p-2.5 sm:p-3 rounded-xl bg-black/40 border border-sky-500/25 space-y-1.5 group/quote"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 text-[11px] min-w-0">
                        <div className="w-4 h-4 rounded-full bg-sky-500/20 text-sky-300 flex items-center justify-center font-bold text-[9px] shrink-0">
                          {citedItem.authorName.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-bold text-slate-200 truncate">{citedItem.authorName}</span>
                        <span className="text-slate-400 font-mono text-[10px] truncate">{citedItem.handle}</span>
                      </div>
                    </div>
                    <p className="text-xs text-slate-300 line-clamp-3 leading-relaxed whitespace-pre-wrap pl-2 border-l-2 border-sky-500/40 group-hover/quote:border-sky-400">
                      {'comment' in citedItem ? (citedItem as any).comment : (citedItem as any).content}
                    </p>
                  </div>
                )}

                {/* TWEET INTERACTION BAR (Like, Fly, Reply/Cite, Share) */}
                <div className="pt-2 border-t border-white/[0.05] flex items-center justify-between text-slate-400 text-xs">

                  {/* Like Button with Count */}
                  <button
                    type="button"
                    onClick={() => handleLike(cmt.id)}
                    className={`flex items-center gap-1.5 transition-all ${
                      isLiked ? 'text-rose-400 font-bold' : 'hover:text-rose-300'
                    }`}
                    title="Like this testimony"
                  >
                    <Heart
                      className={`w-3.5 h-3.5 ${
                        isLiked ? 'fill-rose-500 text-rose-500 scale-110' : ''
                      } transition-transform`}
                    />
                    <span className="text-[11px] font-mono">{currentLikes}</span>
                  </button>

                  {/* Reply / Cite Action with Count */}
                  <button
                    type="button"
                    onClick={() => handleReply(cmt)}
                    className="flex items-center gap-1.5 hover:text-sky-300 transition-colors group/cite"
                    title="Cite this testimony on the timeline"
                  >
                    <Quote className="w-3.5 h-3.5 group-hover/cite:scale-110 transition-transform" />
                    <span className="text-[11px] font-mono">{currentCites}</span>
                    <span className="text-[10px] text-slate-500 hidden sm:inline">Cite</span>
                  </button>

                  {/* Share Action */}
                  <button
                    type="button"
                    onClick={() => handleShareComment(cmt)}
                    className="flex items-center gap-1 transition-colors hover:text-white"
                    title="Share to social media"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    <span className="text-[11px]">Share</span>
                  </button>
                </div>
              </article>
            );
          })
        )}

        {/* Lazy Loading More Button / Egress Guard */}
        {hasMore && (
          <div className="pt-2 pb-3">
            <button
              type="button"
              onClick={loadMoreComments}
              disabled={loadingMore}
              className="w-full py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-xs font-semibold text-slate-300 hover:text-white flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-60"
            >
              {loadingMore ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                  <span>Loading older testimonies…</span>
                </>
              ) : (
                <>
                  <span>Load more oral testimonies (5 more)</span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                </>
              )}
            </button>
          </div>
        )}

        {!hasMore && comments.length > 0 && (
          <div className="py-4 text-center text-[11px] font-mono text-slate-500 border-t border-white/[0.06]">
            ✨ You are all caught up with the documented timeline.
          </div>
        )}
      </div>

      {/* Direct Social Media Share Modal */}
      {shareTarget && (
        <SocialShareModal
          comment={shareTarget}
          onClose={() => setShareTarget(null)}
        />
      )}
    </div>
  );
}
