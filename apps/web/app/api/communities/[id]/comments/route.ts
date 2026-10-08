import { NextRequest, NextResponse } from 'next/server';
import fs from 'node:fs';
import path from 'node:path';

const DB_FILE = path.resolve(process.cwd(), 'public/data/communities_store.json');

function getCommunities(): any[] {
  if (fs.existsSync(DB_FILE)) {
    return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
  }
  return [];
}

function saveCommunities(records: any[]) {
  fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });
  fs.writeFileSync(DB_FILE, JSON.stringify(records, null, 2), 'utf8');
}

/**
 * GET /api/communities/:id/comments
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;
  const communities = getCommunities();
  const comm = communities.find((c) => c.id === id);

  if (!comm) {
    return NextResponse.json({ error: 'Community not found.' }, { status: 404 });
  }

  return NextResponse.json(comm.comments || []);
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
    const { authorName, comment, affiliation } = body;

    if (!comment || typeof comment !== 'string' || !comment.trim()) {
      return NextResponse.json({ error: 'Comment text is required.' }, { status: 400 });
    }

    const communities = getCommunities();
    const commIndex = communities.findIndex((c) => c.id === id);

    if (commIndex === -1) {
      return NextResponse.json({ error: 'Community not found.' }, { status: 404 });
    }

    const newComment = {
      id: 'cmt-' + Date.now(),
      authorName: (authorName && typeof authorName === 'string' && authorName.trim()) ? authorName.trim() : 'Anonymous Contributor',
      affiliation: (affiliation && typeof affiliation === 'string' && affiliation.trim()) ? affiliation.trim() : 'Community Member',
      comment: comment.trim(),
      createdAt: new Date().toISOString(),
    };

    if (!communities[commIndex].comments) {
      communities[commIndex].comments = [];
    }

    communities[commIndex].comments.unshift(newComment);
    communities[commIndex].updatedAt = new Date().toISOString();

    saveCommunities(communities);

    return NextResponse.json(newComment, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
