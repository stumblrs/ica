import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { supabase } from '@/lib/supabase';
import {
  saveCommentToStore,
  likeCommentInStore,
  citeCommentInStore,
  readCommentsStore,
} from '@/lib/comment-store';
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

// Hard cap on rows read from the database per request (free-tier Supabase friendly)
const DB_FETCH_CAP = 100;

function invalidateCommentsCache() {
  commentsCache.clear();
}

/**
 * A single global comment. Comments are NOT tied to any community, state or location.
 */
export interface EnrichedComment {
  id: string;
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
    comment: string;
  };
  createdAt: string;
}

function defaultHandle(author?: string | null) {
  return `@${(author || '').toLowerCase().replace(/[^a-z0-9]/g, '') || 'resident'}`;
}

/**
 * GET /api/comments
 * Returns the single global timeline, newest first.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const cursor = searchParams.get('cursor') || undefined;
  const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '15', 10), 1), 50);

  const isNoCache = req.headers.get('cache-control')?.includes('no-cache');
  const cacheKey = `${cursor || 'start'}:${limit}`;
  const cached = commentsCache.get(cacheKey);
  if (!isNoCache && cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return NextResponse.json(cached.data, {
      headers: { 'x-cache': 'HIT', 'Cache-Control': 'no-cache, no-store, must-revalidate' },
    });
  }

  const commentsMap = new Map<string, EnrichedComment>();

  // 1. Primary Source: PostgreSQL via Prisma
  try {
    const dbComments = await prisma.comment.findMany({
      orderBy: { createdAt: 'desc' },
      take: DB_FETCH_CAP,
    });

    for (const cmt of dbComments) {
      commentsMap.set(cmt.id, {
        id: cmt.id,
        authorName: cmt.author,
        handle: cmt.handle || defaultHandle(cmt.author),
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
    console.warn('[CommentsAPI] Prisma fetch failed, trying Supabase:', dbErr.message);
    try {
      const { data: sbComments, error: sbErr } = await supabase
        .from('Comment')
        .select('id, author, handle, content, category, likes, citesCount, replyToHandle, replyToCommentId, createdAt')
        .order('createdAt', { ascending: false })
        .limit(DB_FETCH_CAP);

      if (!sbErr && Array.isArray(sbComments)) {
        for (const cmt of sbComments as any[]) {
          commentsMap.set(cmt.id, {
            id: cmt.id,
            authorName: cmt.author,
            handle: cmt.handle || defaultHandle(cmt.author),
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
    } catch {
      // Supabase offline
    }
  }

  // 2. Merge persistent file store comments
  const storeComments = readCommentsStore();
  for (const c of storeComments) {
    const existing = commentsMap.get(c.id);
    if (existing) {
      existing.likes = Math.max(existing.likes || 0, c.likes || 0);
      existing.citesCount = Math.max(existing.citesCount || 0, c.citesCount || 0);
      if (!existing.replyToCommentId && c.replyToCommentId) existing.replyToCommentId = c.replyToCommentId;
      if (!existing.replyToHandle && c.replyToHandle) existing.replyToHandle = c.replyToHandle;
    } else {
      commentsMap.set(c.id, {
        id: c.id,
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

  // 3. Attach cited comment details
  for (const c of Array.from(commentsMap.values())) {
    if (c.replyToCommentId && !c.citedComment) {
      const cited = commentsMap.get(c.replyToCommentId);
      if (cited) {
        c.citedComment = {
          id: cited.id,
          authorName: cited.authorName,
          handle: cited.handle,
          comment: cited.comment,
        };
      }
    }
  }

  // 4. Single unified timeline, newest first (id as tie-breaker for stable cursors)
  const timeline = Array.from(commentsMap.values()).sort((a, b) => {
    const diff = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    return diff !== 0 ? diff : b.id.localeCompare(a.id);
  });

  // 5. Pagination
  let startIndex = 0;
  if (cursor) {
    const idx = timeline.findIndex((c) => c.id === cursor);
    if (idx === -1) {
      // Unknown cursor: return empty page instead of repeating page 1
      const empty = { comments: [], nextCursor: null, hasMore: false };
      return NextResponse.json(empty, { headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' } });
    }
    startIndex = idx + 1;
  }

  const sliced = timeline.slice(startIndex, startIndex + limit);
  const hasMore = startIndex + limit < timeline.length;
  const nextCursor = hasMore && sliced.length > 0 ? sliced[sliced.length - 1].id : null;

  const resultPayload = { comments: sliced, nextCursor, hasMore };
  commentsCache.set(cacheKey, { data: resultPayload, timestamp: Date.now() });

  return NextResponse.json(resultPayload, {
    headers: { 'x-cache': 'MISS', 'Cache-Control': 'no-cache, no-store, must-revalidate' },
  });
}

/**
 * POST /api/comments
 * Creates a global comment / citation, or handles like/cite actions.
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

    // 2. Cite action
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

    // 3. Create comment
    const {
      authorName,
      author,
      handle,
      comment,
      content,
      category = 'general',
      affiliation,
      replyToHandle,
      replyToCommentId,
    } = body;

    const targetComment = comment || content;
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

    // 4. Look up cited comment if replying/citing
    let citedCommentDetails: EnrichedComment['citedComment'] = undefined;
    if (replyToCommentId) {
      const storeCited = readCommentsStore().find((c) => c.id === replyToCommentId);
      if (storeCited) {
        citedCommentDetails = {
          id: storeCited.id,
          authorName: storeCited.authorName,
          handle: storeCited.handle,
          comment: storeCited.comment,
        };
      } else {
        try {
          const dbCited = await prisma.comment.findUnique({ where: { id: replyToCommentId } });
          if (dbCited) {
            citedCommentDetails = {
              id: dbCited.id,
              authorName: dbCited.author,
              handle: dbCited.handle || defaultHandle(dbCited.author),
              comment: dbCited.content,
            };
          }
        } catch {
          // ignore
        }
      }
    }

    // 5. Save to local persistent store (legacy store still expects location fields)
    const stored = saveCommentToStore({
      communityId: '',
      communityName: '',
      coordinates: [0, 0],
      authorName: targetAuthor,
      handle: targetHandle,
      comment: targetComment.trim(),
      category: String(category).slice(0, 50),
      affiliation: affiliation ? String(affiliation).slice(0, 60) : undefined,
      deviceId,
      replyToHandle: replyToHandle || undefined,
      replyToCommentId: replyToCommentId || undefined,
    } as any);

    // 6. In-app notifications for citations & mentions
    try {
      const citedHandles = new Set<string>();
      if (replyToHandle) citedHandles.add(replyToHandle.replace(/^@+/, '').toLowerCase());

      const mentionMatches = targetComment.match(/@([a-z0-9_]+)/gi);
      if (mentionMatches) {
        for (const m of mentionMatches) {
          const raw = m.replace(/^@+/, '').toLowerCase();
          if (raw && raw !== targetHandle.replace(/^@+/, '').toLowerCase()) citedHandles.add(raw);
        }
      }

      for (const citedUser of Array.from(citedHandles)) {
        const ownerProfile = findProfileByUsername(citedUser);
        const notifItem = {
          id: `ntf_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          recipientDeviceId: ownerProfile?.deviceId || null,
          recipientHandle: `@${citedUser}`,
          actorHandle: targetHandle,
          actorName: targetAuthor,
          commentId: stored.id,
          snippet: targetComment.trim().slice(0, 300),
          type: (replyToHandle ? 'citation' : 'mention') as 'citation' | 'mention',
          isRead: false,
        };

        try {
          await (prisma.notification as any).create({ data: notifItem });
        } catch (prismaNotifErr: any) {
          console.warn('[CommentsAPI] Prisma Notification insert error:', prismaNotifErr.message);
        }

        createNotification(notifItem as any);
      }
    } catch (notifErr: any) {
      console.warn('[CommentsAPI] Notification trigger error:', notifErr.message);
    }

    // 7. Persist device (only link comment to device if it exists)
    let validDeviceId: string | null = null;
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
        validDeviceId = deviceId;
      } catch (devErr: any) {
        console.warn('[CommentsAPI] Device upsert warning, verifying existence:', devErr.message);
        try {
          const exists = await prisma.device.findUnique({ where: { id: deviceId }, select: { id: true } });
          if (exists) validDeviceId = exists.id;
        } catch {
          validDeviceId = null;
        }
      }
    }

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

    // 8. Insert into PostgreSQL (no community relation), retry without device on FK failure
    const baseData = {
      id: stored.id,
      author: targetAuthor,
      handle: targetHandle,
      content: targetComment.trim(),
      category: String(category).slice(0, 50),
      likes: 0,
      citesCount: 0,
      replyToCommentId: replyToCommentId || null,
      replyToHandle: replyToHandle || null,
    };
    try {
      await (prisma.comment as any).create({ data: { ...baseData, deviceId: validDeviceId } });
    } catch (dbErr: any) {
      console.warn('[CommentsAPI] Insert failed, retrying without device link:', dbErr.message);
      try {
        await (prisma.comment as any).create({ data: { ...baseData, deviceId: null } });
      } catch (fallbackErr: any) {
        console.error('[CommentsAPI] Critical database error on comment insert:', fallbackErr.message);
      }
    }

    invalidateCommentsCache();

    const fullComment: EnrichedComment = {
      id: stored.id,
      authorName: stored.authorName,
      handle: stored.handle,
      affiliation: stored.affiliation,
      category: stored.category,
      comment: stored.comment,
      likes: 0,
      citesCount: 0,
      replyToHandle: stored.replyToHandle,
      replyToCommentId: stored.replyToCommentId,
      citedComment: citedCommentDetails,
      createdAt: stored.createdAt,
    };

    return NextResponse.json(fullComment, {
      status: 201,
      headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' },
    });
  } catch (err: any) {
    console.error('Error creating comment:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
