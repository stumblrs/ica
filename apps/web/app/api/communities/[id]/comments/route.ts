import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { supabase } from '@/lib/supabase';
import {
  saveCommentToStore,
  getCommentsFromStore,
  type StoredComment,
} from '@/lib/comment-store';
import { readCommunityStore } from '@/lib/community-store';

export const dynamic = 'force-dynamic';

/**
 * GET /api/communities/:id/comments
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;
  const communityStore = readCommunityStore();
  const matched = communityStore.find(
    (c) => c.id === id || (c.name && c.name.toLowerCase() === id.toLowerCase())
  );
  const lookupName = matched?.name || id;

  // 1. Primary: Direct query via Prisma
  try {
    const comments = await prisma.comment.findMany({
      where: {
        OR: [
          { communityId: id },
          ...(matched ? [{ communityId: matched.id }] : []),
          { location: { equals: lookupName, mode: 'insensitive' } },
        ],
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    if (comments.length > 0) {
      const formatted = comments.map((c) => ({
        id: c.id,
        communityId: c.communityId || id,
        authorName: c.author,
        handle: c.handle || `@${c.author.toLowerCase().replace(/[^a-z0-9]/g, '') || 'resident'}`,
        affiliation: 'Community Member',
        comment: c.content,
        likes: c.likes || 0,
        citesCount: (c as any).citesCount || 0,
        category: c.category,
        createdAt: c.createdAt.toISOString(),
      }));
      return NextResponse.json(formatted);
    }
  } catch (err: any) {
    console.warn(`[CommunityCommentsAPI] Prisma error: ${err.message}. Checking fallbacks.`);
  }

  // 2. Fallback: Supabase directly
  try {
    const { data: comments, error } = await supabase
      .from('Comment')
      .select('id, communityId, author, handle, content, category, likes, citesCount, createdAt')
      .or(`communityId.eq.${id},location.ilike.${lookupName}`)
      .order('createdAt', { ascending: false });

    if (!error && Array.isArray(comments) && comments.length > 0) {
      const formatted = comments.map((c) => ({
        id: c.id,
        communityId: c.communityId,
        authorName: c.author,
        handle: c.handle || `@${c.author?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'resident'}`,
        affiliation: 'Community Member',
        comment: c.content,
        likes: c.likes || 0,
        citesCount: c.citesCount || 0,
        category: c.category,
        createdAt: typeof c.createdAt === 'string' ? c.createdAt : new Date(c.createdAt).toISOString(),
      }));
      return NextResponse.json(formatted);
    }
  } catch (err: any) {
    // Supabase error fallback
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

    // Resolve community
    const communityStore = readCommunityStore();
    const matched = communityStore.find(
      (c) => c.id === id || (c.name && c.name.toLowerCase() === id.toLowerCase())
    );
    const lookupName = matched?.name || id;

    let resolvedDbCommunityId: string | null = null;
    try {
      const comm = await prisma.community.findFirst({
        where: {
          OR: [
            { id },
            { name: { equals: lookupName, mode: 'insensitive' } },
            { name: { contains: lookupName, mode: 'insensitive' } },
          ],
        },
        select: { id: true, name: true },
      });
      if (comm) resolvedDbCommunityId = comm.id;
    } catch {}

    const finalCommunityName = matched?.name || lookupName;

    // 1. Always save to offline file store
    const stored = saveCommentToStore({
      communityId: resolvedDbCommunityId || matched?.id || id,
      communityName: finalCommunityName,
      stateName: matched?.stateName,
      lgaName: matched?.lgaName,
      coordinates: matched ? [matched.longitude, matched.latitude] : undefined,
      authorName: cleanAuthor,
      handle: cleanHandle,
      comment: commentText.trim(),
      category: String(category).slice(0, 50),
      affiliation: affiliation ? String(affiliation).slice(0, 60) : undefined,
      deviceId,
      location: finalCommunityName,
    });

    // 2. Persist device to database
    if (deviceId) {
      try {
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
      } catch (devErr: any) {
        console.warn('[CommunityCommentsAPI] Device upsert warning:', devErr.message);
      }
    }

    // 3. Persist comment to database via Prisma
    try {
      const prismaCreated = await (prisma.comment as any).create({
        data: {
          id: stored.id,
          communityId: resolvedDbCommunityId,
          deviceId: deviceId || null,
          author: cleanAuthor,
          handle: cleanHandle,
          content: commentText.trim(),
          category: String(category).slice(0, 50),
          location: finalCommunityName.slice(0, 100),
          likes: 0,
          citesCount: 0,
        },
      });

      return NextResponse.json(
        {
          id: prismaCreated.id,
          communityId: prismaCreated.communityId || id,
          communityName: finalCommunityName,
          stateName: matched?.stateName,
          coordinates: matched ? [matched.longitude, matched.latitude] : [7.0, 6.2],
          authorName: prismaCreated.author,
          handle: prismaCreated.handle,
          affiliation: affiliation || 'Community Member',
          comment: prismaCreated.content,
          likes: prismaCreated.likes || 0,
          citesCount: 0,
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
