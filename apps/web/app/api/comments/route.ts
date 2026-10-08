import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export interface EnrichedComment {
  id: string;
  communityId: string;
  communityName: string;
  lgaName?: string;
  stateName?: string;
  coordinates: [number, number];
  authorName: string;
  handle?: string;
  affiliation?: string;
  category?: 'oral-history' | 'dialect' | 'lineage' | 'tradition' | 'general' | string;
  comment: string;
  likes?: number;
  createdAt: string;
}

/**
 * GET /api/comments
 * Returns all community comments and oral histories from Supabase, sorted newest first.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const stateFilter = searchParams.get('state')?.toLowerCase();
    const communityId = searchParams.get('communityId');

    const where: any = {};
    if (communityId) {
      where.communityId = communityId;
    }
    if (stateFilter) {
      where.community = {
        stateName: { equals: stateFilter, mode: 'insensitive' },
      };
    }

    const comments = await prisma.comment.findMany({
      where,
      include: {
        community: {
          select: {
            id: true,
            name: true,
            lgaName: true,
            stateName: true,
            longitude: true,
            latitude: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    const enriched: EnrichedComment[] = comments.map((cmt) => ({
      id: cmt.id,
      communityId: cmt.communityId || '',
      communityName: cmt.community?.name || 'Community',
      lgaName: cmt.community?.lgaName,
      stateName: cmt.community?.stateName,
      coordinates: [cmt.community?.longitude || 0, cmt.community?.latitude || 0],
      authorName: cmt.author,
      handle: cmt.handle || `@${cmt.author.toLowerCase().replace(/[^a-z0-9]/g, '') || 'resident'}`,
      affiliation: 'Community Member',
      category: cmt.category,
      comment: cmt.content,
      likes: cmt.likes,
      createdAt: cmt.createdAt.toISOString(),
    }));

    return NextResponse.json(enriched);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch comments' }, { status: 500 });
  }
}

/**
 * POST /api/comments
 * Creates a comment / oral tweet on a community, or increments likes.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // 1. Like action
    if (body.action === 'like' && body.commentId) {
      const updated = await prisma.comment.update({
        where: { id: body.commentId },
        data: { likes: { increment: 1 } },
      });
      return NextResponse.json({ success: true, likes: updated.likes });
    }

    // 2. Create Comment
    const {
      communityId,
      authorName,
      author,
      handle,
      comment,
      content,
      category = 'general',
      location,
    } = body;

    const targetComment = comment || content;
    if (!communityId) {
      return NextResponse.json({ error: 'communityId is required.' }, { status: 400 });
    }

    if (!targetComment || typeof targetComment !== 'string' || !targetComment.trim()) {
      return NextResponse.json({ error: 'Comment text is required.' }, { status: 400 });
    }

    const deviceId = req.headers.get('x-device-id') || body.deviceId;
    if (deviceId) {
      await prisma.device.upsert({
        where: { id: deviceId },
        update: {},
        create: { id: deviceId, trustScore: 100 },
      });
    }

    const targetAuthor = (authorName || author || '').trim() || 'Anonymous Resident';
    const targetHandle =
      (handle && typeof handle === 'string' && handle.trim())
        ? (handle.trim().startsWith('@') ? handle.trim() : `@${handle.trim()}`)
        : `@${targetAuthor.toLowerCase().replace(/[^a-z0-9]/g, '') || 'resident'}`;

    const created = await prisma.comment.create({
      data: {
        communityId,
        deviceId: deviceId || null,
        author: targetAuthor,
        handle: targetHandle,
        content: targetComment.trim(),
        category,
        location: location || null,
        likes: 0,
      },
      include: {
        community: {
          select: {
            id: true,
            name: true,
            lgaName: true,
            stateName: true,
            longitude: true,
            latitude: true,
          },
        },
      },
    });

    const enriched: EnrichedComment = {
      id: created.id,
      communityId: created.communityId || '',
      communityName: created.community?.name || 'Community',
      lgaName: created.community?.lgaName,
      stateName: created.community?.stateName,
      coordinates: [created.community?.longitude || 0, created.community?.latitude || 0],
      authorName: created.author,
      handle: created.handle || `@${created.author.toLowerCase().replace(/[^a-z0-9]/g, '') || 'resident'}`,
      affiliation: 'Community Member',
      category: created.category,
      comment: created.content,
      likes: created.likes,
      createdAt: created.createdAt.toISOString(),
    };

    return NextResponse.json(enriched, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
