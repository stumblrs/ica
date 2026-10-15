import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { supabase } from '@/lib/supabase';
import { revalidateAtlasData } from '@/lib/revalidation';
import { parseMediaUrl } from '@/lib/media';
import { saveMediaToStore } from '@/lib/community-store';

/**
 * POST /api/communities/media
 * Attach an image or video URL to ANY settlement or community.
 * If PostgreSQL/Prisma is reachable, updates the database.
 * If the database is offline/unreachable, gracefully persists to the local file store.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      communityId,
      name,
      latitude,
      longitude,
      lgaName,
      stateName,
      media,
      contributorName,
    } = body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: 'Settlement or community name is required.' }, { status: 400 });
    }

    if (!media || !media.url || typeof media.url !== 'string') {
      return NextResponse.json({ error: 'A valid media URL (image or video) is required.' }, { status: 400 });
    }

    // Structure media item
    const parsedMedia = parseMediaUrl(media.url, media.caption, media.credit) || {
      id: `media-${Date.now()}`,
      type: media.type || 'image',
      provider: media.provider || 'image',
      url: media.url.trim(),
      embedUrl: media.embedUrl,
      thumbnailUrl: media.thumbnailUrl || media.url.trim(),
      caption: media.caption?.trim(),
      credit: media.credit?.trim(),
    };

    const mediaEvidenceItem = {
      id: `ev-media-${Date.now()}`,
      sourceType: 'media_link',
      type: parsedMedia.type,
      provider: parsedMedia.provider,
      url: parsedMedia.url,
      embedUrl: parsedMedia.embedUrl,
      thumbnailUrl: parsedMedia.thumbnailUrl,
      caption: parsedMedia.caption || `Visual record for ${name.trim()}`,
      credit: parsedMedia.credit || contributorName?.trim() || 'Community contributor',
      contributor: contributorName?.trim() || 'Anonymous contributor',
      createdAt: new Date().toISOString(),
      isVerified: false,
    };

    // Try Supabase directly first, with Prisma as secondary fallback
    try {
      let existingCommunity: any = null;
      if (communityId) {
        const { data } = await supabase
          .from('Community')
          .select('*')
          .eq('id', communityId)
          .maybeSingle();
        existingCommunity = data;
      }

      if (!existingCommunity) {
        const { data } = await supabase
          .from('Community')
          .select('*')
          .ilike('name', name.trim())
          .limit(1)
          .maybeSingle();
        existingCommunity = data;
      }

      // If Supabase didn't have it or errored, check Prisma
      if (!existingCommunity) {
        try {
          if (communityId) {
            existingCommunity = await prisma.community.findUnique({
              where: { id: communityId },
            });
          }
          if (!existingCommunity) {
            existingCommunity = await prisma.community.findFirst({
              where: {
                name: { equals: name.trim(), mode: 'insensitive' },
                ...(stateName ? { stateName: { contains: stateName.trim(), mode: 'insensitive' } } : {}),
              },
            });
          }
        } catch {
          // Prisma offline
        }
      }

      if (existingCommunity) {
        let currentEvidence: any[] = [];
        try {
          currentEvidence = existingCommunity.evidenceJson ? JSON.parse(existingCommunity.evidenceJson) : [];
        } catch {
          currentEvidence = [];
        }
        currentEvidence.unshift(mediaEvidenceItem);

        // Update via Supabase
        let updated: any = null;
        try {
          const { data } = await supabase
            .from('Community')
            .update({
              evidenceJson: JSON.stringify(currentEvidence),
            })
            .eq('id', existingCommunity.id)
            .select()
            .single();
          updated = data;
        } catch {}

        // Fallback to Prisma update if needed
        if (!updated) {
          try {
            updated = await prisma.community.update({
              where: { id: existingCommunity.id },
              data: {
                evidenceJson: JSON.stringify(currentEvidence),
              },
            });
          } catch {}
        }

        if (!updated) {
          updated = { ...existingCommunity, evidenceJson: JSON.stringify(currentEvidence) };
        }

        try {
          await supabase.from('CommunityAuditLog').insert({
            id: 'audit-' + Date.now(),
            communityId: updated.id,
            action: 'MEDIA_ADDED',
            summary: `Added ${parsedMedia.type} URL (${parsedMedia.provider}) for '${updated.name}'.`,
          });
        } catch {}

        // Keep local store in sync
        saveMediaToStore({ communityId: updated.id, name, latitude, longitude, lgaName, stateName, mediaEvidenceItem });
        revalidateAtlasData();

        return NextResponse.json({
          success: true,
          action: 'appended',
          community: {
            ...updated,
            evidence: currentEvidence,
          },
          mediaItem: mediaEvidenceItem,
        });
      } else {
        const lat = typeof latitude === 'number' ? latitude : 6.22;
        const lon = typeof longitude === 'number' ? longitude : 7.05;

        let newCommunity: any = null;
        try {
          const { data } = await supabase
            .from('Community')
            .insert({
              id: 'comm-' + Date.now(),
              name: name.trim(),
              type: 'settlement',
              description: `Documented settlement ${name.trim()} with community visual media.`,
              latitude: lat,
              longitude: lon,
              stateId: 'SE',
              stateName: stateName?.trim() || 'Anambra',
              lgaId: 'LGA',
              lgaName: lgaName?.trim() || 'Awka South',
              identityStatus: 'confirmed_igbo',
              languageStatus: 'Central Igbo dialect',
              verificationStatus: 'verified',
              lifecycleStatus: 'ACTIVE',
              confidence: 0.85,
              evidenceJson: JSON.stringify([mediaEvidenceItem]),
              confirmationsCount: 1,
              challengesCount: 0,
            })
            .select()
            .single();
          newCommunity = data;
        } catch {}

        if (!newCommunity) {
          try {
            newCommunity = await prisma.community.create({
              data: {
                id: 'comm-' + Date.now(),
                name: name.trim(),
                type: 'settlement',
                description: `Documented settlement ${name.trim()} with community visual media.`,
                latitude: lat,
                longitude: lon,
                stateId: 'SE',
                stateName: stateName?.trim() || 'Anambra',
                lgaId: 'LGA',
                lgaName: lgaName?.trim() || 'Awka South',
                identityStatus: 'confirmed_igbo',
                languageStatus: 'Central Igbo dialect',
                verificationStatus: 'verified',
                lifecycleStatus: 'ACTIVE',
                confidence: 0.85,
                evidenceJson: JSON.stringify([mediaEvidenceItem]),
                confirmationsCount: 1,
                challengesCount: 0,
              },
            });
          } catch {}
        }

        // Keep local store in sync
        saveMediaToStore({ communityId: newCommunity?.id || 'comm-' + Date.now(), name, latitude, longitude, lgaName, stateName, mediaEvidenceItem });
        revalidateAtlasData();

        return NextResponse.json({
          success: true,
          action: 'created',
          community: {
            ...newCommunity,
            evidence: [mediaEvidenceItem],
          },
          mediaItem: mediaEvidenceItem,
        }, { status: 201 });
      }
    } catch (dbErr: any) {
      console.warn('Database error in media upload. Seamlessly saving to local store:', dbErr.message);
    }

    // Resilient fallback: Save directly to communities_store.json
    const { community: savedCommunity, action } = saveMediaToStore({
      communityId,
      name,
      latitude,
      longitude,
      lgaName,
      stateName,
      mediaEvidenceItem,
    });

    revalidateAtlasData();

    return NextResponse.json({
      success: true,
      action,
      community: savedCommunity,
      mediaItem: mediaEvidenceItem,
      storage: 'file_store_offline',
    }, { status: action === 'created' ? 201 : 200 });
  } catch (err: any) {
    console.error('Error in /api/communities/media:', err);
    return NextResponse.json({ error: 'Server error: ' + err.message }, { status: 500 });
  }
}
