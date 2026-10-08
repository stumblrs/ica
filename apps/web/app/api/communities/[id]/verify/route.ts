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

function saveCommunities(records: any[]) {
  fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });
  fs.writeFileSync(DB_FILE, JSON.stringify(records, null, 2), 'utf8');
}

/**
 * PATCH /api/communities/:id/verify
 * Section 9: Moderator verification review workflow
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await req.json();
    const { status, note } = body;

    const validStatuses = ['pending', 'under_review', 'verified', 'challenged', 'archived'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: 'Invalid verification status' },
        { status: 400 }
      );
    }

    const communities = getCommunities();
    const index = communities.findIndex((c) => c.id === id);

    if (index === -1) {
      return NextResponse.json({ error: 'Community not found.' }, { status: 404 });
    }

    const comm = communities[index];
    comm.verificationStatus = status;
    if (status === 'verified') {
      comm.confidence = 0.95;
    }
    comm.updatedAt = new Date().toISOString();

    if (!comm.revisions) {
      comm.revisions = [];
    }
    comm.revisions.push({
      field: 'verificationStatus',
      newVal: status,
      reason: note || 'Moderator review decision',
      timestamp: new Date().toISOString()
    });

    saveCommunities(communities);

    return NextResponse.json({
      success: true,
      verificationStatus: comm.verificationStatus,
      confidence: comm.confidence,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
