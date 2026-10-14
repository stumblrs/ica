'use client';

import React, { useState } from 'react';
import { Plus, X, Film, Image as ImageIcon, Link2, Check, AlertCircle, Play, HelpCircle } from 'lucide-react';
import { parseMediaUrl, type MediaItem } from '@/lib/media';

interface MediaUrlInputProps {
  media: MediaItem[];
  onChange: (media: MediaItem[]) => void;
  maxItems?: number;
  label?: string;
  helperText?: string;
}

export function MediaUrlInput({
  media,
  onChange,
  maxItems = 6,
  label = 'Photographs & Videos (Copy & Paste URLs)',
  helperText = 'Paste direct image links (.jpg, .png, .webp) or video URLs (YouTube, Vimeo, MP4). No storage fees required.',
}: MediaUrlInputProps) {
  const [urlInput, setUrlInput] = useState('');
  const [captionInput, setCaptionInput] = useState('');
  const [creditInput, setCreditInput] = useState('');
  const [showHelperTips, setShowHelperTips] = useState(false);

  // Live preview candidate
  const candidateMedia = urlInput.trim() ? parseMediaUrl(urlInput.trim(), captionInput, creditInput) : null;

  const handleAdd = () => {
    if (!candidateMedia) return;
    if (media.length >= maxItems) return;

    onChange([...media, candidateMedia]);
    setUrlInput('');
    setCaptionInput('');
    setCreditInput('');
  };

  const handleRemove = (id: string) => {
    onChange(media.filter((m) => m.id !== id));
  };

  return (
    <div className="space-y-2.5 p-3.5 rounded-2xl bg-black/40 border border-white/[0.08]">
      {/* Header */}
      <div className="flex items-center justify-between">
        <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block font-['Outfit'] flex items-center gap-1.5">
          <Link2 className="w-3.5 h-3.5 text-emerald-400" />
          <span>{label}</span>
        </label>
        <button
          type="button"
          onClick={() => setShowHelperTips((prev) => !prev)}
          className="text-[10px] text-slate-400 hover:text-emerald-300 flex items-center gap-1 transition-colors"
        >
          <HelpCircle className="w-3 h-3" />
          <span>Supported links</span>
        </button>
      </div>

      {helperText && (
        <p className="text-[10px] text-slate-400 leading-tight">
          {helperText}
        </p>
      )}

      {/* Helpful URL source tips drawer */}
      {showHelperTips && (
        <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/10 text-[10px] text-slate-300 space-y-1.5 animate-in fade-in">
          <p className="font-semibold text-emerald-300">Where can you copy image/video URLs from?</p>
          <ul className="list-disc list-inside space-y-0.5 text-slate-400">
            <li><strong className="text-white">YouTube / Shorts:</strong> Copy video link (e.g. <code className="text-amber-300 font-mono">https://youtu.be/...</code> or <code className="text-amber-300 font-mono">youtube.com/watch?v=...</code>)</li>
            <li><strong className="text-white">Free Image Hosts:</strong> Upload to Postimages.org or Imgur.com and copy the <em>Direct Link</em></li>
            <li><strong className="text-white">Wikimedia Commons / Wikipedia:</strong> Right-click image &rarr; <em>Copy image address</em></li>
            <li><strong className="text-white">Cloud / Social:</strong> Public image links from Google Drive, Cloudinary, or Unsplash</li>
          </ul>
        </div>
      )}

      {/* URL Input Row */}
      {media.length < maxItems && (
        <div className="space-y-2 pt-1">
          <div className="flex gap-2">
            <input
              type="url"
              placeholder="Paste Image URL or YouTube/Vimeo video link..."
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              className="flex-1 px-3 py-1.5 bg-black/60 border border-white/15 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-all font-mono"
            />
            <button
              type="button"
              disabled={!candidateMedia}
              onClick={handleAdd}
              className="px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-black font-bold text-xs flex items-center gap-1 shadow-sm disabled:opacity-40 disabled:pointer-events-none transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Attach</span>
            </button>
          </div>

          {/* Optional Caption & Attribution Row */}
          {urlInput.trim().length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 animate-in fade-in">
              <input
                type="text"
                placeholder="Caption (e.g. Village square Obi / town gate)"
                value={captionInput}
                onChange={(e) => setCaptionInput(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-black/40 border border-white/10 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
              <input
                type="text"
                placeholder="Credit / Source (e.g. Photo by Emeka, 2024)"
                value={creditInput}
                onChange={(e) => setCreditInput(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-black/40 border border-white/10 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>
          )}

          {/* Live Preview of Pasted URL */}
          {candidateMedia && (
            <div className="flex items-center gap-2.5 p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 animate-in fade-in">
              <div className="w-12 h-10 rounded-lg overflow-hidden bg-black/60 shrink-0 border border-white/10 flex items-center justify-center">
                {candidateMedia.thumbnailUrl ? (
                  <img
                    src={candidateMedia.thumbnailUrl}
                    alt="Preview"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src =
                        'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="48" height="40" viewBox="0 0 48 40"><rect fill="%23111827" width="48" height="40"/><text fill="%2310B981" font-size="8" x="50%" y="50%" text-anchor="middle">Valid</text></svg>';
                    }}
                  />
                ) : (
                  <Play className="w-4 h-4 text-cyan-400" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[10px] font-mono text-emerald-300 font-bold uppercase block">
                  ✓ Valid {candidateMedia.type === 'video' ? `${candidateMedia.provider} video` : 'image'} detected
                </span>
                <p className="text-[11px] text-slate-300 truncate">
                  {candidateMedia.caption || candidateMedia.url}
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* List of Currently Attached Media */}
      {media.length > 0 && (
        <div className="space-y-1.5 pt-1">
          <span className="text-[9px] font-mono uppercase tracking-wider text-slate-400 block">
            Attached Media ({media.length} of {maxItems}):
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {media.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-2 rounded-xl bg-white/[0.04] border border-white/10 group"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-9 h-9 rounded-lg bg-black/60 overflow-hidden shrink-0 border border-white/10 flex items-center justify-center">
                    {item.thumbnailUrl ? (
                      <img src={item.thumbnailUrl} alt="Thumb" className="w-full h-full object-cover" />
                    ) : item.type === 'video' ? (
                      <Film className="w-4 h-4 text-cyan-400" />
                    ) : (
                      <ImageIcon className="w-4 h-4 text-emerald-400" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <span className="text-[9px] font-mono font-bold uppercase text-emerald-400 block">
                      {item.type} • {item.provider}
                    </span>
                    <p className="text-[11px] text-slate-200 truncate font-medium">
                      {item.caption || item.url}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleRemove(item.id)}
                  className="p-1 rounded-lg text-slate-400 hover:text-red-400 hover:bg-white/10 transition-colors"
                  title="Remove media item"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
