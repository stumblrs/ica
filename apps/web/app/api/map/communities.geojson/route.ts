import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { supabase } from '@/lib/supabase';
import { getCommunitiesStoreGeoJSON } from '@/lib/community-store';

export const dynamic = 'force-dynamic';

/**
 * GET /api/map/communities.geojson
 * Streams all active and contested communities from database or local store as standard GeoJSON,
 * enriched with media presence metadata.
 */
export async function GET(req: NextRequest) {
  try {
    let communities: any[] | null = null;

    // 1. Try Supabase direct HTTPS query first (guaranteed in serverless)
    try {
      const { data, error } = await supabase
        .from('Community')
        .select('id, name, type, stateName, lgaName, identityStatus, verificationStatus, lifecycleStatus, confidence, confirmationsCount, challengesCount, description, longitude, latitude, evidenceJson');
      if (!error && Array.isArray(data) && data.length > 0) {
        communities = data;
      }
    } catch {}

    // 2. Secondary fallback to Prisma
    if (!communities || communities.length === 0) {
      try {
        communities = await prisma.community.findMany({
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
      } catch {}
    }

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
            evidence = typeof c.evidenceJson === 'string' ? JSON.parse(c.evidenceJson) : c.evidenceJson;
          }
        } catch {
          evidence = [];
        }
        if (!Array.isArray(evidence)) evidence = [];

        // Distinguish genuine media links (photos & videos) from purely textual book citations
        const validMedia = evidence.filter((e: any) =>
          Boolean(e && (e.url || e.embedUrl || (e.citationOrUrl && (e.citationOrUrl.startsWith('http://') || e.citationOrUrl.startsWith('https://')))))
        );

        const hasVideo = validMedia.some((e: any) => {
          const u = (e.url || e.embedUrl || e.citationOrUrl || '').toLowerCase();
          return (
            e.type === 'video' ||
            u.includes('youtube') ||
            u.includes('youtu.be') ||
            u.includes('vimeo') ||
            u.includes('tiktok') ||
            u.endsWith('.mp4') ||
            u.endsWith('.webm')
          );
        });

        const hasPhoto = validMedia.some((e: any) => {
          const u = (e.url || e.embedUrl || e.citationOrUrl || '').toLowerCase();
          return (
            e.type === 'image' ||
            u.includes('unsplash') ||
            u.includes('imgur') ||
            u.includes('wikimedia') ||
            u.includes('postimg') ||
            u.endsWith('.jpg') ||
            u.endsWith('.jpeg') ||
            u.endsWith('.png') ||
            u.endsWith('.webp')
          );
        });

        const hasMedia = validMedia.length > 0;
        const videoCount = validMedia.filter((e: any) => {
          const u = (e.url || e.embedUrl || e.citationOrUrl || '').toLowerCase();
          return e.type === 'video' || u.includes('youtube') || u.includes('youtu.be') || u.includes('vimeo') || u.includes('tiktok') || u.endsWith('.mp4');
        }).length;

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
            hasVideo,
            has_video: hasVideo,
            hasPhoto,
            has_photo: hasPhoto,
            videoCount,
            video_count: videoCount,
            mediaCount: validMedia.length,
            media_count: validMedia.length,
            mediaJson: JSON.stringify(validMedia),
            evidence,
            media: validMedia,
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
