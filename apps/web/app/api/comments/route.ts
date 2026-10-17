import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { supabase } from '@/lib/supabase';
import {
  saveCommentToStore,
  getCommentsFromStore,
  likeCommentInStore,
  citeCommentInStore,
  readCommentsStore,
  type StoredComment,
} from '@/lib/comment-store';
import { readCommunityStore } from '@/lib/community-store';
import { createNotification } from '@/lib/notification-store';
import { findProfileByUsername } from '@/lib/profile-store';

export const dynamic = 'force-dynamic';

// In-memory microcache to avoid unnecessary database pressure on rapid feed refreshes
interface CommentsCacheEntry {
  data: { comments: EnrichedComment[]; nextCursor: string | null; hasMore: boolean };
  timestamp: number;
}
const commentsCache = new Map<string, CommentsCacheEntry>();
const CACHE_TTL_MS = 5000; // 5 seconds

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
  citesCount?: number;
  replyToHandle?: string;
  replyToCommentId?: string;
  citedComment?: {
    id: string;
    authorName: string;
    handle?: string;
    communityName: string;
    stateName?: string;
    coordinates?: [number, number];
    comment: string;
  };
  createdAt: string;
}

/**
 * GET /api/comments
 * Returns a unified global feed of oral testimonies and comments with newest at the head.
 * Direct PostgreSQL access via Prisma is authoritative, seamlessly merged with persistent store.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const stateFilter = searchParams.get('state')?.toLowerCase();
  const communityId = searchParams.get('communityId') || undefined;
  const cursor = searchParams.get('cursor') || undefined;
  const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '15', 10), 1), 50);

  // Check microcache
  const cacheKey = `${stateFilter || 'all'}:${communityId || 'all'}:${cursor || 'start'}:${limit}`;
  const cached = commentsCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return NextResponse.json(cached.data, {
      headers: { 'x-cache': 'HIT', 'Cache-Control': 'no-cache, no-store, must-revalidate' },
    });
  }

  const commentsMap = new Map<string, EnrichedComment>();
  const communityStore = readCommunityStore();

  // 1. Primary Source: Query PostgreSQL via Prisma (server-level connection)
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
      let commName = cmt.community?.name;
      let lgaName = cmt.community?.lgaName;
      let stateName = cmt.community?.stateName;
      let coords: [number, number] = [cmt.community?.longitude || 7.0, cmt.community?.latitude || 6.2];

      // If relation is null (e.g. communityId was a store ID or slug), hydrate from community store
      if ((!commName || !stateName) && cmt.communityId) {
        const matched = communityStore.find(
          (c) =>
            c.id === cmt.communityId ||
            (c.name && c.name.toLowerCase() === cmt.communityId?.toLowerCase())
        );
        if (matched) {
          commName = commName || matched.name;
          lgaName = lgaName || matched.lgaName;
          stateName = stateName || matched.stateName;
          coords = [matched.longitude, matched.latitude];
        }
      }

      // Also fall back to location string if stored
      if (!commName && cmt.location) {
        commName = cmt.location;
      }

      commentsMap.set(cmt.id, {
        id: cmt.id,
        communityId: cmt.communityId || '',
        communityName: commName || 'Igbo Settlement',
        lgaName: lgaName || undefined,
        stateName: stateName || undefined,
        coordinates: coords,
        authorName: cmt.author,
        handle: cmt.handle || `@${cmt.author.toLowerCase().replace(/[^a-z0-9]/g, '') || 'resident'}`,
        affiliation: 'Community Member',
        category: cmt.category,
        comment: cmt.content,
        likes: cmt.likes || 0,
        citesCount: (cmt as any).citesCount || 0,
        replyToHandle: (cmt as any).replyToHandle || undefined,
        replyToCommentId: (cmt as any).replyToCommentId || undefined,
        createdAt: cmt.createdAt.toISOString(),
      });
    }
  } catch (dbErr: any) {
    console.warn('[CommentsAPI] Primary Prisma fetch failed, checking Supabase/store fallback:', dbErr.message);
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
          citesCount,
          replyToHandle,
          replyToCommentId,
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

      if (!sbErr && Array.isArray(sbComments) && sbComments.length > 0) {
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
              citesCount: cmt.citesCount || 0,
              replyToHandle: cmt.replyToHandle || undefined,
              replyToCommentId: cmt.replyToCommentId || undefined,
              createdAt: typeof cmt.createdAt === 'string' ? cmt.createdAt : new Date(cmt.createdAt).toISOString(),
            });
          }
        }
      }
    } catch {
      // Supabase offline
    }
  }

  // 2. Secondary Source: Merge persistent file store comments
  const storeComments = readCommentsStore();
  for (const c of storeComments) {
    const existing = commentsMap.get(c.id);
    if (existing) {
      // Reconcile maximum likes/cites counts between store and DB
      existing.likes = Math.max(existing.likes || 0, c.likes || 0);
      existing.citesCount = Math.max(existing.citesCount || 0, c.citesCount || 0);
      if (!existing.replyToCommentId && c.replyToCommentId) {
        existing.replyToCommentId = c.replyToCommentId;
      }
      if (!existing.replyToHandle && c.replyToHandle) {
        existing.replyToHandle = c.replyToHandle;
      }
    } else {
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
        citesCount: c.citesCount || 0,
        replyToHandle: c.replyToHandle,
        replyToCommentId: c.replyToCommentId,
        createdAt: c.createdAt,
      });
    }
  }

  // 3. Attach full citedComment details for any comment that cites another
  for (const c of Array.from(commentsMap.values())) {
    if (c.replyToCommentId && !c.citedComment) {
      const cited = commentsMap.get(c.replyToCommentId);
      if (cited) {
        c.citedComment = {
          id: cited.id,
          authorName: cited.authorName,
          handle: cited.handle,
          communityName: cited.communityName,
          stateName: cited.stateName,
          coordinates: cited.coordinates,
          comment: cited.comment,
        };
      } else {
        const fromStore = storeComments.find((sc) => sc.id === c.replyToCommentId);
        if (fromStore) {
          c.citedComment = {
            id: fromStore.id,
            authorName: fromStore.authorName,
            handle: fromStore.handle,
            communityName: fromStore.communityName,
            stateName: fromStore.stateName,
            coordinates: fromStore.coordinates,
            comment: fromStore.comment,
          };
        }
      }
    }
  }

  // 4. Convert to sorted unified array (newest at the head)
  let allUnified = Array.from(commentsMap.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  // 5. Apply optional state and community filters if specifically requested
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

  // 6. Pagination
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

  // Cache response to protect server egress
  commentsCache.set(cacheKey, {
    data: resultPayload,
    timestamp: Date.now(),
  });

  return NextResponse.json(resultPayload, {
    headers: { 'x-cache': 'MISS', 'Cache-Control': 'no-cache, no-store, must-revalidate' },
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
      invalidateCommentsCache();
      return NextResponse.json({ success: true, likes });
    }

    // 2. Cite action (increment count directly if requested)
    if (body.action === 'cite' && body.commentId) {
      let citesCount = citeCommentInStore(body.commentId);
      try {
        const updated = await (prisma.comment as any).update({
          where: { id: body.commentId },
          data: { citesCount: { increment: 1 } },
        });
        citesCount = (updated as any).citesCount ?? citesCount;
      } catch {
        // Prisma offline
      }
      invalidateCommentsCache();
      return NextResponse.json({ success: true, citesCount });
    }

    // 3. Create Comment / Citation
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

    if (targetComment.trim().length > 1000) {
      return NextResponse.json({ error: 'Comment text cannot exceed 1000 characters.' }, { status: 400 });
    }

    const deviceId = req.headers.get('x-device-id') || body.deviceId || null;
    const rawFingerprint = req.headers.get('x-device-fingerprint') || body.fingerprintHash || null;
    const cleanFingerprint = rawFingerprint && String(rawFingerprint).startsWith('fp_') ? String(rawFingerprint) : null;
    const targetAuthor = (authorName || author || '').trim().slice(0, 60) || 'Anonymous Resident';
    const targetHandle =
      handle && typeof handle === 'string' && handle.trim()
        ? handle.trim().startsWith('@')
          ? handle.trim().slice(0, 40)
          : `@${handle.trim().slice(0, 39)}`
        : `@${targetAuthor.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 30) || 'resident'}`;

    // 4. Resolve community details from persistent community store and Prisma
    const communityStore = readCommunityStore();
    const storeComm = communityStore.find(
      (c) =>
        c.id === communityId ||
        (c.name && c.name.toLowerCase() === String(communityId).toLowerCase())
    );
    const lookupName = storeComm?.name || communityId;

    let resolvedComm: {
      id: string;
      name: string;
      lgaName: string | null;
      stateName: string | null;
      longitude: number;
      latitude: number;
    } | null = null;
    let resolvedDbCommunityId: string | null = null;

    try {
      resolvedComm = await prisma.community.findFirst({
        where: {
          OR: [
            { id: communityId },
            { name: { equals: lookupName, mode: 'insensitive' } },
            { name: { contains: lookupName, mode: 'insensitive' } },
          ],
        },
        select: {
          id: true,
          name: true,
          lgaName: true,
          stateName: true,
          longitude: true,
          latitude: true,
        },
      });
      if (resolvedComm) {
        resolvedDbCommunityId = resolvedComm.id;
      }
    } catch {
      // DB offline - fallback to store
    }

    const finalCommunityName = resolvedComm?.name || storeComm?.name || location || 'Igbo Settlement';
    const finalStateName = resolvedComm?.stateName || storeComm?.stateName || undefined;
    const finalLgaName = resolvedComm?.lgaName || storeComm?.lgaName || undefined;
    const finalCoords: [number, number] = resolvedComm
      ? [resolvedComm.longitude, resolvedComm.latitude]
      : storeComm
      ? [storeComm.longitude, storeComm.latitude]
      : [7.0, 6.2];

    // 5. Look up cited comment if replying/citing
    let citedCommentDetails: EnrichedComment['citedComment'] = undefined;
    if (replyToCommentId) {
      const allStored = readCommentsStore();
      const storeCited = allStored.find((c) => c.id === replyToCommentId);
      if (storeCited) {
        citedCommentDetails = {
          id: storeCited.id,
          authorName: storeCited.authorName,
          handle: storeCited.handle,
          communityName: storeCited.communityName,
          stateName: storeCited.stateName,
          coordinates: storeCited.coordinates,
          comment: storeCited.comment,
        };
      } else {
        try {
          const dbCited = await prisma.comment.findUnique({
            where: { id: replyToCommentId },
            include: { community: { select: { name: true, stateName: true, longitude: true, latitude: true } } },
          });
          if (dbCited) {
            citedCommentDetails = {
              id: dbCited.id,
              authorName: dbCited.author,
              handle: dbCited.handle || `@${dbCited.author.toLowerCase().replace(/[^a-z0-9]/g, '')}`,
              communityName: dbCited.community?.name || dbCited.location || 'Community',
              stateName: dbCited.community?.stateName || undefined,
              coordinates: dbCited.community ? [dbCited.community.longitude, dbCited.community.latitude] : undefined,
              comment: dbCited.content,
            };
          }
        } catch {
          // ignore
        }
      }
    }

    // 6. Save to unified persistent store
    const stored = saveCommentToStore({
      communityId: resolvedDbCommunityId || storeComm?.id || communityId,
      communityName: finalCommunityName,
      lgaName: finalLgaName,
      stateName: finalStateName,
      coordinates: finalCoords,
      authorName: targetAuthor,
      handle: targetHandle,
      comment: targetComment.trim(),
      category: String(category).slice(0, 50),
      affiliation: affiliation ? String(affiliation).slice(0, 60) : undefined,
      deviceId,
      location: location ? String(location).slice(0, 100) : finalCommunityName.slice(0, 100),
      replyToHandle: replyToHandle || undefined,
      replyToCommentId: replyToCommentId || undefined,
    });

    // 7. In-App Notification Trigger for Citations & Mentions
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
          snippet: targetComment.trim().slice(0, 300),
          type: (replyToHandle ? 'citation' : 'mention') as 'citation' | 'mention',
          isRead: false,
        };

        // 1. Persist to Prisma Notification table
        try {
          await prisma.notification.create({
            data: {
              ...notifItem,
              coordinates: notifItem.coordinates,
            },
          });
        } catch (prismaNotifErr: any) {
          console.warn('[CommentsAPI] Prisma Notification insert error:', prismaNotifErr.message);
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

    // 8. Persist to PostgreSQL via Prisma (isolated blocks for absolute reliability)
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
        console.warn('[CommentsAPI] Device upsert warning:', devErr.message);
      }
    }

    // If this comment cited an existing comment, increment citesCount in Postgres
    if (replyToCommentId) {
      try {
        await (prisma.comment as any).update({
          where: { id: replyToCommentId },
          data: { citesCount: { increment: 1 } },
        });
      } catch (citeErr: any) {
        console.warn('[CommentsAPI] Failed to increment citesCount on cited comment:', citeErr.message);
      }
    }

    // Insert comment into PostgreSQL
    try {
      await (prisma.comment as any).create({
        data: {
          id: stored.id,
          communityId: resolvedDbCommunityId,
          deviceId: deviceId || null,
          author: targetAuthor,
          handle: targetHandle,
          content: targetComment.trim(),
          category: String(category).slice(0, 50),
          location: location ? String(location).slice(0, 100) : finalCommunityName.slice(0, 100),
          likes: 0,
          citesCount: 0,
          replyToCommentId: replyToCommentId || null,
          replyToHandle: replyToHandle || null,
        },
      });
    } catch (dbErr: any) {
      console.warn('[CommentsAPI] Database insert error, preserved in persistent store:', dbErr.message);
    }

    // Invalidate comments microcache so newly posted comment is instantly visible on next query
    invalidateCommentsCache();

    // 9. Return full EnrichedComment representation
    const fullComment: EnrichedComment = {
      id: stored.id,
      communityId: stored.communityId,
      communityName: stored.communityName,
      lgaName: stored.lgaName,
      stateName: stored.stateName,
      coordinates: stored.coordinates,
      authorName: stored.authorName,
      handle: stored.handle,
      affiliation: stored.affiliation,
      category: stored.category,
      comment: stored.comment,
      likes: stored.likes || 0,
      citesCount: stored.citesCount || 0,
      replyToHandle: stored.replyToHandle,
      replyToCommentId: stored.replyToCommentId,
      citedComment: citedCommentDetails,
      createdAt: stored.createdAt,
    };

    return NextResponse.json(fullComment, {
      status: 201,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (err: any) {
    console.error('Error creating comment:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
