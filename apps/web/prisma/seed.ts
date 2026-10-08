import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { prisma } from '../lib/prisma';

interface CuratedCommunity {
  id: string;
  name: string;
  type?: string;
  description?: string | null;
  latitude: number;
  longitude: number;
  stateId: string;
  stateName: string;
  lgaId: string;
  lgaName: string;
  identityStatus?: string;
  languageStatus?: string | null;
  historicalStatus?: string | null;
  verificationStatus?: string;
  lifecycleStatus?: string;
  confidence?: number;
  dialect?: string | null;
  dialectGreeting?: string | null;
  whySignificant?: string | null;
  evidence?: unknown[];
  confirmationsCount?: number;
  challengesCount?: number;
}

interface SettlementFeature {
  type: string;
  properties: {
    id: string;
    name: string;
    place?: string | null;
    adm1_pcode?: string | null;
    adm1_name?: string | null;
    adm2_pcode?: string | null;
    adm2_name?: string | null;
  };
  geometry: {
    type: string;
    coordinates: [number, number]; // [lng, lat]
  };
}

async function main() {
  console.log('🌱 Starting Supabase database seed...');

  const dataDir = path.join(__dirname, '../public/data');
  const curatedPath = path.join(dataDir, 'communities_store.json');
  const settlementsPath = path.join(dataDir, 'igbo_settlements.geojson');
  const inquiriesPath = path.join(dataDir, 'governance_inquiries.json');
  const auditLogsPath = path.join(dataDir, 'community_audit_logs.json');

  // 1. Seed Curated Communities
  if (fs.existsSync(curatedPath)) {
    console.log('📦 Reading curated communities...');
    const curatedData: CuratedCommunity[] = JSON.parse(fs.readFileSync(curatedPath, 'utf8'));
    console.log(`Found ${curatedData.length} curated communities.`);

    let curatedCount = 0;
    for (const c of curatedData) {
      await prisma.community.upsert({
        where: { id: c.id },
        update: {
          name: c.name,
          type: c.type || 'community',
          description: c.description || null,
          latitude: c.latitude,
          longitude: c.longitude,
          stateId: c.stateId || 'NG',
          stateName: c.stateName || 'Nigeria',
          lgaId: c.lgaId || 'NG',
          lgaName: c.lgaName || 'LGA',
          identityStatus: c.identityStatus || 'igbo',
          languageStatus: c.languageStatus || null,
          historicalStatus: c.historicalStatus || null,
          verificationStatus: c.verificationStatus || 'verified',
          lifecycleStatus: c.lifecycleStatus || 'ACTIVE',
          confidence: c.confidence ?? 0.9,
          dialect: c.dialect || null,
          dialectGreeting: c.dialectGreeting || null,
          whySignificant: c.whySignificant || null,
          evidenceJson: c.evidence ? JSON.stringify(c.evidence) : null,
          confirmationsCount: c.confirmationsCount || 0,
          challengesCount: c.challengesCount || 0,
        },
        create: {
          id: c.id,
          name: c.name,
          type: c.type || 'community',
          description: c.description || null,
          latitude: c.latitude,
          longitude: c.longitude,
          stateId: c.stateId || 'NG',
          stateName: c.stateName || 'Nigeria',
          lgaId: c.lgaId || 'NG',
          lgaName: c.lgaName || 'LGA',
          identityStatus: c.identityStatus || 'igbo',
          languageStatus: c.languageStatus || null,
          historicalStatus: c.historicalStatus || null,
          verificationStatus: c.verificationStatus || 'verified',
          lifecycleStatus: c.lifecycleStatus || 'ACTIVE',
          confidence: c.confidence ?? 0.9,
          dialect: c.dialect || null,
          dialectGreeting: c.dialectGreeting || null,
          whySignificant: c.whySignificant || null,
          evidenceJson: c.evidence ? JSON.stringify(c.evidence) : null,
          confirmationsCount: c.confirmationsCount || 0,
          challengesCount: c.challengesCount || 0,
        },
      });
      curatedCount++;
    }
    console.log(`✓ Seeded/Updated ${curatedCount} curated communities.`);
  }

  // 2. Seed Settlement Nodes from GeoJSON
  if (fs.existsSync(settlementsPath)) {
    console.log('📍 Reading settlements GeoJSON...');
    const settlementsData = JSON.parse(fs.readFileSync(settlementsPath, 'utf8'));
    const features: SettlementFeature[] = settlementsData.features || [];
    console.log(`Found ${features.length} settlements.`);

    // Batch insertion for performance
    const batchSize = 100;
    let addedSettlements = 0;
    const recordsToInsert = [];

    // Existing IDs to prevent duplicates
    const existing = await prisma.community.findMany({ select: { id: true } });
    const existingIds = new Set(existing.map((e) => e.id));

    for (const f of features) {
      const p = f.properties;
      const coords = f.geometry.coordinates;
      if (!p || !coords || coords.length < 2) continue;

      const rawId = p.id || `node-${coords[0]}-${coords[1]}`;
      const id = `settlement-${rawId.replace(/[^a-zA-Z0-9_-]/g, '_')}`;

      if (existingIds.has(id)) continue;
      existingIds.add(id);

      recordsToInsert.push({
        id,
        name: p.name || 'Unnamed Settlement',
        type: p.place || 'village',
        latitude: coords[1],
        longitude: coords[0],
        stateId: p.adm1_pcode || 'NG',
        stateName: p.adm1_name || 'Nigeria',
        lgaId: p.adm2_pcode || 'NG',
        lgaName: p.adm2_name || 'LGA',
        identityStatus: 'igbo',
        verificationStatus: 'verified',
        lifecycleStatus: 'ACTIVE',
        confidence: 0.9,
      });
    }

    for (let i = 0; i < recordsToInsert.length; i += batchSize) {
      const batch = recordsToInsert.slice(i, i + batchSize);
      await prisma.community.createMany({
        data: batch,
        skipDuplicates: true,
      });
      addedSettlements += batch.length;
    }
    console.log(`✓ Seeded ${addedSettlements} additional settlements.`);
  }

  // 3. Seed Default Client Device Profile (For sample queries and audit verification)
  const defaultDevice = await prisma.device.upsert({
    where: { id: 'dev_system_init' },
    update: {},
    create: {
      id: 'dev_system_init',
      trustScore: 100,
    },
  });

  // Sample Challenger Device if in inquiries
  await prisma.device.upsert({
    where: { id: 'dev_sample_challenger' },
    update: {},
    create: {
      id: 'dev_sample_challenger',
      trustScore: 90,
    },
  });

  // 4. Seed Governance Inquiries if any
  if (fs.existsSync(inquiriesPath)) {
    const inquiriesData = JSON.parse(fs.readFileSync(inquiriesPath, 'utf8'));
    for (const inq of inquiriesData) {
      // Ensure target community exists
      const targetComm = await prisma.community.findUnique({ where: { id: inq.communityId } });
      if (targetComm) {
        await prisma.governanceInquiry.upsert({
          where: { id: inq.id },
          update: {
            status: inq.status || 'OPEN',
            votesFor: inq.votesFor || 0,
            votesAgainst: inq.votesAgainst || 0,
          },
          create: {
            id: inq.id,
            communityId: inq.communityId,
            type: inq.type || 'DELIST',
            petitionerDeviceId: inq.petitionerDeviceId || 'dev_sample_challenger',
            reason: inq.reason,
            citations: inq.citations || null,
            evidenceUrls: inq.evidenceUrls ? JSON.stringify(inq.evidenceUrls) : null,
            status: inq.status || 'OPEN',
            quorumThreshold: inq.quorumThreshold || 15,
            expiresAt: new Date(inq.expiresAt),
            votesFor: inq.votesFor || 0,
            votesAgainst: inq.votesAgainst || 0,
            createdAt: inq.createdAt ? new Date(inq.createdAt) : new Date(),
          },
        });
      }
    }
    console.log(`✓ Seeded governance inquiries.`);
  }

  // 5. Seed Initial Audit Logs
  if (fs.existsSync(auditLogsPath)) {
    const auditData = JSON.parse(fs.readFileSync(auditLogsPath, 'utf8'));
    for (const log of auditData) {
      const targetComm = await prisma.community.findUnique({ where: { id: log.communityId } });
      if (targetComm) {
        await prisma.communityAuditLog.upsert({
          where: { id: log.id },
          update: {},
          create: {
            id: log.id,
            communityId: log.communityId,
            deviceId: 'dev_system_init',
            action: log.action || 'CHALLENGED_DELIST',
            summary: log.summary,
            createdAt: log.createdAt ? new Date(log.createdAt) : new Date(),
          },
        });
      }
    }
    console.log(`✓ Seeded community audit logs.`);
  }

  const total = await prisma.community.count();
  console.log(`🎉 Seeding complete! Total communities in Supabase: ${total}`);
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
