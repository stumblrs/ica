import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  saveCommentToStore,
  getCommentsFromStore,
  type StoredComment,
} from '@/lib/comment-store';

export const dynamic = 'force-dynamic';

/**
 * GET /api/communities/:id/comments
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;

  // 1. Try Prisma first
  try {
    const comments = await prisma.comment.findMany({
      where: { communityId: id },
      orderBy: { createdAt: 'desc' },
    });

    if (comments.length > 0) {
      const formatted = comments.map((c) => ({
        id: c.id,
        communityId: c.communityId,
        authorName: c.author,
        handle: c.handle || `@${c.author.toLowerCase().replace(/[^a-z0-9]/g, '') || 'resident'}`,
        affiliation: 'Community Member',
        comment: c.content,
        likes: c.likes,
        category: c.category,
        createdAt: c.createdAt.toISOString(),
      }));
      return NextResponse.json(formatted);
    }
  } catch (err: any) {
    console.warn(`[CommunityCommentsAPI] PostgreSQL offline: ${err.message}. Reading from store.`);
  }

  // 2. Offline store fallback
  const storeResult = getCommentsFromStore({ communityId: id, limit: 50 });
  return NextResponse.json(storeResult.comments);
}

/**
 * POST /api/communities/:id/comments
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await req.json();
    const { authorName, comment, content, text, affiliation, category = 'general' } = body;
    const commentText = comment || content || text;

    if (!commentText || typeof commentText !== 'string' || !commentText.trim()) {
      return NextResponse.json({ error: 'Comment text is required.' }, { status: 400 });
    }

    const deviceId = req.headers.get('x-device-id') || body.deviceId || null;
    const cleanAuthor =
      authorName && typeof authorName === 'string' && authorName.trim()
        ? authorName.trim()
        : 'Anonymous Contributor';
    const cleanHandle = `@${cleanAuthor.toLowerCase().replace(/[^a-z0-9]/g, '') || 'resident'}`;

    // 1. Always save to offline file store first
    const stored = saveCommentToStore({
      communityId: id,
      authorName: cleanAuthor,
      handle: cleanHandle,
      comment: commentText.trim(),
      category,
      affiliation,
      deviceId,
    });

    // 2. Also try PostgreSQL if available
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
          communityId: id,
          deviceId: deviceId || null,
          author: cleanAuthor,
          handle: cleanHandle,
          content: commentText.trim(),
          category,
          likes: 0,
        },
      });

      return NextResponse.json(
        {
          id: created.id,
          communityId: created.communityId,
          authorName: created.author,
          handle: created.handle,
          affiliation: affiliation || 'Community Member',
          comment: created.content,
          likes: created.likes,
          category: created.category,
          createdAt: created.createdAt.toISOString(),
        },
        { status: 201 }
      );
    } catch (dbErr: any) {
      console.warn(`[CommunityCommentsAPI] PostgreSQL offline (${dbErr.message}). Persisted to comments_store.json.`);
    }

    // Return stored comment
    return NextResponse.json(stored, { status: 201 });
  } catch (err: any) {
    console.error('Error in community comment POST:', err);
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
