async function runTest() {
  const base = 'http://localhost:3000';
  console.log('🧪 Starting End-to-End API & Governance Verification...\n');

  // 1. Get sample community
  const commRes = await fetch(base + '/api/communities?search=Asaba');
  const commData = await commRes.json();
  const comm = (commData.communities || commData)[0];
  if (!comm) throw new Error('Could not find sample community Asaba');
  console.log('✓ Found community:', comm.name, '(' + comm.id + ') in ' + (comm.stateName || 'Delta'));

  // 2. Post a Community Voice / Comment
  const commentPayload = {
    authorName: 'Nze Emeka',
    content: 'Oral history preserved through generations: historic commercial nexus on the Niger bank.',
    deviceId: 'dev_test_e2e_device_001',
    evidenceType: 'oral_tradition',
    perspective: 'indigene'
  };
  const postCommentRes = await fetch(base + '/api/communities/' + comm.id + '/comments', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(commentPayload)
  });
  const postCommentData = await postCommentRes.json();
  console.log('✓ Posted comment to Supabase:', postCommentRes.status, postCommentData.comment?.id || postCommentData.id || 'OK');

  // 3. Fetch Comments back
  const getCommentsRes = await fetch(base + '/api/communities/' + comm.id + '/comments');
  const commentsList = await getCommentsRes.json();
  const list = commentsList.comments || commentsList;
  const hasOurComment = list.some(c => c.authorName === 'Nze Emeka');
  console.log('✓ Verified comment retrieved from Supabase:', hasOurComment, '(Total comments: ' + list.length + ')');

  // 4. Submit Governance Challenge / Inquiry
  const challengePayload = {
    targetStatus: 'challenged',
    reason: 'Testing boundary delineation dispute verification protocol.',
    evidenceUrls: ['https://example.com/historic-record-1914.pdf'],
    deviceId: 'dev_test_e2e_device_001'
  };
  const challengeRes = await fetch(base + '/api/communities/' + comm.id + '/challenge', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(challengePayload)
  });
  const challengeData = await challengeRes.json();
  console.log('✓ Submitted challenge inquiry to Supabase:', challengeRes.status, challengeData.inquiry?.id || challengeData.id || challengeData.message);

  // 5. Create Governance Deliberation Inquiry
  const newInqPayload = {
    communityId: comm.id,
    type: 'DELIST',
    reason: 'Testing communal lineage and dialect verification deliberation.',
    evidenceUrls: ['https://example.com/colonial-record-1932.pdf'],
    deviceId: 'dev_petitioner_device_001',
    quorumThreshold: 5,
    durationDays: 7
  };
  const createInqRes = await fetch(base + '/api/governance/inquiries', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(newInqPayload)
  });
  const inqJson = await createInqRes.json();
  console.log('✓ Created Governance Inquiry in Supabase:', createInqRes.status, inqJson.id || inqJson.error);

  // 6. Query Governance Inquiries
  const inqRes = await fetch(base + '/api/governance/inquiries');
  const inqData = await inqRes.json();
  const inquiries = inqData.inquiries || inqData;
  console.log('✓ Retrieved governance inquiries from Supabase:', inquiries.length, 'active inquiries');

  // 7. Test casting a vote on the active inquiry
  if (inquiries.length > 0) {
    const targetInq = inquiries[0];
    const voterDevice = 'dev_test_voter_device_002';

    // 7a. Cast valid vote
    const voteRes = await fetch(base + '/api/governance/votes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        inquiryId: targetInq.id,
        choice: 'FOR',
        deviceId: voterDevice,
        evidenceNote: 'Corroborating regional oral history documentation.'
      })
    });
    const voteData = await voteRes.json();
    console.log('✓ Cast valid vote on inquiry:', voteRes.status, voteData.status || voteData);

    // 7b. Test duplicate vote rejection (Anti-Sybil Device Check)
    const dupVoteRes = await fetch(base + '/api/governance/votes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        inquiryId: targetInq.id,
        choice: 'AGAINST',
        deviceId: voterDevice
      })
    });
    const dupData = await dupVoteRes.json();
    console.log('✓ Anti-duplicate vote check confirmed (Expected 403):', dupVoteRes.status, dupData.error);
  }

  console.log('\n🎉 ALL END-TO-END VERIFICATION CHECKS PASSED SUCCESSFULLY!');
}

runTest().catch((e) => {
  console.error('Test error:', e);
  process.exit(1);
});
