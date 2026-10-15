import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { supabase } from '@/lib/supabase';
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

// In-memory microcache to avoid Supabase egress exhaustion on repeated feed loads
interface CommentsCacheEntry {
  data: { comments: EnrichedComment[]; nextCursor: string | null; hasMore: boolean };
  timestamp: number;
}
const commentsCache = new Map<string, CommentsCacheEntry>();
const CACHE_TTL_MS = 10000; // 10 seconds

function invalidateCommentsCache() {
  commentsCache.clear();
}

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
  const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '15', 10), 1), 50);

  // Egress optimization: check microcache
  const cacheKey = `${stateFilter || 'all'}:${communityId || 'all'}:${cursor || 'start'}:${limit}`;
  const cached = commentsCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return NextResponse.json(cached.data, {
      headers: { 'x-cache': 'HIT', 'Cache-Control': 'public, max-age=10, stale-while-revalidate=30' },
    });
  }

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

  // 2. Query Supabase directly first, with Prisma as fallback
  try {
    const { data: sbComments, error: sbErr } = await supabase
      .from('Comment')
      .select(`
        id,
        communityId,
        author,
        handle,
        content,
        category,
        likes,
        createdAt,
        community:Community (
          id,
          name,
          lgaName,
          stateName,
          longitude,
          latitude
        )
      `)
      .order('createdAt', { ascending: false })
      .limit(100);

    if (!sbErr && sbComments) {
      for (const cmt of sbComments as any[]) {
        if (!commentsMap.has(cmt.id)) {
          const comm = Array.isArray(cmt.community) ? cmt.community[0] : cmt.community;
          commentsMap.set(cmt.id, {
            id: cmt.id,
            communityId: cmt.communityId || '',
            communityName: comm?.name || 'Community',
            lgaName: comm?.lgaName,
            stateName: comm?.stateName,
            coordinates: [comm?.longitude || 7.0, comm?.latitude || 6.2],
            authorName: cmt.author,
            handle: cmt.handle || `@${cmt.author?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'resident'}`,
            affiliation: 'Community Member',
            category: cmt.category,
            comment: cmt.content,
            likes: cmt.likes || 0,
            createdAt: typeof cmt.createdAt === 'string' ? cmt.createdAt : new Date(cmt.createdAt).toISOString(),
          });
        }
      }
    } else {
      // Supabase PostgREST had an issue, fallback to Prisma
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

  const resultPayload = {
    comments: sliced,
    nextCursor,
    hasMore,
  };

  // Cache response to protect free tier egress
  commentsCache.set(cacheKey, {
    data: resultPayload,
    timestamp: Date.now(),
  });

  return NextResponse.json(resultPayload, {
    headers: { 'x-cache': 'MISS', 'Cache-Control': 'public, max-age=10, stale-while-revalidate=30' },
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
        const notifItem = {
          id: `ntf_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          recipientDeviceId: ownerProfile?.deviceId || null,
          recipientHandle: `@${citedUser}`,
          actorHandle: targetHandle,
          actorName: targetAuthor,
          commentId: stored.id,
          communityId: stored.communityId,
          communityName: stored.communityName,
          coordinates: JSON.stringify(stored.coordinates),
          snippet: targetComment.trim(),
          type: (replyToHandle ? 'citation' : 'mention') as 'citation' | 'mention',
          isRead: false,
        };

        // 1. Persist to Supabase Notification table
        try {
          await supabase.from('Notification').insert(notifItem);
        } catch (sbNotifErr: any) {
          console.warn('[CommentsAPI] Supabase Notification insert error:', sbNotifErr.message);
        }

        // 2. Mirror to local file store
        createNotification({
          ...notifItem,
          coordinates: stored.coordinates,
        });
      }
    } catch (notifErr: any) {
      console.warn('[CommentsAPI] Notification trigger error:', notifErr.message);
    }

    // 5. Persist to Supabase directly first, with Prisma as secondary fallback
    try {
      if (deviceId) {
        await supabase
          .from('Device')
          .upsert({ id: deviceId, trustScore: 100 })
          .select();
      }

      const { error: insertError } = await supabase.from('Comment').insert({
        id: stored.id,
        communityId,
        deviceId: deviceId || null,
        author: targetAuthor,
        handle: targetHandle,
        content: targetComment.trim(),
        category,
        location: location || null,
        likes: 0,
      });

      if (insertError) {
        // Fallback to Prisma if Supabase reported an error
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
        } catch {}
      }
    } catch (dbErr: any) {
      // Database offline - safely saved in persistent store
    }

    // Invalidate comments microcache so newly posted comment is instantly visible
    invalidateCommentsCache();

    return NextResponse.json(stored, { status: 201 });
  } catch (err: any) {
    console.error('Error creating comment:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
