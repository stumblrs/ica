'use client';

/**
 * Offline Storage Engine for Igbo Community Atlas
 * Uses IndexedDB & CacheStorage to provide complete offline map capability:
 * - Communities GeoJSON & density layers
 * - Settlement summaries and dialect greetings
 * - User-contributed Kindred (Ụmụnna) landmarks
 */

const DB_NAME = 'igbo_atlas_offline_db';
const DB_VERSION = 1;
const STORE_COMMUNITIES = 'communities_geojson';
const STORE_SETTLEMENTS = 'settlements_list';
const STORE_LANDMARKS = 'kindred_landmarks';
const STORE_METADATA = 'metadata';

export interface OfflineStorageStats {
  isAvailable: boolean;
  communitiesCount: number;
  settlementsCount: number;
  landmarksCount: number;
  lastSyncTimestamp: string | null;
  estimatedSizeMB: number;
}

export interface KindredLandmarkItem {
  id: string;
  communityId: string;
  communityName: string;
  name: string;
  umunnaName?: string;
  category: 'village_square' | 'kindred_hall' | 'sacred_grove' | 'heritage_spring' | 'market_post' | 'monument';
  description?: string;
  latitude: number;
  longitude: number;
  createdAt: string;
  isLocalContribution?: boolean;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB not supported'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event: any) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_COMMUNITIES)) {
        db.createObjectStore(STORE_COMMUNITIES, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_SETTLEMENTS)) {
        db.createObjectStore(STORE_SETTLEMENTS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_LANDMARKS)) {
        const store = db.createObjectStore(STORE_LANDMARKS, { keyPath: 'id' });
        store.createIndex('communityId', 'communityId', { unique: false });
      }
      if (!db.objectStoreNames.contains(STORE_METADATA)) {
        db.createObjectStore(STORE_METADATA, { keyPath: 'key' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Downloads and caches the complete atlas dataset for offline field use.
 */
export async function cacheAtlasForOffline(
  onProgress?: (progressPct: number, statusText: string) => void
): Promise<{ success: boolean; communitiesCount: number; error?: string }> {
  try {
    onProgress?.(10, 'Connecting to offline database...');
    const db = await openDB();

    // 1. Fetch communities GeoJSON
    onProgress?.(25, 'Downloading communities spatial layer...');
    const geoRes = await fetch('/api/map/communities.geojson');
    if (!geoRes.ok) throw new Error('Failed to fetch communities GeoJSON');
    const geoData = await geoRes.json();

    // 2. Fetch communities summary list
    onProgress?.(50, 'Downloading community metadata & dialect attributes...');
    const listRes = await fetch('/api/communities');
    if (!listRes.ok) throw new Error('Failed to fetch communities list');
    const listData = await listRes.json();

    // 3. Save GeoJSON into IndexedDB
    onProgress?.(70, 'Storing spatial coordinates in offline storage...');
    const tx = db.transaction([STORE_COMMUNITIES, STORE_SETTLEMENTS, STORE_METADATA], 'readwrite');
    const commStore = tx.objectStore(STORE_COMMUNITIES);
    const setStore = tx.objectStore(STORE_SETTLEMENTS);
    const metaStore = tx.objectStore(STORE_METADATA);

    // Store raw GeoJSON feature collection
    commStore.put({ id: 'communities_full', data: geoData, timestamp: new Date().toISOString() });

    // Store individual settlement records for fast lookup
    if (Array.isArray(listData)) {
      for (const item of listData) {
        setStore.put(item);
      }
    }

    // Save sync metadata
    const nowIso = new Date().toISOString();
    metaStore.put({
      key: 'sync_info',
      lastSync: nowIso,
      communitiesCount: geoData?.features?.length || listData?.length || 0,
    });

    await new Promise((resolve, reject) => {
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });

    // 4. Cache critical web assets in CacheStorage
    onProgress?.(90, 'Securing application shell for zero-data environments...');
    if ('caches' in window) {
      try {
        const cache = await caches.open('ica-offline-field-pack');
        await cache.addAll([
          '/',
          '/manifest.json',
          '/api/map/communities.geojson',
          '/api/communities',
        ]);
      } catch {
        // CacheStorage addAll might fail on some dev environments; non-fatal
      }
    }

    onProgress?.(100, 'Atlas successfully cached for offline field mode!');
    return {
      success: true,
      communitiesCount: geoData?.features?.length || listData?.length || 0,
    };
  } catch (err: any) {
    return {
      success: false,
      communitiesCount: 0,
      error: err.message || 'Failed to download offline field pack',
    };
  }
}

/**
 * Retrieves the cached communities GeoJSON from offline storage.
 */
export async function getOfflineCommunitiesGeoJSON(): Promise<any | null> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_COMMUNITIES, 'readonly');
      const req = tx.objectStore(STORE_COMMUNITIES).get('communities_full');
      req.onsuccess = () => resolve(req.result ? req.result.data : null);
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

/**
 * Retrieves all cached settlement records from offline storage.
 */
export async function getOfflineSettlementsList(): Promise<any[]> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_SETTLEMENTS, 'readonly');
      const req = tx.objectStore(STORE_SETTLEMENTS).getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => resolve([]);
    });
  } catch {
    return [];
  }
}

/**
 * Saves a new Kindred (Ụmụnna) Landmark locally into IndexedDB.
 */
export async function saveKindredLandmarkOffline(landmark: KindredLandmarkItem): Promise<boolean> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_LANDMARKS, 'readwrite');
      tx.objectStore(STORE_LANDMARKS).put(landmark);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    });
  } catch {
    return false;
  }
}

/**
 * Retrieves all Kindred landmarks for a given community (or all communities).
 */
export async function getKindredLandmarksOffline(communityId?: string): Promise<KindredLandmarkItem[]> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_LANDMARKS, 'readonly');
      const store = tx.objectStore(STORE_LANDMARKS);
      if (communityId) {
        const index = store.index('communityId');
        const req = index.getAll(communityId);
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => resolve([]);
      } else {
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => resolve([]);
      }
    });
  } catch {
    return [];
  }
}

/**
 * Returns statistics about current offline storage usage.
 */
export async function getOfflineStorageStats(): Promise<OfflineStorageStats> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction([STORE_SETTLEMENTS, STORE_LANDMARKS, STORE_METADATA], 'readonly');
      const setReq = tx.objectStore(STORE_SETTLEMENTS).count();
      const landReq = tx.objectStore(STORE_LANDMARKS).count();
      const metaReq = tx.objectStore(STORE_METADATA).get('sync_info');

      let settlementsCount = 0;
      let landmarksCount = 0;
      let lastSyncTimestamp: string | null = null;
      let communitiesCount = 0;

      setReq.onsuccess = () => { settlementsCount = setReq.result || 0; };
      landReq.onsuccess = () => { landmarksCount = landReq.result || 0; };
      metaReq.onsuccess = () => {
        if (metaReq.result) {
          lastSyncTimestamp = metaReq.result.lastSync || null;
          communitiesCount = metaReq.result.communitiesCount || settlementsCount;
        }
      };

      tx.oncomplete = () => {
        const estimatedSizeMB = Math.round(((settlementsCount * 1.5 + landmarksCount * 0.5) / 1024) * 10) / 10;
        resolve({
          isAvailable: true,
          communitiesCount,
          settlementsCount,
          landmarksCount,
          lastSyncTimestamp,
          estimatedSizeMB: Math.max(0.8, estimatedSizeMB),
        });
      };

      tx.onerror = () => {
        resolve({
          isAvailable: false,
          communitiesCount: 0,
          settlementsCount: 0,
          landmarksCount: 0,
          lastSyncTimestamp: null,
          estimatedSizeMB: 0,
        });
      };
    });
  } catch {
    return {
      isAvailable: false,
      communitiesCount: 0,
      settlementsCount: 0,
      landmarksCount: 0,
      lastSyncTimestamp: null,
      estimatedSizeMB: 0,
    };
  }
}

/**
 * Purges the offline database cache.
 */
export async function clearOfflineStorage(): Promise<boolean> {
  try {
    const db = await openDB();
    const tx = db.transaction([STORE_COMMUNITIES, STORE_SETTLEMENTS, STORE_METADATA], 'readwrite');
    tx.objectStore(STORE_COMMUNITIES).clear();
    tx.objectStore(STORE_SETTLEMENTS).clear();
    tx.objectStore(STORE_METADATA).clear();

    if ('caches' in window) {
      await caches.delete('ica-offline-field-pack');
    }

    return new Promise((resolve) => {
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    });
  } catch {
    return false;
  }
}
