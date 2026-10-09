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
