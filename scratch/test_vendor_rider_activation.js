// Comprehensive Automated Verification Suite for Vendor & Rider Activation Pipeline
// Enforces 7 mandatory activation gates, zero admin bypass, untrusted browser GPS,
// legal state transitions, OCC, continuous revalidation, token scoping, and dispatch gating.

const fs = require('fs');
const path = require('path');
const http = require('http');

// 1. Isolate Database using temp file
const tempDbPath = path.join(__dirname, `test_activation_${Date.now()}.db.json`);
process.env.THELA_DB_FILE = tempDbPath;

// Clean temp DB template
fs.writeFileSync(tempDbPath, JSON.stringify({
  stalls: [],
  riders: [],
  orders: [],
  discounts: [],
  platformStats: {
    grossMerchandiseValue: 0,
    deliveredOrders: 0,
    platformCommission: 0,
    totalVendorPayouts: 0,
    totalRiderPayouts: 0,
    stallsCount: 0,
    activeStalls: 0,
    ridersCount: 0,
    activeRiders: 0,
    settings: {
      platformCommissionPct: 10,
      riderPayoutFlat: 40,
      platformUpi: 'thelaexpress@icici'
    }
  },
  financialLedger: [],
  vendorSettlements: [],
  riderSettlements: [],
  payoutBatches: []
}, null, 2), 'utf8');

const app = require('../server/src/app');
const db = require('../server/src/db');

let server;
let port;
let baseUrl;

function request(method, urlPath, headers = {}, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlPath, baseUrl);
    const reqOptions = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: { ...headers }
    };

    let bodyData = null;
    if (body !== null) {
      bodyData = typeof body === 'string' ? body : JSON.stringify(body);
      reqOptions.headers['Content-Type'] = 'application/json';
      reqOptions.headers['Content-Length'] = Buffer.byteLength(bodyData);
    }

    const req = http.request(reqOptions, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          const json = data ? JSON.parse(data) : {};
          resolve({ status: res.statusCode, headers: res.headers, body: json, text: data });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, body: null, text: data });
        }
      });
    });

    req.on('error', reject);
    if (bodyData) req.write(bodyData);
    req.end();
  });
}

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    throw new Error(message);
  }
  console.log(`  ✓ ${message}`);
}

async function runTests() {
  console.log('================================================================');
  console.log('🚀 RUNNING THELAEXPRESS VENDOR & RIDER ACTIVATION PIPELINE TESTS');
  console.log('================================================================\n');

  server = http.createServer(app);
  await new Promise(resolve => server.listen(0, resolve));
  port = server.address().port;
  baseUrl = `http://127.0.0.1:${port}`;
  console.log(`Server listening on port ${port} with isolated DB: ${tempDbPath}\n`);

  try {
    const adminToken = 'Bearer thela_tok_admin';

    // -------------------------------------------------------------
    // TEST 1: Vendor Registration Initial State & Customer Isolation
    // -------------------------------------------------------------
    console.log('--- TEST 1: Vendor Registration Initial State & Isolation ---');
    const vendorRegPayload = {
      name: 'Old Bazaar Chaat Corner',
      owner_name: 'Harish Kumar',
      owner_phone: '9876501234',
      category: 'chaat',
      specialty: 'Sev Puri & Pani Puri',
      address: 'Shop 12, Clock Tower Market',
      lat: 12.9716,
      lng: 77.5946,
      location_accuracy: 15,
      location_source: 'browser_applicant',
      fssai_number: '12345678901234',
      upi_id: 'harish@upi',
      isVeg: true,
      hygieneHighlights: ['Filtered Clean Water', 'Covered Glass Food Cart'],
      menu_items: [
        { name: 'Special Pani Puri (6 Pcs)', price: 40, isVeg: true, inStock: true }
      ]
    };

    const regRes = await request('POST', '/api/onboard/vendor', {}, vendorRegPayload);
    assert(regRes.status === 201, 'Vendor registration returns HTTP 201 Created');
    assert(regRes.body.success === true, 'Vendor registration response success is true');
    assert(regRes.body.stall.status === 'APPLICATION_SUBMITTED', 'Stall status strictly initialized to APPLICATION_SUBMITTED');
    assert(regRes.body.stall.isOpen === false, 'Stall isOpen strictly false upon registration');
    assert(regRes.body.stall.location_verified === false, 'Stall location_verified strictly false (applicant evidence only)');
    assert(regRes.body.stall.location_accuracy === 15, 'Location accuracy stored');
    assert(regRes.body.stall.location_source === 'browser_applicant', 'Location source tagged as untrusted applicant browser');
    assert(Boolean(regRes.body.applicant_token), 'Scoped applicant token returned');

    const stallId = regRes.body.stall.id;
    const vendorToken = `Bearer ${regRes.body.applicant_token}`;

    // Verify invisible in customer discovery
    const publicStallsRes = await request('GET', '/api/stalls');
    assert(publicStallsRes.status === 200, 'Customer stalls discovery returns HTTP 200');
    assert(!publicStallsRes.body.stalls.some(s => s.id === stallId), 'Unapproved applicant stall is invisible in customer discovery');

    // Verify orders are blocked to this stall
    const blockedOrderRes = await request('POST', '/api/orders', {}, {
      stall_id: stallId,
      items: [{ id: `${stallId}_item_1`, name: 'Special Pani Puri (6 Pcs)', price: 40, quantity: 1 }],
      delivery_address: 'Flat 101, Main Road',
      delivery_coords: { lat: 12.9750, lng: 77.5980 },
      customer_phone: '9999988888',
      customer_name: 'Customer Test',
      payment_method: 'COD'
    });
    assert(blockedOrderRes.status === 400, 'Order to unapproved stall is rejected with HTTP 400');
    assert(blockedOrderRes.body.error.includes('closed or undergoing verification') || blockedOrderRes.body.error.includes('verification'), 'Order rejection mentions verification/closed status');

    // -------------------------------------------------------------
    // TEST 2: Gate Failure Test (Zero Admin Bypass)
    // -------------------------------------------------------------
    console.log('\n--- TEST 2: Zero Admin Bypass (Mandatory 7 Gates Enforced) ---');
    // Admin attempts to bypass gates directly to LIVE
    const bypassRes = await request('POST', `/api/admin/stalls/${stallId}/transition`, { 'Authorization': adminToken }, {
      nextStatus: 'LIVE',
      expectedVersion: 1,
      reason: 'Admin trying to jump directly to LIVE'
    });
    assert(bypassRes.status === 400, 'Admin transition directly to LIVE is rejected with HTTP 400');
    assert(Array.isArray(bypassRes.body.failedGates), 'Response contains explicit failedGates array');
    assert(bypassRes.body.failedGates.length >= 3, 'Multiple mandatory gates flagged as unfulfilled');
    console.log('    Observed failed gates:', bypassRes.body.failedGates);

    // Vendor attempts to toggle open status
    const toggleOpenRes = await request('PATCH', `/api/stalls/${stallId}/toggle-open`, { 'Authorization': vendorToken }, {
      isOpen: true
    });
    assert(toggleOpenRes.status === 400, 'Vendor toggle open is rejected while unapproved');

    // -------------------------------------------------------------
    // TEST 3: Step-by-Step Verified Activation Lifecycle Journey
    // -------------------------------------------------------------
    console.log('\n--- TEST 3: Step-by-Step Verified Activation Lifecycle ---');

    // Stage 1: Transition to DOCUMENT_VERIFICATION
    const toDocVerRes = await request('POST', `/api/admin/stalls/${stallId}/transition`, { 'Authorization': adminToken }, {
      nextStatus: 'DOCUMENT_VERIFICATION',
      expectedVersion: 1,
      reason: 'Commencing regulatory document audit'
    });
    assert(toDocVerRes.status === 200, 'Transition to DOCUMENT_VERIFICATION succeeds');
    assert(toDocVerRes.body.stall.status === 'DOCUMENT_VERIFICATION', 'Stall status is DOCUMENT_VERIFICATION');

    // Admin verifies FSSAI
    const futureDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const fssaiRes = await request('PATCH', `/api/admin/stalls/${stallId}/fssai`, { 'Authorization': adminToken }, {
      fssaiNumber: '12345678901234',
      status: 'verified',
      expiryDate: futureDate,
      notes: 'Verified against national FSSAI portal'
    });
    assert(fssaiRes.status === 200, 'FSSAI verification succeeds');
    assert(fssaiRes.body.stall.fssai_status === 'verified', 'FSSAI status is verified');

    // Stage 2: Transition to PHYSICAL_INSPECTION
    const toPhysRes = await request('POST', `/api/admin/stalls/${stallId}/transition`, { 'Authorization': adminToken }, {
      nextStatus: 'PHYSICAL_INSPECTION',
      expectedVersion: 3, // OCC version
      reason: 'FSSAI valid; dispatching field auditor for physical cart inspection'
    });
    assert(toPhysRes.status === 200, 'Transition to PHYSICAL_INSPECTION succeeds');

    // Field Auditor performs physical inspection (score 92, all checklist verified)
    const hygieneRes = await request('POST', `/api/admin/stalls/${stallId}/hygiene-inspection`, { 'Authorization': adminToken }, {
      status: 'verified',
      score: 92,
      inspectedBy: 'Auditor Suresh (ID: AUD_04)',
      checklist: {
        roWater: true,
        coveredCart: true,
        foodGradePackaging: true,
        cleanOilPractice: true,
        cartSanitization: true
      },
      notes: 'Physical location verified on site. RO water test passed, covered glass cart intact.'
    });
    assert(hygieneRes.status === 200, 'Hygiene inspection recorded successfully');
    assert(hygieneRes.body.stall.hygiene_status === 'verified', 'Hygiene status marked verified');
    assert(hygieneRes.body.stall.location_verified === true, 'Physical on-site audit sets location_verified = true');

    // Stage 3: Transition to APPROVED
    const toApprovedRes = await request('POST', `/api/admin/stalls/${stallId}/transition`, { 'Authorization': adminToken }, {
      nextStatus: 'APPROVED',
      expectedVersion: 5,
      reason: 'All document and physical inspections passed'
    });
    assert(toApprovedRes.status === 200, 'Transition to APPROVED succeeds');
    assert(toApprovedRes.body.stall.status === 'APPROVED', 'Stall status is APPROVED');

    // Stage 4: Transition to LIVE (Now all 7 gates are satisfied)
    const toLiveRes = await request('POST', `/api/admin/stalls/${stallId}/transition`, { 'Authorization': adminToken }, {
      nextStatus: 'LIVE',
      expectedVersion: 6,
      reason: 'Formal market activation'
    });
    assert(toLiveRes.status === 200, 'Transition to LIVE succeeds with all 7 gates satisfied');
    assert(toLiveRes.body.stall.status === 'LIVE', 'Stall status is LIVE');
    assert(toLiveRes.body.stall.isOpen === true, 'Stall automatically marked open upon LIVE transition');

    // Verify stall now appears in customer discovery
    const livePublicStallsRes = await request('GET', '/api/stalls');
    assert(livePublicStallsRes.body.stalls.some(s => s.id === stallId), 'Approved LIVE stall now appears in customer discovery');

    // -------------------------------------------------------------
    // TEST 4: Continuous Revalidation Post-Activation
    // -------------------------------------------------------------
    console.log('\n--- TEST 4: Continuous Revalidation Post-Activation ---');
    // Invalidate FSSAI (expire it)
    const pastDate = '2023-01-01';
    const expireFssaiRes = await request('PATCH', `/api/admin/stalls/${stallId}/fssai`, { 'Authorization': adminToken }, {
      status: 'expired',
      expiryDate: pastDate,
      notes: 'Annual license lapsed'
    });
    assert(expireFssaiRes.status === 200, 'FSSAI updated to expired');
    assert(expireFssaiRes.body.stall.status === 'SUSPENDED', 'LIVE stall with expired FSSAI automatically suspended');
    assert(expireFssaiRes.body.stall.isOpen === false, 'Suspended stall store closed');

    // Orders to suspended stall must be blocked
    const orderToSuspendedRes = await request('POST', '/api/orders', {}, {
      stall_id: stallId,
      items: [{ id: `${stallId}_item_1`, name: 'Special Pani Puri (6 Pcs)', price: 40, quantity: 1 }],
      delivery_address: 'Flat 101, Main Road',
      delivery_coords: { lat: 12.9750, lng: 77.5980 },
      customer_phone: '9999988888',
      customer_name: 'Customer Test',
      payment_method: 'COD'
    });
    assert(orderToSuspendedRes.status === 400, 'Order to suspended stall is blocked');

    // -------------------------------------------------------------
    // TEST 5: Suspension Re-review Requirement (No Direct Jump to APPROVED/LIVE)
    // -------------------------------------------------------------
    console.log('\n--- TEST 5: Suspension Re-review Enforcement ---');
    const directJumpRes = await request('POST', `/api/admin/stalls/${stallId}/transition`, { 'Authorization': adminToken }, {
      nextStatus: 'APPROVED',
      expectedVersion: expireFssaiRes.body.stall.version,
      reason: 'Trying to reinstate without re-review'
    });
    assert(directJumpRes.status === 400, 'SUSPENDED stall cannot jump directly to APPROVED');
    assert(directJumpRes.body.error.includes('SUSPENDED stall must transition to DOCUMENT_VERIFICATION or PHYSICAL_INSPECTION'), 'Error explains mandatory re-review path');

    // Re-enter DOCUMENT_VERIFICATION for reinstatement
    const reReviewRes = await request('POST', `/api/admin/stalls/${stallId}/transition`, { 'Authorization': adminToken }, {
      nextStatus: 'DOCUMENT_VERIFICATION',
      expectedVersion: expireFssaiRes.body.stall.version,
      reason: 'Vendor submitted renewed license'
    });
    assert(reReviewRes.status === 200, 'SUSPENDED stall transitions back to DOCUMENT_VERIFICATION');

    // -------------------------------------------------------------
    // TEST 6: Applicant Token Scoping & RBAC
    // -------------------------------------------------------------
    console.log('\n--- TEST 6: Applicant Token Scoping & RBAC ---');
    // Vendor can check own status
    const ownStatusRes = await request('GET', `/api/onboard/vendor/status/${stallId}`, { 'Authorization': vendorToken });
    assert(ownStatusRes.status === 200, 'Vendor applicant can view own status');
    assert(ownStatusRes.body.stall.id === stallId, 'Correct stall status returned');

    // Vendor CANNOT view other vendor's status
    const otherStatusRes = await request('GET', `/api/onboard/vendor/status/stall_other_999`, { 'Authorization': vendorToken });
    assert(otherStatusRes.status === 403, 'Vendor applicant cannot view other vendor status (HTTP 403)');

    // Vendor CANNOT perform administrative transition
    const unauthorizedTransRes = await request('POST', `/api/admin/stalls/${stallId}/transition`, { 'Authorization': vendorToken }, {
      nextStatus: 'LIVE'
    });
    assert(unauthorizedTransRes.status === 403, 'Vendor token cannot invoke admin transition (HTTP 403)');

    // -------------------------------------------------------------
    // TEST 7: Rider Verification Pipeline & Dispatch Gating
    // -------------------------------------------------------------
    console.log('\n--- TEST 7: Rider Verification Pipeline & Dispatch Gating ---');
    const riderRegPayload = {
      name: 'Vikas Kumar',
      phone: '9888877777',
      vehicle: 'Electric Scooter',
      vehicle_number: 'KA-01-EQ-9090',
      upi_id: 'vikas@upi',
      area: 'Central Zone'
    };

    const riderRegRes = await request('POST', '/api/onboard/rider', {}, riderRegPayload);
    assert(riderRegRes.status === 201, 'Rider registration returns HTTP 201');
    assert(riderRegRes.body.rider.status === 'APPLICATION_SUBMITTED', 'Rider status strictly APPLICATION_SUBMITTED');
    assert(riderRegRes.body.rider.is_online === false, 'Rider is_online strictly false');
    assert(riderRegRes.body.rider.is_verified === false, 'Rider is_verified strictly false');

    const riderId = riderRegRes.body.rider.id;
    const riderToken = `Bearer ${riderRegRes.body.applicant_token}`;

    // Unapproved rider cannot go online
    const riderOnlineRes = await request('PATCH', `/api/riders/${riderId}/toggle-online`, { 'Authorization': riderToken }, {
      is_online: true
    });
    assert(riderOnlineRes.status === 400, 'Unapproved rider cannot go online (HTTP 400)');
    assert(riderOnlineRes.body.error.includes('approved'), 'Error explains approval required before going online');

    // Admin transitions rider to IDENTITY_REVIEW
    const rdrToReviewRes = await request('POST', `/api/admin/riders/${riderId}/transition`, { 'Authorization': adminToken }, {
      nextStatus: 'IDENTITY_REVIEW',
      expectedVersion: 1,
      reason: 'Reviewing driving license and vehicle registration'
    });
    assert(rdrToReviewRes.status === 200, 'Rider transitions to IDENTITY_REVIEW');

    // Admin approves rider
    const rdrApproveRes = await request('POST', `/api/admin/riders/${riderId}/transition`, { 'Authorization': adminToken }, {
      nextStatus: 'APPROVED',
      expectedVersion: 2,
      reason: 'Identity and driving documents verified'
    });
    assert(rdrApproveRes.status === 200, 'Rider transitions to APPROVED');
    assert(rdrApproveRes.body.rider.status === 'APPROVED', 'Rider status is APPROVED');

    // Approved rider can now go online
    const rdrNowOnlineRes = await request('PATCH', `/api/riders/${riderId}/toggle-online`, { 'Authorization': riderToken }, {
      is_online: true
    });
    assert(rdrNowOnlineRes.status === 200, 'Approved rider successfully toggles online');
    assert(rdrNowOnlineRes.body.rider.status === 'AVAILABLE', 'Online approved rider status becomes AVAILABLE');
    assert(rdrNowOnlineRes.body.rider.is_online === true, 'is_online is true');

    // Rider capacity check
    const capacity = db.getDeliveryCapacity();
    assert(capacity.active_riders >= 1, 'Approved online rider is counted in delivery fleet capacity');

    // -------------------------------------------------------------
    // TEST 8: Production Render & Content Audit
    // -------------------------------------------------------------
    console.log('\n--- TEST 8: Production Render & Content Audit ---');
    const vendorHtml = fs.readFileSync(path.join(__dirname, '../public/onboard-vendor.html'), 'utf8');
    assert(!vendorHtml.includes('Your street cart is now live on ThelaExpress'), 'onboard-vendor.html does NOT say cart is live immediately');
    assert(vendorHtml.includes('Application Submitted — Verification Pending'), 'onboard-vendor.html correctly shows review pending header');
    assert(vendorHtml.includes('Submit Stall Application'), 'onboard-vendor.html submit button says Submit Stall Application');

    const riderHtml = fs.readFileSync(path.join(__dirname, '../public/onboard-rider.html'), 'utf8');
    assert(!riderHtml.includes('You are now registered as a verified ThelaExpress delivery partner'), 'onboard-rider.html does NOT say verified delivery partner immediately');
    assert(riderHtml.includes('Application Submitted — Review Pending'), 'onboard-rider.html correctly shows review pending header');
    assert(riderHtml.includes('Submit Partner Application'), 'onboard-rider.html submit button says Submit Partner Application');

    console.log('\n================================================================');
    console.log('🎉 ALL 8 VENDOR & RIDER ACTIVATION TEST SUITES PASSED FLAWLESSLY!');
    console.log('================================================================\n');

  } finally {
    if (server) server.close();
    // Clean temp DB file
    if (fs.existsSync(tempDbPath)) {
      try { fs.unlinkSync(tempDbPath); } catch (e) {}
    }
  }
}

runTests().catch(err => {
  console.error('\n💥 TEST FAILED WITH ERROR:', err);
  process.exit(1);
});
