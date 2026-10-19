'use client';

import React, { useEffect, useState } from 'react';
import { X, Film, Play, ExternalLink, Loader2 } from 'lucide-react';
import { extractYouTubeId, extractVimeoId, isDirectVideoUrl } from '@/lib/media';

export interface VideoPlayerModalProps {
  url: string;
  title?: string;
  caption?: string;
  credit?: string;
  onClose: () => void;
}

export function VideoPlayerModal({ url, title, caption, credit, onClose }: VideoPlayerModalProps) {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!url) return null;

  const ytId = extractYouTubeId(url);
  const vimeoId = extractVimeoId(url);
  const isDirect = isDirectVideoUrl(url);

  let embedSrc = '';
  if (ytId) {
    embedSrc = `https://www.youtube-nocookie.com/embed/${ytId}?autoplay=1&rel=0&modestbranding=1`;
  } else if (vimeoId) {
    embedSrc = `https://player.vimeo.com/video/${vimeoId}?autoplay=1`;
  }

  const displayTitle = title || caption || (ytId ? 'YouTube Video' : vimeoId ? 'Vimeo Video' : 'Video Record');

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={displayTitle}
      className="fixed inset-0 z-[150] flex items-center justify-center p-3 sm:p-6 bg-black/90 backdrop-blur-xl animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative max-w-4xl w-full flex flex-col rounded-3xl bg-[#070b16] border border-white/20 shadow-2xl shadow-black overflow-hidden z-10"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header Bar with prominent [X] button */}
        <div className="flex items-center justify-between p-3.5 sm:p-4 border-b border-white/10 bg-gradient-to-r from-white/[0.05] to-transparent">
          <div className="flex items-center gap-2.5 min-w-0 pr-3">
            <div className="w-8 h-8 rounded-xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0">
              <Film className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-bold text-white tracking-tight truncate">
                {displayTitle}
              </h3>
              <p className="text-[11px] text-slate-400 font-mono truncate">
                In-app video playback
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.1] text-xs font-semibold text-slate-300 hover:text-white transition-all"
              title="Open video URL in new tab"
            >
              <span>Original Link</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>

            {/* Prominent [X] Close Button to go back inside the app */}
            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white/[0.08] hover:bg-rose-500/25 border border-white/[0.15] hover:border-rose-500/40 text-slate-300 hover:text-rose-300 flex items-center justify-center transition-all active:scale-95 shadow-md"
              title="Close video and return to app (Esc)"
              aria-label="Close video and return to app"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Video Stage Frame */}
        <div className="relative w-full aspect-video bg-black flex items-center justify-center overflow-hidden">
          {loading && (embedSrc || isDirect) && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/60 z-0 pointer-events-none">
              <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
              <span className="text-xs font-mono text-slate-400 tracking-wider">LOADING VIDEO</span>
            </div>
          )}

          {embedSrc ? (
            <iframe
              src={embedSrc}
              title={displayTitle}
              className="w-full h-full border-0 relative z-10"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              onLoad={() => setLoading(false)}
            />
          ) : (
            <video
              src={url}
              controls
              autoPlay
              playsInline
              className="w-full h-full object-contain relative z-10"
              onLoadedData={() => setLoading(false)}
            >
              Your browser does not support HTML5 video playback.
            </video>
          )}
        </div>

        {/* Optional Caption / Source Footer */}
        {(caption || credit) && (
          <div className="p-3 sm:p-4 bg-black/80 border-t border-white/[0.08] flex items-center justify-between text-xs text-slate-300">
            {caption && <p className="italic leading-snug line-clamp-2">{caption}</p>}
            {credit && (
              <span className="text-[10px] font-mono text-slate-400 shrink-0 ml-4">
                Source: {credit}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Global helper to trigger in-app video playback from anywhere
 */
export function openInAppVideo(url: string, title?: string) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('ica:play-video', {
        detail: { url, title },
      })
    );
  }
}
