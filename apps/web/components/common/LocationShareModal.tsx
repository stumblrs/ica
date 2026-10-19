'use client';

import React, { useState } from 'react';
import { X, Copy, Check, Share2, MapPin, Compass, ExternalLink } from 'lucide-react';

export interface ShareableLocation {
  name: string;
  coordinates?: [number, number];
  stateName?: string;
  lgaName?: string;
  typeLabel?: string;
  placeType?: string;
  whyMarked?: string;
  historicalSignificance?: string;
}

interface LocationShareModalProps {
  location: ShareableLocation;
  onClose: () => void;
}

export function LocationShareModal({ location, onClose }: LocationShareModalProps) {
  const [copied, setCopied] = useState(false);

  const origin =
    typeof window !== 'undefined' && window.location.origin
      ? window.location.origin
      : 'https://ica-alpha.vercel.app';

  // Construct sharable URL with coordinates and name
  const shareUrl = (() => {
    const u = new URL(origin);
    if (location.coordinates && location.coordinates.length === 2) {
      u.searchParams.set('lng', location.coordinates[0].toFixed(5));
      u.searchParams.set('lat', location.coordinates[1].toFixed(5));
    }
    if (location.name) {
      u.searchParams.set('name', location.name);
    }
    return u.toString();
  })();

  const locationSubtitle = [
    location.typeLabel || location.placeType,
    location.lgaName && `${location.lgaName} LGA`,
    location.stateName && `${location.stateName} State`,
  ]
    .filter(Boolean)
    .join(' • ');

  const descriptionSnippet = location.historicalSignificance || location.whyMarked;
  const cleanSnippet = descriptionSnippet
    ? descriptionSnippet.length > 140
      ? `${descriptionSnippet.slice(0, 137).trim()}…`
      : descriptionSnippet.trim()
    : null;

  const shareTitle = `${location.name} — Igbo Cultural Atlas`;
  const shareText = `Explore ${location.name}${location.stateName ? ` (${location.stateName} State)` : ''} on the Igbo Cultural Atlas${
    cleanSnippet ? ` — "${cleanSnippet}"` : ''
  }`;

  // Direct social media share targets
  const socialTargets = [
    {
      name: 'WhatsApp',
      description: 'Share directly to WhatsApp chats & status',
      bgClass: 'hover:bg-emerald-500/15 border-emerald-500/30 text-emerald-400',
      iconBg: 'bg-[#25D366]/20 text-[#25D366]',
      url: `https://api.whatsapp.com/send?text=${encodeURIComponent(`${shareText}\n\n${shareUrl}`)}`,
      icon: (
        <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
          <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.711 2.598 2.664-.698c.97.589 1.77.92 2.793.921 3.182 0 5.768-2.587 5.768-5.766 0-3.18-2.586-5.768-5.765-5.768zm0 10.355c-.917 0-1.748-.27-2.482-.777l-.178-.122-1.572.412.419-1.533-.117-.187a4.67 4.67 0 0 1-.72-2.581c0-2.583 2.102-4.685 4.685-4.685 2.584 0 4.686 2.102 4.686 4.685 0 2.583-2.102 4.686-4.721 4.686z" />
          <path d="M12 2C6.477 2 2 6.477 2 12c0 1.891.528 3.662 1.45 5.184L2 22l4.943-1.412A9.957 9.957 0 0 0 12 22c5.523 0 10-4.477 10-10S17.523 2 12 2zm0 18.25c-1.637 0-3.167-.487-4.453-1.328l-.32-.209-3.238.925.932-3.149-.228-.337A8.212 8.212 0 0 1 3.75 12c0-4.549 3.701-8.25 8.25-8.25 4.549 0 8.25 3.701 8.25 8.25 0 4.549-3.701 8.25-8.25 8.25z" />
        </svg>
      ),
    },
    {
      name: 'X (formerly Twitter)',
      description: 'Post directly to your timeline',
      bgClass: 'hover:bg-white/10 border-white/20 text-white',
      iconBg: 'bg-white/10 text-white',
      url: `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`,
      icon: (
        <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      ),
    },
    {
      name: 'Facebook',
      description: 'Share to Facebook feed or groups',
      bgClass: 'hover:bg-blue-500/15 border-blue-500/30 text-blue-400',
      iconBg: 'bg-[#1877F2]/20 text-[#1877F2]',
      url: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}&quote=${encodeURIComponent(shareText)}`,
      icon: (
        <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
        </svg>
      ),
    },
    {
      name: 'Telegram',
      description: 'Forward to Telegram contacts & channels',
      bgClass: 'hover:bg-sky-500/15 border-sky-500/30 text-sky-400',
      iconBg: 'bg-[#229ED9]/20 text-[#229ED9]',
      url: `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`,
      icon: (
        <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 0 0-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z" />
        </svg>
      ),
    },
  ];

  function handleCopy() {
    try {
      navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {}
  }

  async function handleNativeShare() {
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share({
          title: shareTitle,
          text: shareText,
          url: shareUrl,
        });
      } catch {
        // User dismissed share dialog
      }
    }
  }

  const supportsNativeShare =
    typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="location-share-modal-title"
      className="fixed inset-0 z-[100] flex items-start sm:items-center justify-center p-3 sm:p-4 overflow-y-auto"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-md transition-opacity"
        aria-hidden="true"
        onClick={onClose}
      />

      {/* Modal Card */}
      <div className="relative w-full max-w-md my-auto rounded-3xl bg-[#090e1c] border border-white/[0.12] shadow-2xl shadow-black/80 overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-white/[0.08] flex items-center justify-between bg-gradient-to-b from-white/[0.04] to-transparent">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500/20 to-emerald-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0 shadow-lg shadow-amber-500/10">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <h3 id="location-share-modal-title" className="text-base font-bold text-white tracking-tight">
                Share Location
              </h3>
              <p className="text-xs text-slate-400">Share this place across social media</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.08] flex items-center justify-center text-slate-400 hover:text-white transition-all active:scale-95"
            aria-label="Close dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Location Preview Card */}
        <div className="p-4 sm:p-5 border-b border-white/[0.08] bg-white/[0.02]">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0 mt-0.5">
              <MapPin className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="text-sm font-bold text-white truncate">{location.name}</h4>
              {locationSubtitle && (
                <p className="text-[11px] text-slate-400 truncate mt-0.5">{locationSubtitle}</p>
              )}
              {cleanSnippet && (
                <p className="text-[11px] text-slate-300/90 italic leading-relaxed mt-2 line-clamp-2 bg-black/40 p-2 rounded-xl border border-white/[0.06]">
                  &ldquo;{cleanSnippet}&rdquo;
                </p>
              )}
              {location.coordinates && (
                <div className="mt-2 flex items-center gap-2 text-[10px] font-mono text-slate-400">
                  <span className="px-2 py-0.5 rounded-md bg-white/[0.05] border border-white/[0.08]">
                    Lng: {location.coordinates[0].toFixed(4)}
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-white/[0.05] border border-white/[0.08]">
                    Lat: {location.coordinates[1].toFixed(4)}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Social Platforms List */}
        <div className="p-4 sm:p-5 space-y-2 max-h-[45vh] overflow-y-auto">
          <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 px-1 font-semibold block">
            Choose Platform
          </span>

          <div className="space-y-2 pt-1">
            {socialTargets.map((target) => (
              <a
                key={target.name}
                href={target.url}
                target="_blank"
                rel="noopener noreferrer"
                className={`w-full p-3 rounded-2xl border border-white/[0.08] flex items-center justify-between transition-all group active:scale-[0.99] ${target.bgClass}`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 ${target.iconBg}`}
                  >
                    {target.icon}
                  </div>
                  <div className="text-left">
                    <span className="text-xs font-semibold text-white block group-hover:text-inherit">
                      {target.name}
                    </span>
                    <span className="text-[10px] text-slate-400 block line-clamp-1">
                      {target.description}
                    </span>
                  </div>
                </div>
                <ExternalLink className="w-3.5 h-3.5 opacity-40 group-hover:opacity-100 transition-opacity shrink-0" />
              </a>
            ))}

            {/* Native Share on supported devices (Mobile / Mac / Windows) */}
            {supportsNativeShare && (
              <button
                type="button"
                onClick={handleNativeShare}
                className="w-full p-3 rounded-2xl border border-white/[0.08] flex items-center justify-between transition-all group active:scale-[0.99] hover:bg-emerald-500/15 border-emerald-500/30 text-emerald-400"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 transition-transform group-hover:scale-105">
                    <Share2 className="w-4 h-4" />
                  </div>
                  <div className="text-left">
                    <span className="text-xs font-semibold text-white block group-hover:text-inherit">
                      More Options…
                    </span>
                    <span className="text-[10px] text-slate-400 block">
                      Use device share sheet (Instagram, Messages, AirDrop)
                    </span>
                  </div>
                </div>
                <ExternalLink className="w-3.5 h-3.5 opacity-40 group-hover:opacity-100 transition-opacity shrink-0" />
              </button>
            )}
          </div>
        </div>

        {/* Copy Direct Link Section */}
        <div className="p-4 sm:p-5 border-t border-white/[0.08] bg-[#050811]/90">
          <div className="flex items-center gap-2">
            <div className="flex-1 min-w-0 px-3 py-2 rounded-xl bg-black/60 border border-white/[0.1] text-xs font-mono text-slate-400 truncate select-all">
              {shareUrl}
            </div>
            <button
              type="button"
              onClick={handleCopy}
              className={`shrink-0 px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 ${
                copied
                  ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/30'
                  : 'bg-white/[0.1] hover:bg-white/[0.16] text-white border border-white/[0.12]'
              }`}
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
