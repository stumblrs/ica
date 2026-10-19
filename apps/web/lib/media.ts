/**
 * Utilities for URL-based media embedding (images and videos).
 * Enables free, zero-backend-storage media contributions by letting users
 * paste URLs from YouTube, Vimeo, Wikimedia, Unsplash, Imgur, Postimages, or direct links.
 */

export interface MediaItem {
  id: string;
  type: 'image' | 'video';
  url: string;
  provider: 'youtube' | 'vimeo' | 'direct_video' | 'image';
  embedUrl?: string;
  thumbnailUrl?: string;
  caption?: string;
  credit?: string;
}

/**
 * Extracts YouTube video ID from various YouTube URL formats
 * (watch?v=, youtu.be/, shorts/, embed/)
 */
export function extractYouTubeId(url: string): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  const regExp = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=|shorts\/)|youtu\.be\/)([^"&?\/\s]{11})/i;
  const match = trimmed.match(regExp);
  return match && match[1].length === 11 ? match[1] : null;
}

/**
 * Extracts Vimeo video ID
 */
export function extractVimeoId(url: string): string | null {
  if (!url) return null;
  const regExp = /(?:vimeo\.com\/(?:channels\/(?:\w+\/)?|groups\/([^\/]*)\/videos\/|album\/(\d+)\/video\/|video\/|)(\d+))/i;
  const match = url.trim().match(regExp);
  return match && match[3] ? match[3] : null;
}

/**
 * Checks if a URL points to a direct video file (.mp4, .webm, .ogg, .mov)
 */
export function isDirectVideoUrl(url: string): boolean {
  if (!url) return false;
  const clean = url.trim().toLowerCase().split('?')[0];
  return (
    clean.endsWith('.mp4') ||
    clean.endsWith('.webm') ||
    clean.endsWith('.ogg') ||
    clean.endsWith('.mov')
  );
}

/**
 * Checks if a URL is a playable video (YouTube, Vimeo, or direct video file)
 */
export function isVideoUrl(url: string): boolean {
  if (!url) return false;
  return Boolean(extractYouTubeId(url) || extractVimeoId(url) || isDirectVideoUrl(url));
}

/**
 * Checks if a URL points to an image
 */
export function isLikelyImageUrl(url: string): boolean {
  if (!url) return false;
  const clean = url.trim().toLowerCase().split('?')[0];
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg', '.avif'];
  if (imageExtensions.some((ext) => clean.endsWith(ext))) {
    return true;
  }
  // Known image hosting patterns
  const knownHosts = [
    'images.unsplash.com',
    'upload.wikimedia.org',
    'i.imgur.com',
    'postimg.cc',
    'i.postimg.cc',
    'res.cloudinary.com',
    'pbs.twimg.com',
    'media.giphy.com',
    'drive.google.com/uc?',
    'lh3.googleusercontent.com',
  ];
  return knownHosts.some((h) => url.toLowerCase().includes(h));
}

/**
 * Parses any pasted media URL into a structured MediaItem
 */
export function parseMediaUrl(url: string, caption?: string, credit?: string): MediaItem | null {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();
  if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
    return null;
  }

  // 1. YouTube
  const ytId = extractYouTubeId(trimmed);
  if (ytId) {
    return {
      id: `media-yt-${ytId}-${Date.now()}`,
      type: 'video',
      provider: 'youtube',
      url: trimmed,
      embedUrl: `https://www.youtube-nocookie.com/embed/${ytId}?rel=0`,
      thumbnailUrl: `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`,
      caption: caption?.trim() || undefined,
      credit: credit?.trim() || 'YouTube',
    };
  }

  // 2. Vimeo
  const vimeoId = extractVimeoId(trimmed);
  if (vimeoId) {
    return {
      id: `media-vimeo-${vimeoId}-${Date.now()}`,
      type: 'video',
      provider: 'vimeo',
      url: trimmed,
      embedUrl: `https://player.vimeo.com/video/${vimeoId}`,
      caption: caption?.trim() || undefined,
      credit: credit?.trim() || 'Vimeo',
    };
  }

  // 3. Direct Video
  if (isDirectVideoUrl(trimmed)) {
    return {
      id: `media-vid-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      type: 'video',
      provider: 'direct_video',
      url: trimmed,
      caption: caption?.trim() || undefined,
      credit: credit?.trim() || undefined,
    };
  }

  // 4. Default to Image (if recognized or standard HTTP URL)
  return {
    id: `media-img-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    type: 'image',
    provider: 'image',
    url: trimmed,
    thumbnailUrl: trimmed,
    caption: caption?.trim() || undefined,
    credit: credit?.trim() || undefined,
  };
}

/**
 * Scans a comment or text string for image and video URLs,
 * returning the clean text and any extracted media items.
 */
export function extractMediaFromText(text: string): { cleanText: string; media: MediaItem[] } {
  if (!text) return { cleanText: '', media: [] };

  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const urls = text.match(urlRegex) || [];
  const media: MediaItem[] = [];

  for (const rawUrl of urls) {
    // Strip trailing punctuation often typed at the end of sentences
    const cleanUrl = rawUrl.replace(/[.,;:!?)\]]+$/, '');
    const item = parseMediaUrl(cleanUrl);
    if (item) {
      media.push(item);
    }
  }

  return { cleanText: text, media };
}
