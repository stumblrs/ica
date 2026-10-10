import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/landmarks
 * Returns all mapped Kindred (Ụmụnna) and Village landmarks as GeoJSON FeatureCollection
 */
export async function GET(req: NextRequest) {
  try {
    const communitiesWithEvidence = await prisma.community.findMany({
      where: {
        evidenceJson: {
          contains: 'kindredLandmarks',
        },
      },
      select: {
        id: true,
        name: true,
        evidenceJson: true,
      },
    });

    const features: any[] = [];

    for (const comm of communitiesWithEvidence) {
      if (!comm.evidenceJson) continue;
      try {
        const parsed = JSON.parse(comm.evidenceJson);
        if (Array.isArray(parsed.kindredLandmarks)) {
          for (const kl of parsed.kindredLandmarks) {
            if (typeof kl.longitude === 'number' && typeof kl.latitude === 'number') {
              features.push({
                type: 'Feature',
                geometry: {
                  type: 'Point',
                  coordinates: [kl.longitude, kl.latitude],
                },
                properties: {
                  id: kl.id,
                  name: kl.name,
                  umunnaName: kl.umunnaName || '',
                  communityId: comm.id,
                  communityName: comm.name,
                  category: kl.category || 'village_square',
                  description: kl.description || '',
                  contributorName: kl.contributorName || '',
                  createdAt: kl.createdAt,
                },
              });
            }
          }
        }
      } catch {
        // Skip malformed records
      }
    }

    return NextResponse.json({
      type: 'FeatureCollection',
      features,
    });
  } catch (err: any) {
    return NextResponse.json(
      { type: 'FeatureCollection', features: [], error: err.message },
      { status: 500 }
    );
  }
}
