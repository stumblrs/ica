import { NextRequest, NextResponse } from 'next/server';
import fs from 'node:fs';
import path from 'node:path';
import {
  getInquiries,
  saveInquiries,
  getVotes,
  saveVotes,
  appendAuditLog,
  type GovernanceVote,
} from '@/lib/governance';

const DB_FILE = path.resolve(process.cwd(), 'public/data/communities_store.json');

function updateCommunityState(communityId: string, lifecycleStatus: string, identityStatus?: string) {
  if (!fs.existsSync(DB_FILE)) return;
  try {
    const list: any[] = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
    const item = list.find((c) => c.id === communityId);
    if (item) {
      item.lifecycleStatus = lifecycleStatus;
      if (identityStatus) {
        item.identityStatus = identityStatus;
      }
      item.updatedAt = new Date().toISOString();
      fs.writeFileSync(DB_FILE, JSON.stringify(list, null, 2), 'utf8');
    }
  } catch {
    /* ignore */
  }
}

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

    const inquiries = getInquiries();
    const inquiry = inquiries.find((i) => i.id === inquiryId);
    if (!inquiry) {
      return NextResponse.json({ error: 'Inquiry not found' }, { status: 404 });
    }

    if (inquiry.status !== 'OPEN') {
      return NextResponse.json(
        { error: `Inquiry is already closed with status: ${inquiry.status}` },
        { status: 400 }
      );
    }

    // Check if device already voted
    const votes = getVotes();
    const alreadyVoted = votes.some(
      (v) => v.inquiryId === inquiryId && v.deviceId === deviceId
    );
    if (alreadyVoted) {
      return NextResponse.json(
        { error: 'This device has already cast a vote in this community inquiry.' },
        { status: 403 }
      );
    }

    // Record vote
    const newVote: GovernanceVote = {
      id: `vote-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      inquiryId,
      deviceId,
      choice,
      evidenceNote,
      isLocalObserver: Boolean(isLocalObserver),
      createdAt: new Date().toISOString(),
    };

    votes.push(newVote);
    saveVotes(votes);

    // Update tallies
    if (choice === 'FOR') {
      inquiry.votesFor += 1;
    } else {
      inquiry.votesAgainst += 1;
    }

    // Evaluate Quorum & Automated Resolution
    const totalVotes = inquiry.votesFor + inquiry.votesAgainst;
    let resolvedState: string | null = null;

    if (totalVotes >= inquiry.quorumThreshold) {
      const forRatio = inquiry.votesFor / totalVotes;
      const againstRatio = inquiry.votesAgainst / totalVotes;

      if (inquiry.type === 'DELIST') {
        if (forRatio >= 0.70) {
          // Super-majority reached to declassify
          inquiry.status = 'APPROVED';
          inquiry.closedAt = new Date().toISOString();
          resolvedState = 'DELISTED';
          updateCommunityState(inquiry.communityId, 'DELISTED', 'non_igbo');
          appendAuditLog({
            communityId: inquiry.communityId,
            deviceId,
            action: 'DELISTED',
            summary: `Delisting approved by community quorum (${inquiry.votesFor} for / ${inquiry.votesAgainst} against). Reclassified to dormant.`,
          });
        } else if (againstRatio >= 0.55) {
          // Majority voted to retain
          inquiry.status = 'REJECTED';
          inquiry.closedAt = new Date().toISOString();
          resolvedState = 'ACTIVE';
          updateCommunityState(inquiry.communityId, 'ACTIVE', 'igbo');
          appendAuditLog({
            communityId: inquiry.communityId,
            deviceId,
            action: 'CHALLENGE_DISMISSED',
            summary: `Delisting petition dismissed by community quorum (${inquiry.votesAgainst} to retain). Active Igbo classification reaffirmed.`,
          });
        }
      } else if (inquiry.type === 'REINSTATE') {
        if (forRatio >= 0.60) {
          // Reinstatement approved
          inquiry.status = 'APPROVED';
          inquiry.closedAt = new Date().toISOString();
          resolvedState = 'ACTIVE';
          updateCommunityState(inquiry.communityId, 'ACTIVE', 'igbo');
          appendAuditLog({
            communityId: inquiry.communityId,
            deviceId,
            action: 'REINSTATED',
            summary: `Reinstatement approved by community quorum (${inquiry.votesFor} for restoration). Settlement returned to active atlas core.`,
          });
        } else if (againstRatio >= 0.60) {
          // Reinstatement rejected
          inquiry.status = 'REJECTED';
          inquiry.closedAt = new Date().toISOString();
          resolvedState = 'DELISTED';
          updateCommunityState(inquiry.communityId, 'DELISTED', 'non_igbo');
          appendAuditLog({
            communityId: inquiry.communityId,
            deviceId,
            action: 'CHALLENGE_DISMISSED',
            summary: `Reinstatement petition dismissed by quorum. Status remains delisted/dormant.`,
          });
        }
      }
    }

    saveInquiries(inquiries);

    return NextResponse.json({
      success: true,
      vote: newVote,
      inquiry,
      resolvedState,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
