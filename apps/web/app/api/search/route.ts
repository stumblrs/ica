import { NextRequest, NextResponse } from 'next/server';
import fs from 'node:fs';
import path from 'node:path';

function findDataFile(relPath: string): string | null {
  const candidates = [
    path.resolve(process.cwd(), relPath),
    path.resolve(process.cwd(), 'apps/web', relPath),
    path.resolve(process.cwd(), '..', relPath),
    path.resolve(__dirname, '../../../../public', relPath.replace(/^public\//, '')),
    path.resolve(__dirname, '../../../public', relPath.replace(/^public\//, '')),
  ];
  for (const c of candidates) {
    try {
      if (fs.existsSync(c)) return c;
    } catch {}
  }
  return null;
}

let cachedSearchIndex: any[] | null = null;
let cachedCanonicalTowns: any[] | null = null;

function getSearchIndex(): any[] {
  if (cachedSearchIndex && cachedSearchIndex.length > 0) return cachedSearchIndex;
  try {
    const file = findDataFile('public/data/search_index.json');
    if (file && fs.existsSync(file)) {
      cachedSearchIndex = JSON.parse(fs.readFileSync(file, 'utf8'));
      return cachedSearchIndex || [];
    }
  } catch (err) {
    console.error('Failed reading search index:', err);
  }
  return [];
}

function getCanonicalTowns(): any[] {
  if (cachedCanonicalTowns) return cachedCanonicalTowns;
  try {
    const file = findDataFile('public/data/igboland_canonical_towns.geojson');
    if (file && fs.existsSync(file)) {
      const data = JSON.parse(fs.readFileSync(file, 'utf8'));
      cachedCanonicalTowns = data.features || [];
      return cachedCanonicalTowns || [];
    }
  } catch (err) {
    console.error('Failed reading canonical towns:', err);
  }
  return [];
}

function getStoredCommunities(): any[] {
  try {
    const file = findDataFile('public/data/communities_store.json');
    if (file && fs.existsSync(file)) {
      return JSON.parse(fs.readFileSync(file, 'utf8')) || [];
    }
  } catch {}
  return [];
}

const STOPWORDS = new Set(['in', 'at', 'of', 'and', 'the', 'lga', 'state', 'town', 'village', 'community']);

function getPhoneticVariants(word: string): string[] {
  const w = word.toLowerCase().trim();
  const variants = new Set<string>([w]);
  // Collapse double vowels (ukpuuno -> ukpuno)
  const collapsed = w.replace(/(.)\1+/g, '$1');
  variants.add(collapsed);
  // Igbo orthography u/o alternations
  if (w.startsWith('ukp')) variants.add(w.replace(/^ukp/, 'okp'));
  if (w.startsWith('okp')) variants.add(w.replace(/^okp/, 'ukp'));
  if (collapsed.startsWith('ukp')) variants.add(collapsed.replace(/^ukp/, 'okp'));
  if (collapsed.startsWith('okp')) variants.add(collapsed.replace(/^okp/, 'ukp'));
  return Array.from(variants);
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q')?.trim().toLowerCase();

  if (!q) {
    return NextResponse.json([]);
  }

  // Tokenize multi-word queries (e.g. "ukpuuno in awka" -> ["ukpuuno", "awka"])
  const rawTokens = q.replace(/[,.-]/g, ' ').split(/\s+/).filter(Boolean);
  const meaningfulTokens = rawTokens.filter((t) => !STOPWORDS.has(t) && t.length > 1);
  const searchTokens = meaningfulTokens.length > 0 ? meaningfulTokens : rawTokens;
  const tokenVariantList = searchTokens.map((t) => getPhoneticVariants(t));

  const results: any[] = [];
  const seen = new Set<string>();

  // 1. Check participatory communities
  const communities = getStoredCommunities();
  for (const c of communities) {
    const nameLower = (c.name || '').toLowerCase();
    const lgaLower = (c.lgaName || '').toLowerCase();
    const stateLower = (c.stateName || '').toLowerCase();
    const fullText = `${nameLower} ${lgaLower} ${stateLower}`;

    const allTokensMatch = tokenVariantList.every((variants) =>
      variants.some((v) => fullText.includes(v))
    );

    if (allTokensMatch) {
      const key = `comm-${nameLower}-${lgaLower}`;
      if (!seen.has(key)) {
        seen.add(key);
        const exactName = tokenVariantList[0]?.some((v) => nameLower === v);
        const startsName = tokenVariantList[0]?.some((v) => nameLower.startsWith(v));
        results.push({
          id: c.id,
          source: 'community',
          type: 'community',
          typeLabel: 'Documented Community',
          name: c.name,
          lgaName: c.lgaName,
          lgaCode: c.lgaId,
          stateName: c.stateName,
          stateCode: c.stateId,
          center: [c.longitude, c.latitude],
          verificationStatus: c.verificationStatus || 'verified',
          priority: exactName ? 1 : startsName ? 2 : 3,
        });
      }
    }
  }

  // 1b. Check canonical towns & capitals from "Map of Igbo Land: Communities and Towns" (igbo.jpg)
  const canonicalTowns = getCanonicalTowns();
  for (const f of canonicalTowns) {
    const p = f.properties || {};
    const nameLower = (p.name || '').toLowerCase();
    const lgaLower = (p.lgaName || '').toLowerCase();
    const stateLower = (p.stateName || '').toLowerCase();
    const isCapital = p.category === 'capital';
    const fullText = `${nameLower} ${lgaLower} ${stateLower}`;

    const allTokensMatch = tokenVariantList.every((variants) =>
      variants.some((v) => fullText.includes(v))
    );

    if (allTokensMatch) {
      const key = `canonical-${nameLower}-${lgaLower}`;
      if (!seen.has(key)) {
        seen.add(key);
        const exactName = tokenVariantList[0]?.some((v) => nameLower === v);
        const startsName = tokenVariantList[0]?.some((v) => nameLower.startsWith(v));
        results.push({
          id: f.id || `canonical-${nameLower}`,
          source: 'canonical',
          category: p.category,
          type: isCapital ? 'capital' : 'town',
          typeLabel: isCapital ? 'Capital City (Map of Igbo Land)' : 'Historic Town (Map of Igbo Land)',
          name: p.name,
          lgaName: p.lgaName,
          stateName: p.stateName,
          historicalSignificance: p.historicalSignificance,
          center: f.geometry?.coordinates,
          priority: exactName ? 1 : startsName ? 2 : 3,
        });
      }
    }
  }

  // 2. Check 49,415 settlements, LGAs, villages, and cultural landmarks
  const index = getSearchIndex();
  for (const item of index) {
    const nameLower = (item.name || '').toLowerCase();
    const altLower = (item.altName || '').toLowerCase();
    const wardLower = (item.wardName || '').toLowerCase();
    const lgaLower = (item.lgaName || '').toLowerCase();
    const stateLower = (item.stateName || '').toLowerCase();
    const fullText = `${nameLower} ${altLower} ${wardLower} ${lgaLower} ${stateLower}`;

    const allTokensMatch = tokenVariantList.every((variants) =>
      variants.some((v) => fullText.includes(v))
    );

    if (allTokensMatch) {
      const key = `${item.type}-${nameLower}-${lgaLower}`;
      if (!seen.has(key)) {
        seen.add(key);
        let typeLabel = 'Settlement';
        if (item.type === 'lga') typeLabel = 'LGA';
        else if (item.type === 'city') typeLabel = 'City';
        else if (item.type === 'town') typeLabel = 'Town';
        else if (item.type === 'village') typeLabel = 'Village / Settlement';
        else if (item.type === 'market') typeLabel = 'Traditional Market';
        else if (item.type === 'marketplace') typeLabel = 'Marketplace';
        else if (item.type === 'landmark') typeLabel = 'Cultural Landmark';

        const exactName = tokenVariantList[0]?.some((v) => nameLower === v || altLower === v);
        const startsName = tokenVariantList[0]?.some((v) => nameLower.startsWith(v));
        const containsName = tokenVariantList[0]?.some((v) => nameLower.includes(v) || altLower.includes(v));

        results.push({
          id: item.id,
          source: item.type === 'lga' ? 'lga' : 'settlement',
          type: item.type,
          typeLabel,
          name: item.name,
          altName: item.altName,
          wardName: item.wardName,
          lgaName: item.lgaName,
          lgaCode: item.lgaCode,
          stateName: item.stateName,
          stateCode: item.stateCode,
          center: item.center,
          priority: exactName ? 1 : startsName ? 2 : containsName ? 3 : 4,
        });
      }
    }

    if (results.length >= 80) break;
  }

  // Sort by priority (exact/prefix matches first)
  results.sort((a, b) => a.priority - b.priority);

  return NextResponse.json(results.slice(0, 35));
}
