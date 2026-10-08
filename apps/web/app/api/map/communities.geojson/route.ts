import { NextRequest, NextResponse } from 'next/server';
import fs from 'node:fs';
import path from 'node:path';

const DB_FILE = path.resolve(process.cwd(), 'public/data/communities_store.json');

/**
 * GET /api/map/communities.geojson
 * Section 10: "Public GeoJSON endpoints must exclude contributor email, private moderation notes and sensitive evidence metadata."
 */
export async function GET(req: NextRequest) {
  let communities: any[] = [];
  if (fs.existsSync(DB_FILE)) {
    communities = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
  }

  const featureCollection = {
    type: 'FeatureCollection',
    features: communities.map((c) => ({
      type: 'Feature',
      id: c.id,
      properties: {
        id: c.id,
        name: c.name,
        type: c.type,
        stateName: c.stateName,
        lgaName: c.lgaName,
        identityStatus: c.identityStatus,
        verificationStatus: c.verificationStatus,
        lifecycleStatus: c.lifecycleStatus || 'ACTIVE',
        confidence: c.confidence,
        confirmationsCount: c.confirmationsCount || 0,
        challengesCount: c.challengesCount || 0,
        description: c.description,
      },
      geometry: {
        type: 'Point',
        coordinates: [c.longitude, c.latitude],
      },
    })),
  };

  return NextResponse.json(featureCollection, {
    headers: {
      'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
    },
  });
}
