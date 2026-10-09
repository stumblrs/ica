import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/communities/:id/comments
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // Verify community exists
    const comm = await prisma.community.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!comm) {
      return NextResponse.json({ error: 'Community not found.' }, { status: 404 });
    }

    const comments = await prisma.comment.findMany({
      where: { communityId: id },
      orderBy: { createdAt: 'desc' },
    });

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
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
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
    const { authorName, comment, affiliation, category = 'general' } = body;

    if (!comment || typeof comment !== 'string' || !comment.trim()) {
      return NextResponse.json({ error: 'Comment text is required.' }, { status: 400 });
    }

    const comm = await prisma.community.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!comm) {
      return NextResponse.json({ error: 'Community not found.' }, { status: 404 });
    }

    const deviceId = req.headers.get('x-device-id') || body.deviceId;
    if (deviceId) {
      await prisma.device.upsert({
        where: { id: deviceId },
        update: {},
        create: { id: deviceId, trustScore: 100 },
      });
    }

    const cleanAuthor = (authorName && typeof authorName === 'string' && authorName.trim())
      ? authorName.trim()
      : 'Anonymous Contributor';
    const cleanHandle = `@${cleanAuthor.toLowerCase().replace(/[^a-z0-9]/g, '') || 'resident'}`;

    const created = await prisma.comment.create({
      data: {
        communityId: id,
        deviceId: deviceId || null,
        author: cleanAuthor,
        handle: cleanHandle,
        content: comment.trim(),
        category,
        likes: 0,
      },
    });

    return NextResponse.json(
      {
        id: created.id,
        communityId: created.communityId,
        authorName: created.author,
        handle: created.handle,
        affiliation: affiliation || 'Community Member',
        comment: created.content,
        likes: created.likes,
        category: created.category,
        createdAt: created.createdAt.toISOString(),
      },
      { status: 201 }
    );
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
