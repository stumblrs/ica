import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  saveCommentToStore,
  getCommentsFromStore,
  likeCommentInStore,
  readCommentsStore,
  type StoredComment,
} from '@/lib/comment-store';

export const dynamic = 'force-dynamic';

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
 * Returns all community comments and oral histories, sorted newest first.
 * Gracefully falls back to offline comment store if PostgreSQL is unreachable.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const stateFilter = searchParams.get('state')?.toLowerCase();
  const communityId = searchParams.get('communityId') || undefined;
  const cursor = searchParams.get('cursor') || undefined;
  const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '5', 10), 1), 50);

  // 1. Try Prisma first if available
  try {
    const where: any = {};
    if (communityId) {
      where.communityId = communityId;
    }
    if (stateFilter && stateFilter !== 'all') {
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
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });

    const hasMore = comments.length > limit;
    const trimmed = hasMore ? comments.slice(0, limit) : comments;
    const nextCursor = hasMore && trimmed.length > 0 ? trimmed[trimmed.length - 1].id : null;

    const enriched: EnrichedComment[] = trimmed.map((cmt) => ({
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

    // If database returned results, return them
    if (enriched.length > 0) {
      return NextResponse.json({
        comments: enriched,
        nextCursor,
        hasMore,
      });
    }
  } catch (err: any) {
    console.warn('[CommentsAPI] PostgreSQL offline or unreachable. Reading from offline store:', err.message);
  }

  // 2. Seamless fallback to offline file store
  const storeResult = getCommentsFromStore({
    communityId,
    state: stateFilter,
    limit,
    cursor,
  });

  return NextResponse.json({
    comments: storeResult.comments,
    nextCursor: storeResult.nextCursor,
    hasMore: storeResult.hasMore,
  });
}

/**
 * POST /api/comments
 * Creates a comment / oral tweet on a community, or increments likes.
 * Works offline with persistent fallback so no comment is lost when DB is offline.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // 1. Like action
    if (body.action === 'like' && body.commentId) {
      let likes = likeCommentInStore(body.commentId);
      try {
        const updated = await prisma.comment.update({
          where: { id: body.commentId },
          data: { likes: { increment: 1 } },
        });
        likes = updated.likes;
      } catch {
        // Prisma offline - store updated
      }
      return NextResponse.json({ success: true, likes });
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
      affiliation,
      location,
    } = body;

    const targetComment = comment || content;
    if (!communityId) {
      return NextResponse.json({ error: 'communityId is required.' }, { status: 400 });
    }

    if (!targetComment || typeof targetComment !== 'string' || !targetComment.trim()) {
      return NextResponse.json({ error: 'Comment text is required.' }, { status: 400 });
    }

    const deviceId = req.headers.get('x-device-id') || body.deviceId || null;
    const targetAuthor = (authorName || author || '').trim() || 'Anonymous Resident';
    const targetHandle =
      handle && typeof handle === 'string' && handle.trim()
        ? handle.trim().startsWith('@')
          ? handle.trim()
          : `@${handle.trim()}`
        : `@${targetAuthor.toLowerCase().replace(/[^a-z0-9]/g, '') || 'resident'}`;

    // 3. Always save to offline file store first (guaranteed persistence)
    const stored = saveCommentToStore({
      communityId,
      authorName: targetAuthor,
      handle: targetHandle,
      comment: targetComment.trim(),
      category,
      affiliation,
      deviceId,
      location,
    });

    // 4. Also persist to PostgreSQL if reachable
    try {
      if (deviceId) {
        await prisma.device.upsert({
          where: { id: deviceId },
          update: {},
          create: { id: deviceId, trustScore: 100 },
        });
      }

      const created = await prisma.comment.create({
        data: {
          id: stored.id,
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

      return NextResponse.json(
        {
          id: created.id,
          communityId: created.communityId,
          communityName: created.community?.name || stored.communityName,
          lgaName: created.community?.lgaName || stored.lgaName,
          stateName: created.community?.stateName || stored.stateName,
          coordinates: [created.community?.longitude || stored.coordinates[0], created.community?.latitude || stored.coordinates[1]],
          authorName: created.author,
          handle: created.handle,
          affiliation: affiliation || 'Community Member',
          category: created.category,
          comment: created.content,
          likes: created.likes,
          createdAt: created.createdAt.toISOString(),
        },
        { status: 201 }
      );
    } catch (dbErr: any) {
      console.warn(`[CommentsAPI] PostgreSQL offline (${dbErr.message}). Successfully saved to comments_store.json.`);
    }

    // Return the stored comment seamlessly
    return NextResponse.json(stored, { status: 201 });
  } catch (err: any) {
    console.error('Error creating comment:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
