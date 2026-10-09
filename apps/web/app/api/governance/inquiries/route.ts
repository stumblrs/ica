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

    const deviceId = request.headers.get('x-device-id') || body.deviceId || 'anon-device';

    if (!communityId || !type || !reason) {
      return NextResponse.json(
        { error: 'Missing required parameters (communityId, type, reason)' },
        { status: 400 }
      );
    }

    const newInquiry = await createInquiry({
      communityId,
      type: type as InquiryType,
      petitionerDeviceId: deviceId,
      reason,
      citations,
      evidenceUrls: evidenceUrls || [],
      clanLineage,
      quorumThreshold: quorumThreshold ? Number(quorumThreshold) : undefined,
      durationDays: durationDays ? Number(durationDays) : undefined,
    });

    return NextResponse.json(newInquiry, { status: 201 });
  } catch (err: any) {
    const status = err.message?.includes('already in progress') ? 409 : 500;
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status });
  }
}
