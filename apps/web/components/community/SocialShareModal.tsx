'use client';

import React, { useState } from 'react';
import { X, Copy, Check, Share2, ExternalLink } from 'lucide-react';
import type { EnrichedComment } from '@/app/api/comments/route';

interface SocialShareModalProps {
  comment: EnrichedComment;
  onClose: () => void;
}

export function SocialShareModal({ comment, onClose }: SocialShareModalProps) {
  const [copied, setCopied] = useState(false);

  const origin =
    typeof window !== 'undefined' && window.location.origin
      ? window.location.origin
      : 'https://igboculturalatlas.org';
  const shareUrl = `${origin}/?comment=${encodeURIComponent(comment.id)}`;

  const cleanSnippet =
    comment.comment.length > 130
      ? `${comment.comment.slice(0, 127).trim()}…`
      : comment.comment.trim();
  const shareTitle = `Oral Testimony by ${comment.authorName}`;
  const shareText = `"${cleanSnippet}" — ${comment.authorName} (${comment.handle || '@resident'}) on Igbo Cultural Atlas`;

  // Direct social media share endpoints
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
      } catch (err: any) {
        // User aborted or dismiss
      }
    }
  }

  const supportsNativeShare =
    typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-3 sm:p-4 pt-3 sm:pt-8 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Card (Pops up at the top) */}
      <div className="relative w-full max-w-sm sm:max-w-md bg-[#000000] border border-[#2f3336] rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-top-4 fade-in duration-200 z-10 flex flex-col">
        {/* Header */}
        <div className="h-10 px-3.5 border-b border-[#2f3336] flex items-center justify-between shrink-0 bg-[#000000]/95">
          <div className="flex items-center gap-1.5">
            <Share2 className="w-3.5 h-3.5 text-emerald-400" />
            <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
              Share Oral Testimony
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-full text-[#71767b] hover:text-white hover:bg-[#16181c] transition-all"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Testimony Preview Quote */}
        <div className="p-3 bg-gradient-to-b from-[#16181c] to-[#0a0c10] border-b border-[#2f3336]">
          <div className="flex items-center gap-2 mb-1.5">
            <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-400 p-[1px] shrink-0">
              <div className="w-full h-full rounded-full bg-[#000000] flex items-center justify-center text-[9px] font-bold text-emerald-300">
                {comment.authorName.charAt(0).toUpperCase()}
              </div>
            </div>
            <div className="min-w-0">
              <span className="text-xs font-bold text-white truncate block leading-tight">
                {comment.authorName}
              </span>
              <span className="text-[10px] font-mono text-slate-400 truncate block">
                {comment.handle || '@resident'}
              </span>
            </div>
          </div>
          <p className="text-xs text-slate-200 line-clamp-2 leading-relaxed italic border-l-2 border-emerald-500/50 pl-2">
            "{cleanSnippet}"
          </p>
        </div>

        {/* Direct Social Media Share Options */}
        <div className="p-2.5 space-y-1 max-h-[52vh] overflow-y-auto">
          <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 px-1 font-semibold">
            Choose Platform to Share
          </span>

          <div className="space-y-1 pt-0.5">
            {socialTargets.map((s) => (
              <a
                key={s.name}
                href={s.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setTimeout(onClose, 400)}
                className={`w-full p-2 rounded-xl border border-white/[0.08] flex items-center justify-between transition-all group active:scale-[0.99] ${s.bgClass}`}
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${s.iconBg}`}
                  >
                    {s.icon}
                  </div>
                  <div className="text-left">
                    <span className="text-xs font-bold text-white block leading-tight">
                      {s.name}
                    </span>
                    <span className="text-[10px] text-slate-400 block leading-tight">
                      {s.description}
                    </span>
                  </div>
                </div>
                <ExternalLink className="w-3 h-3 text-slate-500 group-hover:text-white transition-colors mr-1" />
              </a>
            ))}

            {/* Native OS Device Share Button (if supported) */}
            {supportsNativeShare && (
              <button
                type="button"
                onClick={handleNativeShare}
                className="w-full p-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 flex items-center justify-between transition-all group active:scale-[0.99]"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                    <Share2 className="w-3.5 h-3.5" />
                  </div>
                  <div className="text-left">
                    <span className="text-xs font-bold text-white block leading-tight">
                      More Apps & System Share
                    </span>
                    <span className="text-[10px] text-emerald-400/80 block leading-tight">
                      Open device share sheet (Instagram, Messages, etc.)
                    </span>
                  </div>
                </div>
                <Share2 className="w-3.5 h-3.5 text-emerald-400 group-hover:scale-110 transition-transform mr-1" />
              </button>
            )}
          </div>
        </div>

        {/* Copy Link Footer Bar */}
        <div className="p-2.5 bg-[#111317] border-t border-[#2f3336] flex items-center gap-2">
          <input
            type="text"
            readOnly
            value={shareUrl}
            className="flex-1 bg-black/60 border border-white/10 rounded-lg px-2.5 py-1 text-xs text-slate-300 font-mono truncate focus:outline-none"
          />
          <button
            type="button"
            onClick={handleCopy}
            className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 shrink-0 ${
              copied
                ? 'bg-emerald-500 text-black shadow-md'
                : 'bg-white/10 hover:bg-white/20 text-white'
            }`}
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-black stroke-[3]" />
                <span>Copied!</span>
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
  );
}
