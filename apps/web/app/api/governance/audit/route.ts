import { NextRequest, NextResponse } from 'next/server';
import { getAuditLogs } from '@/lib/governance';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const communityId = searchParams.get('communityId');

  const logs = getAuditLogs(communityId || undefined);
  return NextResponse.json(logs);
}
