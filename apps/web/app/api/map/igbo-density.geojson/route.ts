import { NextRequest, NextResponse } from 'next/server';
import fs from 'node:fs';
import path from 'node:path';
import { prisma } from '@/lib/prisma';

const DB_FILE = path.resolve(process.cwd(), 'public/data/communities_store.json');

// Excluded non-Igbo reference states
const EXCLUDED_STATES = ['NG032', 'NG002', 'Plateau', 'Adamawa'];

/**
 * GET /api/map/igbo-density.geojson
 * Section 12.1 & 1.2:
 * "The geographic picture of Igbo presence is derived from the underlying community dataset
 * rather than imposed as a pre-drawn boundary. Never interpret low density as absence."
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const minConfidence = parseFloat(searchParams.get('minConfidence') || '0');
  const identityFilter = searchParams.get('identity')?.toLowerCase();
  const stateFilter = searchParams.get('state')?.toUpperCase();

  let communities: any[] = [];

  try {
    const dbCommunities = await prisma.community.findMany({
      where: {
        stateId: { notIn: ['NG032', 'NG002'] },
        stateName: { notIn: ['Plateau', 'Adamawa'] },
        lifecycleStatus: { not: 'DELISTED' },
        ...(stateFilter ? { OR: [{ stateId: stateFilter }, { stateName: { equals: stateFilter, mode: 'insensitive' } }] } : {}),
        ...(identityFilter ? { identityStatus: identityFilter } : {}),
      },
      select: {
        id: true,
        name: true,
        stateName: true,
        lgaName: true,
        identityStatus: true,
        verificationStatus: true,
        confidence: true,
        confirmationsCount: true,
        longitude: true,
        latitude: true,
      },
    });
    communities = dbCommunities;
  } catch (err) {
    if (fs.existsSync(DB_FILE)) {
      communities = JSON.parse(fs.readFileSync(DB_FILE, 'utf8')).filter(
        (c: any) =>
          !EXCLUDED_STATES.includes(c.stateId) &&
          !EXCLUDED_STATES.includes(c.stateName) &&
          (c.stateName || '').toLowerCase() !== 'plateau' &&
          (c.stateName || '').toLowerCase() !== 'adamawa' &&
          c.lifecycleStatus !== 'DELISTED'
      );
    }
  }

  // Weight point intensity based on:
  // 1. Identity nuance (igbo = 1.0, historically_igbo/associated = 0.85, mixed = 0.65)
  // 2. Verification status (verified = 1.25x, unverified = 0.85x, challenged = 0.3x)
  // 3. Confirmations bonus (+0.05 per confirmation up to +0.35)
  // 4. Confidence factor (0.5 to 1.0)
  const densityFeatures = communities
    .filter((c) => (c.confidence ?? 0.9) >= minConfidence)
    .map((c) => {
      // 1. Identity status base weight
      let identityWeight = 1.0;
      switch (c.identityStatus) {
        case 'igbo':
          identityWeight = 1.0;
          break;
        case 'historically_igbo':
        case 'igbo_associated':
          identityWeight = 0.85;
          break;
        case 'mixed':
          identityWeight = 0.65;
          break;
        case 'uncertain':
          identityWeight = 0.4;
          break;
        default:
          identityWeight = 0.5;
      }

      // 2. Verification multiplier
      let verificationMultiplier = 1.0;
      if (c.verificationStatus === 'verified') verificationMultiplier = 1.25;
      else if (c.verificationStatus === 'challenged') verificationMultiplier = 0.3;
      else verificationMultiplier = 0.85;

      // 3. Community confirmations bonus (crowd validation)
      const confirmationsBonus = Math.min(0.35, (c.confirmationsCount || 0) * 0.05);

      // 4. Confidence factor
      const confidenceFactor = Math.max(0.5, Math.min(1.0, c.confidence ?? 0.9));

      const rawWeight = (identityWeight * verificationMultiplier + confirmationsBonus) * confidenceFactor;
      const normalizedWeight = Number(Math.max(0.1, Math.min(2.0, rawWeight)).toFixed(2));

      return {
        type: 'Feature' as const,
        id: `density-${c.id}`,
        properties: {
          id: c.id,
          name: c.name,
          stateName: c.stateName,
          lgaName: c.lgaName,
          weight: normalizedWeight,
          verificationStatus: c.verificationStatus,
          identityStatus: c.identityStatus,
          confidence: c.confidence,
        },
        geometry: {
          type: 'Point' as const,
          coordinates: [c.longitude, c.latitude] as [number, number],
        },
      };
    });

  return NextResponse.json(
    {
      type: 'FeatureCollection',
      metadata: {
        type: 'derived_presence_density',
        totalDocumentedSettlements: densityFeatures.length,
        derivedAt: new Date().toISOString(),
        disclaimer:
          'Mapped community density represents documented records and community confirmations. Never interpret low density as absence of people.',
      },
      features: densityFeatures,
    },
    {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
      },
    }
  );
}
