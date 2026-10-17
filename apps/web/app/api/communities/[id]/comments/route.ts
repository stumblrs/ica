import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { supabase } from '@/lib/supabase';
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

  // 1. Try Supabase directly first
  try {
    const { data: comments, error } = await supabase
      .from('Comment')
      .select('id, communityId, author, handle, content, category, likes, createdAt')
      .eq('communityId', id)
      .order('createdAt', { ascending: false });

    if (!error && comments && comments.length > 0) {
      const formatted = comments.map((c) => ({
        id: c.id,
        communityId: c.communityId,
        authorName: c.author,
        handle: c.handle || `@${c.author?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'resident'}`,
        affiliation: 'Community Member',
        comment: c.content,
        likes: c.likes || 0,
        category: c.category,
        createdAt: typeof c.createdAt === 'string' ? c.createdAt : new Date(c.createdAt).toISOString(),
      }));
      return NextResponse.json(formatted);
    }
  } catch (err: any) {
    // Supabase error fallback
  }

  // 2. Try Prisma fallback
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

  // 3. Offline store fallback
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

    if (commentText.trim().length > 1000) {
      return NextResponse.json({ error: 'Comment text cannot exceed 1000 characters.' }, { status: 400 });
    }

    const deviceId = req.headers.get('x-device-id') || body.deviceId || null;
    const rawFingerprint = req.headers.get('x-device-fingerprint') || body.fingerprintHash || null;
    const cleanFingerprint = rawFingerprint && String(rawFingerprint).startsWith('fp_') ? String(rawFingerprint) : null;
    const cleanAuthor =
      authorName && typeof authorName === 'string' && authorName.trim()
        ? authorName.trim().slice(0, 60)
        : 'Anonymous Contributor';
    const cleanHandle = `@${cleanAuthor.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 30) || 'resident'}`;

    // 1. Always save to offline file store first
    const stored = saveCommentToStore({
      communityId: id,
      authorName: cleanAuthor,
      handle: cleanHandle,
      comment: commentText.trim(),
      category: String(category).slice(0, 50),
      affiliation: affiliation ? String(affiliation).slice(0, 60) : undefined,
      deviceId,
    });

    // 2. Persist to database via Prisma (server-level admin connection)
    try {
      if (deviceId) {
        await prisma.device.upsert({
          where: { id: deviceId },
          update: {
            lastActiveAt: new Date(),
            ...(cleanFingerprint ? { fingerprintHash: cleanFingerprint } : {}),
          },
          create: {
            id: deviceId,
            trustScore: 100,
            lastActiveAt: new Date(),
            fingerprintHash: cleanFingerprint,
          },
        });
      }

      // Resolve community to prevent foreign key errors
      let resolvedDbCommunityId: string | null = null;
      try {
        const comm = await prisma.community.findFirst({
          where: {
            OR: [
              { id },
              { name: { equals: id, mode: 'insensitive' } },
            ],
          },
          select: { id: true },
        });
        if (comm) resolvedDbCommunityId = comm.id;
      } catch {}

      const prismaCreated = await (prisma.comment as any).create({
        data: {
          id: stored.id,
          communityId: resolvedDbCommunityId,
          deviceId: deviceId || null,
          author: cleanAuthor,
          handle: cleanHandle,
          content: commentText.trim(),
          category: String(category).slice(0, 50),
          likes: 0,
          citesCount: 0,
        },
      });

      return NextResponse.json(
        {
          id: prismaCreated.id,
          communityId: prismaCreated.communityId,
          authorName: prismaCreated.author,
          handle: prismaCreated.handle,
          affiliation: affiliation || 'Community Member',
          comment: prismaCreated.content,
          likes: prismaCreated.likes,
          category: prismaCreated.category,
          createdAt: prismaCreated.createdAt.toISOString(),
        },
        { status: 201 }
      );
    } catch (dbErr: any) {
      console.warn(`[CommunityCommentsAPI] Database error (${dbErr.message}). Persisted to local store.`);
    }

    // Return stored comment
    return NextResponse.json(stored, { status: 201 });
  } catch (err: any) {
    console.error('Error in community comment POST:', err);
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
