'use client';

import React, { useEffect } from 'react';
import { X, ExternalLink, Play, Film, Image as ImageIcon } from 'lucide-react';
import type { MediaItem } from '@/lib/media';

interface MediaLightboxModalProps {
  media: MediaItem | null;
  onClose: () => void;
}

export function MediaLightboxModal({ media, onClose }: MediaLightboxModalProps) {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!media) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/90 backdrop-blur-xl animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="relative max-w-4xl w-full max-h-[90vh] flex flex-col rounded-2xl bg-[#070b16] border border-white/15 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-3 sm:p-4 border-b border-white/10 bg-black/40">
          <div className="flex items-center gap-2 min-w-0">
            {media.type === 'video' ? (
              <Film className="w-4 h-4 text-cyan-400 shrink-0" />
            ) : (
              <ImageIcon className="w-4 h-4 text-emerald-400 shrink-0" />
            )}
            <span className="text-xs sm:text-sm font-bold text-white truncate">
              {media.caption || (media.type === 'video' ? 'Video Record' : 'Photographic Evidence')}
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <a
              href={media.url}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors text-xs flex items-center gap-1"
              title="Open original URL in new tab"
            >
              <span className="hidden sm:inline">Original</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
              title="Close (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 min-h-[300px] max-h-[70vh] bg-black flex items-center justify-center overflow-hidden">
          {media.type === 'video' ? (
            media.embedUrl ? (
              <iframe
                src={media.embedUrl}
                title={media.caption || 'Video presentation'}
                className="w-full h-full min-h-[360px] aspect-video border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            ) : (
              <video
                src={media.url}
                controls
                autoPlay
                className="max-h-[68vh] max-w-full rounded"
              >
                Your browser does not support HTML5 video.
              </video>
            )
          ) : (
            <img
              src={media.url}
              alt={media.caption || 'Community photograph'}
              className="max-h-[68vh] max-w-full object-contain select-none"
              onError={(e) => {
                // Handle broken external links gracefully
                (e.target as HTMLImageElement).src =
                  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300"><rect fill="%23111827" width="400" height="300"/><text fill="%239CA3AF" font-family="sans-serif" font-size="14" x="50%" y="50%" text-anchor="middle">Image preview unavailable or blocked by source</text></svg>';
              }}
            />
          )}
        </div>

        {/* Footer with caption and attribution */}
        {(media.caption || media.credit) && (
          <div className="p-3 sm:p-4 bg-black/60 border-t border-white/10 flex items-center justify-between text-xs text-slate-300">
            <p className="italic leading-snug">{media.caption}</p>
            {media.credit && (
              <span className="text-[10px] font-mono text-slate-400 shrink-0 ml-4">
                Source: {media.credit}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
