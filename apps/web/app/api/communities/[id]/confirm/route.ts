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
 * POST /api/communities/:id/confirm
 * Section 8 & Section 10: Community confirmation workflow
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await req.json().catch(() => ({}));
    const { note } = body;

    const communities = getCommunities();
    const index = communities.findIndex((c) => c.id === id);

    if (index === -1) {
      return NextResponse.json(
        { error: 'Community not found.' },
        { status: 404 }
      );
    }

    const comm = communities[index];
    comm.confirmationsCount = (comm.confirmationsCount || 0) + 1;
    
    // Slight confidence increase on community confirmation
    if (comm.confidence < 0.95) {
      comm.confidence = Number(Math.min(0.99, comm.confidence + 0.05).toFixed(2));
    }
    comm.updatedAt = new Date().toISOString();

    if (!comm.confirmations) {
      comm.confirmations = [];
    }
    comm.confirmations.push({
      id: 'conf-' + Date.now(),
      note: note?.trim() || null,
      createdAt: new Date().toISOString(),
    });

    saveCommunities(communities);

    return NextResponse.json({
      success: true,
      confirmationsCount: comm.confirmationsCount,
      confidence: comm.confidence,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: 'Server error: ' + err.message },
      { status: 500 }
    );
  }
}
