import fs from 'node:fs';
import path from 'node:path';

export interface StoredUserProfile {
  deviceId: string;
  username: string;
  displayName: string;
  homeTown?: string;
  stateOfOrigin?: string;
  kindredClan?: string;
  bio?: string;
  avatarSymbol?: string;
  role?: string;
  joinedAt?: string;
  updatedAt?: string;
  autoSignContributions?: boolean;
}

export const RESERVED_USERNAMES = new Set([
  'admin',
  'administrator',
  'system',
  'root',
  'atlas',
  'ica',
  'official',
  'moderator',
  'support',
  'help',
  'api',
  'dev',
  'test',
  'null',
  'undefined',
  'igbo',
  'community',
]);

export function cleanUsername(input: string): string {
  if (!input) return '';
  return input
    .trim()
    .replace(/^@+/, '')
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '')
    .slice(0, 30);
}

export function validateUsernameFormat(username: string): { valid: boolean; reason?: string } {
  const clean = cleanUsername(username);
  if (!clean) {
    return { valid: false, reason: 'Username cannot be empty.' };
  }
  if (clean.length < 3) {
    return { valid: false, reason: 'Username must be at least 3 characters long.' };
  }
  if (clean.length > 30) {
    return { valid: false, reason: 'Username cannot exceed 30 characters.' };
  }
  if (RESERVED_USERNAMES.has(clean)) {
    return { valid: false, reason: `@${clean} is a reserved system handle.` };
  }
  return { valid: true };
}

export function getProfileCandidatePaths(): string[] {
  const cwd = process.cwd();
  return Array.from(
    new Set([
      path.resolve(cwd, 'apps/web/public/data/profiles_store.json'),
      path.resolve(cwd, 'public/data/profiles_store.json'),
      path.resolve(cwd, '../public/data/profiles_store.json'),
      path.resolve(__dirname, '../../public/data/profiles_store.json'),
      path.resolve(__dirname, '../../../public/data/profiles_store.json'),
      path.resolve(__dirname, '../../../../public/data/profiles_store.json'),
    ])
  );
}

export function findExistingProfileStorePath(): string | null {
  for (const p of getProfileCandidatePaths()) {
    try {
      if (fs.existsSync(p)) return p;
    } catch {
      // ignore
    }
  }
  return null;
}

export function readProfilesStore(): Record<string, StoredUserProfile> {
  const existingPath = findExistingProfileStorePath();
  if (!existingPath) return {};

  try {
    const raw = fs.readFileSync(existingPath, 'utf8');
    if (!raw.trim()) return {};
    const parsed = JSON.parse(raw);
    return typeof parsed === 'object' && parsed !== null ? parsed : {};
  } catch (err: any) {
    console.error(`[ProfileStore] Failed reading profiles from ${existingPath}:`, err.message);
    return {};
  }
}

export function writeProfilesStore(store: Record<string, StoredUserProfile>): boolean {
  const cwd = process.cwd();
  const existing = findExistingProfileStorePath();
  const targets = new Set<string>();

  if (existing) targets.add(existing);

  const webPublic = path.resolve(cwd, 'apps/web/public/data/profiles_store.json');
  const rootPublic = path.resolve(cwd, 'public/data/profiles_store.json');

  if (fs.existsSync(path.dirname(webPublic))) targets.add(webPublic);
  if (fs.existsSync(path.dirname(rootPublic))) targets.add(rootPublic);

  if (targets.size === 0) {
    targets.add(path.resolve(cwd, 'apps/web/public/data/profiles_store.json'));
  }

  let wroteAny = false;
  const jsonContent = JSON.stringify(store, null, 2);

  for (const target of Array.from(targets)) {
    try {
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, jsonContent, 'utf8');
      wroteAny = true;
    } catch (err: any) {
      console.error(`[ProfileStore] Failed writing profiles to ${target}:`, err.message);
    }
  }

  return wroteAny;
}

export function getProfileByDeviceId(deviceId: string): StoredUserProfile | null {
  if (!deviceId) return null;
  const store = readProfilesStore();
  return store[deviceId] || null;
}

export function findProfileByUsername(username: string): StoredUserProfile | null {
  const clean = cleanUsername(username);
  if (!clean) return null;
  const store = readProfilesStore();
  for (const prof of Object.values(store)) {
    if (cleanUsername(prof.username) === clean) {
      return prof;
    }
  }
  return null;
}

/**
 * Checks if a username is available globally or already claimed by another device.
 */
export function checkUsernameAvailability(
  username: string,
  currentDeviceId?: string
): {
  available: boolean;
  isSelf: boolean;
  ownerDeviceId?: string;
  reason?: string;
} {
  const clean = cleanUsername(username);
  const formatValidation = validateUsernameFormat(clean);
  if (!formatValidation.valid) {
    return {
      available: false,
      isSelf: false,
      reason: formatValidation.reason,
    };
  }

  const existingOwner = findProfileByUsername(clean);
  if (!existingOwner) {
    return {
      available: true,
      isSelf: false,
      reason: `@${clean} is available!`,
    };
  }

  // If the current device already owns this username, it's valid for them
  if (currentDeviceId && existingOwner.deviceId === currentDeviceId) {
    return {
      available: true,
      isSelf: true,
      ownerDeviceId: existingOwner.deviceId,
      reason: `@${clean} is already your registered handle.`,
    };
  }

  return {
    available: false,
    isSelf: false,
    ownerDeviceId: existingOwner.deviceId,
    reason: `The handle @${clean} is already taken by another contributor device.`,
  };
}

/**
 * Saves a user profile for a specific device, enforcing global unique usernames.
 */
export function saveProfileForDevice(deviceId: string, profile: Partial<StoredUserProfile>): StoredUserProfile {
  if (!deviceId) {
    throw new Error('Device ID is required to bind a profile.');
  }

  const store = readProfilesStore();
  const existing = store[deviceId] || {
    deviceId,
    username: '',
    displayName: '',
    avatarSymbol: 'ọ',
    role: 'Native Contributor',
    joinedAt: new Date().toISOString(),
  };

  const candidateUsername = profile.username !== undefined ? cleanUsername(profile.username) : existing.username;

  // If a username is being registered or updated, verify uniqueness
  if (candidateUsername) {
    const availability = checkUsernameAvailability(candidateUsername, deviceId);
    if (!availability.available && !availability.isSelf) {
      throw new Error(`The handle @${candidateUsername} is already taken by another contributor.`);
    }
  }

  const updated: StoredUserProfile = {
    ...existing,
    ...profile,
    deviceId,
    username: candidateUsername,
    updatedAt: new Date().toISOString(),
  };

  store[deviceId] = updated;
  writeProfilesStore(store);
  return updated;
}
