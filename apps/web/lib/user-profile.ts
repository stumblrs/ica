'use client';

import { getOrCreateDeviceId } from '@/lib/device';

export interface UserProfile {
  deviceId?: string;
  username: string; // e.g. "chidi_m" (stored without '@')
  displayName: string; // e.g. "Chidi Okafor"
  homeTown?: string; // e.g. "Awka"
  stateOfOrigin?: string; // e.g. "Anambra"
  kindredClan?: string; // e.g. "Umubele Kindred"
  bio?: string;
  avatarSymbol?: string; // "ọ" or initials or custom
  role?: string; // "Native Contributor" | "Elder / Custodian" | "Field Researcher"
  joinedAt?: string;
  autoSignContributions?: boolean;
}

const PROFILE_KEY = 'ica_user_profile';

export const DEFAULT_AVATARS = ['ọ', 'Ọ', 'ị', 'Ụ', 'ᛘ', '☀', '⚡', '🌿', '🦅', '🛖'];

export function getUserProfile(): UserProfile {
  if (typeof window === 'undefined') {
    return {
      deviceId: 'srv-anonymous',
      username: '',
      displayName: '',
      avatarSymbol: 'ọ',
      role: 'Native Contributor',
      autoSignContributions: true,
    };
  }

  const deviceId = getOrCreateDeviceId();

  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (!raw) {
      return {
        deviceId,
        username: '',
        displayName: '',
        avatarSymbol: 'ọ',
        role: 'Native Contributor',
        autoSignContributions: true,
      };
    }
    const parsed = JSON.parse(raw);
    return {
      deviceId,
      username: cleanUsername(parsed.username || ''),
      displayName: parsed.displayName || '',
      homeTown: parsed.homeTown || '',
      stateOfOrigin: parsed.stateOfOrigin || '',
      kindredClan: parsed.kindredClan || '',
      bio: parsed.bio || '',
      avatarSymbol: parsed.avatarSymbol || 'ọ',
      role: parsed.role || 'Native Contributor',
      joinedAt: parsed.joinedAt || new Date().toISOString(),
      autoSignContributions: parsed.autoSignContributions ?? true,
    };
  } catch {
    return {
      deviceId,
      username: '',
      displayName: '',
      avatarSymbol: 'ọ',
      role: 'Native Contributor',
      autoSignContributions: true,
    };
  }
}

export function cleanUsername(input: string): string {
  if (!input) return '';
  return input
    .trim()
    .replace(/^@+/, '')
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '')
    .slice(0, 30);
}

/**
 * Checks in real time with backend if a username is available globally or taken by another device.
 */
export async function checkUsernameAvailabilityRemote(
  username: string,
  deviceId?: string
): Promise<{
  available: boolean;
  isSelf: boolean;
  reason?: string;
}> {
  const clean = cleanUsername(username);
  if (!clean) {
    return { available: false, isSelf: false, reason: 'Please enter a username.' };
  }
  if (clean.length < 3) {
    return { available: false, isSelf: false, reason: 'Username must be at least 3 characters.' };
  }

  const effectiveDeviceId = deviceId || (typeof window !== 'undefined' ? getOrCreateDeviceId() : '');

  try {
    const res = await fetch(
      `/api/profile?checkUsername=${encodeURIComponent(clean)}&deviceId=${encodeURIComponent(effectiveDeviceId)}`
    );
    if (res.ok) {
      const data = await res.json();
      return {
        available: Boolean(data.available),
        isSelf: Boolean(data.isSelf),
        reason: data.reason,
      };
    }
  } catch (err) {
    console.warn('[UserProfile] Check username network fallback:', err);
  }

  // Fallback optimistic check if offline
  return { available: true, isSelf: false, reason: `@${clean} is valid.` };
}

/**
 * Validates and saves profile asynchronously, ensuring the handle is globally unique.
 */
export async function saveUserProfileAsync(
  updates: Partial<UserProfile>
): Promise<{
  success: boolean;
  profile?: UserProfile;
  error?: string;
  isTaken?: boolean;
}> {
  if (typeof window === 'undefined') {
    return { success: false, error: 'Cannot save outside browser window.' };
  }

  const deviceId = getOrCreateDeviceId();
  const current = getUserProfile();
  const candidateUsername = updates.username !== undefined ? cleanUsername(updates.username) : current.username;

  const candidateProfile: UserProfile = {
    ...current,
    ...updates,
    deviceId,
    username: candidateUsername,
    joinedAt: current.joinedAt || new Date().toISOString(),
  };

  try {
    // 1. Verify with backend first
    const res = await fetch('/api/profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(candidateProfile),
    });

    const data = await res.json();

    if (!res.ok) {
      return {
        success: false,
        error: data.error || 'Failed to register username.',
        isTaken: Boolean(data.isTaken || res.status === 409),
      };
    }

    // 2. Only persist to local device storage once verified
    const saved = data.profile || candidateProfile;
    localStorage.setItem(PROFILE_KEY, JSON.stringify(saved));

    // 3. Notify all client components
    window.dispatchEvent(
      new CustomEvent('ica:profile-updated', {
        detail: saved,
      })
    );

    return { success: true, profile: saved };
  } catch (err: any) {
    // If completely offline, save locally
    console.warn('[UserProfile] Offline profile save:', err.message);
    localStorage.setItem(PROFILE_KEY, JSON.stringify(candidateProfile));
    window.dispatchEvent(
      new CustomEvent('ica:profile-updated', {
        detail: candidateProfile,
      })
    );
    return { success: true, profile: candidateProfile };
  }
}

/**
 * Synchronous profile save helper for compatibility
 */
export function saveUserProfile(updates: Partial<UserProfile>): UserProfile {
  saveUserProfileAsync(updates);
  const current = getUserProfile();
  return { ...current, ...updates };
}

/**
 * Syncs profile from backend by deviceId if local storage is blank
 */
export async function syncProfileFromBackend(): Promise<UserProfile | null> {
  if (typeof window === 'undefined') return null;
  const deviceId = getOrCreateDeviceId();
  try {
    const res = await fetch(`/api/profile?deviceId=${encodeURIComponent(deviceId)}`);
    if (res.ok) {
      const data = await res.json();
      if (data && data.username) {
        localStorage.setItem(PROFILE_KEY, JSON.stringify(data));
        window.dispatchEvent(new CustomEvent('ica:profile-updated', { detail: data }));
        return data;
      }
    }
  } catch {
    // offline
  }
  return null;
}

/**
 * Returns formatted handle e.g. "@username" or empty string if unset
 */
export function formatHandle(username?: string): string {
  if (!username) return '';
  const clean = cleanUsername(username);
  return clean ? `@${clean}` : '';
}

/**
 * Returns a display signature for contributions e.g. "Chidi Okafor (@chidi_m)" or "@chidi_m"
 */
export function getContributorSignature(profile?: UserProfile): string {
  const p = profile || getUserProfile();
  if (p.displayName && p.username) {
    return `${p.displayName} (@${p.username})`;
  }
  if (p.displayName) return p.displayName;
  if (p.username) return `@${p.username}`;
  return '';
}
