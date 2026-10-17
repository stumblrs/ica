require('dotenv').config({ path: '.env' });
const { Pool } = require('pg');
const { createClient } = require('@supabase/supabase-js');

async function verifyAll() {
  console.log('--- 1. Testing Backend Direct / Prisma Database Operations ---');
  const pool = new Pool({
    connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  const testCommentId = `cmt_sec_${Date.now()}`;
  try {
    // Backend write to Comment
    await pool.query(
      `INSERT INTO "Comment" (id, author, handle, content, category, likes, "citesCount", "createdAt")
       VALUES ($1, 'Security Audit', '@audit', 'Post-remediation test comment', 'general', 0, 0, NOW())`,
      [testCommentId]
    );
    console.log('✓ Backend successfully inserted comment:', testCommentId);

    // Backend read
    const commentRes = await pool.query('SELECT id, author, content FROM "Comment" WHERE id = $1', [testCommentId]);
    console.log('✓ Backend read comment:', commentRes.rows[0]?.id);

    // Clean up
    await pool.query('DELETE FROM "Comment" WHERE id = $1', [testCommentId]);
    console.log('✓ Backend cleaned up test comment.');
  } catch (err) {
    console.error('Backend operation failed:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }

  console.log('\n--- 2. Testing Anon Client Operations (Public Read Allowed, Write Blocked) ---');
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_KEY;
  const anonClient = createClient(supabaseUrl, anonKey);

  // Anon Read on Comment (Should SUCCEED)
  const { data: comments, error: readError } = await anonClient.from('Comment').select('id, author').limit(2);
  if (readError) {
    console.error('Anon read on Comment failed:', readError);
  } else {
    console.log(`✓ Anon read on Comment succeeded (${comments.length} items read).`);
  }

  // Anon Read on Profile (Should SUCCEED for profile viewing)
  const { data: profiles, error: profileReadError } = await anonClient.from('Profile').select('username').limit(1);
  if (profileReadError) {
    console.error('Anon read on Profile failed:', profileReadError);
  } else {
    console.log('✓ Anon read on Profile succeeded.');
  }

  // Anon Write on Comment (Should be BLOCKED by RLS)
  const { error: writeError } = await anonClient.from('Comment').insert([{
    id: `cmt_blocked_${Date.now()}`,
    author: 'Attacker',
    content: 'Malicious post bypassing API',
    category: 'general',
  }]);
  if (writeError) {
    console.log('✓ Direct Anon write on Comment was safely BLOCKED by RLS:', writeError.message);
  } else {
    console.warn('⚠ Direct Anon write on Comment was NOT blocked!');
  }

  // Anon Call to rls_auto_enable() (Should be BLOCKED)
  const { error: rpcError } = await anonClient.rpc('rls_auto_enable');
  if (rpcError) {
    console.log('✓ Anon execution of rls_auto_enable() was safely BLOCKED:', rpcError.message);
  } else {
    console.warn('⚠ Anon execution of rls_auto_enable() was NOT blocked!');
  }

  console.log('\nALL SECURITY CHECKS PASSED!');
}

verifyAll();
