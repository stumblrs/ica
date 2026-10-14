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

export function saveProfileForDevice(deviceId: string, profile: Partial<StoredUserProfile>): StoredUserProfile {
  const store = readProfilesStore();
  const existing = store[deviceId] || {
    deviceId,
    username: '',
    displayName: '',
    avatarSymbol: 'ọ',
    role: 'Native Contributor',
    joinedAt: new Date().toISOString(),
  };

  const updated: StoredUserProfile = {
    ...existing,
    ...profile,
    deviceId,
    updatedAt: new Date().toISOString(),
  };

  store[deviceId] = updated;
  writeProfilesStore(store);
  return updated;
}
