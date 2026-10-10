import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export interface KindredLandmarkPayload {
  name: string;
  umunnaName?: string;
  category: 'village_square' | 'kindred_hall' | 'sacred_grove' | 'heritage_spring' | 'market_post' | 'monument';
  description?: string;
  latitude: number;
  longitude: number;
  contributorName?: string;
}

/**
 * GET /api/communities/:id/landmarks
 * Returns kindred landmarks mapped for a specific community.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const comm = await prisma.community.findUnique({
      where: { id },
      select: { id: true, name: true, evidenceJson: true },
    });

    if (!comm) {
      return NextResponse.json({ error: 'Community not found.' }, { status: 404 });
    }

    let parsedEvidence: any = {};
    try {
      if (comm.evidenceJson) {
        parsedEvidence = JSON.parse(comm.evidenceJson);
      }
    } catch {
      parsedEvidence = {};
    }

    const landmarks = Array.isArray(parsedEvidence.kindredLandmarks)
      ? parsedEvidence.kindredLandmarks
      : [];

    return NextResponse.json({
      communityId: comm.id,
      communityName: comm.name,
      landmarks,
    });
  } catch (err: any) {
    return NextResponse.json({ error: 'Failed to retrieve kindred landmarks: ' + err.message }, { status: 500 });
  }
}

/**
 * POST /api/communities/:id/landmarks
 * Micro-maps an ancestral Kindred (Ụmụnna) landmark or village heritage point.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body: KindredLandmarkPayload = await req.json();

    if (!body.name || !body.latitude || !body.longitude) {
      return NextResponse.json(
        { error: 'Landmark name, latitude, and longitude are required.' },
        { status: 400 }
      );
    }

    const comm = await prisma.community.findUnique({
      where: { id },
    });

    if (!comm) {
      return NextResponse.json({ error: 'Community not found.' }, { status: 404 });
    }

    let parsedEvidence: any = {};
    try {
      if (comm.evidenceJson) {
        parsedEvidence = JSON.parse(comm.evidenceJson);
      }
    } catch {
      parsedEvidence = {};
    }

    const existingLandmarks = Array.isArray(parsedEvidence.kindredLandmarks)
      ? parsedEvidence.kindredLandmarks
      : [];

    const newLandmark = {
      id: `kl-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      communityId: comm.id,
      communityName: comm.name,
      name: body.name.trim(),
      umunnaName: body.umunnaName ? body.umunnaName.trim() : undefined,
      category: body.category || 'village_square',
      description: body.description ? body.description.trim() : undefined,
      latitude: Number(body.latitude),
      longitude: Number(body.longitude),
      contributorName: body.contributorName ? body.contributorName.trim() : 'Anonymous Kin',
      createdAt: new Date().toISOString(),
    };

    parsedEvidence.kindredLandmarks = [...existingLandmarks, newLandmark];

    await prisma.community.update({
      where: { id },
      data: {
        evidenceJson: JSON.stringify(parsedEvidence),
      },
    });

    return NextResponse.json({
      success: true,
      landmark: newLandmark,
    });
  } catch (err: any) {
    return NextResponse.json({ error: 'Failed to record landmark: ' + err.message }, { status: 500 });
  }
}
