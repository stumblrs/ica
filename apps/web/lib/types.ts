export type CommunityType =
  | 'village'
  | 'town'
  | 'city'
  | 'settlement'
  | 'community'
  | 'historical_settlement';

export type IdentityStatus =
  | 'igbo'
  | 'mixed'
  | 'historically_igbo'
  | 'igbo_associated'
  | 'uncertain'
  | 'disputed'
  | 'not_igbo';

export type VerificationStatus =
  | 'pending'
  | 'under_review'
  | 'verified'
  | 'challenged'
  | 'archived';

export type EvidenceSourceType =
  | 'community_submission'
  | 'community_confirmation'
  | 'academic_source'
  | 'historical_source'
  | 'linguistic_source'
  | 'government_source'
  | 'archival_source'
  | 'oral_history'
  | 'other';

export type UserRole = 'contributor' | 'moderator' | 'admin';

export interface StateReference {
  id: string;
  admin1Pcod: string;
  name: string;
  referenceName?: string | null;
  alternateName?: string | null;
  admin0Pcod: string;
  admin0Name: string;
}

export interface LGAReference {
  id: string;
  admin2Pcod: string;
  name: string;
  referenceName?: string | null;
  alternateName?: string | null;
  stateId: string;
  admin1Pcod: string;
}

export interface CommunityRecord {
  id: string;
  name: string;
  type: CommunityType;
  description?: string | null;
  latitude: number;
  longitude: number;
  stateId: string;
  stateName: string;
  lgaId: string;
  lgaName: string;
  identityStatus: IdentityStatus;
  languageStatus?: string | null;
  historicalStatus?: string | null;
  verificationStatus: VerificationStatus;
  confidence: number;
  submittedBy?: string | null;
  createdAt: string;
  updatedAt: string;
  aliases?: CommunityAlias[];
  evidence?: CommunityEvidence[];
  comments?: CommunityComment[];
  confirmationsCount?: number;
  challengesCount?: number;
}

export interface CommunityAlias {
  id: string;
  communityId: string;
  aliasName: string;
  nameType: 'alternate' | 'historical' | 'dialect';
  languageOrDialect?: string | null;
}

export interface CommunityEvidence {
  id: string;
  communityId: string;
  sourceType: EvidenceSourceType;
  citationOrUrl?: string | null;
  description: string;
  submittedBy?: string | null;
  isVerified: boolean;
  createdAt: string;
}

export interface CommunityComment {
  id: string;
  communityId?: string;
  authorName: string;
  affiliation?: string;
  comment: string;
  createdAt: string;
}

export interface CommunityChallenge {
  id: string;
  communityId: string;
  reason: string;
  evidenceUrl?: string | null;
  status: 'open' | 'resolved' | 'dismissed';
  resolutionNotes?: string | null;
  createdAt: string;
}

export interface CreateCommunityInput {
  name: string;
  type: CommunityType;
  description?: string;
  latitude: number;
  longitude: number;
  identityStatus: IdentityStatus;
  languageStatus?: string;
  historicalStatus?: string;
  evidence?: {
    sourceType: EvidenceSourceType;
    description: string;
    citationOrUrl?: string;
  };
  aliases?: string[];
}
