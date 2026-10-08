import { NextRequest, NextResponse } from 'next/server';
import fs from 'node:fs';
import path from 'node:path';

// Store in-memory / local JSON database for initial MVP flow before PostGIS container connection
const DB_FILE = path.resolve(process.cwd(), 'public/data/communities_store.json');

function getStoredCommunities(): any[] {
  if (!fs.existsSync(DB_FILE)) {
    // Seed with representative communities
    const initialSeed = [
      {
        id: 'c1-aba',
        name: 'Aba',
        type: 'city',
        description: 'Major commercial hub and historic settlement in Abia State.',
        latitude: 5.1167,
        longitude: 7.3667,
        stateId: 'NG001',
        stateName: 'Abia',
        lgaId: 'NG001001',
        lgaName: 'Aba North',
        identityStatus: 'igbo',
        languageStatus: 'Asa/Ngwa dialect',
        historicalStatus: 'Pre-colonial commercial and market settlement',
        verificationStatus: 'verified',
        confidence: 0.98,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        evidence: [
          {
            id: 'e1',
            sourceType: 'historical_source',
            citationOrUrl: 'Colonial & Regional Administrative Records',
            description: 'Established settlement center of the Ngwa Igbo.',
            isVerified: true
          }
        ],
        confirmationsCount: 14,
        challengesCount: 0
      },
      {
        id: 'c2-enugu',
        name: 'Enugu',
        type: 'city',
        description: 'Historic capital of Eastern Region and prominent coal city.',
        latitude: 6.4413,
        longitude: 7.4988,
        stateId: 'NG014',
        stateName: 'Enugu',
        lgaId: 'NG014004',
        lgaName: 'Enugu North',
        identityStatus: 'igbo',
        languageStatus: 'Waawa/Northern Igbo',
        verificationStatus: 'verified',
        confidence: 0.99,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        evidence: [
          {
            id: 'e2',
            sourceType: 'academic_source',
            citationOrUrl: 'Gazette of the Colony of Nigeria (1915)',
            description: 'Founded around the original Enugwu Ngwo community.',
            isVerified: true
          }
        ],
        confirmationsCount: 22,
        challengesCount: 0
      },
      {
        id: 'c3-asaba',
        name: 'Asaba (Ahaba)',
        type: 'city',
        description: 'Historic Anioma cultural and political center on the western bank of the River Niger.',
        latitude: 6.2006,
        longitude: 6.7333,
        stateId: 'NG010',
        stateName: 'Delta',
        lgaId: 'NG010015',
        lgaName: 'Oshimili South',
        identityStatus: 'igbo',
        languageStatus: 'Enuani dialect',
        historicalStatus: 'Traditional kingdom founded by Nnebisi',
        verificationStatus: 'verified',
        confidence: 0.95,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        evidence: [
          {
            id: 'e3',
            sourceType: 'oral_history',
            citationOrUrl: 'Asaba Traditional Council Archives',
            description: 'Oral tradition and lineage records connecting to ancient Nri and Igala affinities.',
            isVerified: true
          }
        ],
        confirmationsCount: 19,
        challengesCount: 0
      }
    ];
    fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });
    fs.writeFileSync(DB_FILE, JSON.stringify(initialSeed, null, 2), 'utf8');
    return initialSeed;
  }
  return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
}

function saveCommunities(records: any[]) {
  fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });
  fs.writeFileSync(DB_FILE, JSON.stringify(records, null, 2), 'utf8');
}

/**
 * GET /api/communities - List/search communities
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q')?.toLowerCase();
  const state = searchParams.get('state');
  const status = searchParams.get('status');
  const lifecycle = searchParams.get('lifecycle');

  let list = getStoredCommunities().map((c) => ({
    ...c,
    lifecycleStatus: c.lifecycleStatus || 'ACTIVE',
  }));

  if (q) {
    list = list.filter(c => 
      c.name.toLowerCase().includes(q) ||
      c.lgaName?.toLowerCase().includes(q) ||
      c.stateName?.toLowerCase().includes(q)
    );
  }
  if (state) {
    list = list.filter(c => c.stateName?.toLowerCase() === state.toLowerCase() || c.stateId === state);
  }
  if (status) {
    list = list.filter(c => c.verificationStatus === status);
  }
  if (lifecycle && lifecycle !== 'all') {
    if (lifecycle === 'active') {
      list = list.filter(c => c.lifecycleStatus === 'ACTIVE');
    } else if (lifecycle === 'delisted' || lifecycle === 'dormant') {
      list = list.filter(c => c.lifecycleStatus === 'DELISTED');
    } else if (lifecycle === 'contested') {
      list = list.filter(c => c.lifecycleStatus === 'CONTESTED_DELIST' || c.lifecycleStatus === 'CONTESTED_REINSTATE');
    }
  }

  return NextResponse.json(list);
}

/**
 * POST /api/communities - Create new community contribution
 * Authoritatively enforces server-side administrative resolution.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      name,
      type,
      description,
      latitude,
      longitude,
      identityStatus,
      languageStatus,
      historicalStatus,
      evidence
    } = body;

    if (!name || !type || latitude == null || longitude == null || !identityStatus) {
      return NextResponse.json(
        { error: 'Missing required fields: name, type, latitude, longitude, identityStatus' },
        { status: 400 }
      );
    }

    // Call internal administrative resolver
    const resolveRes = await fetch(new URL('/api/spatial/resolve-admin', req.url).toString(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ longitude, latitude })
    });

    if (!resolveRes.ok) {
      const errData = await resolveRes.json().catch(() => ({}));
      return NextResponse.json(
        { error: errData.error || 'Failed to resolve authoritative administrative boundaries.' },
        { status: resolveRes.status }
      );
    }

    const resolveData = await resolveRes.json();
    if (resolveData.ambiguous) {
      return NextResponse.json(
        {
          error: 'Location falls on an ambiguous boundary. Please confirm exact point.',
          candidates: resolveData.candidates
        },
        { status: 409 }
      );
    }

    const newRecord = {
      id: 'comm-' + Date.now(),
      name: name.trim(),
      type,
      description: description?.trim() || null,
      latitude,
      longitude,
      stateId: resolveData.state.code,
      stateName: resolveData.state.name,
      lgaId: resolveData.lga.code,
      lgaName: resolveData.lga.name,
      identityStatus,
      languageStatus: languageStatus?.trim() || null,
      historicalStatus: historicalStatus?.trim() || null,
      verificationStatus: 'pending', // Always defaults to pending
      lifecycleStatus: 'ACTIVE',
      confidence: 0.5,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      evidence: evidence ? [{
        id: 'ev-' + Date.now(),
        sourceType: evidence.sourceType,
        citationOrUrl: evidence.citationOrUrl || null,
        description: evidence.description,
        isVerified: false
      }] : [],
      confirmationsCount: 0,
      challengesCount: 0
    };

    const current = getStoredCommunities();
    current.unshift(newRecord);
    saveCommunities(current);

    return NextResponse.json(newRecord, { status: 201 });
  } catch (err: any) {
    return NextResponse.json(
      { error: 'Server error: ' + err.message },
      { status: 500 }
    );
  }
}
