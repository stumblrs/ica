import { NextRequest, NextResponse } from 'next/server';
import fs from 'node:fs';
import path from 'node:path';

const INDEX_FILE = path.resolve(process.cwd(), 'public/data/search_index.json');
const COMM_FILE = path.resolve(process.cwd(), 'public/data/communities_store.json');

let cachedSearchIndex: any[] | null = null;

function getSearchIndex(): any[] {
  if (cachedSearchIndex) return cachedSearchIndex;
  try {
    if (fs.existsSync(INDEX_FILE)) {
      cachedSearchIndex = JSON.parse(fs.readFileSync(INDEX_FILE, 'utf8'));
      return cachedSearchIndex || [];
    }
  } catch (err) {
    console.error('Failed reading search index:', err);
  }
  return [];
}

function getStoredCommunities(): any[] {
  try {
    if (fs.existsSync(COMM_FILE)) {
      return JSON.parse(fs.readFileSync(COMM_FILE, 'utf8')) || [];
    }
  } catch {}
  return [];
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q')?.trim().toLowerCase();

  if (!q) {
    return NextResponse.json([]);
  }

  const results: any[] = [];
  const seen = new Set<string>();

  // 1. Check user-documented communities first
  const communities = getStoredCommunities();
  for (const c of communities) {
    const nameMatch = c.name?.toLowerCase().includes(q);
    const lgaMatch = c.lgaName?.toLowerCase().includes(q);
    const stateMatch = c.stateName?.toLowerCase().includes(q);

    if (nameMatch || lgaMatch || stateMatch) {
      const key = `comm-${c.name.toLowerCase()}-${c.lgaName?.toLowerCase()}`;
      if (!seen.has(key)) {
        seen.add(key);
        results.push({
          id: c.id,
          source: 'community',
          type: 'community',
          typeLabel: 'Community',
          name: c.name,
          lgaName: c.lgaName,
          lgaCode: c.lgaId,
          stateName: c.stateName,
          stateCode: c.stateId,
          center: [c.longitude, c.latitude],
          verificationStatus: c.verificationStatus || 'verified',
          priority: c.name.toLowerCase().startsWith(q) ? 1 : 2
        });
      }
    }
  }

  // 2. Check spatial settlements, LGAs, and landmarks
  const index = getSearchIndex();
  for (const item of index) {
    const nameLower = (item.name || '').toLowerCase();
    const lgaLower = (item.lgaName || '').toLowerCase();
    const stateLower = (item.stateName || '').toLowerCase();

    const startsWithName = nameLower.startsWith(q);
    const containsName = nameLower.includes(q);
    const matchesLga = item.type === 'lga' && lgaLower.includes(q);
    const subMatchLga = lgaLower.includes(q);

    if (containsName || matchesLga || (q.length > 3 && subMatchLga)) {
      const key = `${item.type}-${nameLower}-${lgaLower}`;
      if (!seen.has(key)) {
        seen.add(key);
        let typeLabel = 'Settlement';
        if (item.type === 'lga') typeLabel = 'LGA';
        else if (item.type === 'city') typeLabel = 'City';
        else if (item.type === 'town') typeLabel = 'Town';
        else if (item.type === 'village') typeLabel = 'Village';
        else if (item.type === 'market') typeLabel = 'Traditional Market';
        else if (item.type === 'marketplace') typeLabel = 'Marketplace';
        else if (item.type === 'landmark') typeLabel = 'Cultural Landmark';

        results.push({
          id: item.id,
          source: item.type === 'lga' ? 'lga' : 'settlement',
          type: item.type,
          typeLabel,
          name: item.name,
          lgaName: item.lgaName,
          lgaCode: item.lgaCode,
          stateName: item.stateName,
          stateCode: item.stateCode,
          center: item.center,
          priority: startsWithName ? 3 : containsName ? 4 : 5
        });
      }
    }

    if (results.length >= 60) break;
  }

  // Sort by priority (exact/prefix matches first)
  results.sort((a, b) => a.priority - b.priority);

  return NextResponse.json(results.slice(0, 30));
}
