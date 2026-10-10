import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { revalidateAtlasData } from '@/lib/revalidation';

/**
 * GET /api/communities/:id
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const comm = await prisma.community.findUnique({
      where: { id },
      include: {
        inquiries: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
        auditLogs: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        comments: {
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
      },
    });

    if (!comm) {
      return NextResponse.json({ error: 'Community not found.' }, { status: 404 });
    }

    return NextResponse.json({
      ...comm,
      evidence: comm.evidenceJson ? JSON.parse(comm.evidenceJson) : [],
    });
  } catch (err: any) {
    return NextResponse.json({ error: 'Server error: ' + err.message }, { status: 500 });
  }
}

/**
 * POST /api/communities/:id/confirm (or PATCH confirmation)
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const comm = await prisma.community.findUnique({ where: { id } });
    if (!comm) {
      return NextResponse.json({ error: 'Community not found.' }, { status: 404 });
    }

    const nextConfirmations = comm.confirmationsCount + 1;
    const newVerificationStatus =
      nextConfirmations >= 3 && comm.verificationStatus === 'pending'
        ? 'verified'
        : comm.verificationStatus;

    const updated = await prisma.community.update({
      where: { id },
      data: {
        confirmationsCount: nextConfirmations,
        verificationStatus: newVerificationStatus,
      },
    });

    revalidateAtlasData();

    return NextResponse.json({
      success: true,
      confirmationsCount: updated.confirmationsCount,
      verificationStatus: updated.verificationStatus,
    });
  } catch (err: any) {
    return NextResponse.json({ error: 'Server error: ' + err.message }, { status: 500 });
  }
}

/**
 * PATCH /api/communities/:id - Update community metadata
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await req.json();

    const comm = await prisma.community.findUnique({ where: { id } });
    if (!comm) {
      return NextResponse.json({ error: 'Community not found.' }, { status: 404 });
    }

    const allowedFields = [
      'name',
      'type',
      'description',
      'dialect',
      'dialectGreeting',
      'whySignificant',
      'languageStatus',
      'historicalStatus',
    ] as const;

    const updateData: any = {};
    for (const f of allowedFields) {
      if (body[f] !== undefined) {
        updateData[f] = typeof body[f] === 'string' ? body[f].trim() : body[f];
      }
    }

    if (body.evidence !== undefined) {
      updateData.evidenceJson = JSON.stringify(body.evidence);
    }

    const updated = await prisma.community.update({
      where: { id },
      data: updateData,
    });

    revalidateAtlasData();

    return NextResponse.json({
      success: true,
      community: {
        ...updated,
        evidence: updated.evidenceJson ? JSON.parse(updated.evidenceJson) : [],
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: 'Server error: ' + err.message }, { status: 500 });
  }
}

/**
 * DELETE /api/communities/:id - Remove community record
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    await prisma.community.delete({ where: { id } });
    revalidateAtlasData();
    return NextResponse.json({ success: true, deletedId: id });
  } catch (err: any) {
    return NextResponse.json({ error: 'Server error: ' + err.message }, { status: 500 });
  }
}


