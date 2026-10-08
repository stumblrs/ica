import { NextRequest, NextResponse } from 'next/server';
import fs from 'node:fs';
import path from 'node:path';

const DB_FILE = path.resolve(process.cwd(), 'public/data/communities_store.json');

/**
 * GET /api/map/igbo-density.geojson
 * Section 12.1: "Start with a heatmap or regular grid from approved/verified community points...
 * Never interpret low density as absence."
 */
export async function GET(req: NextRequest) {
  let communities: any[] = [];
  if (fs.existsSync(DB_FILE)) {
    communities = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
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
