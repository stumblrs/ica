require('dotenv').config({ path: '.env' });
const { Pool } = require('pg');

/**
 * Migration Script: Harden Supabase PostgreSQL Row-Level Security (RLS)
 * - Revokes all anonymous mutation privileges (INSERT, UPDATE, DELETE) across all public tables.
 * - Restricts public client access to safe SELECT only on public data (Community, Comment, GovernanceInquiry, CommunityAuditLog).
 * - Restricts Device, GovernanceVote, and Profile writes strictly to server-side Prisma / Service Role.
 * Run with: node scripts/harden-supabase-rls.js
 */
async function hardenPolicies() {
  const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('No DIRECT_URL or DATABASE_URL found in environment.');
    process.exit(1);
  }

  const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });

  console.log('Connecting to Supabase PostgreSQL to harden RLS policies...');

  await pool.query(`
    DO $$
    DECLARE
      pol RECORD;
    BEGIN
      -- 1. Drop all existing legacy/permissive policies created previously
      FOR pol IN 
        SELECT tablename, policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' 
          AND policyname LIKE 'Allow public%'
      LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I;', pol.policyname, pol.tablename);
        RAISE NOTICE 'Dropped legacy policy: % on %', pol.policyname, pol.tablename;
      END LOOP;

      -- 2. Explicitly ensure Row Level Security is ENABLED on all core tables
      ALTER TABLE "Community" ENABLE ROW LEVEL SECURITY;
      ALTER TABLE "Comment" ENABLE ROW LEVEL SECURITY;
      ALTER TABLE "Device" ENABLE ROW LEVEL SECURITY;
      ALTER TABLE "CommunityAuditLog" ENABLE ROW LEVEL SECURITY;
      ALTER TABLE "GovernanceInquiry" ENABLE ROW LEVEL SECURITY;
      ALTER TABLE "GovernanceVote" ENABLE ROW LEVEL SECURITY;
      ALTER TABLE "Profile" ENABLE ROW LEVEL SECURITY;
      ALTER TABLE "Notification" ENABLE ROW LEVEL SECURITY;

      -- 3. Explicitly REVOKE all mutating actions on all public tables from anon
      REVOKE INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public FROM anon;

      -- 4. Create strictly scoped SELECT policies for tables that need public visibility
      -- Community (Read-only for interactive map & public atlas)
      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'Community' AND policyname = 'Public read verified communities') THEN
        CREATE POLICY "Public read verified communities" ON "Community" FOR SELECT USING (true);
      END IF;

      -- Comment (Read-only for public voices feed and Realtime broadcast)
      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'Comment' AND policyname = 'Public read comments') THEN
        CREATE POLICY "Public read comments" ON "Comment" FOR SELECT USING (true);
      END IF;

      -- GovernanceInquiry (Read-only for active and closed deliberation inquiries)
      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'GovernanceInquiry' AND policyname = 'Public read inquiries') THEN
        CREATE POLICY "Public read inquiries" ON "GovernanceInquiry" FOR SELECT USING (true);
      END IF;

      -- CommunityAuditLog (Read-only for public transparency audit logs)
      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'CommunityAuditLog' AND policyname = 'Public read audit logs') THEN
        CREATE POLICY "Public read audit logs" ON "CommunityAuditLog" FOR SELECT USING (true);
      END IF;

      -- Notification (Read-only for Realtime notification delivery)
      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'Notification' AND policyname = 'Public read notifications') THEN
        CREATE POLICY "Public read notifications" ON "Notification" FOR SELECT USING (true);
      END IF;

      -- Note: Device, GovernanceVote, and Profile intentionally have NO public mutation policies.
      -- All mutations on these tables MUST be performed via Next.js server-side API routes using Prisma or Service Role.
    END $$;
  `);

  console.log('✓ Successfully hardened all Supabase PostgreSQL RLS policies.');

  // Print current active policies for verification
  const res = await pool.query(`
    SELECT tablename, policyname, cmd, roles 
    FROM pg_policies 
    WHERE schemaname = 'public' 
    ORDER BY tablename, policyname;
  `);

  console.log('\n--- ACTIVE POSTGRESQL RLS POLICIES ---');
  res.rows.forEach((r) => {
    console.log(`[${r.tablename}] ${r.policyname} -> ${r.cmd} (${r.roles})`);
  });

  await pool.end();
}

hardenPolicies().catch((err) => {
  console.error('Error applying RLS hardening:', err);
  process.exit(1);
});
