import { NextRequest, NextResponse } from 'next/server';
import fs from 'node:fs';
import path from 'node:path';

const DB_FILE = path.resolve(process.cwd(), 'public/data/communities_store.json');

function getCommunities(): any[] {
  if (fs.existsSync(DB_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
    } catch {
      return [];
    }
  }
  return [];
}

function saveCommunities(records: any[]) {
  fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });
  fs.writeFileSync(DB_FILE, JSON.stringify(records, null, 2), 'utf8');
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
  category?: 'oral-history' | 'dialect' | 'lineage' | 'tradition' | 'general';
  comment: string;
  likes?: number;
  createdAt: string;
}

/**
 * GET /api/comments
 * Returns all community comments and oral histories aggregated across the atlas, sorted newest first.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const stateFilter = searchParams.get('state')?.toLowerCase();
    const communityId = searchParams.get('communityId');

    const communities = getCommunities();
    const allComments: EnrichedComment[] = [];

    for (const comm of communities) {
      if (communityId && comm.id !== communityId) continue;
      if (stateFilter && comm.stateName?.toLowerCase() !== stateFilter) continue;

      if (Array.isArray(comm.comments)) {
        for (const cmt of comm.comments) {
          allComments.push({
            id: cmt.id || `cmt-${Date.now()}`,
            communityId: comm.id,
            communityName: comm.name,
            lgaName: comm.lgaName,
            stateName: comm.stateName,
            coordinates: [comm.longitude, comm.latitude],
            authorName: cmt.authorName || 'Anonymous Contributor',
            handle: cmt.handle || `@${(cmt.authorName || 'contributor').toLowerCase().replace(/[^a-z0-9]/g, '') || 'contributor'}`,
            affiliation: cmt.affiliation || 'Community Member',
            category: cmt.category || 'general',
            comment: cmt.comment,
            likes: cmt.likes || 0,
            createdAt: cmt.createdAt || new Date().toISOString(),
          });
        }
      }
    }

    // Sort newest first: new comments push old comments down
    allComments.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return NextResponse.json(allComments);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch comments' }, { status: 500 });
  }
}

/**
 * POST /api/comments
 * Creates a comment / oral tweet on a community, or increments likes.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // 1. Support Like action
    if (body.action === 'like' && body.commentId) {
      const communities = getCommunities();
      let foundComment: any = null;
      for (const comm of communities) {
        if (Array.isArray(comm.comments)) {
          const c = comm.comments.find((item: any) => item.id === body.commentId);
          if (c) {
            c.likes = (c.likes || 0) + 1;
            foundComment = c;
            comm.updatedAt = new Date().toISOString();
            break;
          }
        }
      }
      if (foundComment) {
        saveCommunities(communities);
        return NextResponse.json({ success: true, likes: foundComment.likes });
      }
      return NextResponse.json({ error: 'Comment not found.' }, { status: 404 });
    }

    // 2. Create Comment
    const { communityId, authorName, handle, affiliation, comment, category } = body;

    if (!communityId) {
      return NextResponse.json({ error: 'communityId is required.' }, { status: 400 });
    }

    if (!comment || typeof comment !== 'string' || !comment.trim()) {
      return NextResponse.json({ error: 'Comment text is required.' }, { status: 400 });
    }

    const communities = getCommunities();
    const commIndex = communities.findIndex((c) => c.id === communityId);

    if (commIndex === -1) {
      return NextResponse.json({ error: 'Community not found.' }, { status: 404 });
    }

    const cleanAuthor = (authorName && typeof authorName === 'string' && authorName.trim()) ? authorName.trim() : 'Anonymous Contributor';
    const cleanHandle = (handle && typeof handle === 'string' && handle.trim())
      ? (handle.trim().startsWith('@') ? handle.trim() : `@${handle.trim()}`)
      : `@${cleanAuthor.toLowerCase().replace(/[^a-z0-9]/g, '') || 'contributor'}`;

    const newComment = {
      id: 'cmt-' + Date.now(),
      authorName: cleanAuthor,
      handle: cleanHandle,
      affiliation: (affiliation && typeof affiliation === 'string' && affiliation.trim()) ? affiliation.trim() : 'Community Member',
      category: category || 'general',
      comment: comment.trim(),
      likes: 0,
      createdAt: new Date().toISOString(),
    };

    if (!communities[commIndex].comments) {
      communities[commIndex].comments = [];
    }

    // Prepend: new comments push older ones down!
    communities[commIndex].comments.unshift(newComment);
    communities[commIndex].updatedAt = new Date().toISOString();

    saveCommunities(communities);

    const enriched: EnrichedComment = {
      ...newComment,
      communityId: communities[commIndex].id,
      communityName: communities[commIndex].name,
      lgaName: communities[commIndex].lgaName,
      stateName: communities[commIndex].stateName,
      coordinates: [communities[commIndex].longitude, communities[commIndex].latitude],
    };

    return NextResponse.json(enriched, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
