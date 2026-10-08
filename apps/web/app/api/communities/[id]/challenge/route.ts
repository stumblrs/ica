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
 * POST /api/communities/:id/challenge
 * Section 9: "A challenge does not automatically delete a record... disputes remain in the audit trail."
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await req.json();
    const { reason, evidenceUrl } = body;

    if (!reason || !reason.trim()) {
      return NextResponse.json(
        { error: 'A substantive reason is required to challenge a community record.' },
        { status: 400 }
      );
    }

    const communities = getCommunities();
    const index = communities.findIndex((c) => c.id === id);

    if (index === -1) {
      return NextResponse.json(
        { error: 'Community not found.' },
        { status: 404 }
      );
    }

    const comm = communities[index];
    comm.challengesCount = (comm.challengesCount || 0) + 1;
    
    // Automatically transition to 'challenged' verification status
    comm.verificationStatus = 'challenged';
    comm.updatedAt = new Date().toISOString();

    if (!comm.challenges) {
      comm.challenges = [];
    }
    comm.challenges.push({
      id: 'chal-' + Date.now(),
      reason: reason.trim(),
      evidenceUrl: evidenceUrl?.trim() || null,
      status: 'open',
      createdAt: new Date().toISOString(),
    });

    saveCommunities(communities);

    return NextResponse.json({
      success: true,
      verificationStatus: comm.verificationStatus,
      challengesCount: comm.challengesCount,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: 'Server error: ' + err.message },
      { status: 500 }
    );
  }
}
