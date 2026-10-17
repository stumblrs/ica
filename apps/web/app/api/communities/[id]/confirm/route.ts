import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { readCommunityStore, writeCommunityStore } from '@/lib/community-store';

export const dynamic = 'force-dynamic';

/**
 * POST /api/communities/:id/confirm
 * Community confirmation workflow
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await req.json().catch(() => ({}));
    const { note } = body;

    // 1. Try Prisma first
    try {
      const comm = await prisma.community.findUnique({ where: { id } });
      if (comm) {
        const nextConfirmations = (comm.confirmationsCount || 0) + 1;
        const nextConfidence = comm.confidence < 0.95
          ? Number(Math.min(0.99, comm.confidence + 0.05).toFixed(2))
          : comm.confidence;

        const updated = await prisma.community.update({
          where: { id },
          data: {
            confirmationsCount: nextConfirmations,
            confidence: nextConfidence,
          },
        });

        return NextResponse.json({
          success: true,
          confirmationsCount: updated.confirmationsCount,
          confidence: updated.confidence,
        });
      }
    } catch {
      // Fallback below
    }

    // 2. Fallback to local store (gated for development)
    const communities = readCommunityStore();
    const index = communities.findIndex((c) => c.id === id);

    if (index === -1) {
      return NextResponse.json({ error: 'Community not found.' }, { status: 404 });
    }

    const comm = communities[index];
    comm.confirmationsCount = (comm.confirmationsCount || 0) + 1;
    const currentConfidence = comm.confidence ?? 0.8;
    if (currentConfidence < 0.95) {
      comm.confidence = Number(Math.min(0.99, currentConfidence + 0.05).toFixed(2));
    }
    comm.updatedAt = new Date().toISOString();

    writeCommunityStore(communities);

    return NextResponse.json({
      success: true,
      confirmationsCount: comm.confirmationsCount,
      confidence: comm.confidence,
    });
  } catch (err: any) {
    return NextResponse.json({ error: 'Server error: ' + err.message }, { status: 500 });
  }
}
