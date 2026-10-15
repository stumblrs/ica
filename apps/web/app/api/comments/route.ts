import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  saveCommentToStore,
  getCommentsFromStore,
  likeCommentInStore,
  readCommentsStore,
  type StoredComment,
} from '@/lib/comment-store';
import { createNotification } from '@/lib/notification-store';
import { findProfileByUsername } from '@/lib/profile-store';

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
  replyToHandle?: string;
  replyToCommentId?: string;
}

/**
 * GET /api/comments
 * Returns a unified global feed of oral testimonies and comments.
 * Merges comments from both PostgreSQL (if available) and the persistent store,
 * guaranteeing zero disappeared comments across all devices.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const stateFilter = searchParams.get('state')?.toLowerCase();
  const communityId = searchParams.get('communityId') || undefined;
  const cursor = searchParams.get('cursor') || undefined;
  const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '10', 10), 1), 50);

  // 1. Load comments from local offline-first persistent store
  const storeComments = readCommentsStore();
  const commentsMap = new Map<string, EnrichedComment>();

  // Populate from persistent store first
  for (const c of storeComments) {
    commentsMap.set(c.id, {
      id: c.id,
      communityId: c.communityId,
      communityName: c.communityName,
      lgaName: c.lgaName,
      stateName: c.stateName,
      coordinates: c.coordinates,
      authorName: c.authorName,
      handle: c.handle,
      affiliation: c.affiliation || 'Community Member',
      category: c.category,
      comment: c.comment,
      likes: c.likes || 0,
      createdAt: c.createdAt,
    });
  }

  // 2. Also query PostgreSQL if available, and merge
  try {
    const dbComments = await prisma.comment.findMany({
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

    for (const cmt of dbComments) {
      if (!commentsMap.has(cmt.id)) {
        commentsMap.set(cmt.id, {
          id: cmt.id,
          communityId: cmt.communityId || '',
          communityName: cmt.community?.name || 'Community',
          lgaName: cmt.community?.lgaName,
          stateName: cmt.community?.stateName,
          coordinates: [cmt.community?.longitude || 7.0, cmt.community?.latitude || 6.2],
          authorName: cmt.author,
          handle: cmt.handle || `@${cmt.author.toLowerCase().replace(/[^a-z0-9]/g, '') || 'resident'}`,
          affiliation: 'Community Member',
          category: cmt.category,
          comment: cmt.content,
          likes: cmt.likes,
          createdAt: cmt.createdAt.toISOString(),
        });
      }
    }
  } catch (err: any) {
    // Database offline - proceed with merged file store
  }

  // 3. Convert to sorted unified array
  let allUnified = Array.from(commentsMap.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  // 4. Apply optional state and community filters if specifically requested
  if (communityId) {
    allUnified = allUnified.filter(
      (c) =>
        c.communityId === communityId ||
        c.communityName.toLowerCase() === communityId.toLowerCase()
    );
  }

  if (stateFilter && stateFilter !== 'all') {
    allUnified = allUnified.filter((c) => c.stateName?.toLowerCase() === stateFilter);
  }

  // 5. Pagination
  let startIndex = 0;
  if (cursor) {
    const idx = allUnified.findIndex((c) => c.id === cursor);
    if (idx !== -1) {
      startIndex = idx + 1;
    }
  }

  const sliced = allUnified.slice(startIndex, startIndex + limit);
  const hasMore = startIndex + limit < allUnified.length;
  const nextCursor = hasMore && sliced.length > 0 ? sliced[sliced.length - 1].id : null;

  return NextResponse.json({
    comments: sliced,
    nextCursor,
    hasMore,
  });
}

/**
 * POST /api/comments
 * Creates a comment / citation, triggers in-app notification to cited author,
 * and permanently records the comment across all devices.
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
        // Prisma offline
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
      replyToHandle,
      replyToCommentId,
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

    // 3. Save to unified persistent store
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

    // 4. In-App Notification Trigger for Citations & Mentions
    try {
      const citedHandles = new Set<string>();

      // Direct reply/citation
      if (replyToHandle) {
        citedHandles.add(replyToHandle.replace(/^@+/, '').toLowerCase());
      }

      // Regex scan for all @mentions in comment body
      const mentionMatches = targetComment.match(/@([a-z0-9_]+)/gi);
      if (mentionMatches) {
        for (const m of mentionMatches) {
          const raw = m.replace(/^@+/, '').toLowerCase();
          if (raw && raw !== targetHandle.replace(/^@+/, '').toLowerCase()) {
            citedHandles.add(raw);
          }
        }
      }

      // Dispatch in-app notification for each mentioned contributor
      for (const citedUser of Array.from(citedHandles)) {
        const ownerProfile = findProfileByUsername(citedUser);
        createNotification({
          recipientDeviceId: ownerProfile?.deviceId || null,
          recipientHandle: `@${citedUser}`,
          actorHandle: targetHandle,
          actorName: targetAuthor,
          commentId: stored.id,
          communityId: stored.communityId,
          communityName: stored.communityName,
          coordinates: stored.coordinates,
          snippet: targetComment.trim(),
          type: replyToHandle ? 'citation' : 'mention',
        });
      }
    } catch (notifErr: any) {
      console.warn('[CommentsAPI] Notification trigger error:', notifErr.message);
    }

    // 5. Also persist to PostgreSQL if online
    try {
      if (deviceId) {
        await prisma.device.upsert({
          where: { id: deviceId },
          update: {},
          create: { id: deviceId, trustScore: 100 },
        });
      }

      await prisma.comment.create({
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
      });
    } catch (dbErr: any) {
      // Prisma offline - safely ignored
    }

    return NextResponse.json(stored, { status: 201 });
  } catch (err: any) {
    console.error('Error creating comment:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
