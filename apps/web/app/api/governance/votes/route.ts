import { NextRequest, NextResponse } from 'next/server';
import { castVote } from '@/lib/governance';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { inquiryId, choice, evidenceNote, isLocalObserver } = body;
    const deviceId = request.headers.get('x-device-id') || body.deviceId;

    if (!inquiryId || !choice || !deviceId) {
      return NextResponse.json(
        { error: 'Missing required parameters (inquiryId, choice, deviceId)' },
        { status: 400 }
      );
    }

    if (choice !== 'FOR' && choice !== 'AGAINST') {
      return NextResponse.json(
        { error: 'Invalid vote choice. Must be FOR or AGAINST.' },
        { status: 400 }
      );
    }

    const result = await castVote({
      inquiryId,
      deviceId,
      choice,
      evidenceNote,
      isLocalObserver: Boolean(isLocalObserver),
    });

    return NextResponse.json(result);
  } catch (err: any) {
    const status =
      err.message?.includes('already cast a vote')
        ? 403
        : err.message?.includes('not found')
        ? 404
        : err.message?.includes('closed')
        ? 400
        : 500;
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status });
  }
}
