import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
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

/**
 * GET /api/comments
 * Returns the single, straightforward global feed from PostgreSQL (newest first).
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const cursor = searchParams.get('cursor') || undefined;
  const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '20', 10), 1), 50);

  let rawComments: any[] = [];

  // 1. Fetch directly from PostgreSQL
  try {
    rawComments = await prisma.comment.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  } catch (prismaErr: any) {
    console.warn('[CommentsAPI] Prisma fetch error, falling back to direct SQL pool:', prismaErr.message);
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
      console.error('[CommentsAPI] Fatal database fetch error:', sqlErr.message);
      return NextResponse.json({ comments: [], nextCursor: null, hasMore: false }, { status: 500 });
    }
  }

  // 2. Map into unified EnrichedComment format
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

  // 3. Attach cited comment quote details if citing an existing comment
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

  // 4. Cursor pagination
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
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // 1. Like action
    if (body.action === 'like' && body.commentId) {
      try {
        const updated = await prisma.comment.update({
          where: { id: body.commentId },
          data: { likes: { increment: 1 } },
          select: { likes: true },
        });
        return NextResponse.json({ success: true, likes: updated.likes });
      } catch {
        const pool = getPgPool();
        const res = await pool.query(
          'UPDATE "Comment" SET likes = likes + 1 WHERE id = $1 RETURNING likes',
          [body.commentId]
        );
        return NextResponse.json({ success: true, likes: res.rows[0]?.likes || 1 });
      }
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
        const pool = getPgPool();
        const res = await pool.query(
          'UPDATE "Comment" SET "citesCount" = "citesCount" + 1 WHERE id = $1 RETURNING "citesCount"',
          [body.commentId]
        );
        return NextResponse.json({ success: true, citesCount: res.rows[0]?.citesCount || 1 });
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

    // 5. Persist directly to PostgreSQL (Primary: Prisma, Guaranteed Fallback: Direct SQL Pool)
    let saveSuccess = false;
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
      console.warn('[CommentsAPI] Prisma insert failed, executing direct SQL pool insert:', prismaErr.message);
      try {
        const pool = getPgPool();
        await pool.query(
          `INSERT INTO "Comment" (id, author, handle, content, category, likes, "citesCount", "replyToCommentId", "replyToHandle", "createdAt")
           VALUES ($1, $2, $3, $4, $5, 0, 0, $6, $7, $8)`,
          [newId, targetAuthor, targetHandle, targetComment, 'general', replyToCommentId || null, replyToHandle || null, now]
        );
        saveSuccess = true;
      } catch (sqlErr: any) {
        console.error('[CommentsAPI] Fatal database insert error:', sqlErr.message);
      }
    }

    if (!saveSuccess) {
      return NextResponse.json({ error: 'Failed to write post to database. Please try again.' }, { status: 500 });
    }

    // If this post cited another, increment citesCount on the target comment
    if (replyToCommentId) {
      try {
        const pool = getPgPool();
        await pool.query('UPDATE "Comment" SET "citesCount" = "citesCount" + 1 WHERE id = $1', [replyToCommentId]);
      } catch {}
    }

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
