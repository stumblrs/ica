import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { supabase } from '@/lib/supabase';
import { Pool } from 'pg';

export const dynamic = 'force-dynamic';

// Shared PostgreSQL pool for direct, resilient database access
let pgPool: Pool | null = null;
function getPgPool(): Pool {
  if (!pgPool) {
    const connectionString = process.env.DATABASE_URL || process.env.DIRECT_URL || '';
    pgPool = new Pool({
      connectionString: connectionString || undefined,
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 10000,
    });
  }
  return pgPool;
}

export interface EnrichedComment {
  id: string;
  authorName: string;
  handle?: string;
  affiliation?: string;
  comment: string;
  likes: number;
  citesCount: number;
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

function defaultHandle(author?: string | null): string {
  return `@${(author || '').toLowerCase().replace(/[^a-z0-9]/g, '') || 'resident'}`;
}

async function emitNotification(notif: {
  recipientDeviceId?: string | null;
  recipientHandle: string;
  actorHandle: string;
  actorName: string;
  commentId?: string | null;
  communityId?: string | null;
  communityName?: string | null;
  coordinates?: string | null;
  snippet: string;
  type: 'citation' | 'like' | 'mention';
}) {
  const newNotifId = `ntf_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const now = new Date();

  // Ensure recipient handle has @ prefix for standard lookup
  const normalizedRecipient = notif.recipientHandle.startsWith('@')
    ? notif.recipientHandle
    : `@${notif.recipientHandle}`;

  // Tier 1: Direct SQL Pool
  try {
    const pool = getPgPool();
    await pool.query(
      `INSERT INTO "Notification" (id, "recipientDeviceId", "recipientHandle", "actorHandle", "actorName", "commentId", "communityId", "communityName", coordinates, snippet, type, "isRead", "createdAt")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, false, $12)`,
      [
        newNotifId,
        notif.recipientDeviceId || null,
        normalizedRecipient,
        notif.actorHandle,
        notif.actorName,
        notif.commentId || null,
        notif.communityId || null,
        notif.communityName || null,
        notif.coordinates || null,
        notif.snippet.slice(0, 300),
        notif.type,
        now,
      ]
    );
    return;
  } catch (sqlErr: any) {
    console.warn('[CommentsAPI] Tier 1 SQL notification insert failed, trying Tier 2 Prisma:', sqlErr.message);
  }

  // Tier 2: Prisma
  try {
    await prisma.notification.create({
      data: {
        id: newNotifId,
        recipientDeviceId: notif.recipientDeviceId || null,
        recipientHandle: normalizedRecipient,
        actorHandle: notif.actorHandle,
        actorName: notif.actorName,
        commentId: notif.commentId || null,
        communityId: notif.communityId || null,
        communityName: notif.communityName || null,
        coordinates: notif.coordinates || null,
        snippet: notif.snippet.slice(0, 300),
        type: notif.type,
        isRead: false,
        createdAt: now,
      },
    });
    return;
  } catch (prismaErr: any) {
    console.warn('[CommentsAPI] Tier 2 Prisma notification insert failed, trying Tier 3 Supabase REST:', prismaErr.message);
  }

  // Tier 3: Supabase REST
  try {
    await supabase.from('Notification').insert([{
      id: newNotifId,
      recipientDeviceId: notif.recipientDeviceId || null,
      recipientHandle: normalizedRecipient,
      actorHandle: notif.actorHandle,
      actorName: notif.actorName,
      commentId: notif.commentId || null,
      communityId: notif.communityId || null,
      communityName: notif.communityName || null,
      coordinates: notif.coordinates || null,
      snippet: notif.snippet.slice(0, 300),
      type: notif.type,
      isRead: false,
      createdAt: now.toISOString(),
    }]);
  } catch (sbErr: any) {
    console.error('[CommentsAPI] All notification tiers failed:', sbErr.message);
  }
}

/**
 * GET /api/comments
 * Returns the single, straightforward global feed from PostgreSQL (newest first).
 * Triple-fallback: Prisma -> Direct SQL Pool -> Supabase REST
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const cursor = searchParams.get('cursor') || undefined;
  const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '20', 10), 1), 50);

  let rawComments: any[] = [];

  // Tier 1: Prisma
  try {
    rawComments = await prisma.comment.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  } catch (prismaErr: any) {
    console.warn('[CommentsAPI] Prisma fetch error, trying direct SQL pool:', prismaErr.message);

    // Tier 2: Direct SQL Pool
    try {
      const pool = getPgPool();
      const res = await pool.query(`
        SELECT id, author, handle, content, likes, "citesCount", "replyToCommentId", "replyToHandle", "createdAt"
        FROM "Comment"
        ORDER BY "createdAt" DESC
        LIMIT 100
      `);
      rawComments = res.rows;
    } catch (sqlErr: any) {
      console.warn('[CommentsAPI] Direct SQL pool fetch error, trying Supabase REST:', sqlErr.message);

      // Tier 3: Supabase REST
      try {
        const { data: sbComments, error: sbErr } = await supabase
          .from('Comment')
          .select('id, author, handle, content, likes, citesCount, replyToCommentId, replyToHandle, createdAt')
          .order('createdAt', { ascending: false })
          .limit(100);

        if (!sbErr && Array.isArray(sbComments)) {
          rawComments = sbComments;
        } else {
          console.error('[CommentsAPI] Supabase REST error:', sbErr);
          return NextResponse.json({ comments: [], nextCursor: null, hasMore: false }, { status: 500 });
        }
      } catch (sbEx: any) {
        console.error('[CommentsAPI] Fatal database fetch error:', sbEx.message);
        return NextResponse.json({ comments: [], nextCursor: null, hasMore: false }, { status: 500 });
      }
    }
  }

  // Map into unified EnrichedComment format
  const commentMap = new Map<string, EnrichedComment>();
  for (const c of rawComments) {
    commentMap.set(c.id, {
      id: c.id,
      authorName: c.author || 'Anonymous Resident',
      handle: c.handle || defaultHandle(c.author),
      affiliation: 'Community Member',
      comment: c.content,
      likes: c.likes || 0,
      citesCount: c.citesCount || 0,
      replyToHandle: c.replyToHandle || undefined,
      replyToCommentId: c.replyToCommentId || undefined,
      createdAt: c.createdAt instanceof Date ? c.createdAt.toISOString() : new Date(c.createdAt).toISOString(),
    });
  }

  // Attach cited comment quote details if citing an existing comment
  const commentsList = Array.from(commentMap.values());
  for (const c of commentsList) {
    if (c.replyToCommentId) {
      const cited = commentMap.get(c.replyToCommentId);
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

  // Cursor pagination
  let startIndex = 0;
  if (cursor) {
    const idx = commentsList.findIndex((c) => c.id === cursor);
    if (idx !== -1) {
      startIndex = idx + 1;
    }
  }

  const sliced = commentsList.slice(startIndex, startIndex + limit);
  const hasMore = startIndex + limit < commentsList.length;
  const nextCursor = hasMore && sliced.length > 0 ? sliced[sliced.length - 1].id : null;

  return NextResponse.json(
    { comments: sliced, nextCursor, hasMore },
    {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    }
  );
}

/**
 * POST /api/comments
 * Creates a global post / citation directly in PostgreSQL, or handles likes/cites.
 * Triple-fallback guarantee: Prisma -> Direct SQL Pool -> Supabase REST
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // 1. Like action
    if (body.action === 'like' && body.commentId) {
      let likesResult = 1;
      let targetCommentRow: any = null;

      try {
        const pool = getPgPool();
        const res = await pool.query(
          'UPDATE "Comment" SET likes = likes + 1 WHERE id = $1 RETURNING likes, author, handle, content, "deviceId"',
          [body.commentId]
        );
        if (res.rows.length > 0) {
          likesResult = res.rows[0].likes;
          targetCommentRow = res.rows[0];
        }
      } catch {
        try {
          const updated = await prisma.comment.update({
            where: { id: body.commentId },
            data: { likes: { increment: 1 } },
            select: { likes: true, author: true, handle: true, content: true, deviceId: true },
          });
          likesResult = updated.likes;
          targetCommentRow = updated;
        } catch {
          try {
            await (supabase.rpc as any)('increment_likes', { comment_id: body.commentId });
          } catch {}
        }
      }

      // Generate in-app notification for the author of the comment being liked
      if (targetCommentRow) {
        const actorName = (body.actorName || body.author || 'Someone').trim().slice(0, 60);
        const actorHandle =
          body.actorHandle && typeof body.actorHandle === 'string' && body.actorHandle.trim()
            ? body.actorHandle.trim().startsWith('@')
              ? body.actorHandle.trim().slice(0, 40)
              : `@${body.actorHandle.trim().slice(0, 39)}`
            : defaultHandle(actorName);

        const targetHandle = targetCommentRow.handle || defaultHandle(targetCommentRow.author);
        const targetDeviceId = targetCommentRow.deviceId || null;

        // Avoid self-notification
        if (targetHandle.toLowerCase() !== actorHandle.toLowerCase()) {
          emitNotification({
            recipientDeviceId: targetDeviceId,
            recipientHandle: targetHandle,
            actorHandle,
            actorName,
            commentId: body.commentId,
            snippet: targetCommentRow.content.slice(0, 150),
            type: 'like',
          }).catch(() => {});
        }
      }

      return NextResponse.json({ success: true, likes: likesResult });
    }

    // 2. Cite action
    if (body.action === 'cite' && body.commentId) {
      try {
        const updated = await (prisma.comment as any).update({
          where: { id: body.commentId },
          data: { citesCount: { increment: 1 } },
          select: { citesCount: true },
        });
        return NextResponse.json({ success: true, citesCount: (updated as any).citesCount || 1 });
      } catch {
        try {
          const pool = getPgPool();
          const res = await pool.query(
            'UPDATE "Comment" SET "citesCount" = "citesCount" + 1 WHERE id = $1 RETURNING "citesCount"',
            [body.commentId]
          );
          return NextResponse.json({ success: true, citesCount: res.rows[0]?.citesCount || 1 });
        } catch {
          return NextResponse.json({ success: true, citesCount: 1 });
        }
      }
    }

    // 3. Create post / comment
    const {
      authorName,
      author,
      handle,
      comment,
      content,
      affiliation,
      replyToHandle,
      replyToCommentId,
    } = body;

    const targetComment = (comment || content || '').trim();
    if (!targetComment) {
      return NextResponse.json({ error: 'Post text cannot be empty.' }, { status: 400 });
    }
    if (targetComment.length > 1000) {
      return NextResponse.json({ error: 'Post cannot exceed 1000 characters.' }, { status: 400 });
    }

    const targetAuthor = (authorName || author || '').trim().slice(0, 60) || 'Anonymous Resident';
    const targetHandle =
      handle && typeof handle === 'string' && handle.trim()
        ? handle.trim().startsWith('@')
          ? handle.trim().slice(0, 40)
          : `@${handle.trim().slice(0, 39)}`
        : defaultHandle(targetAuthor);

    const newId = `cmt_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const now = new Date();

    // 4. Look up cited comment preview if replying
    let citedCommentDetails: EnrichedComment['citedComment'] = undefined;
    if (replyToCommentId) {
      try {
        const pool = getPgPool();
        const citedRes = await pool.query(
          'SELECT id, author, handle, content FROM "Comment" WHERE id = $1 LIMIT 1',
          [replyToCommentId]
        );
        if (citedRes.rows.length > 0) {
          const row = citedRes.rows[0];
          citedCommentDetails = {
            id: row.id,
            authorName: row.author,
            handle: row.handle || defaultHandle(row.author),
            comment: row.content,
          };
        }
      } catch {
        // ignore
      }
    }

    // 5. Persist directly to PostgreSQL (Tier 1: Prisma, Tier 2: Direct SQL Pool, Tier 3: Supabase REST)
    let saveSuccess = false;
    const tierErrors: Record<string, string> = {};

    try {
      await (prisma.comment as any).create({
        data: {
          id: newId,
          author: targetAuthor,
          handle: targetHandle,
          content: targetComment,
          category: 'general',
          likes: 0,
          citesCount: 0,
          replyToCommentId: replyToCommentId || null,
          replyToHandle: replyToHandle || null,
          createdAt: now,
        },
      });
      saveSuccess = true;
    } catch (prismaErr: any) {
      tierErrors.tier1_prisma = prismaErr?.message || String(prismaErr);
      console.warn('[CommentsAPI] Tier 1 Prisma insert failed, trying Tier 2 Direct SQL:', prismaErr.message);
      try {
        const pool = getPgPool();
        await pool.query(
          `INSERT INTO "Comment" (id, author, handle, content, category, likes, "citesCount", "replyToCommentId", "replyToHandle", "createdAt")
           VALUES ($1, $2, $3, $4, $5, 0, 0, $6, $7, $8)`,
          [newId, targetAuthor, targetHandle, targetComment, 'general', replyToCommentId || null, replyToHandle || null, now]
        );
        saveSuccess = true;
      } catch (sqlErr: any) {
        tierErrors.tier2_sql = sqlErr?.message || String(sqlErr);
        console.warn('[CommentsAPI] Tier 2 Direct SQL insert failed, trying Tier 3 Supabase REST:', sqlErr.message);
        try {
          const { error: sbErr } = await supabase.from('Comment').insert([{
            id: newId,
            author: targetAuthor,
            handle: targetHandle,
            content: targetComment,
            category: 'general',
            likes: 0,
            citesCount: 0,
            replyToCommentId: replyToCommentId || null,
            replyToHandle: replyToHandle || null,
            createdAt: now.toISOString(),
          }]);
          if (!sbErr) {
            saveSuccess = true;
          } else {
            tierErrors.tier3_supabase = sbErr?.message || String(sbErr);
            console.error('[CommentsAPI] Tier 3 Supabase REST insert error:', sbErr);
          }
        } catch (sbEx: any) {
          tierErrors.tier3_supabase = sbEx?.message || String(sbEx);
          console.error('[CommentsAPI] Tier 3 Supabase REST exception:', sbEx.message);
        }
      }
    }

    if (!saveSuccess) {
      console.error('[CommentsAPI] All database persistence tiers failed:', tierErrors);
      return NextResponse.json(
        {
          error: 'Failed to write post to database. Please try again.',
          details: tierErrors,
        },
        { status: 500 }
      );
    }

    // If this post cited another, increment citesCount and emit citation notification
    if (replyToCommentId) {
      try {
        const pool = getPgPool();
        const res = await pool.query(
          'UPDATE "Comment" SET "citesCount" = "citesCount" + 1 WHERE id = $1 RETURNING author, handle, content, "deviceId"',
          [replyToCommentId]
        );
        if (res.rows.length > 0) {
          const citedRow = res.rows[0];
          const citedHandle = citedRow.handle || defaultHandle(citedRow.author);
          // Avoid self-notification
          if (citedHandle.toLowerCase() !== targetHandle.toLowerCase()) {
            emitNotification({
              recipientDeviceId: citedRow.deviceId || null,
              recipientHandle: citedHandle,
              actorHandle: targetHandle,
              actorName: targetAuthor,
              commentId: newId,
              snippet: targetComment.slice(0, 150),
              type: 'citation',
            }).catch(() => {});
          }
        }
      } catch (err: any) {
        console.warn('[CommentsAPI] Citation notification error:', err.message);
      }
    }

    // Mention notifications for any @username in the post
    try {
      const mentionMatches = targetComment.match(/@([a-zA-Z0-9_]+)/g);
      if (mentionMatches) {
        const uniqueMentions = new Set<string>(
          mentionMatches.map((m: string) => m.toLowerCase().trim())
        );
        for (const mention of Array.from(uniqueMentions)) {
          const mentionHandle: string = mention.startsWith('@') ? mention : `@${mention}`;
          if (
            mentionHandle.toLowerCase() !== targetHandle.toLowerCase() &&
            (!replyToHandle || mentionHandle.toLowerCase() !== replyToHandle.toLowerCase())
          ) {
            emitNotification({
              recipientHandle: mentionHandle,
              actorHandle: targetHandle,
              actorName: targetAuthor,
              commentId: newId,
              snippet: targetComment.slice(0, 150),
              type: 'mention',
            }).catch(() => {});
          }
        }
      }
    } catch {}

    const createdRecord: EnrichedComment = {
      id: newId,
      authorName: targetAuthor,
      handle: targetHandle,
      affiliation: affiliation || 'Community Member',
      comment: targetComment,
      likes: 0,
      citesCount: 0,
      replyToHandle: replyToHandle || undefined,
      replyToCommentId: replyToCommentId || undefined,
      citedComment: citedCommentDetails,
      createdAt: now.toISOString(),
    };

    return NextResponse.json(createdRecord, {
      status: 201,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (err: any) {
    console.error('[CommentsAPI] Unexpected error in POST:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
