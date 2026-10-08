import { NextRequest, NextResponse } from 'next/server';
import { getAuditLogs } from '@/lib/governance';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const communityId = searchParams.get('communityId') || undefined;

    const logs = await getAuditLogs(communityId);
    return NextResponse.json(logs);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
