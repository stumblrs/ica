import { NextRequest, NextResponse } from 'next/server';
import fs from 'node:fs';
import path from 'node:path';

const DB_FILE = path.resolve(process.cwd(), 'public/data/communities_store.json');

function getCommunities(): any[] {
  if (fs.existsSync(DB_FILE)) {
    return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
  }
  return [];
}

function saveCommunities(data: any[]) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf8');
}

/**
 * GET /api/communities/:id
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;
  const communities = getCommunities();
  const comm = communities.find((c) => c.id === id);

  if (!comm) {
    return NextResponse.json({ error: 'Community not found.' }, { status: 404 });
  }

  return NextResponse.json(comm);
}

/**
 * POST /api/communities/:id/confirm (or PATCH confirmation)
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;
  const communities = getCommunities();
  const commIndex = communities.findIndex((c) => c.id === id);

  if (commIndex === -1) {
    return NextResponse.json({ error: 'Community not found.' }, { status: 404 });
  }

  const comm = communities[commIndex];
  comm.confirmationsCount = (comm.confirmationsCount || 0) + 1;
  if (comm.confirmationsCount >= 3 && comm.verificationStatus === 'pending') {
    comm.verificationStatus = 'verified';
  }
  comm.updatedAt = new Date().toISOString();

  communities[commIndex] = comm;
  saveCommunities(communities);

  return NextResponse.json({
    success: true,
    confirmationsCount: comm.confirmationsCount,
    verificationStatus: comm.verificationStatus,
  });
}
