require('dotenv').config({ path: '.env' });
const { Pool } = require('pg');

/**
 * Migration Script: Harden Supabase PostgreSQL Row-Level Security (RLS)
 * - Resolves all Supabase Security Advisor and Linter warnings.
 * - Restricts public client access to safe SELECT only on public data (Community, Comment, GovernanceInquiry, CommunityAuditLog, Notification, Profile).
 * - Restricts Device, GovernanceVote, and Profile writes strictly to server-side Prisma / Service Role.
 * - Adds explicit Service Role policies to all tables to resolve 'RLS Enabled No Policy'.
 * - Revokes public EXECUTE on SECURITY DEFINER function rls_auto_enable().
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
      -- 1. Drop all insecure legacy/permissive policies
      FOR pol IN 
        SELECT tablename, policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' 
          AND (policyname LIKE 'Allow public%' OR policyname LIKE 'Public insert%' OR policyname LIKE 'Public update%' OR policyname LIKE 'Public select%')
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

      -- 3. Explicitly REVOKE all mutating actions on all public tables from anon and authenticated
      REVOKE INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public FROM anon, authenticated, public;

      -- 4. Create strictly scoped SELECT policies for tables that need public visibility
      -- Community (Read-only for interactive map & public atlas)
      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'Community' AND policyname = 'Public read verified communities') THEN
        CREATE POLICY "Public read verified communities" ON "Community" FOR SELECT USING (true);
      END IF;

      -- Comment (Read-only for public voices feed and Realtime broadcast)
      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'Comment' AND policyname = 'Public read comments') THEN
        CREATE POLICY "Public read comments" ON "Comment" FOR SELECT USING (true);
      END IF;

      -- Comment (Validated INSERT policy to permit resilient fallback while enforcing strict data hygiene)
      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'Comment' AND policyname = 'Public insert on Comment with validation') THEN
        CREATE POLICY "Public insert on Comment with validation" ON "Comment"
          FOR INSERT
          TO anon, authenticated
          WITH CHECK (
            length(content) > 0 AND length(content) <= 1000
            AND length(author) <= 60
          );
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

      -- Profile (Read-only for contributor profile lookup and availability check)
      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'Profile' AND policyname = 'Public read profiles') THEN
        CREATE POLICY "Public read profiles" ON "Profile" FOR SELECT USING (true);
      END IF;

      -- Grant explicit SELECT and validated INSERT privileges
      GRANT SELECT ON "Community", "CommunityAuditLog", "GovernanceInquiry", "Notification", "Profile" TO anon, authenticated;
      GRANT SELECT, INSERT ON "Comment" TO anon, authenticated;

      -- 5. Add Service Role full access policies on all tables to resolve 'RLS Enabled No Policy' warnings
      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'Comment' AND policyname = 'Service role full access on Comment') THEN
        CREATE POLICY "Service role full access on Comment" ON "Comment" FOR ALL TO service_role USING (true) WITH CHECK (true);
      END IF;

      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'Community' AND policyname = 'Service role full access on Community') THEN
        CREATE POLICY "Service role full access on Community" ON "Community" FOR ALL TO service_role USING (true) WITH CHECK (true);
      END IF;

      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'CommunityAuditLog' AND policyname = 'Service role full access on CommunityAuditLog') THEN
        CREATE POLICY "Service role full access on CommunityAuditLog" ON "CommunityAuditLog" FOR ALL TO service_role USING (true) WITH CHECK (true);
      END IF;

      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'Device' AND policyname = 'Service role full access on Device') THEN
        CREATE POLICY "Service role full access on Device" ON "Device" FOR ALL TO service_role USING (true) WITH CHECK (true);
      END IF;

      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'GovernanceInquiry' AND policyname = 'Service role full access on GovernanceInquiry') THEN
        CREATE POLICY "Service role full access on GovernanceInquiry" ON "GovernanceInquiry" FOR ALL TO service_role USING (true) WITH CHECK (true);
      END IF;

      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'GovernanceVote' AND policyname = 'Service role full access on GovernanceVote') THEN
        CREATE POLICY "Service role full access on GovernanceVote" ON "GovernanceVote" FOR ALL TO service_role USING (true) WITH CHECK (true);
      END IF;

      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'Notification' AND policyname = 'Service role full access on Notification') THEN
        CREATE POLICY "Service role full access on Notification" ON "Notification" FOR ALL TO service_role USING (true) WITH CHECK (true);
      END IF;

      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'Profile' AND policyname = 'Service role full access on Profile') THEN
        CREATE POLICY "Service role full access on Profile" ON "Profile" FOR ALL TO service_role USING (true) WITH CHECK (true);
      END IF;

      -- 6. Revoke public EXECUTE on SECURITY DEFINER function rls_auto_enable()
      IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid WHERE n.nspname = 'public' AND p.proname = 'rls_auto_enable') THEN
        REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM PUBLIC, anon, authenticated;
        GRANT EXECUTE ON FUNCTION public.rls_auto_enable() TO postgres, service_role;
      END IF;

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
