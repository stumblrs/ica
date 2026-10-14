'use client';

import React, { useState } from 'react';
import { Play, Film, Image as ImageIcon, ExternalLink, Eye } from 'lucide-react';
import type { MediaItem } from '@/lib/media';
import { MediaLightboxModal } from './MediaLightboxModal';

interface MediaGalleryProps {
  media: MediaItem[];
  title?: string;
  columns?: 2 | 3 | 4;
}

export function MediaGallery({ media, title = 'Photographs & Video Records', columns = 3 }: MediaGalleryProps) {
  const [activeMedia, setActiveMedia] = useState<MediaItem | null>(null);

  if (!media || media.length === 0) return null;

  const colClasses = {
    2: 'grid-cols-2',
    3: 'grid-cols-2 sm:grid-cols-3',
    4: 'grid-cols-2 sm:grid-cols-4',
  }[columns];

  return (
    <div className="space-y-2">
      {title && (
        <div className="flex items-center justify-between">
          <span className="text-[10px] uppercase font-mono font-bold tracking-wider text-slate-400">
            {title} ({media.length})
          </span>
        </div>
      )}

      <div className={`grid ${colClasses} gap-2`}>
        {media.map((item) => {
          const isVideo = item.type === 'video';
          return (
            <div
              key={item.id}
              onClick={() => setActiveMedia(item)}
              className="group relative aspect-[4/3] rounded-xl overflow-hidden bg-black/60 border border-white/10 hover:border-emerald-500/50 cursor-pointer shadow-md transition-all hover:scale-[1.02]"
            >
              {/* Media Thumbnail */}
              {item.thumbnailUrl || !isVideo ? (
                <img
                  src={item.thumbnailUrl || item.url}
                  alt={item.caption || 'Community media'}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src =
                      'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="160" height="120" viewBox="0 0 160 120"><rect fill="%23111827" width="160" height="120"/><text fill="%239CA3AF" font-family="sans-serif" font-size="10" x="50%" y="50%" text-anchor="middle">Image</text></svg>';
                  }}
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900/90 text-cyan-400">
                  <Film className="w-6 h-6 mb-1 opacity-80" />
                  <span className="text-[9px] font-mono">Video Link</span>
                </div>
              )}

              {/* Gradient Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 pointer-events-none" />

              {/* Type Badge */}
              <div className="absolute top-1.5 left-1.5 z-10 flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-black/70 backdrop-blur-md border border-white/10 text-[9px] font-mono font-medium text-white">
                {isVideo ? (
                  <>
                    <Play className="w-2.5 h-2.5 text-cyan-400 fill-cyan-400" />
                    <span>Video</span>
                  </>
                ) : (
                  <>
                    <ImageIcon className="w-2.5 h-2.5 text-emerald-400" />
                    <span>Photo</span>
                  </>
                )}
              </div>

              {/* Hover Eye Trigger */}
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40">
                <div className="p-2 rounded-full bg-emerald-500/80 text-black shadow-lg">
                  <Eye className="w-4 h-4" />
                </div>
              </div>

              {/* Caption Preview at Bottom */}
              {item.caption && (
                <div className="absolute bottom-1 left-1.5 right-1.5 z-10">
                  <p className="text-[10px] text-white/90 truncate font-medium drop-shadow">
                    {item.caption}
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Lightbox Modal */}
      <MediaLightboxModal media={activeMedia} onClose={() => setActiveMedia(null)} />
    </div>
  );
}
