import { NextRequest, NextResponse } from 'next/server';
import {
  readSettlementProfiles,
  writeSettlementProfiles,
  findMatchingHeritageProfile,
  verifyCuratorPasscode,
  type SettlementHeritageProfile,
} from '@/lib/curator-store';
import { revalidateAtlasData } from '@/lib/revalidation';

export const dynamic = 'force-dynamic';

function checkAuth(req: NextRequest) {
  const key = req.headers.get('x-curator-key') || req.headers.get('authorization')?.replace('Bearer ', '');
  return verifyCuratorPasscode(key || '');
}

/**
 * GET /api/curator/profiles
 * Query matching profile by ?name=...&code=... or list all profiles.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const name = searchParams.get('name') || undefined;
    const code = searchParams.get('code') || undefined;
    const lgaName = searchParams.get('lgaName') || undefined;

    if (name || code) {
      const matched = findMatchingHeritageProfile({ name, code, lgaName });
      return NextResponse.json({ profile: matched });
    }

    const allProfiles = readSettlementProfiles();
    return NextResponse.json({ profiles: allProfiles });
  } catch (err: any) {
    return NextResponse.json({ error: 'Query failed: ' + err.message }, { status: 500 });
  }
}

/**
 * POST /api/curator/profiles
 * Upsert or enhance a settlement heritage profile. Requires curator auth.
 */
export async function POST(req: NextRequest) {
  const auth = checkAuth(req);
  if (!auth.valid) {
    return NextResponse.json({ error: 'Unauthorized. Curator passcode required.' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const {
      id,
      name,
      matchKeys,
      nativeName,
      traditionalRulerTitle,
      clanLineage,
      marketDay,
      festivals,
      sacredLandmarks,
      historicalSummary,
      customAttributes,
      specificArchivalDocs,
    } = body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: 'Settlement name is required.' }, { status: 400 });
    }

    const trimmedName = name.trim();
    const rawKeys: string[] = Array.isArray(matchKeys) ? matchKeys : [];
    // Ensure primary name is always included in matchKeys
    if (!rawKeys.some((k) => k.trim().toLowerCase() === trimmedName.toLowerCase())) {
      rawKeys.unshift(trimmedName);
    }

    const cleanMatchKeys = Array.from(
      new Set(rawKeys.map((k) => (typeof k === 'string' ? k.trim().toLowerCase() : '')).filter(Boolean))
    );

    const profileId = id && typeof id === 'string' && id.trim()
      ? id.trim()
      : `prof-${trimmedName.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;

    const newProfile: SettlementHeritageProfile = {
      id: profileId,
      name: trimmedName,
      matchKeys: cleanMatchKeys,
      nativeName: nativeName?.trim() || undefined,
      traditionalRulerTitle: traditionalRulerTitle?.trim() || undefined,
      clanLineage: clanLineage?.trim() || undefined,
      marketDay: marketDay?.trim() || undefined,
      festivals: Array.isArray(festivals) ? festivals.filter(Boolean) : undefined,
      sacredLandmarks: Array.isArray(sacredLandmarks) ? sacredLandmarks.filter(Boolean) : undefined,
      historicalSummary: historicalSummary?.trim() || undefined,
      customAttributes: customAttributes && typeof customAttributes === 'object' ? customAttributes : undefined,
      specificArchivalDocs: Array.isArray(specificArchivalDocs) ? specificArchivalDocs.filter(Boolean) : undefined,
      updatedAt: new Date().toISOString(),
      updatedBy: auth.label || 'Curator',
    };

    const currentProfiles = readSettlementProfiles();
    const existingIdx = currentProfiles.findIndex(
      (p) => p.id === profileId || p.name.toLowerCase() === trimmedName.toLowerCase()
    );

    if (existingIdx !== -1) {
      currentProfiles[existingIdx] = {
        ...currentProfiles[existingIdx],
        ...newProfile,
      };
    } else {
      currentProfiles.unshift(newProfile);
    }

    writeSettlementProfiles(currentProfiles);
    revalidateAtlasData();

    return NextResponse.json({
      success: true,
      profile: newProfile,
      action: existingIdx !== -1 ? 'updated' : 'created',
    });
  } catch (err: any) {
    return NextResponse.json({ error: 'Failed to save profile: ' + err.message }, { status: 500 });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 200 });
}

