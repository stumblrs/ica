async function test() {
  const list = await (await fetch('http://localhost:3000/api/communities')).json();
  const id = list[0]?.id;
  if (!id) return console.log('No communities');

  const c1 = await (await fetch(`http://localhost:3000/api/communities/${id}/confirm`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ note: 'Elder confirmed' })
  })).json();
  console.log('Confirmed:', c1.success, 'Count:', c1.confirmationsCount);

  const c2 = await (await fetch(`http://localhost:3000/api/communities/${id}/challenge`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reason: 'Boundary dispute' })
  })).json();
  console.log('Challenged:', c2.success, 'Status:', c2.verificationStatus);
}
test();
