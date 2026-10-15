require('dotenv').config();
const { Pool } = require('pg');

/**
 * Utility script to ensure all Row-Level Security (RLS) policies
 * are active on Supabase PostgreSQL for direct client access.
 * Run with: node scripts/setup-supabase-policies.js
 */
async function setupPolicies() {
  const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('No DIRECT_URL or DATABASE_URL found in environment.');
    process.exit(1);
  }

  const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });

  console.log('Connecting to Supabase PostgreSQL...');

  await pool.query(`
    DO $$
    BEGIN
      -- Community (Public read, insert, update)
      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'Community' AND policyname = 'Allow public read on Community') THEN
        CREATE POLICY "Allow public read on Community" ON "Community" FOR SELECT USING (true);
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'Community' AND policyname = 'Allow public insert on Community') THEN
        CREATE POLICY "Allow public insert on Community" ON "Community" FOR INSERT WITH CHECK (true);
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'Community' AND policyname = 'Allow public update on Community') THEN
        CREATE POLICY "Allow public update on Community" ON "Community" FOR UPDATE USING (true) WITH CHECK (true);
      END IF;

      -- Comment (Public read, insert, update)
      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'Comment' AND policyname = 'Allow public read on Comment') THEN
        CREATE POLICY "Allow public read on Comment" ON "Comment" FOR SELECT USING (true);
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'Comment' AND policyname = 'Allow public insert on Comment') THEN
        CREATE POLICY "Allow public insert on Comment" ON "Comment" FOR INSERT WITH CHECK (true);
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'Comment' AND policyname = 'Allow public update on Comment') THEN
        CREATE POLICY "Allow public update on Comment" ON "Comment" FOR UPDATE USING (true) WITH CHECK (true);
      END IF;

      -- Device
      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'Device' AND policyname = 'Allow public all on Device') THEN
        CREATE POLICY "Allow public all on Device" ON "Device" FOR ALL USING (true) WITH CHECK (true);
      END IF;

      -- CommunityAuditLog
      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'CommunityAuditLog' AND policyname = 'Allow public read on CommunityAuditLog') THEN
        CREATE POLICY "Allow public read on CommunityAuditLog" ON "CommunityAuditLog" FOR SELECT USING (true);
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'CommunityAuditLog' AND policyname = 'Allow public insert on CommunityAuditLog') THEN
        CREATE POLICY "Allow public insert on CommunityAuditLog" ON "CommunityAuditLog" FOR INSERT WITH CHECK (true);
      END IF;

      -- GovernanceInquiry
      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'GovernanceInquiry' AND policyname = 'Allow public read on GovernanceInquiry') THEN
        CREATE POLICY "Allow public read on GovernanceInquiry" ON "GovernanceInquiry" FOR SELECT USING (true);
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'GovernanceInquiry' AND policyname = 'Allow public insert on GovernanceInquiry') THEN
        CREATE POLICY "Allow public insert on GovernanceInquiry" ON "GovernanceInquiry" FOR INSERT WITH CHECK (true);
      END IF;

      -- GovernanceVote
      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'GovernanceVote' AND policyname = 'Allow public all on GovernanceVote') THEN
        CREATE POLICY "Allow public all on GovernanceVote" ON "GovernanceVote" FOR ALL USING (true) WITH CHECK (true);
      END IF;

      -- Profile (Global handle binding)
      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'Profile' AND policyname = 'Allow public read on Profile') THEN
        CREATE POLICY "Allow public read on Profile" ON "Profile" FOR SELECT USING (true);
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'Profile' AND policyname = 'Allow public insert on Profile') THEN
        CREATE POLICY "Allow public insert on Profile" ON "Profile" FOR INSERT WITH CHECK (true);
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'Profile' AND policyname = 'Allow public update on Profile') THEN
        CREATE POLICY "Allow public update on Profile" ON "Profile" FOR UPDATE USING (true) WITH CHECK (true);
      END IF;

      -- Notification (In-App notifications)
      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'Notification' AND policyname = 'Allow public read on Notification') THEN
        CREATE POLICY "Allow public read on Notification" ON "Notification" FOR SELECT USING (true);
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'Notification' AND policyname = 'Allow public insert on Notification') THEN
        CREATE POLICY "Allow public insert on Notification" ON "Notification" FOR INSERT WITH CHECK (true);
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'Notification' AND policyname = 'Allow public update on Notification') THEN
        CREATE POLICY "Allow public update on Notification" ON "Notification" FOR UPDATE USING (true) WITH CHECK (true);
      END IF;
    END $$;
  `);

  console.log('✓ All Supabase public RLS policies verified and created.');
  await pool.end();
}

setupPolicies().catch((err) => {
  console.error('Error setting up Supabase RLS policies:', err);
  process.exit(1);
});
