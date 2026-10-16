'use client';

const DEVICE_ID_KEY = 'ica_client_device_id';
const DEVICE_FINGERPRINT_KEY = 'ica_client_fingerprint_hash';
const DEVICE_SYNC_SESSION_KEY = 'ica_device_sync_session';
const DEVICE_VOTES_KEY = 'ica_client_votes';
const DEVICE_PETITIONS_KEY = 'ica_client_petitions';

/**
 * Returns a stable, anonymous unique client Device ID stored in localStorage.
 * Used for registration-free community governance, rate limiting, and anti-duplicate voting.
 */
export function getOrCreateDeviceId(): string {
  if (typeof window === 'undefined') {
    return 'srv-anonymous';
  }

  let deviceId = localStorage.getItem(DEVICE_ID_KEY);
  if (!deviceId) {
    // Generate RFC4122 v4 UUID
    deviceId = 'dev_' + 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
    localStorage.setItem(DEVICE_ID_KEY, deviceId);
  }
  return deviceId;
}

/**
 * Generates a Canvas 2D fingerprint component.
 * Canvas rendering varies across GPU architectures, rasterization engines, and OS font smoothers.
 */
function getCanvasFingerprint(): string {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 280;
    canvas.height = 60;
    const ctx = canvas.getContext('2d');
    if (!ctx) return 'no-canvas';

    // Background rectangle
    ctx.textBaseline = 'top';
    ctx.font = '14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = '#10b981';
    ctx.fillRect(120, 1, 60, 20);

    // Text with blending and emojis
    ctx.fillStyle = '#06b6d4';
    ctx.fillText('IgboAtlas: Ịkpa Ókè ⚡ 🌍', 2, 15);
    ctx.fillStyle = 'rgba(234, 179, 8, 0.7)';
    ctx.fillText('IgboAtlas: Ịkpa Ókè ⚡ 🌍', 4, 17);

    // Arc & shadow
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#6366f1';
    ctx.beginPath();
    ctx.arc(50, 40, 15, 0, Math.PI * 2, true);
    ctx.closePath();
    ctx.fill();

    return canvas.toDataURL();
  } catch {
    return 'canvas-unsupported';
  }
}

/**
 * Generates a WebGL hardware & renderer fingerprint component.
 */
function getWebGLFingerprint(): string {
  try {
    const canvas = document.createElement('canvas');
    const gl =
      (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')) as
        | WebGLRenderingContext
        | null;
    if (!gl) return 'no-webgl';

    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    const vendor = debugInfo ? gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) : 'unknown-vendor';
    const renderer = debugInfo ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : 'unknown-renderer';
    const maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE) || 0;
    const shadingLanguage = gl.getParameter(gl.SHADING_LANGUAGE_VERSION) || '';

    return `${vendor}~${renderer}~${maxTextureSize}~${shadingLanguage}`;
  } catch {
    return 'webgl-unsupported';
  }
}

/**
 * Computes a robust SHA-256 hex hash from raw entropy string using native Web Crypto.
 */
async function computeSha256Hex(entropy: string): Promise<string> {
  try {
    if (typeof window !== 'undefined' && window.crypto?.subtle) {
      const encoder = new TextEncoder();
      const data = encoder.encode(entropy);
      const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
      return `fp_${hex}`;
    }
  } catch {
    /* Fallback below */
  }

  // Fast deterministic fallback hash (FNV-1a / Murmur3 inspired) for non-crypto contexts
  let h1 = 0xdeadbeef;
  let h2 = 0x41c64e6d;
  for (let i = 0; i < entropy.length; i++) {
    const ch = entropy.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  const part1 = (h1 >>> 0).toString(16).padStart(8, '0');
  const part2 = (h2 >>> 0).toString(16).padStart(8, '0');
  return `fp_${part1}${part2}${(entropy.length * 31).toString(16).padStart(8, '0')}`;
}

/**
 * Asynchronously generates and caches a stable device fingerprint hash.
 * Combines Canvas, WebGL, screen geometry, timezone, languages, and hardware concurrency.
 */
export async function getOrCreateDeviceFingerprint(): Promise<string> {
  if (typeof window === 'undefined') {
    return 'fp_server_rendered';
  }

  // 1. Check existing cached fingerprint in localStorage
  const cached = localStorage.getItem(DEVICE_FINGERPRINT_KEY);
  if (cached && cached.startsWith('fp_')) {
    return cached;
  }

  try {
    // 2. Gather entropy components
    const canvasEntropy = getCanvasFingerprint();
    const webglEntropy = getWebGLFingerprint();
    const screenEntropy = `${window.screen?.width || 0}x${window.screen?.height || 0}x${window.screen?.colorDepth || 0}@${window.devicePixelRatio || 1}`;
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    const timezoneOffset = new Date().getTimezoneOffset();
    const language = navigator.language || '';
    const languages = (navigator.languages || []).join(',');
    const hardwareConcurrency = navigator.hardwareConcurrency || 0;
    const maxTouchPoints = navigator.maxTouchPoints || 0;
    const platform = (navigator as any).userAgentData?.platform || navigator.platform || '';

    const entropyPayload = [
      canvasEntropy,
      webglEntropy,
      screenEntropy,
      timezone,
      timezoneOffset,
      language,
      languages,
      hardwareConcurrency,
      maxTouchPoints,
      platform,
    ].join('|||');

    // 3. Compute SHA-256
    const fingerprintHash = await computeSha256Hex(entropyPayload);
    localStorage.setItem(DEVICE_FINGERPRINT_KEY, fingerprintHash);
    return fingerprintHash;
  } catch (err) {
    console.warn('[Device] Fingerprint generation fallback:', err);
    const fallback = `fp_${getOrCreateDeviceId()}`;
    localStorage.setItem(DEVICE_FINGERPRINT_KEY, fallback);
    return fallback;
  }
}

/**
 * Synchronous getter for device fingerprint hash.
 * Returns cached hash if already generated, otherwise returns null or optimistic UUID hash.
 */
export function getDeviceFingerprintSync(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(DEVICE_FINGERPRINT_KEY) || null;
}

/**
 * Retrieves both the persistent device ID and the hardware fingerprint hash.
 */
export async function getDeviceIdentifiers(): Promise<{ deviceId: string; fingerprintHash: string }> {
  const deviceId = getOrCreateDeviceId();
  const fingerprintHash = await getOrCreateDeviceFingerprint();
  return { deviceId, fingerprintHash };
}

/**
 * Automatically registers / syncs the current device and its fingerprint with Supabase in the background.
 * Protected by session caching to avoid consuming free-tier Supabase egress on repeated renders.
 */
export async function autoSyncDeviceWithBackend(force = false): Promise<{
  deviceId: string;
  fingerprintHash: string;
  profile: any | null;
} | null> {
  if (typeof window === 'undefined') return null;

  try {
    const { deviceId, fingerprintHash } = await getDeviceIdentifiers();

    // Check if synced recently this session (15 minute session throttle unless forced)
    if (!force) {
      const lastSync = sessionStorage.getItem(DEVICE_SYNC_SESSION_KEY);
      if (lastSync && Date.now() - Number(lastSync) < 15 * 60 * 1000) {
        return { deviceId, fingerprintHash, profile: null };
      }
    }

    const res = await fetch('/api/device/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviceId, fingerprintHash }),
    });

    if (res.ok) {
      sessionStorage.setItem(DEVICE_SYNC_SESSION_KEY, Date.now().toString());
      const data = await res.json();

      // If backend has an existing profile linked to this device or fingerprint, hydrate localStorage!
      if (data.profile && data.profile.username) {
        const storedProfile = {
          deviceId,
          username: data.profile.username,
          displayName: data.profile.displayName || `@${data.profile.username}`,
          homeTown: data.profile.homeTown || '',
          stateOfOrigin: data.profile.stateOfOrigin || '',
          kindredClan: data.profile.kindredClan || '',
          bio: data.profile.bio || '',
          avatarSymbol: data.profile.avatarSymbol || 'ọ',
          role: data.profile.role || 'Native Contributor',
          joinedAt: data.profile.createdAt || new Date().toISOString(),
          autoSignContributions: true,
        };
        localStorage.setItem('ica_user_profile', JSON.stringify(storedProfile));
        window.dispatchEvent(new CustomEvent('ica:profile-updated', { detail: storedProfile }));
      }

      return {
        deviceId,
        fingerprintHash,
        profile: data.profile || null,
      };
    }
  } catch (err) {
    console.warn('[Device] Background auto-sync failed:', err);
  }

  return null;
}

/**
 * Check if the current device has already voted on a specific inquiry.
 */
export function hasDeviceVoted(inquiryId: string): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const raw = localStorage.getItem(DEVICE_VOTES_KEY);
    const votes: Record<string, string> = raw ? JSON.parse(raw) : {};
    return Boolean(votes[inquiryId]);
  } catch {
    return false;
  }
}

/**
 * Get the vote choice ('FOR' | 'AGAINST') if this device already voted on the inquiry.
 */
export function getDeviceVote(inquiryId: string): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(DEVICE_VOTES_KEY);
    const votes: Record<string, string> = raw ? JSON.parse(raw) : {};
    return votes[inquiryId] || null;
  } catch {
    return null;
  }
}

/**
 * Record a vote locally on this device.
 */
export function recordDeviceVote(inquiryId: string, choice: 'FOR' | 'AGAINST'): void {
  if (typeof window === 'undefined') return;
  try {
    const raw = localStorage.getItem(DEVICE_VOTES_KEY);
    const votes: Record<string, string> = raw ? JSON.parse(raw) : {};
    votes[inquiryId] = choice;
    localStorage.setItem(DEVICE_VOTES_KEY, JSON.stringify(votes));
  } catch {
    /* ignore */
  }
}

/**
 * Check if the device has created a petition for a community within the 24-hr cooldown.
 */
export function getDevicePetitionCooldown(communityId: string): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const raw = localStorage.getItem(DEVICE_PETITIONS_KEY);
    const petitions: Record<string, number> = raw ? JSON.parse(raw) : {};
    const timestamp = petitions[communityId];
    if (!timestamp) return false;
    const elapsed = Date.now() - timestamp;
    return elapsed < 24 * 60 * 60 * 1000; // 24 hours cooldown
  } catch {
    return false;
  }
}

/**
 * Record a petition submission for cooldown calculation.
 */
export function recordDevicePetition(communityId: string): void {
  if (typeof window === 'undefined') return;
  try {
    const raw = localStorage.getItem(DEVICE_PETITIONS_KEY);
    const petitions: Record<string, number> = raw ? JSON.parse(raw) : {};
    petitions[communityId] = Date.now();
    localStorage.setItem(DEVICE_PETITIONS_KEY, JSON.stringify(petitions));
  } catch {
    /* ignore */
  }
}
