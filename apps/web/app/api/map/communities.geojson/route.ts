import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCommunitiesStoreGeoJSON } from '@/lib/community-store';

export const dynamic = 'force-dynamic';

/**
 * GET /api/map/communities.geojson
 * Streams all active and contested communities from database or local store as standard GeoJSON,
 * enriched with media presence metadata.
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
        evidenceJson: true,
      },
    });

    if (!communities || communities.length === 0) {
      // If DB returned empty, use file store
      return NextResponse.json(getCommunitiesStoreGeoJSON(), {
        headers: { 'Cache-Control': 'no-store' },
      });
    }

    const featureCollection = {
      type: 'FeatureCollection',
      features: communities.map((c) => {
        let evidence: any[] = [];
        try {
          if (c.evidenceJson) {
            evidence = JSON.parse(c.evidenceJson);
          }
        } catch {
          evidence = [];
        }
        const hasMedia = Array.isArray(evidence) && evidence.length > 0;
        return {
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
            hasMedia,
            has_media: hasMedia,
            mediaCount: evidence.length,
            media_count: evidence.length,
            evidence,
            media: evidence,
          },
          geometry: {
            type: 'Point',
            coordinates: [c.longitude, c.latitude],
          },
        };
      }),
    };

    return NextResponse.json(featureCollection, {
      headers: {
        'Cache-Control': 'no-store',
      },
    });
  } catch (err: any) {
    console.warn('Database query error in /api/map/communities.geojson, falling back to local store:', err.message);
    const storeGeoJSON = getCommunitiesStoreGeoJSON();
    return NextResponse.json(storeGeoJSON, {
      status: 200,
      headers: {
        'x-db-status': 'fallback',
        'Cache-Control': 'no-store',
      },
    });
  }
}
