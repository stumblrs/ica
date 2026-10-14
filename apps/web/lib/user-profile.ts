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

export function saveUserProfile(updates: Partial<UserProfile>): UserProfile {
  if (typeof window === 'undefined') {
    return {
      username: '',
      displayName: '',
      avatarSymbol: 'ọ',
      ...updates,
    };
  }

  const deviceId = getOrCreateDeviceId();

  try {
    const current = getUserProfile();
    const updated: UserProfile = {
      ...current,
      ...updates,
      deviceId,
      username: updates.username !== undefined ? cleanUsername(updates.username) : current.username,
      joinedAt: current.joinedAt || new Date().toISOString(),
    };

    // 1. Fast local persistence
    localStorage.setItem(PROFILE_KEY, JSON.stringify(updated));

    // 2. Notify all UI components across the client
    window.dispatchEvent(
      new CustomEvent('ica:profile-updated', {
        detail: updated,
      })
    );

    // 3. Asynchronously sync and bind profile with backend tied to this deviceId
    fetch('/api/profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated),
    }).catch((err) => {
      console.warn('[UserProfile] Backend profile sync deferred (offline):', err.message);
    });

    return updated;
  } catch (err) {
    console.error('Failed saving user profile:', err);
    return getUserProfile();
  }
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
