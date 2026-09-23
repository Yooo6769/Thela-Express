const assert = require('assert');
const http = require('http');

const ADMIN_TOKEN = 'Bearer thela_tok_admin';

function req(options, body = null) {
  return new Promise((resolve, reject) => {
    const r = http.request(options, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });
    r.on('error', reject);
    if (body) r.write(JSON.stringify(body));
    r.end();
  });
}

async function run() {
  console.log('Testing Admin Quick Operations Endpoints...');

  // 1. Quick Add Vendor (makeLive: true)
  const addVendorRes = await req({
    hostname: 'localhost',
    port: 5000,
    path: '/api/admin/stalls',
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': ADMIN_TOKEN }
  }, {
    name: 'Test Sharma Chaat',
    owner_name: 'Rajesh Sharma',
    owner_phone: '9876543210',
    category: 'chaat',
    address: 'Indiranagar 100ft Rd',
    makeLive: true
  });

  console.log('1. Add Vendor status:', addVendorRes.status, addVendorRes.body.message);
  assert.strictEqual(addVendorRes.status, 201);
  assert.strictEqual(addVendorRes.body.stall.status, 'LIVE');
  assert.strictEqual(addVendorRes.body.stall.isOpen, true);
  const stallId = addVendorRes.body.stall.id;

  // 2. 1-Click Delete Vendor
  const delVendorRes = await req({
    hostname: 'localhost',
    port: 5000,
    path: `/api/admin/stalls/${stallId}`,
    method: 'DELETE',
    headers: { 'Authorization': ADMIN_TOKEN }
  });
  console.log('2. Delete Vendor status:', delVendorRes.status, delVendorRes.body.message);
  assert.strictEqual(delVendorRes.status, 200);

  // 3. Quick Add Rider (makeActive: true)
  const addRiderRes = await req({
    hostname: 'localhost',
    port: 5000,
    path: '/api/admin/riders',
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': ADMIN_TOKEN }
  }, {
    name: 'Test Vikram Rider',
    phone: '9876543211',
    vehicle: 'EV Scooter',
    area: 'Central Zone',
    makeActive: true
  });
  console.log('3. Add Rider status:', addRiderRes.status, addRiderRes.body.message);
  assert.strictEqual(addRiderRes.status, 201);
  assert.strictEqual(addRiderRes.body.rider.status, 'AVAILABLE');
  assert.strictEqual(addRiderRes.body.rider.is_online, true);
  const riderId = addRiderRes.body.rider.id;

  // 4. 1-Click Delete Rider
  const delRiderRes = await req({
    hostname: 'localhost',
    port: 5000,
    path: `/api/admin/riders/${riderId}`,
    method: 'DELETE',
    headers: { 'Authorization': ADMIN_TOKEN }
  });
  console.log('4. Delete Rider status:', delRiderRes.status, delRiderRes.body.message);
  assert.strictEqual(delRiderRes.status, 200);

  // 5. Test Quick Add (Pending) + Quick Approve
  const pendingVendorRes = await req({
    hostname: 'localhost',
    port: 5000,
    path: '/api/admin/stalls',
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': ADMIN_TOKEN }
  }, {
    name: 'Pending Chaat Cart',
    owner_phone: '9876543212',
    makeLive: false
  });
  assert.strictEqual(pendingVendorRes.status, 201);
  const pendingStallId = pendingVendorRes.body.stall.id;

  const approveRes = await req({
    hostname: 'localhost',
    port: 5000,
    path: `/api/admin/stalls/${pendingStallId}/quick-approve`,
    method: 'POST',
    headers: { 'Authorization': ADMIN_TOKEN }
  });
  console.log('5. Quick Approve status:', approveRes.status, approveRes.body.message);
  assert.strictEqual(approveRes.status, 200);
  assert.strictEqual(approveRes.body.stall.status, 'LIVE');

  // Clean up
  await req({
    hostname: 'localhost',
    port: 5000,
    path: `/api/admin/stalls/${pendingStallId}`,
    method: 'DELETE',
    headers: { 'Authorization': ADMIN_TOKEN }
  });

  console.log('All backend quick operations endpoints verified successfully!');
}

run().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
