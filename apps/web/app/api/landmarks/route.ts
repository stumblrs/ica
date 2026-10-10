import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { revalidateAtlasData } from '@/lib/revalidation';

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

/**
 * POST /api/landmarks
 * Records a kindred landmark, automatically binding it to the nearest or specified community
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, umunnaName, category, description, latitude, longitude, communityId, contributorName } = body;

    if (!name || latitude == null || longitude == null) {
      return NextResponse.json(
        { error: 'name, latitude, and longitude are required.' },
        { status: 400 }
      );
    }

    let targetCommunity = null;

    if (communityId) {
      targetCommunity = await prisma.community.findUnique({ where: { id: communityId } });
    }

    // If no community specified, find the nearest community geographically
    if (!targetCommunity) {
      const allCommunities = await prisma.community.findMany({
        select: { id: true, name: true, latitude: true, longitude: true, evidenceJson: true },
      });

      if (allCommunities.length > 0) {
        let minDist = Infinity;
        for (const c of allCommunities) {
          const dLat = c.latitude - Number(latitude);
          const dLon = c.longitude - Number(longitude);
          const distSq = dLat * dLat + dLon * dLon;
          if (distSq < minDist) {
            minDist = distSq;
            targetCommunity = c;
          }
        }
      }
    }

    if (!targetCommunity) {
      return NextResponse.json(
        { error: 'No parent community found in the atlas to attach landmark.' },
        { status: 404 }
      );
    }

    let parsedEvidence: any = {};
    try {
      if (targetCommunity.evidenceJson) parsedEvidence = JSON.parse(targetCommunity.evidenceJson);
    } catch {
      parsedEvidence = {};
    }

    const existingLandmarks = Array.isArray(parsedEvidence.kindredLandmarks)
      ? parsedEvidence.kindredLandmarks
      : [];

    const newLandmark = {
      id: `kl-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      communityId: targetCommunity.id,
      communityName: targetCommunity.name,
      name: name.trim(),
      umunnaName: umunnaName ? umunnaName.trim() : undefined,
      category: category || 'village_square',
      description: description ? description.trim() : undefined,
      latitude: Number(latitude),
      longitude: Number(longitude),
      contributorName: contributorName ? contributorName.trim() : 'Anonymous Kin',
      createdAt: new Date().toISOString(),
    };

    parsedEvidence.kindredLandmarks = [...existingLandmarks, newLandmark];

    await prisma.community.update({
      where: { id: targetCommunity.id },
      data: { evidenceJson: JSON.stringify(parsedEvidence) },
    });

    revalidateAtlasData();

    return NextResponse.json({
      success: true,
      landmark: newLandmark,
    });
  } catch (err: any) {
    return NextResponse.json({ error: 'Failed to create landmark: ' + err.message }, { status: 500 });
  }
}

