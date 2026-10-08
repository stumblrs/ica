'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
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

interface CommunityVoicesTabProps {
  communities: CommunitySummary[];
  onFlyTo: (center: [number, number], zoom: number) => void;
  onSelectCommunityByName: (name: string) => void;
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

export function CommunityVoicesTab({
  communities,
  onFlyTo,
  onSelectCommunityByName,
  selectedFeature,
}: CommunityVoicesTabProps) {
  const [comments, setComments] = useState<EnrichedComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedState, setSelectedState] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Composer state
  const [selectedCommId, setSelectedCommId] = useState<string>('');
  const [authorName, setAuthorName] = useState<string>('');
  const [authorHandle, setAuthorHandle] = useState<string>('');
  const [affiliation, setAffiliation] = useState<string>('Indigene');
  const [category, setCategory] = useState<'oral-history' | 'dialect' | 'lineage' | 'tradition' | 'general'>('oral-history');
  const [commentText, setCommentText] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [isComposerExpanded, setIsComposerExpanded] = useState(false);

  // Community picker in composer
  const [communitySearch, setCommunitySearch] = useState('');
  const [isPickingCommunity, setIsPickingCommunity] = useState(false);

  // Social interactions
  const [likedMap, setLikedMap] = useState<Record<string, boolean>>({});
  const [likesCountMap, setLikesCountMap] = useState<Record<string, number>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const composerTextareaRef = useRef<HTMLTextAreaElement>(null);
  const topFeedRef = useRef<HTMLDivElement>(null);

  // Automatically pre-fill community if a feature is selected on the map
  useEffect(() => {
    if (selectedFeature?.name) {
      const match = communities.find(
        (c) => c.name.toLowerCase() === selectedFeature.name.toLowerCase()
      );
      if (match) {
        setSelectedCommId(match.id);
      }
    }
  }, [selectedFeature, communities]);

  useEffect(() => {
    loadAllComments();
  }, []);

  async function loadAllComments() {
    try {
      setLoading(true);
      const res = await fetch('/api/comments');
      if (res.ok) {
        const data: EnrichedComment[] = await res.json();
        const sorted = Array.isArray(data)
          ? data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          : [];
        setComments(sorted);

        // Populate initial likes map
        const initialLikes: Record<string, number> = {};
        sorted.forEach((c) => {
          initialLikes[c.id] = c.likes ?? 0;
        });
        setLikesCountMap(initialLikes);
      }
    } catch (err) {
      console.error('Failed to load comments:', err);
    } finally {
      setLoading(false);
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

  // Share comment link
  function handleShareComment(comment: EnrichedComment) {
    const url = new URL(window.location.href);
    if (comment.coordinates) {
      url.searchParams.set('lng', comment.coordinates[0].toFixed(4));
      url.searchParams.set('lat', comment.coordinates[1].toFixed(4));
    }
    url.searchParams.set('name', comment.communityName);
    navigator.clipboard.writeText(url.toString());
    setCopiedId(comment.id);
    setTimeout(() => setCopiedId(null), 2500);
  }

  // Reply to author
  function handleReply(comment: EnrichedComment) {
    setIsComposerExpanded(true);
    const handle = comment.handle || `@${comment.authorName.replace(/\s+/g, '')}`;
    setCommentText((prev) => (prev ? `${prev} ${handle} ` : `${handle} `));
    setSelectedCommId(comment.communityId);
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
    if (!selectedCommId) {
      setFormError('Please select or tag a community for this comment.');
      setIsPickingCommunity(true);
      return;
    }

    try {
      setSubmitting(true);
      setFormError(null);

      const res = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          communityId: selectedCommId,
          authorName: authorName.trim() || undefined,
          handle: authorHandle.trim() || undefined,
          affiliation: affiliation.trim() || undefined,
          category,
          comment: commentText.trim(),
        }),
      });

      if (res.ok) {
        const newEnriched: EnrichedComment = await res.json();

        // Push new comment to the top of feed immediately: pushes older comments down!
        setComments((prev) => [newEnriched, ...prev]);
        setLikesCountMap((prev) => ({ ...prev, [newEnriched.id]: 0 }));

        setSubmitSuccess(true);
        setCommentText('');
        setIsComposerExpanded(false);

        // Smooth scroll to top of feed so user sees their new tweet!
        topFeedRef.current?.scrollIntoView({ behavior: 'smooth' });

        setTimeout(() => setSubmitSuccess(false), 3000);
      } else {
        const err = await res.json().catch(() => ({}));
        setFormError(err.error || 'Failed to post comment');
      }
    } catch (err: any) {
      setFormError(err.message || 'Error submitting comment');
    } finally {
      setSubmitting(false);
    }
  }

  // Filtered comments timeline
  const filteredComments = useMemo(() => {
    return comments.filter((cmt) => {
      if (selectedState !== 'all' && cmt.stateName?.toLowerCase() !== selectedState.toLowerCase()) {
        return false;
      }
      if (selectedCategory !== 'all' && cmt.category !== selectedCategory) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesContent = cmt.comment.toLowerCase().includes(q);
        const matchesTown = cmt.communityName.toLowerCase().includes(q);
        const matchesAuthor = cmt.authorName.toLowerCase().includes(q);
        const matchesHandle = cmt.handle?.toLowerCase().includes(q);
        const matchesLga = cmt.lgaName?.toLowerCase().includes(q);
        if (!matchesContent && !matchesTown && !matchesAuthor && !matchesHandle && !matchesLga) {
          return false;
        }
      }
      return true;
    });
  }, [comments, selectedState, selectedCategory, searchQuery]);

  // States available for filter
  const stateOptions = useMemo(() => {
    const states = new Set<string>();
    communities.forEach((c) => {
      if (c.stateName) states.add(c.stateName);
    });
    return Array.from(states).sort();
  }, [communities]);

  // Current selected community object for composer tag
  const activeTaggedCommunity = useMemo(() => {
    return communities.find((c) => c.id === selectedCommId);
  }, [communities, selectedCommId]);

  // Filtered community options for autocomplete picker
  const filteredCommunityPickerOptions = useMemo(() => {
    if (!communitySearch.trim()) return communities.slice(0, 15);
    const q = communitySearch.toLowerCase();
    return communities
      .filter((c) => c.name.toLowerCase().includes(q) || c.lgaName?.toLowerCase().includes(q))
      .slice(0, 15);
  }, [communities, communitySearch]);

  return (
    <div className="space-y-4 rise select-text">
      <div ref={topFeedRef} />

      {/* FEED HEADER & REAL-TIME STATS BANNER */}
      <section className="p-3.5 rounded-2xl bg-gradient-to-br from-emerald-950/40 via-[#0a1224] to-[#060a14] border border-emerald-500/20 relative overflow-hidden">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase font-bold text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Public Community Timeline</span>
            </div>
            <h3 className="font-display text-base sm:text-lg font-bold text-white">
              Community Comments & Oral Feed
            </h3>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              Real-time microblog of oral histories, lineage facts, dialect greetings, and local updates across Igbo settlements.
            </p>
          </div>
          <button
            type="button"
            onClick={loadAllComments}
            className="shrink-0 p-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 text-slate-300 hover:text-white transition-all active:scale-95"
            title="Refresh Timeline"
            aria-label="Refresh Timeline"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-emerald-400' : ''}`} />
          </button>
        </div>
      </section>

      {/* TWEET-STYLE COMPOSER (Top of Feed) */}
      <section className="card p-3.5 border-emerald-500/25 bg-gradient-to-b from-white/[0.04] to-white/[0.01] shadow-xl">
        <form onSubmit={handlePostComment} className="space-y-3">
          {/* Tagged Location Pill */}
          <div className="flex items-center justify-between gap-2 flex-wrap pb-2 border-b border-white/[0.06]">
            <div className="flex items-center gap-1.5 min-w-0">
              <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              {activeTaggedCommunity ? (
                <div className="flex items-center gap-1 min-w-0">
                  <span className="text-xs font-semibold text-emerald-300 truncate">
                    {activeTaggedCommunity.name}
                    {activeTaggedCommunity.lgaName ? ` · ${activeTaggedCommunity.lgaName}` : ''}
                    {activeTaggedCommunity.stateName ? `, ${activeTaggedCommunity.stateName}` : ''}
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsPickingCommunity(true)}
                    className="text-[10px] text-slate-400 hover:text-white underline ml-1"
                  >
                    Change
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsPickingCommunity(true)}
                  className="text-xs text-amber-300 hover:text-amber-200 underline font-semibold flex items-center gap-1"
                >
                  <span>Tag a Community to Post</span>
                  <ChevronDown className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Category Chip Selector */}
            <select
              value={category}
              onChange={(e: any) => setCategory(e.target.value)}
              className="bg-black/50 border border-white/10 rounded-lg px-2 py-1 text-[11px] text-slate-200 focus:outline-none focus:border-emerald-500 font-mono"
            >
              <option value="oral-history">📜 Oral History</option>
              <option value="dialect">🗣️ Dialect & Phrase</option>
              <option value="lineage">🌿 Lineage & Clan</option>
              <option value="tradition">🎭 Traditional Customs</option>
              <option value="general">📢 General Update</option>
            </select>
          </div>

          {/* Autocomplete Community Search Modal / Dropdown */}
          {isPickingCommunity && (
            <div className="p-2.5 rounded-xl bg-[#090e1c] border border-emerald-500/30 space-y-2 animate-in fade-in duration-150">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-white uppercase font-mono">Select Location to Tag</span>
                <button
                  type="button"
                  onClick={() => setIsPickingCommunity(false)}
                  className="p-1 text-slate-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <input
                type="text"
                placeholder="Search from 736+ towns, clans, LGAs…"
                value={communitySearch}
                onChange={(e) => setCommunitySearch(e.target.value)}
                className="w-full h-8 px-2.5 rounded-lg bg-white/[0.05] border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                autoFocus
              />
              <div className="max-h-36 overflow-y-auto space-y-1">
                {filteredCommunityPickerOptions.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      setSelectedCommId(c.id);
                      setIsPickingCommunity(false);
                      setCommunitySearch('');
                    }}
                    className={`w-full text-left px-2 py-1.5 rounded-lg text-xs flex items-center justify-between hover:bg-emerald-500/20 ${
                      selectedCommId === c.id ? 'bg-emerald-500/25 text-emerald-300 font-bold' : 'text-slate-300'
                    }`}
                  >
                    <span className="truncate">{c.name}</span>
                    <span className="text-[10px] text-slate-500 font-mono shrink-0 ml-2">
                      {c.lgaName ? `${c.lgaName}, ` : ''}{c.stateName}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Textarea Composer */}
          <div className="relative">
            <textarea
              ref={composerTextareaRef}
              rows={isComposerExpanded ? 3 : 2}
              maxLength={500}
              placeholder="What's happening in your community? Share an oral tradition, lineage note, dialect phrase, or borderland history…"
              value={commentText}
              onFocus={() => setIsComposerExpanded(true)}
              onChange={(e) => setCommentText(e.target.value)}
              className="w-full bg-transparent border-0 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none resize-none leading-relaxed"
            />
          </div>

          {/* Author Details (Expandable) */}
          {isComposerExpanded && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-white/[0.06] text-xs animate-in fade-in duration-200">
              <div>
                <input
                  type="text"
                  placeholder="Your Name (or Clan Title)"
                  value={authorName}
                  onChange={(e) => setAuthorName(e.target.value)}
                  className="w-full h-7 px-2 rounded-lg bg-white/[0.04] border border-white/10 text-white placeholder-slate-500 text-[11px] focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <input
                  type="text"
                  placeholder="Handle (@username)"
                  value={authorHandle}
                  onChange={(e) => setAuthorHandle(e.target.value)}
                  className="w-full h-7 px-2 rounded-lg bg-white/[0.04] border border-white/10 text-white placeholder-slate-500 text-[11px] font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <select
                  value={affiliation}
                  onChange={(e) => setAffiliation(e.target.value)}
                  className="w-full h-7 px-2 rounded-lg bg-[#090e1c] border border-white/10 text-slate-300 text-[11px] focus:outline-none focus:border-emerald-500"
                >
                  <option value="Indigene">Indigene</option>
                  <option value="Clan Elder">Clan Elder</option>
                  <option value="Youth Leader">Youth Leader</option>
                  <option value="Linguist / Oral Historian">Linguist / Historian</option>
                  <option value="Resident">Resident</option>
                  <option value="Diaspora Member">Diaspora Member</option>
                </select>
              </div>
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

        {/* State Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 no-scrollbar">
          <button
            type="button"
            onClick={() => setSelectedState('all')}
            className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-semibold transition-all shrink-0 ${
              selectedState === 'all'
                ? 'bg-emerald-500 text-black shadow-sm'
                : 'bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 border border-white/[0.06]'
            }`}
          >
            All States ({comments.length})
          </button>
          {stateOptions.map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setSelectedState(st)}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-semibold transition-all shrink-0 ${
                selectedState === st
                  ? 'bg-emerald-500 text-black shadow-sm'
                  : 'bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 border border-white/[0.06]'
              }`}
            >
              {st}
            </button>
          ))}
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 no-scrollbar">
          {[
            { id: 'all', label: 'All Categories' },
            { id: 'oral-history', label: '📜 Oral History' },
            { id: 'dialect', label: '🗣️ Dialect' },
            { id: 'lineage', label: '🌿 Lineage' },
            { id: 'tradition', label: '🎭 Tradition' },
          ].map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-2 py-0.5 rounded-md text-[10px] font-mono transition-all shrink-0 ${
                selectedCategory === cat.id
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {cat.label}
            </button>
          ))}
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
              No comments found {selectedState !== 'all' ? `for ${selectedState}` : ''} {searchQuery ? `matching "${searchQuery}"` : ''}.
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

                  {cmt.category && (
                    <span className="text-[9px] uppercase font-mono px-1.5 py-0.5 rounded bg-white/[0.04] border border-white/[0.08] text-slate-300 shrink-0">
                      {cmt.category.replace('-', ' ')}
                    </span>
                  )}
                </div>

                {/* SPATIAL ANCHOR LOCATION PILL (Click to fly map!) */}
                <div>
                  <button
                    type="button"
                    onClick={() => {
                      if (cmt.coordinates && cmt.coordinates[0] && cmt.coordinates[1]) {
                        onFlyTo(cmt.coordinates, 12);
                      }
                      onSelectCommunityByName(cmt.communityName);
                    }}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/25 text-emerald-300 text-[11px] font-semibold transition-all group-hover:border-emerald-500/50"
                    title={`Fly map to ${cmt.communityName}`}
                  >
                    <MapPin className="w-3 h-3 text-emerald-400 shrink-0" />
                    <span className="truncate max-w-[240px]">
                      {cmt.communityName}
                      {cmt.lgaName ? ` · ${cmt.lgaName}` : ''}
                      {cmt.stateName ? `, ${cmt.stateName}` : ''}
                    </span>
                    <ArrowUpRight className="w-3 h-3 text-emerald-400/80 shrink-0 ml-0.5" />
                  </button>
                </div>

                {/* TWEET BODY TEXT */}
                <p className="text-xs sm:text-[13px] text-slate-200 leading-relaxed whitespace-pre-wrap pl-2 border-l-2 border-emerald-500/40">
                  {cmt.comment}
                </p>

                {/* TWEET INTERACTION BAR (Like, Fly, Reply, Share) */}
                <div className="pt-2 border-t border-white/[0.05] flex items-center justify-between text-slate-400 text-xs">
                  {/* Fly Map Action */}
                  <button
                    type="button"
                    onClick={() => {
                      if (cmt.coordinates && cmt.coordinates[0] && cmt.coordinates[1]) {
                        onFlyTo(cmt.coordinates, 12);
                      }
                      onSelectCommunityByName(cmt.communityName);
                    }}
                    className="flex items-center gap-1 hover:text-emerald-300 transition-colors"
                  >
                    <MapPin className="w-3.5 h-3.5" />
                    <span className="text-[11px]">Map</span>
                  </button>

                  {/* Like Button */}
                  <button
                    type="button"
                    onClick={() => handleLike(cmt.id)}
                    className={`flex items-center gap-1.5 transition-all ${
                      isLiked ? 'text-rose-400 font-bold' : 'hover:text-rose-300'
                    }`}
                  >
                    <Heart
                      className={`w-3.5 h-3.5 ${
                        isLiked ? 'fill-rose-500 text-rose-500 scale-110' : ''
                      } transition-transform`}
                    />
                    <span className="text-[11px] font-mono">{currentLikes}</span>
                  </button>

                  {/* Reply Action */}
                  <button
                    type="button"
                    onClick={() => handleReply(cmt)}
                    className="flex items-center gap-1 hover:text-sky-300 transition-colors"
                  >
                    <Quote className="w-3.5 h-3.5" />
                    <span className="text-[11px]">Cite</span>
                  </button>

                  {/* Share Action */}
                  <button
                    type="button"
                    onClick={() => handleShareComment(cmt)}
                    className={`flex items-center gap-1 transition-colors ${
                      copiedId === cmt.id ? 'text-emerald-400 font-bold' : 'hover:text-white'
                    }`}
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    <span className="text-[11px]">
                      {copiedId === cmt.id ? 'Copied!' : 'Share'}
                    </span>
                  </button>
                </div>
              </article>
            );
          })
        )}
      </div>
    </div>
  );
}
