import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * PATCH /api/communities/:id/verify
 * Moderator verification review workflow
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await req.json();
    const { status, note } = body;

    const validStatuses = ['pending', 'under_review', 'verified', 'challenged', 'archived'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: 'Invalid verification status' },
        { status: 400 }
      );
    }

    const comm = await prisma.community.findUnique({
      where: { id },
    });

    if (!comm) {
      return NextResponse.json({ error: 'Community not found.' }, { status: 404 });
    }

    const confidence = status === 'verified' ? 0.95 : comm.confidence;

    const [updated] = await prisma.$transaction([
      prisma.community.update({
        where: { id },
        data: {
          verificationStatus: status,
          confidence,
        },
      }),
      prisma.communityAuditLog.create({
        data: {
          communityId: id,
          action: 'CREATED',
          summary: `Verification status updated to ${status}. Note: ${note || 'Moderator review'}`,
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      verificationStatus: updated.verificationStatus,
      confidence: updated.confidence,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
