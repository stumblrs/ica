import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/map/communities.geojson
 * Streams all active and contested communities from Supabase as standard GeoJSON
 */
export async function GET(req: NextRequest) {
  try {
    const communities = await prisma.community.findMany({
      select: {
        id: true,
        name: true,
        type: true,
        stateName: true,
        lgaName: true,
        identityStatus: true,
        verificationStatus: true,
        lifecycleStatus: true,
        confidence: true,
        confirmationsCount: true,
        challengesCount: true,
        description: true,
        longitude: true,
        latitude: true,
      },
    });

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
          state_name: c.stateName,
          lga_name: c.lgaName,
          identityStatus: c.identityStatus,
          identity_status: c.identityStatus,
          verificationStatus: c.verificationStatus,
          verification_status: c.verificationStatus,
          lifecycleStatus: c.lifecycleStatus || 'ACTIVE',
          lifecycle_status: c.lifecycleStatus || 'ACTIVE',
          confidence: c.confidence,
          confirmationsCount: c.confirmationsCount || 0,
          confirmations_count: c.confirmationsCount || 0,
          challengesCount: c.challengesCount || 0,
          challenges_count: c.challengesCount || 0,
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
        'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=120',
      },
    });
  } catch (err: any) {
    console.error('Database query error in /api/map/communities.geojson:', err);
    return NextResponse.json(
      { type: 'FeatureCollection', features: [] },
      {
        status: 200,
        headers: {
          'x-db-status': 'fallback',
          'x-db-error': err.message || 'Database unavailable',
        },
      }
    );
  }
}
