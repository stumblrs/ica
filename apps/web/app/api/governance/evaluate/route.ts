import { NextRequest, NextResponse } from 'next/server';
import { GET as cronGET, POST as cronPOST } from '@/app/api/cron/evaluate/route';

export async function GET(req: NextRequest) {
  return cronGET(req);
}

export async function POST(req: NextRequest) {
  return cronPOST(req);
}
