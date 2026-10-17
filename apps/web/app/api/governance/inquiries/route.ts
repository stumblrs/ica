import { NextRequest, NextResponse } from 'next/server';
import { getInquiries, createInquiry, type InquiryType } from '@/lib/governance';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const communityId = searchParams.get('communityId') || undefined;
    const status = searchParams.get('status') || undefined;

    const list = await getInquiries({ communityId, status });
    return NextResponse.json(list);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      communityId,
      type,
      reason,
      citations,
      evidenceUrls,
      clanLineage,
      quorumThreshold = 15,
      durationDays = 7,
    } = body;

    const deviceId = request.headers.get('x-device-id') || body.deviceId;

    if (!deviceId) {
      return NextResponse.json(
        { error: 'A verified device ID is required to open a governance petition.' },
        { status: 400 }
      );
    }

    if (!communityId || !type || !reason) {
      return NextResponse.json(
        { error: 'Missing required parameters: communityId, type, reason.' },
        { status: 400 }
      );
    }

    if (type !== 'DELIST' && type !== 'REINSTATE') {
      return NextResponse.json(
        { error: "Invalid petition type. Must be 'DELIST' or 'REINSTATE'." },
        { status: 400 }
      );
    }

    if (typeof reason !== 'string' || reason.trim().length < 10 || reason.trim().length > 1000) {
      return NextResponse.json(
        { error: 'Petition reason must be between 10 and 1000 characters.' },
        { status: 400 }
      );
    }

    if (citations && (typeof citations !== 'string' || citations.length > 1000)) {
      return NextResponse.json(
        { error: 'Citations must be a string up to 1000 characters.' },
        { status: 400 }
      );
    }

    if (clanLineage && (typeof clanLineage !== 'string' || clanLineage.length > 200)) {
      return NextResponse.json(
        { error: 'Clan lineage must be a string up to 200 characters.' },
        { status: 400 }
      );
    }

    const newInquiry = await createInquiry({
      communityId,
      type: type as InquiryType,
      petitionerDeviceId: deviceId,
      reason: reason.trim(),
      citations: citations?.trim(),
      evidenceUrls: Array.isArray(evidenceUrls) ? evidenceUrls.slice(0, 10) : [],
      clanLineage: clanLineage?.trim(),
      quorumThreshold: quorumThreshold ? Number(quorumThreshold) : undefined,
      durationDays: durationDays ? Number(durationDays) : undefined,
    });

    return NextResponse.json(newInquiry, { status: 201 });
  } catch (err: any) {
    const status = err.message?.includes('already in progress')
      ? 409
      : err.message?.includes('Unregistered device') || err.message?.includes('insufficient')
      ? 403
      : 500;
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status });
  }
}
