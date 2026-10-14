import { NextRequest, NextResponse } from 'next/server';
import fs from 'node:fs';
import path from 'node:path';
import { prisma } from '@/lib/prisma';
import { revalidateAtlasData } from '@/lib/revalidation';
import { parseMediaUrl } from '@/lib/media';

function getStorePaths(): string[] {
  const p1 = path.resolve(process.cwd(), 'public/data/communities_store.json');
  const p2 = path.resolve(process.cwd(), 'apps/web/public/data/communities_store.json');
  const p3 = path.resolve(__dirname, '../../../../public/data/communities_store.json');
  const p4 = path.resolve(__dirname, '../../../public/data/communities_store.json');
  return Array.from(new Set([p1, p2, p3, p4]));
}

function readStore(): any[] {
  for (const p of getStorePaths()) {
    try {
      if (fs.existsSync(p)) {
        const data = JSON.parse(fs.readFileSync(p, 'utf8'));
        if (Array.isArray(data)) return data;
      }
    } catch {}
  }
  return [];
}

function writeStore(records: any[]) {
  const targets = [
    path.resolve(process.cwd(), 'public/data/communities_store.json'),
    path.resolve(process.cwd(), 'apps/web/public/data/communities_store.json'),
  ];
  for (const t of targets) {
    try {
      fs.mkdirSync(path.dirname(t), { recursive: true });
      fs.writeFileSync(t, JSON.stringify(records, null, 2), 'utf8');
    } catch {}
  }
}

function fallbackStoreSave(params: {
  communityId?: string;
  name: string;
  latitude?: number;
  longitude?: number;
  lgaName?: string;
  stateName?: string;
  mediaEvidenceItem: any;
}) {
  const { communityId, name, latitude, longitude, lgaName, stateName, mediaEvidenceItem } = params;
  const store = readStore();
  const nameNorm = name.trim().toLowerCase();

  let targetIndex = store.findIndex((c) => communityId && c.id === communityId);
  if (targetIndex === -1) {
    targetIndex = store.findIndex((c) => (c.name || '').trim().toLowerCase() === nameNorm);
  }

  let resultCommunity: any;
  let action: 'appended' | 'created';

  if (targetIndex !== -1) {
    const existing = store[targetIndex];
    if (!Array.isArray(existing.evidence)) {
      existing.evidence = existing.evidenceJson ? JSON.parse(existing.evidenceJson) : [];
    }
    existing.evidence.unshift(mediaEvidenceItem);
    existing.updatedAt = new Date().toISOString();
    store[targetIndex] = existing;
    resultCommunity = existing;
    action = 'appended';
  } else {
    const lat = typeof latitude === 'number' ? latitude : 6.22;
    const lon = typeof longitude === 'number' ? longitude : 7.05;
    const newRecord = {
      id: communityId || 'comm-' + Date.now(),
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
      historicalStatus: 'Documented visual media record',
      verificationStatus: 'verified',
      lifecycleStatus: 'ACTIVE',
      confidence: 0.85,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      evidence: [mediaEvidenceItem],
      confirmationsCount: 1,
      challengesCount: 0,
    };
    store.unshift(newRecord);
    resultCommunity = newRecord;
    action = 'created';
  }

  writeStore(store);
  return { community: resultCommunity, action };
}

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

    // Try Prisma DB first
    try {
      let existingCommunity: any = null;
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

      if (existingCommunity) {
        let currentEvidence: any[] = [];
        try {
          currentEvidence = existingCommunity.evidenceJson ? JSON.parse(existingCommunity.evidenceJson) : [];
        } catch {
          currentEvidence = [];
        }
        currentEvidence.unshift(mediaEvidenceItem);

        const updated = await prisma.community.update({
          where: { id: existingCommunity.id },
          data: {
            evidenceJson: JSON.stringify(currentEvidence),
          },
        });

        try {
          await prisma.communityAuditLog.create({
            data: {
              communityId: updated.id,
              action: 'MEDIA_ADDED',
              summary: `Added ${parsedMedia.type} URL (${parsedMedia.provider}) for '${updated.name}'.`,
            },
          });
        } catch {}

        // Keep local store in sync
        fallbackStoreSave({ communityId: updated.id, name, latitude, longitude, lgaName, stateName, mediaEvidenceItem });
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

        const newCommunity = await prisma.community.create({
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

        // Keep local store in sync
        fallbackStoreSave({ communityId: newCommunity.id, name, latitude, longitude, lgaName, stateName, mediaEvidenceItem });
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
      console.warn('Database server offline (Prisma unreachable). Seamlessly saving to local store:', dbErr.message);
    }

    // Resilient fallback: Save directly to communities_store.json
    const { community: savedCommunity, action } = fallbackStoreSave({
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
