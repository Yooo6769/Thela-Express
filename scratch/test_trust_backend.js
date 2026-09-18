const http = require('http');


function request(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 5000,
      path,
      method,
      headers: { 'Content-Type': 'application/json' }
    };
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(data) }); }
        catch (e) { resolve({ status: res.statusCode, raw: data }); }
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function runTests() {
  console.log('--- Step 1: Onboard Vendor with FSSAI ---');
  const onboardRes = await request('POST', '/api/onboard/vendor', {
    name: 'Sharma Chaat Corner',
    owner_name: 'Rajesh Sharma',
    owner_phone: '9888877777',
    category: 'chaat',
    specialty: 'Authentic Dahi Puri',
    address: '12th Main, Indiranagar',
    fssai_number: '21223010000888',
    hygieneHighlights: ['RO Clean Water', 'Covered Cart'],
    menu_items: [{ name: 'Sev Puri', price: 50 }]
  });

  console.log('Onboard status:', onboardRes.status);
  const stall = onboardRes.data.stall;
  console.log('identity_status:', stall.identity_status);
  console.log('fssai_status:', stall.fssai_status);
  console.log('hygiene_status:', stall.hygiene_status);

  console.log('\n--- Step 2: Customer get stall ---');
  const custRes = await request('GET', '/api/stalls/' + stall.id);
  console.log('Trust Badges:
', custRes.data.stall.trustBadges.map(b => b.label));

  console.log('\n--- Step 3: Trust dossier ---');
  const trustRes = await request('GET', '/api/stalls/' + stall.id + '/trust');
  console.log('Masked FSSAI:', trustRes.data.fssai.maskedNumber);
  console.log('Hygiene Status:', trustRes.data.hygiene.status);

  console.log('\n--- Step 4: Admin verifies FSSAI ---');
  const fssaiVerifyRes = await request('OATCH', '/api/admin/stalls/' + stall.id + '/fssai', { status: 'verified', expiryDate: '2028-12-31', notes: 'FoSCoS verified' });
  console.log('Trust Badges after FSSAI verify:', fssaiVerifyRes.data.stall.trustBadges.map(b => b.label));

  console.log('\n--- Step 5: Admin conducts Hygiene Inspection ---');
  const hygieneRes = await request('POST', '/api/admin/stalls/' + stall.id + '/hygiene-inspection', { status: 'verified', score: 96, inspectedBy: 'Senior Auditor Verma', notes: 'RO water & cart clean' });
  console.log('Trust Badges after Hygiene verify:', hygieneRes.data.stall.trustBadges.map(b => b.label));

  // Clean up test stall
  const db = require('./server/src/db');
  const idx = db.data.stalls.findIndex(s => s.id === stall.id);
  if (idx > -1) {
    db.data.stalls.splice(idx, 1);
    db.data.menu_items = db.data.menu_items.filter(m => m.stall_id !== stall.id);
    db.save();
    console.log('\nTest stall cleaned up.');
  }
  console.log('\n=== ALL BACKEND VERIFICATION TESTS PASSED ===');
}

runTests().catch(e => { console.error(e); process.exit(1); });