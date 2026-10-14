'use client';

import React, { useState } from 'react';
import { X, Camera, Film, Link as LinkIcon, CheckCircle2, AlertCircle, Loader2, Sparkles, MapPin } from 'lucide-react';
import { parseMediaUrl, type MediaItem } from '@/lib/media';

interface QuickMediaUploadModalProps {
  feature: {
    name: string;
    parentName?: string;
    code?: string;
    coordinates?: [number, number];
    lgaName?: string;
    stateName?: string;
  };
  onClose: () => void;
  onSuccess: (community: any, mediaItem: any) => void;
}

export function QuickMediaUploadModal({
  feature,
  onClose,
  onSuccess,
}: QuickMediaUploadModalProps) {
  const [url, setUrl] = useState('');
  const [caption, setCaption] = useState('');
  const [contributorName, setContributorName] = useState('');
  const [credit, setCredit] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Live parsed preview
  const parsedPreview: MediaItem | null = React.useMemo(() => {
    if (!url.trim()) return null;
    return parseMediaUrl(url.trim(), caption, credit);
  }, [url, caption, credit]);

  // Extract LGA and State from parentName if not explicitly provided
  const lgaName = feature.lgaName || (feature.parentName ? feature.parentName.split(',')[0]?.replace('LGA', '').trim() : undefined);
  const stateName = feature.stateName || (feature.parentName ? feature.parentName.split(',')[1]?.replace('State', '').trim() : undefined);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim()) {
      setError('Please enter or paste an image or video URL.');
      return;
    }

    const mediaItem = parsedPreview || parseMediaUrl(url.trim(), caption, credit);
    if (!mediaItem) {
      setError('Invalid media URL. Please provide a direct image link (.jpg, .png, .webp) or video link (YouTube, Vimeo, MP4).');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const res = await fetch('/api/communities/media', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          communityId: feature.code?.startsWith('comm-') ? feature.code : undefined,
          name: feature.name,
          latitude: feature.coordinates ? feature.coordinates[1] : undefined,
          longitude: feature.coordinates ? feature.coordinates[0] : undefined,
          lgaName,
          stateName,
          media: mediaItem,
          contributorName: contributorName.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || 'Failed to save media to settlement.');
      }

      const data = await res.json();
      onSuccess(data.community, data.mediaItem);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error uploading media URL.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-lg rounded-2xl bg-[#090e1c] border border-white/15 shadow-2xl overflow-hidden text-white flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-white/10 flex items-start justify-between gap-3 bg-gradient-to-r from-emerald-950/40 via-transparent to-transparent">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center shrink-0 text-emerald-400">
              <Camera className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider text-emerald-400 font-bold">
                <Sparkles className="w-3 h-3 text-emerald-400" />
                <span>Zero-Cost Media Attachment</span>
              </div>
              <h2 className="text-base sm:text-lg font-bold font-display text-white truncate leading-tight mt-0.5">
                {feature.name}
              </h2>
              {feature.parentName && (
                <p className="text-xs text-slate-400 flex items-center gap-1 truncate mt-0.5">
                  <MapPin className="w-3 h-3 text-cyan-400 shrink-0" />
                  <span className="truncate">{feature.parentName}</span>
                </p>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Close upload modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1">
          {/* URL Input */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-300">
              Paste Image or Video URL <span className="text-emerald-400">*</span>
            </label>
            <div className="relative">
              <input
                type="url"
                required
                autoFocus
                placeholder="https://youtube.com/watch?v=... or https://...jpg / png / webm"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-white/[0.05] border border-white/10 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors font-mono"
              />
              <LinkIcon className="w-4 h-4 text-slate-500 absolute left-3 top-2.5 pointer-events-none" />
            </div>
            <p className="text-[10px] text-slate-400 leading-normal">
              Supported: YouTube (standard, shorts, embed), Vimeo, Wikimedia Commons, Unsplash, Imgur, Postimages, or direct MP4/JPG links.
            </p>
          </div>

          {/* Live Instant Preview Card */}
          {parsedPreview && (
            <div className="p-3 rounded-xl bg-black/60 border border-emerald-500/30 space-y-2 animate-in fade-in duration-150">
              <div className="flex items-center justify-between text-[11px] font-mono">
                <span className="flex items-center gap-1.5 text-emerald-400 font-bold uppercase">
                  {parsedPreview.type === 'video' ? <Film className="w-3.5 h-3.5" /> : <Camera className="w-3.5 h-3.5" />}
                  <span>Detected {parsedPreview.provider.toUpperCase()} {parsedPreview.type.toUpperCase()}</span>
                </span>
                <span className="text-emerald-400 flex items-center gap-1 text-[10px]">
                  <CheckCircle2 className="w-3 h-3" /> Ready to link
                </span>
              </div>

              <div className="relative w-full h-36 rounded-lg overflow-hidden bg-slate-900 border border-white/10 flex items-center justify-center">
                {parsedPreview.type === 'video' && parsedPreview.embedUrl ? (
                  <iframe
                    src={parsedPreview.embedUrl}
                    className="w-full h-full border-0 pointer-events-none"
                    title="Video Preview"
                    sandbox="allow-scripts allow-same-origin"
                  />
                ) : parsedPreview.thumbnailUrl || parsedPreview.url ? (
                  <img
                    src={parsedPreview.thumbnailUrl || parsedPreview.url}
                    alt="Preview"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src =
                        'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="200" viewBox="0 0 400 200"><rect fill="%231e293b" width="400" height="200"/><text fill="%2394a3b8" x="50%" y="50%" font-size="14" text-anchor="middle">Image preview unavailable (will embed directly)</text></svg>';
                    }}
                  />
                ) : (
                  <div className="text-xs text-slate-500 font-mono">Preview rendering…</div>
                )}
              </div>
            </div>
          )}

          {/* Caption / Description */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-300">
              Caption / Cultural Significance
            </label>
            <input
              type="text"
              placeholder={`e.g. Village square gathering, ancient shrine, or festive celebration in ${feature.name}`}
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              className="w-full px-3 py-2 bg-white/[0.05] border border-white/10 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Contributor & Source Attributions */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-300">
                Your Name / Alias (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Native resident, clan historian"
                value={contributorName}
                onChange={(e) => setContributorName(e.target.value)}
                className="w-full px-3 py-2 bg-white/[0.05] border border-white/10 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-300">
                Credit / Attribution (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. YouTube / Wikimedia / Photographer"
                value={credit}
                onChange={(e) => setCredit(e.target.value)}
                className="w-full px-3 py-2 bg-white/[0.05] border border-white/10 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-red-500/15 border border-red-500/30 text-xs text-red-300 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Action Footer */}
          <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !url.trim()}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:brightness-110 active:scale-95 text-black font-bold text-xs flex items-center gap-2 shadow-lg shadow-emerald-500/20 disabled:opacity-50 transition-all"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Attaching to {feature.name}…</span>
                </>
              ) : (
                <>
                  <Camera className="w-3.5 h-3.5" />
                  <span>Attach to {feature.name}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
