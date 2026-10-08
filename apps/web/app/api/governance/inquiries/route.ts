import { NextRequest, NextResponse } from 'next/server';
import fs from 'node:fs';
import path from 'node:path';
import {
  getInquiries,
  saveInquiries,
  appendAuditLog,
  type GovernanceInquiry,
  type InquiryType,
} from '@/lib/governance';

const DB_FILE = path.resolve(process.cwd(), 'public/data/communities_store.json');

function updateCommunityLifecycle(communityId: string, status: string) {
  if (!fs.existsSync(DB_FILE)) return;
  try {
    const list: any[] = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
    const item = list.find((c) => c.id === communityId);
    if (item) {
      item.lifecycleStatus = status;
      item.updatedAt = new Date().toISOString();
      fs.writeFileSync(DB_FILE, JSON.stringify(list, null, 2), 'utf8');
    }
  } catch {
    /* ignore */
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const communityId = searchParams.get('communityId');
  const status = searchParams.get('status');

  let list = getInquiries();

  if (communityId) {
    list = list.filter((i) => i.communityId === communityId);
  }

  if (status) {
    list = list.filter((i) => i.status === status);
  }

  return NextResponse.json(list);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      communityId,
      communityName,
      lgaName,
      stateName,
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

    const inquiries = getInquiries();

    // Check if an open inquiry already exists for this community
    const existing = inquiries.find(
      (i) => i.communityId === communityId && i.status === 'OPEN'
    );
    if (existing) {
      return NextResponse.json(
        { error: 'An active community deliberation is already in progress for this settlement.', existing },
        { status: 409 }
      );
    }

    const newInquiry: GovernanceInquiry = {
      id: `inq-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      communityId,
      communityName: communityName || 'Community',
      lgaName,
      stateName,
      type: type as InquiryType,
      petitionerDeviceId: deviceId,
      reason,
      citations,
      evidenceUrls: evidenceUrls || [],
      clanLineage,
      status: 'OPEN',
      quorumThreshold: Number(quorumThreshold) || 15,
      expiresAt: new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000).toISOString(),
      votesFor: 1, // petitioner automatically counts as 1 vote for their proposition
      votesAgainst: 0,
      createdAt: new Date().toISOString(),
    };

    inquiries.unshift(newInquiry);
    saveInquiries(inquiries);

    // Update community lifecycle status
    const targetStatus = type === 'DELIST' ? 'CONTESTED_DELIST' : 'CONTESTED_REINSTATE';
    updateCommunityLifecycle(communityId, targetStatus);

    // Append to public audit trail
    appendAuditLog({
      communityId,
      deviceId,
      action: type === 'DELIST' ? 'CHALLENGED_DELIST' : 'PETITION_REINSTATE',
      summary:
        type === 'DELIST'
          ? `Delisting petition submitted: "${reason}". Archival citation: ${citations || 'None provided'}`
          : `Reinstatement claimed by resident: "${reason}". Lineage: ${clanLineage || 'N/A'}`,
    });

    return NextResponse.json(newInquiry, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
