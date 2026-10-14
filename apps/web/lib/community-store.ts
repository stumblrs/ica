import fs from 'node:fs';
import path from 'node:path';

export interface StoredMediaItem {
  id: string;
  sourceType: string;
  type: 'image' | 'video';
  provider: string;
  url: string;
  embedUrl?: string;
  thumbnailUrl?: string;
  caption?: string;
  credit?: string;
  contributor?: string;
  createdAt: string;
  isVerified?: boolean;
}

export interface StoredCommunity {
  id: string;
  name: string;
  type?: string;
  description?: string | null;
  latitude: number;
  longitude: number;
  stateId?: string;
  stateName?: string;
  lgaId?: string;
  lgaName?: string;
  identityStatus?: string;
  languageStatus?: string | null;
  historicalStatus?: string | null;
  verificationStatus?: string;
  lifecycleStatus?: string;
  confidence?: number;
  createdAt?: string;
  updatedAt?: string;
  evidence?: StoredMediaItem[];
  evidenceJson?: string;
  confirmationsCount?: number;
  challengesCount?: number;
}

export function getStoreCandidatePaths(): string[] {
  const cwd = process.cwd();
  return Array.from(
    new Set([
      path.resolve(cwd, 'apps/web/public/data/communities_store.json'),
      path.resolve(cwd, 'public/data/communities_store.json'),
      path.resolve(cwd, '../public/data/communities_store.json'),
      path.resolve(__dirname, '../../public/data/communities_store.json'),
      path.resolve(__dirname, '../../../public/data/communities_store.json'),
      path.resolve(__dirname, '../../../../public/data/communities_store.json'),
    ])
  );
}

export function findExistingStorePath(): string | null {
  for (const p of getStoreCandidatePaths()) {
    try {
      if (fs.existsSync(p)) {
        return p;
      }
    } catch {}
  }
  return null;
}

export function readCommunityStore(): StoredCommunity[] {
  const storePath = findExistingStorePath();
  if (storePath) {
    try {
      const raw = fs.readFileSync(storePath, 'utf8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.map((item) => {
          let ev: StoredMediaItem[] = [];
          if (Array.isArray(item.evidence)) {
            ev = item.evidence;
          } else if (typeof item.evidenceJson === 'string' && item.evidenceJson.trim()) {
            try {
              ev = JSON.parse(item.evidenceJson);
            } catch {
              ev = [];
            }
          }
          return {
            ...item,
            evidence: ev,
          };
        });
      }
    } catch (err: any) {
      console.error(`[CommunityStore] Error reading store at ${storePath}:`, err.message);
    }
  }
  return [];
}

export function writeCommunityStore(records: StoredCommunity[]): boolean {
  const existingPath = findExistingStorePath();
  const targets = new Set<string>();

  if (existingPath) {
    targets.add(existingPath);
  }

  // Also include standard paths based on current working directory
  const cwd = process.cwd();
  if (fs.existsSync(path.resolve(cwd, 'apps/web/public/data'))) {
    targets.add(path.resolve(cwd, 'apps/web/public/data/communities_store.json'));
  }
  if (fs.existsSync(path.resolve(cwd, 'public/data'))) {
    targets.add(path.resolve(cwd, 'public/data/communities_store.json'));
  }

  // Fallback default target if none existed yet
  if (targets.size === 0) {
    targets.add(path.resolve(cwd, 'apps/web/public/data/communities_store.json'));
  }

  let wroteAny = false;
  const jsonContent = JSON.stringify(records, null, 2);

  for (const target of Array.from(targets)) {
    try {
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, jsonContent, 'utf8');
      wroteAny = true;
    } catch (err: any) {
      console.error(`[CommunityStore] Failed writing store to ${target}:`, err.message);
    }
  }

  return wroteAny;
}

export function saveMediaToStore(params: {
  communityId?: string;
  name: string;
  latitude?: number;
  longitude?: number;
  lgaName?: string;
  stateName?: string;
  mediaEvidenceItem: StoredMediaItem;
}): { community: StoredCommunity; action: 'appended' | 'created' } {
  const { communityId, name, latitude, longitude, lgaName, stateName, mediaEvidenceItem } = params;
  const store = readCommunityStore();
  const nameNorm = name.trim().toLowerCase();

  let targetIndex = store.findIndex((c) => communityId && c.id === communityId);
  if (targetIndex === -1) {
    targetIndex = store.findIndex((c) => (c.name || '').trim().toLowerCase() === nameNorm);
  }

  let resultCommunity: StoredCommunity;
  let action: 'appended' | 'created';

  if (targetIndex !== -1) {
    const existing = store[targetIndex];
    const currentEvidence = Array.isArray(existing.evidence) ? [...existing.evidence] : [];
    // Prevent duplicate URLs in same settlement
    const urlExists = currentEvidence.some((e) => e.url === mediaEvidenceItem.url);
    if (!urlExists) {
      currentEvidence.unshift(mediaEvidenceItem);
    }
    existing.evidence = currentEvidence;
    existing.evidenceJson = JSON.stringify(currentEvidence);
    existing.updatedAt = new Date().toISOString();
    store[targetIndex] = existing;
    resultCommunity = existing;
    action = 'appended';
  } else {
    const lat = typeof latitude === 'number' ? latitude : 6.22;
    const lon = typeof longitude === 'number' ? longitude : 7.05;
    const newRecord: StoredCommunity = {
      id: communityId || 'comm-' + Date.now(),
      name: name.trim(),
      type: 'settlement',
      description: `Documented settlement ${name.trim()} with community visual media.`,
      latitude: lat,
      longitude: lon,
      stateId: 'SE',
      stateName: stateName?.trim() || 'Anambra',
      lgaId: 'LGA',
      lgaName: lgaName?.trim() || 'Awka South',
      identityStatus: 'confirmed_igbo',
      languageStatus: 'Central Igbo dialect',
      historicalStatus: 'Documented visual media record',
      verificationStatus: 'verified',
      lifecycleStatus: 'ACTIVE',
      confidence: 0.85,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      evidence: [mediaEvidenceItem],
      evidenceJson: JSON.stringify([mediaEvidenceItem]),
      confirmationsCount: 1,
      challengesCount: 0,
    };
    store.unshift(newRecord);
    resultCommunity = newRecord;
    action = 'created';
  }

  writeCommunityStore(store);
  return { community: resultCommunity, action };
}

export function getCommunitiesStoreGeoJSON() {
  const store = readCommunityStore();
  return {
    type: 'FeatureCollection',
    features: store.map((c) => {
      const evidence = Array.isArray(c.evidence) ? c.evidence : [];
      const hasMedia = evidence.length > 0;
      return {
        type: 'Feature',
        id: c.id,
        properties: {
          id: c.id,
          name: c.name,
          type: c.type || 'settlement',
          stateName: c.stateName,
          lgaName: c.lgaName,
          state_name: c.stateName,
          lga_name: c.lgaName,
          identityStatus: c.identityStatus || 'confirmed_igbo',
          identity_status: c.identityStatus || 'confirmed_igbo',
          verificationStatus: c.verificationStatus || 'verified',
          verification_status: c.verificationStatus || 'verified',
          lifecycleStatus: c.lifecycleStatus || 'ACTIVE',
          lifecycle_status: c.lifecycleStatus || 'ACTIVE',
          confidence: c.confidence || 0.8,
          confirmationsCount: c.confirmationsCount || 0,
          confirmations_count: c.confirmationsCount || 0,
          challengesCount: c.challengesCount || 0,
          challenges_count: c.challengesCount || 0,
          description: c.description,
          hasMedia,
          has_media: hasMedia,
          mediaCount: evidence.length,
          media_count: evidence.length,
          evidence,
          media: evidence,
        },
        geometry: {
          type: 'Point',
          coordinates: [c.longitude, c.latitude],
        },
      };
    }),
  };
}
