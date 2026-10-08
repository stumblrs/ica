import { prisma } from '@/lib/prisma';

export type LifecycleStatus = 'ACTIVE' | 'CONTESTED_DELIST' | 'DELISTED' | 'CONTESTED_REINSTATE';

export type InquiryType = 'DELIST' | 'REINSTATE';

export type InquiryStatus = 'OPEN' | 'APPROVED' | 'REJECTED' | 'EXPIRED';

export interface GovernanceInquiry {
  id: string;
  communityId: string;
  communityName: string;
  lgaName?: string;
  stateName?: string;
  type: InquiryType;
  petitionerDeviceId: string;
  reason: string;
  citations?: string | null;
  evidenceUrls?: string[];
  clanLineage?: string | null;
  status: InquiryStatus;
  quorumThreshold: number;
  expiresAt: string; // ISO date
  closedAt?: string | null;
  votesFor: number;
  votesAgainst: number;
  createdAt: string;
}

export interface GovernanceVote {
  id: string;
  inquiryId: string;
  deviceId: string;
  choice: 'FOR' | 'AGAINST';
  evidenceNote?: string | null;
  isLocalObserver?: boolean;
  createdAt: string;
}

export interface CommunityAuditLog {
  id: string;
  communityId: string;
  communityName?: string;
  deviceId?: string | null;
  action: 'CREATED' | 'CHALLENGED_DELIST' | 'DELISTED' | 'PETITION_REINSTATE' | 'REINSTATED' | 'CHALLENGE_DISMISSED';
  summary: string;
  createdAt: string;
}

/**
 * Fetch all governance inquiries, optionally filtered by communityId and status.
 */
export async function getInquiries(filters?: {
  communityId?: string;
  status?: string;
}): Promise<GovernanceInquiry[]> {
  const where: any = {};
  if (filters?.communityId) where.communityId = filters.communityId;
  if (filters?.status) where.status = filters.status;

  const rows = await prisma.governanceInquiry.findMany({
    where,
    include: {
      community: {
        select: {
          name: true,
          lgaName: true,
          stateName: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return rows.map((r) => ({
    id: r.id,
    communityId: r.communityId,
    communityName: r.community?.name || 'Community',
    lgaName: r.community?.lgaName,
    stateName: r.community?.stateName,
    type: r.type as InquiryType,
    petitionerDeviceId: r.petitionerDeviceId,
    reason: r.reason,
    citations: r.citations,
    evidenceUrls: r.evidenceUrls ? JSON.parse(r.evidenceUrls) : [],
    clanLineage: r.clanLineage,
    status: r.status as InquiryStatus,
    quorumThreshold: r.quorumThreshold,
    expiresAt: r.expiresAt.toISOString(),
    closedAt: r.closedAt ? r.closedAt.toISOString() : null,
    votesFor: r.votesFor,
    votesAgainst: r.votesAgainst,
    createdAt: r.createdAt.toISOString(),
  }));
}

/**
 * Create a new governance inquiry and transition community to contested lifecycle state.
 */
export async function createInquiry(data: {
  communityId: string;
  type: InquiryType;
  petitionerDeviceId: string;
  reason: string;
  citations?: string;
  evidenceUrls?: string[];
  clanLineage?: string;
  quorumThreshold?: number;
  durationDays?: number;
}): Promise<GovernanceInquiry> {
  const {
    communityId,
    type,
    petitionerDeviceId,
    reason,
    citations,
    evidenceUrls,
    clanLineage,
    quorumThreshold = 15,
    durationDays = 7,
  } = data;

  // 1. Ensure petitioner device profile exists
  await prisma.device.upsert({
    where: { id: petitionerDeviceId },
    update: {},
    create: { id: petitionerDeviceId, trustScore: 100 },
  });

  // 2. Check for active open inquiry on this community
  const existing = await prisma.governanceInquiry.findFirst({
    where: {
      communityId,
      status: 'OPEN',
    },
  });

  if (existing) {
    throw new Error('An active community deliberation is already in progress for this settlement.');
  }

  const expiresAt = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000);
  const targetLifecycleStatus = type === 'DELIST' ? 'CONTESTED_DELIST' : 'CONTESTED_REINSTATE';

  // 3. Create inquiry, update community status, record vote, and write audit log
  const inquiry = await prisma.$transaction(async (tx) => {
    const createdInquiry = await tx.governanceInquiry.create({
      data: {
        communityId,
        type,
        petitionerDeviceId,
        reason,
        citations: citations || null,
        evidenceUrls: evidenceUrls ? JSON.stringify(evidenceUrls) : null,
        clanLineage: clanLineage || null,
        status: 'OPEN',
        quorumThreshold: Number(quorumThreshold) || 15,
        expiresAt,
        votesFor: 1, // Petitioner counts as 1 vote FOR their petition
        votesAgainst: 0,
      },
      include: {
        community: {
          select: { name: true, lgaName: true, stateName: true },
        },
      },
    });

    await tx.community.update({
      where: { id: communityId },
      data: { lifecycleStatus: targetLifecycleStatus },
    });

    await tx.governanceVote.upsert({
      where: {
        inquiryId_deviceId: {
          inquiryId: createdInquiry.id,
          deviceId: petitionerDeviceId,
        },
      },
      update: { choice: 'FOR' },
      create: {
        inquiryId: createdInquiry.id,
        deviceId: petitionerDeviceId,
        choice: 'FOR',
        evidenceNote: 'Original petition author',
      },
    });

    await tx.communityAuditLog.create({
      data: {
        communityId,
        deviceId: petitionerDeviceId,
        action: type === 'DELIST' ? 'CHALLENGED_DELIST' : 'PETITION_REINSTATE',
        summary:
          type === 'DELIST'
            ? `Delisting petition submitted: "${reason}". Archival citation: ${citations || 'None provided'}`
            : `Reinstatement claimed by resident: "${reason}". Lineage: ${clanLineage || 'N/A'}`,
      },
    });

    return createdInquiry;
  });

  return {
    id: inquiry.id,
    communityId: inquiry.communityId,
    communityName: inquiry.community?.name || 'Community',
    lgaName: inquiry.community?.lgaName,
    stateName: inquiry.community?.stateName,
    type: inquiry.type as InquiryType,
    petitionerDeviceId: inquiry.petitionerDeviceId,
    reason: inquiry.reason,
    citations: inquiry.citations,
    evidenceUrls: inquiry.evidenceUrls ? JSON.parse(inquiry.evidenceUrls) : [],
    clanLineage: inquiry.clanLineage,
    status: inquiry.status as InquiryStatus,
    quorumThreshold: inquiry.quorumThreshold,
    expiresAt: inquiry.expiresAt.toISOString(),
    closedAt: null,
    votesFor: 1,
    votesAgainst: 0,
    createdAt: inquiry.createdAt.toISOString(),
  };
}

/**
 * Cast an anonymous device vote and evaluate quorum thresholds in Supabase.
 */
export async function castVote(data: {
  inquiryId: string;
  deviceId: string;
  choice: 'FOR' | 'AGAINST';
  evidenceNote?: string;
  isLocalObserver?: boolean;
}): Promise<{
  success: boolean;
  vote: GovernanceVote;
  inquiry: GovernanceInquiry;
  resolvedState: string | null;
}> {
  const { inquiryId, deviceId, choice, evidenceNote, isLocalObserver } = data;

  // 1. Ensure device exists
  await prisma.device.upsert({
    where: { id: deviceId },
    update: {},
    create: { id: deviceId, trustScore: 100 },
  });

  // 2. Fetch inquiry
  const inquiry = await prisma.governanceInquiry.findUnique({
    where: { id: inquiryId },
    include: {
      community: { select: { name: true, lgaName: true, stateName: true } },
    },
  });

  if (!inquiry) {
    throw new Error('Inquiry not found');
  }

  if (inquiry.status !== 'OPEN') {
    throw new Error(`Inquiry is already closed with status: ${inquiry.status}`);
  }

  // 3. Check for existing vote
  const existingVote = await prisma.governanceVote.findUnique({
    where: {
      inquiryId_deviceId: { inquiryId, deviceId },
    },
  });

  if (existingVote) {
    throw new Error('This device has already cast a vote in this community inquiry.');
  }

  // 4. Record vote & update tallies
  const createdVote = await prisma.governanceVote.create({
    data: {
      inquiryId,
      deviceId,
      choice,
      evidenceNote: evidenceNote || null,
      isLocalObserver: Boolean(isLocalObserver),
    },
  });

  const updatedVotesFor = choice === 'FOR' ? inquiry.votesFor + 1 : inquiry.votesFor;
  const updatedVotesAgainst = choice === 'AGAINST' ? inquiry.votesAgainst + 1 : inquiry.votesAgainst;
  const totalVotes = updatedVotesFor + updatedVotesAgainst;

  let newStatus: InquiryStatus = 'OPEN';
  let closedAt: Date | null = null;
  let resolvedState: string | null = null;

  // 5. Evaluate Quorum Rules
  if (totalVotes >= inquiry.quorumThreshold) {
    const forRatio = updatedVotesFor / totalVotes;
    const againstRatio = updatedVotesAgainst / totalVotes;

    if (inquiry.type === 'DELIST') {
      if (forRatio >= 0.7) {
        newStatus = 'APPROVED';
        closedAt = new Date();
        resolvedState = 'DELISTED';

        await prisma.community.update({
          where: { id: inquiry.communityId },
          data: { lifecycleStatus: 'DELISTED', identityStatus: 'non_igbo' },
        });

        await prisma.communityAuditLog.create({
          data: {
            communityId: inquiry.communityId,
            deviceId,
            action: 'DELISTED',
            summary: `Delisting approved by community quorum (${updatedVotesFor} for / ${updatedVotesAgainst} against). Reclassified to dormant.`,
          },
        });
      } else if (againstRatio >= 0.55) {
        newStatus = 'REJECTED';
        closedAt = new Date();
        resolvedState = 'ACTIVE';

        await prisma.community.update({
          where: { id: inquiry.communityId },
          data: { lifecycleStatus: 'ACTIVE', identityStatus: 'igbo' },
        });

        await prisma.communityAuditLog.create({
          data: {
            communityId: inquiry.communityId,
            deviceId,
            action: 'CHALLENGE_DISMISSED',
            summary: `Delisting petition dismissed by community quorum (${updatedVotesAgainst} to retain). Active Igbo classification reaffirmed.`,
          },
        });
      }
    } else if (inquiry.type === 'REINSTATE') {
      if (forRatio >= 0.6) {
        newStatus = 'APPROVED';
        closedAt = new Date();
        resolvedState = 'ACTIVE';

        await prisma.community.update({
          where: { id: inquiry.communityId },
          data: { lifecycleStatus: 'ACTIVE', identityStatus: 'igbo' },
        });

        await prisma.communityAuditLog.create({
          data: {
            communityId: inquiry.communityId,
            deviceId,
            action: 'REINSTATED',
            summary: `Reinstatement approved by community quorum (${updatedVotesFor} for restoration). Settlement returned to active atlas core.`,
          },
        });
      } else if (againstRatio >= 0.6) {
        newStatus = 'REJECTED';
        closedAt = new Date();
        resolvedState = 'DELISTED';

        await prisma.community.update({
          where: { id: inquiry.communityId },
          data: { lifecycleStatus: 'DELISTED', identityStatus: 'non_igbo' },
        });

        await prisma.communityAuditLog.create({
          data: {
            communityId: inquiry.communityId,
            deviceId,
            action: 'CHALLENGE_DISMISSED',
            summary: `Reinstatement petition dismissed by quorum. Status remains delisted/dormant.`,
          },
        });
      }
    }
  }

  await prisma.governanceInquiry.update({
    where: { id: inquiryId },
    data: {
      votesFor: updatedVotesFor,
      votesAgainst: updatedVotesAgainst,
      status: newStatus,
      closedAt,
    },
  });

  return {
    success: true,
    vote: {
      id: createdVote.id,
      inquiryId: createdVote.inquiryId,
      deviceId: createdVote.deviceId,
      choice: createdVote.choice as 'FOR' | 'AGAINST',
      evidenceNote: createdVote.evidenceNote,
      isLocalObserver: createdVote.isLocalObserver,
      createdAt: createdVote.createdAt.toISOString(),
    },
    inquiry: {
      id: inquiry.id,
      communityId: inquiry.communityId,
      communityName: inquiry.community?.name || 'Community',
      lgaName: inquiry.community?.lgaName,
      stateName: inquiry.community?.stateName,
      type: inquiry.type as InquiryType,
      petitionerDeviceId: inquiry.petitionerDeviceId,
      reason: inquiry.reason,
      citations: inquiry.citations,
      evidenceUrls: inquiry.evidenceUrls ? JSON.parse(inquiry.evidenceUrls) : [],
      clanLineage: inquiry.clanLineage,
      status: newStatus,
      quorumThreshold: inquiry.quorumThreshold,
      expiresAt: inquiry.expiresAt.toISOString(),
      closedAt: closedAt ? closedAt.toISOString() : null,
      votesFor: updatedVotesFor,
      votesAgainst: updatedVotesAgainst,
      createdAt: inquiry.createdAt.toISOString(),
    },
    resolvedState,
  };
}

/**
 * Fetch immutable public audit history from Supabase.
 */
export async function getAuditLogs(communityId?: string): Promise<CommunityAuditLog[]> {
  const where: any = {};
  if (communityId) where.communityId = communityId;

  const rows = await prisma.communityAuditLog.findMany({
    where,
    include: {
      community: {
        select: { name: true },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });

  return rows.map((r) => ({
    id: r.id,
    communityId: r.communityId,
    communityName: r.community?.name,
    deviceId: r.deviceId,
    action: r.action as CommunityAuditLog['action'],
    summary: r.summary,
    createdAt: r.createdAt.toISOString(),
  }));
}

/**
 * Record an audit log entry directly to Supabase.
 */
export async function appendAuditLog(data: {
  communityId: string;
  deviceId?: string;
  action: CommunityAuditLog['action'];
  summary: string;
}): Promise<CommunityAuditLog> {
  const row = await prisma.communityAuditLog.create({
    data: {
      communityId: data.communityId,
      deviceId: data.deviceId || null,
      action: data.action,
      summary: data.summary,
    },
  });

  return {
    id: row.id,
    communityId: row.communityId,
    deviceId: row.deviceId,
    action: row.action as CommunityAuditLog['action'],
    summary: row.summary,
    createdAt: row.createdAt.toISOString(),
  };
}
