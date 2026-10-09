import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/communities/:id/challenge
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await req.json();
    const { reason, evidenceUrl } = body;

    if (!reason || !reason.trim()) {
      return NextResponse.json(
        { error: 'A substantive reason is required to challenge a community record.' },
        { status: 400 }
      );
    }

    const comm = await prisma.community.findUnique({
      where: { id },
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

    const [updated] = await prisma.$transaction([
      prisma.community.update({
        where: { id },
        data: {
          challengesCount: { increment: 1 },
          verificationStatus: 'challenged',
        },
      }),
      prisma.communityAuditLog.create({
        data: {
          communityId: id,
          deviceId: deviceId || null,
          action: 'CHALLENGED_DELIST',
          summary: `Community challenged: "${reason.trim()}". Evidence link: ${evidenceUrl || 'None provided'}`,
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      verificationStatus: updated.verificationStatus,
      challengesCount: updated.challengesCount,
    });
  } catch (err: any) {
    return NextResponse.json({ error: 'Server error: ' + err.message }, { status: 500 });
  }
}
