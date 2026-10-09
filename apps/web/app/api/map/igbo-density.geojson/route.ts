import { NextRequest, NextResponse } from 'next/server';
import fs from 'node:fs';
import path from 'node:path';

const DB_FILE = path.resolve(process.cwd(), 'public/data/communities_store.json');

import { prisma } from '@/lib/prisma';

/**
 * GET /api/map/igbo-density.geojson
 * Section 12.1: "Start with a heatmap or regular grid from approved/verified community points...
 * Never interpret low density as absence."
 */
export async function GET(req: NextRequest) {
  let communities: any[] = [];

  try {
    const dbCommunities = await prisma.community.findMany({
      where: {
        stateId: { notIn: ['NG032', 'NG002'] },
        stateName: { notIn: ['Plateau', 'Adamawa'] },
      },
      select: {
        id: true,
        name: true,
        verificationStatus: true,
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
          c.stateId !== 'NG032' &&
          c.stateId !== 'NG002' &&
          (c.stateName || '').toLowerCase() !== 'plateau' &&
          (c.stateName || '').toLowerCase() !== 'adamawa'
      );
    }
  }

  // Weight point intensity based on verification and confirmations
  const densityFeatures = communities.map((c) => {
    let weight = 0.5;
    if (c.verificationStatus === 'verified') weight = 1.0;
    else if (c.verificationStatus === 'challenged') weight = 0.2;

    const confirmationsBonus = Math.min(0.5, (c.confirmationsCount || 0) * 0.05);

    return {
      type: 'Feature',
      id: `density-${c.id}`,
      properties: {
        weight: Number((weight + confirmationsBonus).toFixed(2)),
        communityName: c.name,
        verificationStatus: c.verificationStatus,
      },
      geometry: {
        type: 'Point',
        coordinates: [c.longitude, c.latitude],
      },
    };
  });

  return NextResponse.json({
    type: 'FeatureCollection',
    metadata: {
      type: 'derived_density',
      disclaimer: 'Mapped community density represents documented records and not absence of communities.',
    },
    features: densityFeatures,
  });
}
