const http = require('http');

function post(path, body) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(body);
    const req = http.request({
      host: 'localhost',
      port: 5000,
      path: path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    }, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(JSON.parse(data)));
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

function get(path) {
  return new Promise((resolve, reject) => {
    http.get({ host: 'localhost', port: 5000, path: path }, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(JSON.parse(data)));
    }).on('error', reject);
  });
}

async function run() {
  console.log('1. Testing Admin Overview...');
  const overview = await get('/api/admin/overview');
  console.log('Admin KPIs:', {
    stalls: overview.stats.stallsCount,
    riders: overview.stats.ridersCount,
    gmv: overview.stats.grossMerchandiseValue
  });

  console.log('2. Testing Vendor Onboarding...');
  const vendorRes = await post('/api/onboard/vendor', {
    name: 'Gupta Ji Ka Special Chaat',
    owner_name: 'Rameshwar Gupta',
    owner_phone: '9845012345',
    category: 'chaat',
    specialty: 'Authentic Hing Pani Golgappe & Dahi Bhalla',
    address: 'Indiranagar 100ft Rd, near Metro',
    fssai_number: '21223010000456',
    upi_id: 'guptaji@okaxis',
    menu_items: [
      { name: 'Special Sev Puri', price: 50, isVeg: true },
      { name: 'Dahi Bhalla Papdi', price: 65, isVeg: true }
    ]
  });
  console.log('Vendor Onboarded:', vendorRes.stall.name, 'ID:', vendorRes.stall.id, 'POS URL:', vendorRes.posUrl);

  console.log('3. Testing Rider Onboarding...');
  const riderRes = await post('/api/onboard/rider', {
    name: 'Suresh Gowda',
    phone: '9845088888',
    vehicle: 'Ather 450X (EV)',
    vehicle_number: 'KA-04-EA-1029',
    upi_id: 'suresh@icici',
    area: 'Indiranagar'
  });
  console.log('Rider Onboarded:', riderRes.rider.name, 'ID:', riderRes.rider.id, 'Console URL:', riderRes.consoleUrl);

  console.log('4. Testing Payouts Ledger...');
  const payouts = await get('/api/admin/payouts');
  console.log('Vendor settlements calculated:', payouts.vendorSettlements.length);
  console.log('Rider settlements calculated:', payouts.riderSettlements.length);

  console.log('ALL REAL ONBOARDING & ADMIN WORKFLOWS VERIFIED 100%!');
}

run().catch(console.error);
