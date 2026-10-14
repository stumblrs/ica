'use client';

export interface UserProfile {
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
      username: '',
      displayName: '',
      avatarSymbol: 'ọ',
      role: 'Native Contributor',
      autoSignContributions: true,
    };
  }

  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (!raw) {
      return {
        username: '',
        displayName: '',
        avatarSymbol: 'ọ',
        role: 'Native Contributor',
        autoSignContributions: true,
      };
    }
    const parsed = JSON.parse(raw);
    return {
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

  try {
    const current = getUserProfile();
    const updated: UserProfile = {
      ...current,
      ...updates,
      username: updates.username !== undefined ? cleanUsername(updates.username) : current.username,
      joinedAt: current.joinedAt || new Date().toISOString(),
    };

    localStorage.setItem(PROFILE_KEY, JSON.stringify(updated));

    // Notify all components across the app
    window.dispatchEvent(
      new CustomEvent('ica:profile-updated', {
        detail: updated,
      })
    );

    return updated;
  } catch (err) {
    console.error('Failed saving user profile:', err);
    return getUserProfile();
  }
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
