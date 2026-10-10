import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { revalidateAtlasData } from '@/lib/revalidation';

function haversineDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const landmarks = Array.isArray(body.landmarks) ? body.landmarks : [];

    if (landmarks.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No offline landmarks provided for sync',
        syncedCount: 0,
        skippedDuplicates: 0,
      });
    }

    // Pre-fetch all communities for spatial nearest-neighbor resolution
    const allCommunities = await prisma.community.findMany({
      select: {
        id: true,
        name: true,
        latitude: true,
        longitude: true,
        evidenceJson: true,
      },
    });

    if (allCommunities.length === 0) {
      return NextResponse.json(
        { error: 'No communities exist in the database to bind offline landmarks to.' },
        { status: 400 }
      );
    }

    // Group incoming landmarks by target community to perform batched updates
    const communityLandmarksMap = new Map<string, any[]>();
    let syncedCount = 0;
    let skippedDuplicates = 0;
    const errors: string[] = [];

    for (const item of landmarks) {
      if (!item.name || typeof item.latitude !== 'number' || typeof item.longitude !== 'number') {
        errors.push(`Invalid landmark record: ${item.name || 'unnamed'}`);
        continue;
      }

      let targetCommunity = null;
      if (item.communityId) {
        targetCommunity = allCommunities.find((c) => c.id === item.communityId);
      }

      if (!targetCommunity) {
        // Nearest neighbor
        let minDist = Infinity;
        for (const c of allCommunities) {
          const dist = haversineDistanceKm(item.latitude, item.longitude, c.latitude, c.longitude);
          if (dist < minDist) {
            minDist = dist;
            targetCommunity = c;
          }
        }
      }

      if (!targetCommunity) {
        errors.push(`Could not associate landmark "${item.name}" with any community.`);
        continue;
      }

      if (!communityLandmarksMap.has(targetCommunity.id)) {
        communityLandmarksMap.set(targetCommunity.id, []);
      }
      communityLandmarksMap.get(targetCommunity.id)!.push({
        ...item,
        targetCommunity,
      });
    }

    // Process batched updates per community
    for (const [communityId, itemsToSync] of Array.from(communityLandmarksMap.entries())) {
      const comm = allCommunities.find((c) => c.id === communityId);
      if (!comm) continue;

      let evidenceObj: any = {};
      try {
        if (comm.evidenceJson) {
          evidenceObj = JSON.parse(comm.evidenceJson);
        }
      } catch {
        evidenceObj = {};
      }

      if (!Array.isArray(evidenceObj.kindredLandmarks)) {
        evidenceObj.kindredLandmarks = [];
      }

      for (const item of itemsToSync) {
        // Deduplication check: same name or distance < 50 meters (0.05 km)
        const isDuplicate = evidenceObj.kindredLandmarks.some((existing: any) => {
          const nameMatch = existing.name?.toLowerCase().trim() === item.name.toLowerCase().trim();
          const dist = haversineDistanceKm(item.latitude, item.longitude, existing.latitude, existing.longitude);
          return nameMatch || dist < 0.05;
        });

        if (isDuplicate) {
          skippedDuplicates++;
          continue;
        }

        evidenceObj.kindredLandmarks.push({
          id: item.id || `kl-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          name: item.name.trim(),
          umunnaName: item.umunnaName?.trim() || null,
          category: item.category || 'village_square',
          description: item.description?.trim() || null,
          latitude: item.latitude,
          longitude: item.longitude,
          contributorName: item.contributorName?.trim() || 'Offline Field Contributor',
          createdAt: item.createdAt || new Date().toISOString(),
          syncedAt: new Date().toISOString(),
        });
        syncedCount++;
      }

      // Persist updated evidenceJson
      await prisma.community.update({
        where: { id: communityId },
        data: {
          evidenceJson: JSON.stringify(evidenceObj),
        },
      });
    }

    // Invalidate public caches so the newly synced landmarks appear immediately
    revalidateAtlasData();

    return NextResponse.json({
      success: true,
      syncedCount,
      skippedDuplicates,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: 'Batch sync failed: ' + err.message },
      { status: 500 }
    );
  }
}
