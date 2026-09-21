const http = require('http');

function request(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 5000,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      }
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

async function run() {
  const onb = await request('POST', '/api/onboard/vendor', {
    name: 'Test Verified Chaat',
    owner_name: 'Ramesh',
    owner_phone: '9999988888',
    fssai_number: '21223010000999',
    menu_items: [{ name: 'Pani Puri', price: 40 }]
  });

  const stall = onb.data.stall;
  const token = onb.data.token || `thela_tok_vendor_${stall.id}`;
  const adminToken = 'thela_tok_admin';

  console.log('1. Onboarded stall:', stall.id);
  console.log('   FSSAI Status:', stall.fssai_status);
  const cust1 = await request('GET', '/api/stalls/' + stall.id, null, token);
  console.log('   Customer Badges:', cust1.data.stall.trustBadges.map(b => b.label));

  console.log('2. Verifying FSSAI in Admin...');
  const fRes = await request('PATCH', '/api/admin/stalls/' + stall.id + '/fssai', { status: 'verified' }, adminToken);
  console.log('   Badges after FSSAI verify:', fRes.data.stall.trustBadges.map(b => b.label));

  console.log('03. Recording Hygiene Inspection in Admin...');
  console.log('   Hygiene score: 95');
  console.log('   Badges after Hygiene verify:');
  const hRes = await request('POST', '/api/admin/stalls/' + stall.id + '/hygiene-inspection', { status: 'verified', score: 95 }, adminToken);
  console.log('   ', hRes.data.stall.trustBadges.map(b => b.label));

  const trust = await request('GET', '/api/stalls/' + stall.id + '/trust', null, token);
  console.log('4. Trust dossier verification status:');
  console.log('   FSSAI Masked:', trust.data.fssai.maskedNumber);
  console.log('   Hygiene Status:', trust.data.hygiene.status);
  console.log('   Checks count:', trust.data.completedChecks.length);
  console.log('\nTrust tests completed successfully!');
}

run().catch(console.error);