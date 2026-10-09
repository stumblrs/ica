const assert = require('assert');

const BASE_URL = 'http://localhost:3000';

async function runTest() {
  console.log('=== OPTION 4: END-TO-END CONTRIBUTION WORKFLOW VERIFICATION ===\n');

  // Step 1: Test Server-Side Spatial Boundary Resolution
  console.log('1. Testing /api/spatial/resolve-admin boundary detection...');
  const resolveRes = await fetch(`${BASE_URL}/api/spatial/resolve-admin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ longitude: 7.49, latitude: 5.53 }),
  });
  assert.strictEqual(resolveRes.status, 200, `Expected 200, got ${resolveRes.status}`);
  const resolveData = await resolveRes.json();
  console.log('   Spatial resolve result:', JSON.stringify(resolveData));
  assert.strictEqual(resolveData.success, true);
  assert.ok(resolveData.state.name.toLowerCase().includes('abia'), `Expected Abia state, got ${resolveData.state.name}`);
  console.log(`   [PASS] Successfully resolved coordinates (5.53° N, 7.49° E) to ${resolveData.lga.name}, ${resolveData.state.name}.\n`);

  // Step 2: Test Plateau State Safeguard
  console.log('2. Testing Plateau State rejection guard...');
  const plateauRes = await fetch(`${BASE_URL}/api/communities`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Erroneous Plateau Test Community',
      type: 'village',
      identityStatus: 'igbo',
      latitude: 9.9,
      longitude: 8.9, // Coordinates in Plateau State
    }),
  });
  console.log(`   Plateau submission HTTP response: ${plateauRes.status}`);
  const plateauData = await plateauRes.json();
  console.log(`   Rejection error: "${plateauData.error}"`);
  assert.strictEqual(plateauRes.status, 422, 'Expected 422 Unprocessable Entity for Plateau State coordinates');
  console.log('   [PASS] Rejection safeguard strictly blocked submission in non-Igbo state.\n');

  // Step 3: Test Legitimate Community Contribution
  console.log('3. Testing legitimate community creation with device profile & audit trail...');
  const testDeviceId = 'dev_test_e2e_contributor_888';
  const createRes = await fetch(`${BASE_URL}/api/communities`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-device-id': testDeviceId,
    },
    body: JSON.stringify({
      name: 'Umuahia North Verified Settlement Test',
      type: 'village',
      identityStatus: 'igbo',
      latitude: 5.53,
      longitude: 7.49,
      description: 'Test community contribution documenting local kindred history',
      deviceId: testDeviceId,
      evidence: {
        sourceType: 'community_submission',
        description: 'Elder council oral testimony and local lineage records',
        citationOrUrl: 'National Archives Enugu / Oral Fieldwork 2024',
      },
    }),
  });

  assert.strictEqual(createRes.status, 201, `Expected 201, got ${createRes.status}`);
  const createdComm = await createRes.json();
  console.log(`   Created community ID: ${createdComm.id}`);
  console.log(`   Name: ${createdComm.name}`);
  console.log(`   State: ${createdComm.stateName} (${createdComm.stateId})`);
  console.log(`   LGA: ${createdComm.lgaName} (${createdComm.lgaId})`);
  console.log(`   Verification Status: ${createdComm.verificationStatus}`);
  console.log(`   Lifecycle Status: ${createdComm.lifecycleStatus}`);

  assert.strictEqual(createdComm.verificationStatus, 'pending');
  assert.strictEqual(createdComm.lifecycleStatus, 'ACTIVE');
  assert.strictEqual(createdComm.evidence.length, 1);
  console.log('   [PASS] Community successfully created with initial pending status.\n');

  // Step 4: Verify Audit Trail & Device Record in Supabase
  console.log('4. Verifying CommunityAuditLog entry via /api/communities/:id...');
  const detailRes = await fetch(`${BASE_URL}/api/communities/${createdComm.id}`);
  assert.strictEqual(detailRes.status, 200);
  const detailData = await detailRes.json();

  console.log(`   Audit logs count: ${detailData.auditLogs?.length || 0}`);
  assert.ok(detailData.auditLogs && detailData.auditLogs.length > 0, 'Expected at least 1 audit log');
  const creationLog = detailData.auditLogs.find(l => l.action === 'CREATED');
  assert.ok(creationLog, 'Expected CREATED action in audit log');
  console.log(`   Action: ${creationLog.action}`);
  console.log(`   Device ID: ${creationLog.deviceId}`);
  console.log(`   Summary: "${creationLog.summary}"`);
  assert.strictEqual(creationLog.deviceId, testDeviceId);
  console.log('   [PASS] CommunityAuditLog correctly captured submission action and contributor device.\n');

  // Step 5: Test Peer Confirmations Transitioning Pending -> Verified
  console.log('5. Testing 3 peer confirmations threshold...');
  for (let i = 1; i <= 3; i++) {
    const confirmRes = await fetch(`${BASE_URL}/api/communities/${createdComm.id}`, {
      method: 'POST',
    });
    const confirmData = await confirmRes.json();
    console.log(`   Confirmation #${i}: count = ${confirmData.confirmationsCount}, status = ${confirmData.verificationStatus}`);
    if (i === 3) {
      assert.strictEqual(confirmData.verificationStatus, 'verified', 'Expected status to upgrade to verified after 3 confirmations');
    }
  }
  console.log('   [PASS] Community automatically upgraded from "pending" to "verified" after reaching 3 confirmations!\n');

  // Step 6: Cleanup Test Settlement
  console.log('6. Cleaning up test record from Supabase...');
  const deleteRes = await fetch(`${BASE_URL}/api/communities/${createdComm.id}`, {
    method: 'DELETE',
  });
  assert.strictEqual(deleteRes.status, 200);
  const deleteData = await deleteRes.json();
  console.log(`   Deleted test community: ${deleteData.deletedId}`);
  console.log('   [PASS] Database state restored cleanly.\n');

  console.log('===========================================================');
  console.log('ALL OPTION 4 VERIFICATION CHECKS PASSED PERFECTLY!');
  console.log('===========================================================');
}

runTest().catch((err) => {
  console.error('\n[FAIL] Test encountered error:', err);
  process.exit(1);
});
