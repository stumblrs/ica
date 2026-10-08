import fs from 'node:fs';
import path from 'node:path';

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
  citations?: string;
  evidenceUrls?: string[];
  clanLineage?: string;
  status: InquiryStatus;
  quorumThreshold: number;
  expiresAt: string; // ISO date
  closedAt?: string;
  votesFor: number;
  votesAgainst: number;
  createdAt: string;
}

export interface GovernanceVote {
  id: string;
  inquiryId: string;
  deviceId: string;
  choice: 'FOR' | 'AGAINST';
  evidenceNote?: string;
  isLocalObserver?: boolean;
  createdAt: string;
}

export interface CommunityAuditLog {
  id: string;
  communityId: string;
  deviceId?: string;
  action: 'CREATED' | 'CHALLENGED_DELIST' | 'DELISTED' | 'PETITION_REINSTATE' | 'REINSTATED' | 'CHALLENGE_DISMISSED';
  summary: string;
  createdAt: string;
}

const INQUIRIES_FILE = path.resolve(process.cwd(), 'public/data/governance_inquiries.json');
const VOTES_FILE = path.resolve(process.cwd(), 'public/data/governance_votes.json');
const AUDIT_FILE = path.resolve(process.cwd(), 'public/data/community_audit_logs.json');

function ensureDir() {
  const dir = path.dirname(INQUIRIES_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

export function getInquiries(): GovernanceInquiry[] {
  ensureDir();
  if (!fs.existsSync(INQUIRIES_FILE)) {
    // Seed with a representative contested inquiry for Obi LGA / Amaeke so users can immediately test the UI
    const sample: GovernanceInquiry[] = [
      {
        id: 'inq-amaeke-01',
        communityId: 'c-amaeke-obi',
        communityName: 'Amaeke (Amaekka)',
        lgaName: 'Obi',
        stateName: 'Benue',
        type: 'DELIST',
        petitionerDeviceId: 'dev_sample_challenger',
        reason: 'Border settlement claimed as historically Igede rather than Ezza-Igbo enclave.',
        citations: 'Benue State Administrative Gazetteer 1976; Obi Local Government Council boundary memorandum.',
        evidenceUrls: ['https://example.com/archival/obi_gazetteer_extract.pdf'],
        status: 'OPEN',
        quorumThreshold: 15,
        expiresAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days left
        votesFor: 4,
        votesAgainst: 9,
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      },
    ];
    fs.writeFileSync(INQUIRIES_FILE, JSON.stringify(sample, null, 2), 'utf8');
    return sample;
  }
  try {
    return JSON.parse(fs.readFileSync(INQUIRIES_FILE, 'utf8'));
  } catch {
    return [];
  }
}

export function saveInquiries(inquiries: GovernanceInquiry[]): void {
  ensureDir();
  fs.writeFileSync(INQUIRIES_FILE, JSON.stringify(inquiries, null, 2), 'utf8');
}

export function getVotes(): GovernanceVote[] {
  ensureDir();
  if (!fs.existsSync(VOTES_FILE)) return [];
  try {
    return JSON.parse(fs.readFileSync(VOTES_FILE, 'utf8'));
  } catch {
    return [];
  }
}

export function saveVotes(votes: GovernanceVote[]): void {
  ensureDir();
  fs.writeFileSync(VOTES_FILE, JSON.stringify(votes, null, 2), 'utf8');
}

export function getAuditLogs(communityId?: string): CommunityAuditLog[] {
  ensureDir();
  if (!fs.existsSync(AUDIT_FILE)) {
    const sampleLogs: CommunityAuditLog[] = [
      {
        id: 'log-1',
        communityId: 'c-amaeke-obi',
        action: 'CREATED',
        summary: 'Documented as historic Ezza-Igbo enclave in Obi LGA borderland.',
        createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: 'log-2',
        communityId: 'c-amaeke-obi',
        action: 'CHALLENGED_DELIST',
        summary: 'Declassification inquiry opened by community petitioner citing Igede predominance.',
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      },
    ];
    fs.writeFileSync(AUDIT_FILE, JSON.stringify(sampleLogs, null, 2), 'utf8');
    return communityId ? sampleLogs.filter((l) => l.communityId === communityId) : sampleLogs;
  }
  try {
    const logs: CommunityAuditLog[] = JSON.parse(fs.readFileSync(AUDIT_FILE, 'utf8'));
    return communityId ? logs.filter((l) => l.communityId === communityId) : logs;
  } catch {
    return [];
  }
}

export function appendAuditLog(log: Omit<CommunityAuditLog, 'id' | 'createdAt'>): CommunityAuditLog {
  ensureDir();
  const logs = getAuditLogs();
  const newLog: CommunityAuditLog = {
    ...log,
    id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    createdAt: new Date().toISOString(),
  };
  logs.unshift(newLog);
  fs.writeFileSync(AUDIT_FILE, JSON.stringify(logs, null, 2), 'utf8');
  return newLog;
}
