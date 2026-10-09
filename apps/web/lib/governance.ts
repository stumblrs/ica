import { prisma } from '@/lib/prisma';

export type LifecycleStatus = 'ACTIVE' | 'CONTESTED_DELIST' | 'DELISTED' | 'CONTESTED_REINSTATE';

export type InquiryType = 'DELIST' | 'REINSTATE';

export type InquiryStatus = 'OPEN' | 'APPROVED' | 'REJECTED' | 'EXPIRED';

export interface GovernanceTierPolicy {
  tier: 1 | 2 | 3 | 4;
  tierName: string;
  badgeLabel: string;
  quorumThreshold: number; // 25 | 35 | 50 | 75
  durationDays: number; // 14 | 21
  supermajorityPct: number; // 80%
  minLocalObservers: number; // 0 | 2 | 3 | 5
  description: string;
}

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
  localObserversCount?: number;
  tierPolicy?: GovernanceTierPolicy;
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
 * Calculates authoritative Governance Tier Policy for any community.
 * Maintains strict egalitarian parity across all 7 Igbo dialect continua:
 * Classification strictly reflects settlement scale and documented antiquities,
 * with no dialect or geographical hierarchy.
 */
export function getCommunityGovernancePolicy(community?: {
  type?: string | null;
  historicalStatus?: string | null;
  verificationStatus?: string | null;
  confidence?: number | null;
  whySignificant?: string | null;
}): GovernanceTierPolicy {
  if (!community) {
    return {
      tier: 1,
      tierName: 'Tier 1: Minor Settlement / Unverified Enclave',
      badgeLabel: 'Tier 1 • Minor Settlement (25 Quorum)',
      quorumThreshold: 25,
      durationDays: 14,
      supermajorityPct: 80,
      minLocalObservers: 0,
      description: 'Minor settlement or pending listing. Requires 25 valid unique votes over a 14-day window with an 80% delisting supermajority.',
    };
  }

  const hist = (community.historicalStatus || '').toLowerCase();
  const sig = (community.whySignificant || '').toLowerCase();
  const cType = (community.type || '').toLowerCase();
  const vStatus = (community.verificationStatus || '').toLowerCase();

  // Tier 4: Protected Historic / Ancestral Hub / Clan Seat
  const isAncientOrHub =
    hist.includes('hub') ||
    hist.includes('ancient') ||
    hist.includes('origin') ||
    hist.includes('cradle') ||
    hist.includes('clan') ||
    cType === 'clan' ||
    sig.includes('cradle') ||
    sig.includes('ancestral') ||
    sig.includes('origin');

  if (isAncientOrHub) {
    return {
      tier: 4,
      tierName: 'Tier 4: Protected Historic / Ancestral Hub / Clan Seat',
      badgeLabel: 'Tier 4 • Historic Hub (75 Quorum)',
      quorumThreshold: 75,
      durationDays: 21,
      supermajorityPct: 80,
      minLocalObservers: 5,
      description: 'Documented ancestral hub or clan seat. Requires 75 valid unique votes over a 21-day window, min 5 local/descendant observers, and 80% supermajority.',
    };
  }

  // Tier 3: Autonomous Community / Major Town / City
  const isMajorTownOrCity =
    cType === 'city' ||
    cType === 'town' ||
    (vStatus === 'verified' && (community.confidence ?? 1) >= 0.85);

  if (isMajorTownOrCity) {
    return {
      tier: 3,
      tierName: 'Tier 3: Autonomous Community / Town / City',
      badgeLabel: 'Tier 3 • Autonomous Town (50 Quorum)',
      quorumThreshold: 50,
      durationDays: 14,
      supermajorityPct: 80,
      minLocalObservers: 3,
      description: 'Autonomous community or town. Requires 50 valid unique votes over a 14-day window, min 3 local observers, and 80% supermajority.',
    };
  }

  // Tier 2: Verified Settlement / Village
  const isVillageOrVerified =
    cType === 'village' ||
    vStatus === 'verified' ||
    (community.confidence ?? 1) >= 0.7;

  if (isVillageOrVerified) {
    return {
      tier: 2,
      tierName: 'Tier 2: Verified Settlement / Village',
      badgeLabel: 'Tier 2 • Verified Settlement (35 Quorum)',
      quorumThreshold: 35,
      durationDays: 14,
      supermajorityPct: 80,
      minLocalObservers: 2,
      description: 'Verified village or settlement. Requires 35 valid unique votes over a 14-day window, min 2 local observers, and 80% supermajority.',
    };
  }

  // Tier 1: Minor Settlement / Unverified Enclave / Pending
  return {
    tier: 1,
    tierName: 'Tier 1: Minor Settlement / Unverified Enclave',
    badgeLabel: 'Tier 1 • Minor Settlement (25 Quorum)',
    quorumThreshold: 25,
    durationDays: 14,
    supermajorityPct: 80,
    minLocalObservers: 0,
    description: 'Minor settlement or pending listing. Requires 25 valid unique votes over a 14-day window with an 80% delisting supermajority.',
  };
}

/**
 * Evaluates an inquiry when its expiration deadline has arrived.
 * Implements the Conservation-First Hybrid Governance Model:
 * 1. Anti-Early-Closure: Petitions never resolve before expiresAt has elapsed.
 * 2. Quorum Check: Requires meeting the Tier's quorum threshold (25, 35, 50, or 75 unique devices).
 * 3. Conservation Supermajority: DELISTING requires >= 80% supermajority FOR delisting.
 *    Any petition with < 80% votes for delisting (i.e. > 20% retain votes) is DEFEATED and preserved.
 * 4. Reversible Lifecycle: Community transitions cleanly between ACTIVE, CONTESTED_DELIST, DELISTED,
 *    and CONTESTED_REINSTATE with full immutable audit history.
 */
export async function evaluateInquiryOutcome(inquiryId: string): Promise<{
  evaluated: boolean;
  inquiry: GovernanceInquiry | null;
  resolvedState: string | null;
}> {
  const inquiry = await prisma.governanceInquiry.findUnique({
    where: { id: inquiryId },
    include: {
      community: {
        select: {
          id: true,
          name: true,
          lgaName: true,
          stateName: true,
          type: true,
          historicalStatus: true,
          verificationStatus: true,
          confidence: true,
          whySignificant: true,
        },
      },
    },
  });

  if (!inquiry || inquiry.status !== 'OPEN') {
    return { evaluated: false, inquiry: null, resolvedState: null };
  }

  const now = new Date();
  if (now < inquiry.expiresAt) {
    // Deliberation period still active; anti-early-closure prevents resolving before deadline
    return { evaluated: false, inquiry: null, resolvedState: null };
  }

  const totalVotes = inquiry.votesFor + inquiry.votesAgainst;
  const quorumMet = totalVotes >= inquiry.quorumThreshold;

  let newStatus: InquiryStatus = 'EXPIRED';
  let resolvedState: string | null = null;
  const closedAt = now;

  if (!quorumMet) {
    // Quorum not met: petition lapses; revert community status to pre-inquiry baseline
    newStatus = 'EXPIRED';
    resolvedState = inquiry.type === 'DELIST' ? 'ACTIVE' : 'DELISTED';

    await prisma.community.update({
      where: { id: inquiry.communityId },
      data: {
        lifecycleStatus: resolvedState,
        identityStatus: resolvedState === 'ACTIVE' ? 'igbo' : 'non_igbo',
      },
    });

    await prisma.communityAuditLog.create({
      data: {
        communityId: inquiry.communityId,
        action: 'CHALLENGE_DISMISSED',
        summary: `Governance deliberation window expired. Quorum was not reached (${totalVotes}/${inquiry.quorumThreshold} votes). Community preserved as ${resolvedState}.`,
      },
    });
  } else {
    // Quorum met: evaluate conservation supermajority rules
    if (inquiry.type === 'DELIST') {
      const forRatio = totalVotes > 0 ? inquiry.votesFor / totalVotes : 0;
      // Strict 80% supermajority required to delist an Igbo community
      if (forRatio >= 0.8) {
        newStatus = 'APPROVED';
        resolvedState = 'DELISTED';

        await prisma.community.update({
          where: { id: inquiry.communityId },
          data: { lifecycleStatus: 'DELISTED', identityStatus: 'non_igbo' },
        });

        await prisma.communityAuditLog.create({
          data: {
            communityId: inquiry.communityId,
            action: 'DELISTED',
            summary: `Delisting petition approved by 80% supermajority quorum (${inquiry.votesFor}/${totalVotes} votes, ${(forRatio * 100).toFixed(1)}%). Reclassified to dormant archive with preserved geometry and records.`,
          },
        });
      } else {
        newStatus = 'REJECTED';
        resolvedState = 'ACTIVE';

        await prisma.community.update({
          where: { id: inquiry.communityId },
          data: { lifecycleStatus: 'ACTIVE', identityStatus: 'igbo' },
        });

        await prisma.communityAuditLog.create({
          data: {
            communityId: inquiry.communityId,
            action: 'CHALLENGE_DISMISSED',
            summary: `Delisting petition defeated: failed to achieve the mandatory 80% supermajority (${inquiry.votesFor}/${totalVotes} votes, ${(forRatio * 100).toFixed(1)}%). Active Igbo status reaffirmed and protected.`,
          },
        });
      }
    } else if (inquiry.type === 'REINSTATE') {
      const forRatio = totalVotes > 0 ? inquiry.votesFor / totalVotes : 0;
      // 60% restoration threshold for reinstatement petitions
      if (forRatio >= 0.6) {
        newStatus = 'APPROVED';
        resolvedState = 'ACTIVE';

        await prisma.community.update({
          where: { id: inquiry.communityId },
          data: { lifecycleStatus: 'ACTIVE', identityStatus: 'igbo' },
        });

        await prisma.communityAuditLog.create({
          data: {
            communityId: inquiry.communityId,
            action: 'REINSTATED',
            summary: `Reinstatement approved by community quorum (${inquiry.votesFor}/${totalVotes} votes, ${(forRatio * 100).toFixed(1)}%). Settlement restored to active atlas registry.`,
          },
        });
      } else {
        newStatus = 'REJECTED';
        resolvedState = 'DELISTED';

        await prisma.community.update({
          where: { id: inquiry.communityId },
          data: { lifecycleStatus: 'DELISTED', identityStatus: 'non_igbo' },
        });

        await prisma.communityAuditLog.create({
          data: {
            communityId: inquiry.communityId,
            action: 'CHALLENGE_DISMISSED',
            summary: `Reinstatement petition dismissed by community quorum (${inquiry.votesFor}/${totalVotes} votes). Status remains dormant in archive.`,
          },
        });
      }
    }
  }

  const updatedInquiry = await prisma.governanceInquiry.update({
    where: { id: inquiryId },
    data: {
      status: newStatus,
      closedAt,
    },
    include: {
      community: {
        select: {
          name: true,
          lgaName: true,
          stateName: true,
          type: true,
          historicalStatus: true,
          verificationStatus: true,
          confidence: true,
          whySignificant: true,
        },
      },
    },
  });

  const tierPolicy = getCommunityGovernancePolicy(updatedInquiry.community || undefined);

  return {
    evaluated: true,
    resolvedState,
    inquiry: {
      id: updatedInquiry.id,
      communityId: updatedInquiry.communityId,
      communityName: updatedInquiry.community?.name || 'Community',
      lgaName: updatedInquiry.community?.lgaName,
      stateName: updatedInquiry.community?.stateName,
      type: updatedInquiry.type as InquiryType,
      petitionerDeviceId: updatedInquiry.petitionerDeviceId,
      reason: updatedInquiry.reason,
      citations: updatedInquiry.citations,
      evidenceUrls: updatedInquiry.evidenceUrls ? JSON.parse(updatedInquiry.evidenceUrls) : [],
      clanLineage: updatedInquiry.clanLineage,
      status: updatedInquiry.status as InquiryStatus,
      quorumThreshold: updatedInquiry.quorumThreshold,
      expiresAt: updatedInquiry.expiresAt.toISOString(),
      closedAt: updatedInquiry.closedAt ? updatedInquiry.closedAt.toISOString() : null,
      votesFor: updatedInquiry.votesFor,
      votesAgainst: updatedInquiry.votesAgainst,
      tierPolicy,
      createdAt: updatedInquiry.createdAt.toISOString(),
    },
  };
}

/**
 * Fetch all governance inquiries, resolving any expired ones on the fly.
 */
export async function getInquiries(filters?: {
  communityId?: string;
  status?: string;
}): Promise<GovernanceInquiry[]> {
  // Check and resolve any expired open inquiries
  const expiredOpen = await prisma.governanceInquiry.findMany({
    where: {
      status: 'OPEN',
      expiresAt: { lte: new Date() },
    },
    select: { id: true },
  });

  for (const exp of expiredOpen) {
    try {
      await evaluateInquiryOutcome(exp.id);
    } catch {
      // Continue resolving remaining inquiries
    }
  }

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
          type: true,
          historicalStatus: true,
          verificationStatus: true,
          confidence: true,
          whySignificant: true,
        },
      },
      votes: {
        where: { isLocalObserver: true },
        select: { id: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return rows.map((r) => {
    const tierPolicy = getCommunityGovernancePolicy(r.community || undefined);
    return {
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
      localObserversCount: r.votes.length,
      tierPolicy,
      createdAt: r.createdAt.toISOString(),
    };
  });
}

/**
 * Create a new governance inquiry and transition community to contested lifecycle state.
 * Uses authoritative community governance tier policy to enforce quorum and window duration.
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
  } = data;

  // 1. Ensure petitioner device profile exists
  await prisma.device.upsert({
    where: { id: petitionerDeviceId },
    update: {},
    create: { id: petitionerDeviceId, trustScore: 100 },
  });

  // 2. Fetch community and compute authoritative governance policy
  const community = await prisma.community.findUnique({
    where: { id: communityId },
    select: {
      id: true,
      name: true,
      lgaName: true,
      stateName: true,
      type: true,
      historicalStatus: true,
      verificationStatus: true,
      confidence: true,
      whySignificant: true,
    },
  });

  const policy = getCommunityGovernancePolicy(community || undefined);
  const effectiveQuorum = Math.max(policy.quorumThreshold, Number(data.quorumThreshold) || policy.quorumThreshold);
  const effectiveDurationDays = Math.max(policy.durationDays, Number(data.durationDays) || policy.durationDays);

  // 3. Check for active open inquiry on this community
  const existing = await prisma.governanceInquiry.findFirst({
    where: {
      communityId,
      status: 'OPEN',
    },
  });

  if (existing) {
    throw new Error('An active community deliberation is already in progress for this settlement.');
  }

  const expiresAt = new Date(Date.now() + effectiveDurationDays * 24 * 60 * 60 * 1000);
  const targetLifecycleStatus = type === 'DELIST' ? 'CONTESTED_DELIST' : 'CONTESTED_REINSTATE';

  // 4. Create inquiry, update community status, record petitioner vote, and write audit log
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
        quorumThreshold: effectiveQuorum,
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
            ? `Delisting petition submitted: "${reason}". Archival citation: ${citations || 'None provided'}. Governed under ${policy.tierName} (${effectiveQuorum} quorum, ${effectiveDurationDays} days deliberation).`
            : `Reinstatement claimed by resident: "${reason}". Lineage: ${clanLineage || 'N/A'}. Governed under ${policy.tierName}.`,
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
    localObserversCount: 0,
    tierPolicy: policy,
    createdAt: inquiry.createdAt.toISOString(),
  };
}

/**
 * Cast an anonymous device vote.
 * Implements Anti-Early-Closure: Reaching quorum never terminates voting prematurely.
 * Voting remains OPEN for the entire deliberation window (14 or 21 days) to give
 * descendants, elders, and observers time to contribute counter-evidence.
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
      community: {
        select: {
          name: true,
          lgaName: true,
          stateName: true,
          type: true,
          historicalStatus: true,
          verificationStatus: true,
          confidence: true,
          whySignificant: true,
        },
      },
    },
  });

  if (!inquiry) {
    throw new Error('Inquiry not found');
  }

  // Check if expiration deadline has passed
  if (new Date() >= inquiry.expiresAt) {
    await evaluateInquiryOutcome(inquiryId);
    throw new Error('The deliberation window for this community inquiry has concluded.');
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

  // Anti-Early-Closure: Inquiry stays OPEN regardless of current vote count
  await prisma.governanceInquiry.update({
    where: { id: inquiryId },
    data: {
      votesFor: updatedVotesFor,
      votesAgainst: updatedVotesAgainst,
    },
  });

  const tierPolicy = getCommunityGovernancePolicy(inquiry.community || undefined);
  const localObserversCount = await prisma.governanceVote.count({
    where: { inquiryId, isLocalObserver: true },
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
      status: 'OPEN',
      quorumThreshold: inquiry.quorumThreshold,
      expiresAt: inquiry.expiresAt.toISOString(),
      closedAt: null,
      votesFor: updatedVotesFor,
      votesAgainst: updatedVotesAgainst,
      localObserversCount,
      tierPolicy,
      createdAt: inquiry.createdAt.toISOString(),
    },
    resolvedState: null,
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
