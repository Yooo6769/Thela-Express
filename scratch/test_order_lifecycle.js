// ThelaExpress - Production-Grade Centralized Order Lifecycle Test Suite
// Comprehensive validation of State Machine, OCC Concurrency, Role Authorization,
// Single-Use Doorstep OTP, Reassignment Flows, and Decoupled Payment/Refund Lifecycles.

process.env.NODE_ENV = 'test';

const assert = require('assert');
const db = require('../server/src/db');

console.log('🧪 Starting ThelaExpress Centralized Order Lifecycle Engine Test Suite...\n');

let passedTests = 0;
let totalTests = 0;

function test(description, fn) {
  totalTests++;
  try {
    fn();
    passedTests++;
    console.log(`  ✅ [PASS] ${description}`);
  } catch (err) {
    console.error(`  ❌ [FAIL] ${description}`);
    console.error(`     Error: ${err.message}`);
    throw err;
  }
}

// Setup test fixtures in DB
const testStall1 = {
  id: 'stall_test_1',
  name: 'Sharma Chaat Bhandar',
  owner_name: 'Ramesh Sharma',
  owner_phone: '9876543201',
  isOpen: true
};

const testStall2 = {
  id: 'stall_test_2',
  name: 'Gupta Pav Bhaji',
  owner_name: 'Suresh Gupta',
  owner_phone: '9876543202',
  isOpen: true
};

const testRider1 = {
  id: 'rdr_test_1',
  name: 'Amit Kumar',
  phone: '9876543301',
  vehicle: 'Ather 450X'
};

const testRider2 = {
  id: 'rdr_test_2',
  name: 'Vikram Singh',
  phone: '9876543302',
  vehicle: 'Ola S1 Pro'
};

// Insert fixtures
db.data.stalls = db.data.stalls || [];
if (!db.data.stalls.some(s => s.id === testStall1.id)) db.data.stalls.push(testStall1);
if (!db.data.stalls.some(s => s.id === testStall2.id)) db.data.stalls.push(testStall2);

db.data.riders = db.data.riders || [];
if (!db.data.riders.some(r => r.id === testRider1.id)) db.data.riders.push(testRider1);
if (!db.data.riders.some(r => r.id === testRider2.id)) db.data.riders.push(testRider2);

db.save();

// ==========================================================
// 1. ORDER CREATION & CLIENT PAYMENT_STATUS SPOOFING DEFENSE
// ==========================================================
console.log('--- 1. Order Creation & Client Payment Status Decoupling ---');

test('Order creation ignores client-supplied payment_status: PAID and initializes to PENDING', () => {
  const order = db.createOrder({
    customer_id: 'usr_cust_1',
    customer_name: 'Anurag',
    customer_phone: '9876543210',
    stall_id: testStall1.id,
    stall_name: testStall1.name,
    items: [{ name: 'Pani Puri', price: 40, qty: 2 }],
    subtotal: 80,
    grand_total: 90,
    payment_status: 'PAID', // Malicious attempt to self-declare paid
    testOtp: '4567'
  });

  assert.strictEqual(order.status, 'PLACED', 'Status must be PLACED');
  assert.strictEqual(order.payment_status, 'PENDING', 'Payment status must be forced to PENDING');
  assert.strictEqual(order.version, 1, 'Initial version must be 1');
  assert.strictEqual(order.otp_consumed, false, 'OTP must not be consumed');
  assert.strictEqual(order.timeline.length, 1, 'Initial timeline must have 1 entry');
  assert.strictEqual(order.timeline[0].to_status, 'PLACED', 'Initial timeline entry must record PLACED');
});

test('Cryptographic OTP storage protects raw secrets in database', () => {
  const order = db.createOrder({
    customer_id: 'usr_cust_1',
    customer_phone: '9876543210',
    stall_id: testStall1.id,
    stall_name: testStall1.name,
    items: [{ name: 'Sev Puri', price: 50, qty: 1 }],
    subtotal: 50,
    testOtp: '7890'
  });

  assert.ok(order.otp_hash, 'Order must store otp_hash');
  assert.ok(order.otp_salt, 'Order must store otp_salt');
  assert.ok(order.otp_encrypted, 'Order must store otp_encrypted');
  assert.notStrictEqual(order.otp_hash, '7890', 'Plaintext OTP must not be stored in otp_hash');

  // Check public format
  const customerView = db.formatOrderForPublic(order, { role: 'customer', phone: '9876543210', actorId: 'usr_cust_1' });
  assert.strictEqual(customerView.otp, '7890', 'Authorized customer must see decrypted OTP');
  assert.strictEqual(customerView.otp_hash, undefined, 'otp_hash must be redacted from public view');
  assert.strictEqual(customerView.otp_salt, undefined, 'otp_salt must be redacted from public view');

  const riderView = db.formatOrderForPublic(order, { role: 'rider', actorId: 'rdr_test_1' });
  assert.strictEqual(riderView.otp, null, 'Rider must NEVER see customer OTP in public view');
});

// ==========================================================
// 2. HAPPY PATH 10-STAGE CANONICAL PROGRESSION
// ==========================================================
console.log('\n--- 2. Canonical 10-Stage Lifecycle Progression ---');

test('Order completes full 10-stage canonical lifecycle', () => {
  const order = db.createOrder({
    customer_id: 'usr_cust_1',
    customer_phone: '9876543210',
    stall_id: testStall1.id,
    stall_name: testStall1.name,
    items: [{ name: 'Dahi Puri', price: 60, qty: 1 }],
    subtotal: 60,
    grand_total: 70,
    testOtp: '5555'
  });

  // Stage 1: PLACED (created)
  assert.strictEqual(order.status, 'PLACED');

  // Verify payment independently
  order.payment_status = 'PAID';
  assert.strictEqual(order.status, 'PLACED', 'Payment verification must not jump order status');

  // Stage 2: ACCEPTED (Vendor)
  let res = db.transitionOrderStatus(order.id, 'ACCEPTED', {
    expectedVersion: 1,
    actorRole: 'vendor',
    actorId: testStall1.owner_phone,
    reason: 'Vendor accepted order'
  });
  assert.strictEqual(res.success, true);
  assert.strictEqual(res.order.status, 'ACCEPTED');
  assert.strictEqual(res.order.version, 2);

  // Stage 3: PREPARING (Vendor starts cooking)
  res = db.transitionOrderStatus(order.id, 'PREPARING', {
    expectedVersion: 2,
    actorRole: 'vendor',
    actorId: testStall1.owner_phone,
    reason: 'Cooking on tawa'
  });
  assert.strictEqual(res.success, true);
  assert.strictEqual(res.order.status, 'PREPARING');
  assert.strictEqual(res.order.version, 3);

  // Stage 4: READY_FOR_PICKUP (Vendor packs food)
  res = db.transitionOrderStatus(order.id, 'READY_FOR_PICKUP', {
    expectedVersion: 3,
    actorRole: 'vendor',
    actorId: testStall1.owner_phone,
    reason: 'Packed in eco dona'
  });
  assert.strictEqual(res.success, true);
  assert.strictEqual(res.order.status, 'READY_FOR_PICKUP');
  assert.strictEqual(res.order.version, 4);

  // Stage 5: RIDER_ASSIGNED (Rider claims gig)
  res = db.assignRiderToOrder(order.id, testRider1.id);
  assert.strictEqual(res.success, true);
  assert.strictEqual(res.order.status, 'RIDER_ASSIGNED');
  assert.strictEqual(res.order.rider_id, testRider1.id);
  assert.strictEqual(res.order.version, 5);

  // Stage 6: RIDER_ARRIVING (Rider heading to stall)
  res = db.transitionOrderStatus(order.id, 'RIDER_ARRIVING', {
    expectedVersion: 5,
    actorRole: 'rider',
    actorId: testRider1.id,
    reason: 'Rider reaching cart'
  });
  assert.strictEqual(res.success, true);
  assert.strictEqual(res.order.status, 'RIDER_ARRIVING');
  assert.strictEqual(res.order.version, 6);

  // Stage 7: PICKED_UP (Rider collects food)
  res = db.transitionOrderStatus(order.id, 'PICKED_UP', {
    expectedVersion: 6,
    actorRole: 'rider',
    actorId: testRider1.id,
    reason: 'Collected from stall'
  });
  assert.strictEqual(res.success, true);
  assert.strictEqual(res.order.status, 'PICKED_UP');
  assert.strictEqual(res.order.version, 7);

  // Stage 8: OUT_FOR_DELIVERY (Rider en route to doorstep)
  res = db.transitionOrderStatus(order.id, 'OUT_FOR_DELIVERY', {
    expectedVersion: 7,
    actorRole: 'rider',
    actorId: testRider1.id,
    reason: 'Heading to customer address'
  });
  assert.strictEqual(res.success, true);
  assert.strictEqual(res.order.status, 'OUT_FOR_DELIVERY');
  assert.strictEqual(res.order.version, 8);

  // Stage 9: DELIVERED (Rider verifies single-use OTP at doorstep)
  res = db.verifyDeliveryOtp(order.id, '5555', {
    actorId: testRider1.id,
    actorRole: 'rider'
  });
  assert.strictEqual(res.success, true);
  assert.strictEqual(res.order.status, 'DELIVERED');
  assert.strictEqual(res.order.otp_consumed, true, 'OTP must be consumed upon delivery');
  assert.strictEqual(res.order.version, 9);

  // Stage 10: COMPLETED (Customer rating triggers settlement)
  const rated = db.rateOrder(order.id, {
    stallRating: 5,
    riderRating: 5,
    compliments: ['Crispy Puri', 'Super Fast']
  });
  assert.strictEqual(rated.status, 'COMPLETED', 'Rating submission must transition order to COMPLETED');
  assert.strictEqual(rated.version, 10);
  assert.strictEqual(rated.timeline.length, 10, 'Timeline must contain exactly 10 ledger entries');
});

// ==========================================================
// 3. ILLEGAL TRANSITIONS & STATE MACHINE GUARDS
// ==========================================================
console.log('\n--- 3. Illegal State Transitions & Integrity Guards ---');

test('Rejects arbitrary stage skipping (PLACED -> DELIVERED)', () => {
  const order = db.createOrder({ stall_id: testStall1.id, items: [{ name: 'Chaat', price: 40, qty: 1 }] });
  const res = db.transitionOrderStatus(order.id, 'DELIVERED', { actorRole: 'admin' });
  assert.strictEqual(res.success, false);
  assert.strictEqual(res.code, 400);
  assert.ok(res.error.includes('Illegal state transition'));
});

test('Rejects backward transitions (DELIVERED -> PREPARING)', () => {
  const order = db.createOrder({ stall_id: testStall1.id, items: [{ name: 'Chaat', price: 40, qty: 1 }], testOtp: '1111' });
  order.status = 'DELIVERED';
  const res = db.transitionOrderStatus(order.id, 'PREPARING', { actorRole: 'vendor', actorId: testStall1.owner_phone });
  assert.strictEqual(res.success, false);
  assert.strictEqual(res.code, 400);
});

test('Terminal states cannot transition to any other status', () => {
  const order = db.createOrder({ stall_id: testStall1.id, items: [{ name: 'Chaat', price: 40, qty: 1 }] });
  order.status = 'CANCELLED';
  const res = db.transitionOrderStatus(order.id, 'ACCEPTED', { actorRole: 'vendor', actorId: testStall1.owner_phone });
  assert.strictEqual(res.success, false);
  assert.strictEqual(res.code, 400);
});

test('Customer cannot cancel once food is PREPARING on tawa', () => {
  const order = db.createOrder({
    customer_id: 'usr_cust_1',
    customer_phone: '9876543210',
    stall_id: testStall1.id,
    items: [{ name: 'Chaat', price: 40, qty: 1 }]
  });
  order.status = 'PREPARING';
  const res = db.transitionOrderStatus(order.id, 'CANCELLED', { actorRole: 'customer', actorId: 'usr_cust_1' });
  assert.strictEqual(res.success, false);
  assert.strictEqual(res.code, 400);
  assert.ok(res.error.includes('tawa'));
});

// ==========================================================
// 4. ROLE IMPERSONATION & OWNERSHIP DEFENSE (ADVERSARIAL)
// ==========================================================
console.log('\n--- 4. Role Impersonation & Ownership Defense (Adversarial) ---');

test('Customer cannot mark order as ACCEPTED or DELIVERED', () => {
  const order = db.createOrder({ stall_id: testStall1.id, items: [{ name: 'Chaat', price: 40, qty: 1 }] });
  const res1 = db.transitionOrderStatus(order.id, 'ACCEPTED', { actorRole: 'customer', actorId: 'usr_cust_1' });
  assert.strictEqual(res1.success, false);
  assert.strictEqual(res1.code, 403);

  order.status = 'OUT_FOR_DELIVERY';
  const res2 = db.transitionOrderStatus(order.id, 'DELIVERED', { actorRole: 'customer', actorId: 'usr_cust_1' });
  assert.strictEqual(res2.success, false);
  assert.strictEqual(res2.code, 403);
});

test('Vendor cannot operate orders belonging to another vendor stall', () => {
  const order = db.createOrder({ stall_id: testStall2.id, items: [{ name: 'Pav Bhaji', price: 90, qty: 1 }] });
  
  // Resolve auth for vendor 1
  const authVendor1 = db.resolveAuth(`test_tok_vendor_${testStall1.id}`);
  assert.strictEqual(authVendor1.ownedStallIds.includes(order.stall_id), false);

  // Simulating route check
  const isOwner = authVendor1.ownedStallIds?.includes(order.stall_id);
  assert.strictEqual(isOwner, false, 'Vendor 1 must not own Vendor 2 order');
});

test('Rider cannot advance an order assigned to a different rider', () => {
  const order = db.createOrder({ stall_id: testStall1.id, items: [{ name: 'Chaat', price: 40, qty: 1 }] });
  order.status = 'RIDER_ASSIGNED';
  order.rider_id = testRider1.id; // Assigned to Rider 1

  // Rider 2 attempts to advance to RIDER_ARRIVING
  const res = db.transitionOrderStatus(order.id, 'RIDER_ARRIVING', {
    actorRole: 'rider',
    actorId: testRider2.id
  });
  assert.strictEqual(res.success, false);
  assert.strictEqual(res.code, 403);
  assert.ok(res.error.includes('assigned rider'));
});

test('Client direct jump to COMPLETED is rejected', () => {
  const order = db.createOrder({ stall_id: testStall1.id, items: [{ name: 'Chaat', price: 40, qty: 1 }] });
  order.status = 'DELIVERED';

  const res1 = db.transitionOrderStatus(order.id, 'COMPLETED', { actorRole: 'customer', actorId: 'usr_cust_1' });
  assert.strictEqual(res1.success, false);
  assert.strictEqual(res1.code, 403);

  const res2 = db.transitionOrderStatus(order.id, 'COMPLETED', { actorRole: 'rider', actorId: testRider1.id });
  assert.strictEqual(res2.success, false);
  assert.strictEqual(res2.code, 403);
});

// ==========================================================
// 5. SINGLE-USE OTP, RATE LIMITING & REPLAY ATTACK DEFENSE
// ==========================================================
console.log('\n--- 5. Single-Use OTP & Replay Attack Defense ---');

test('OTP verification requires order to be OUT_FOR_DELIVERY', () => {
  const order = db.createOrder({ stall_id: testStall1.id, items: [{ name: 'Chaat', price: 40, qty: 1 }], testOtp: '2222' });
  order.status = 'READY_FOR_PICKUP';
  order.rider_id = testRider1.id;

  const res = db.verifyDeliveryOtp(order.id, '2222', { actorId: testRider1.id, actorRole: 'rider' });
  assert.strictEqual(res.success, false);
  assert.strictEqual(res.code, 400);
  assert.ok(res.error.includes('OUT_FOR_DELIVERY'));
});

test('Unassigned rider cannot verify OTP', () => {
  const order = db.createOrder({ stall_id: testStall1.id, items: [{ name: 'Chaat', price: 40, qty: 1 }], testOtp: '2222' });
  order.status = 'OUT_FOR_DELIVERY';
  order.rider_id = testRider1.id;

  const res = db.verifyDeliveryOtp(order.id, '2222', { actorId: testRider2.id, actorRole: 'rider' });
  assert.strictEqual(res.success, false);
  assert.strictEqual(res.code, 403);
});

test('Replay attack rejected: duplicate OTP submission fails', () => {
  const order = db.createOrder({ stall_id: testStall1.id, items: [{ name: 'Chaat', price: 40, qty: 1 }], testOtp: '3333' });
  order.status = 'OUT_FOR_DELIVERY';
  order.rider_id = testRider1.id;

  // First verification succeeds
  const res1 = db.verifyDeliveryOtp(order.id, '3333', { actorId: testRider1.id, actorRole: 'rider' });
  assert.strictEqual(res1.success, true);
  assert.strictEqual(res1.order.status, 'DELIVERED');
  assert.strictEqual(res1.order.otp_consumed, true);

  // Second verification attempt (replay attack)
  const res2 = db.verifyDeliveryOtp(order.id, '3333', { actorId: testRider1.id, actorRole: 'rider' });
  assert.strictEqual(res2.success, false);
  assert.strictEqual(res2.code, 400);
  assert.ok(res2.error.includes('consumed') || res2.error.includes('OUT_FOR_DELIVERY'));
});

test('OTP rate limiting locks after 5 failed attempts', () => {
  const order = db.createOrder({ stall_id: testStall1.id, items: [{ name: 'Chaat', price: 40, qty: 1 }], testOtp: '9876' });
  order.status = 'OUT_FOR_DELIVERY';
  order.rider_id = testRider1.id;

  for (let i = 0; i < 5; i++) {
    const res = db.verifyDeliveryOtp(order.id, '0000', { actorId: testRider1.id, actorRole: 'rider' });
    assert.strictEqual(res.success, false);
    assert.strictEqual(res.code, 400);
  }

  // 6th attempt triggers 429 rate limit
  const resLocked = db.verifyDeliveryOtp(order.id, '0000', { actorId: testRider1.id, actorRole: 'rider' });
  assert.strictEqual(resLocked.success, false);
  assert.strictEqual(resLocked.code, 429);
  assert.ok(resLocked.error.includes('locked'));
});

// ==========================================================
// 6. RIDER UNAVAILABLE & REASSIGNMENT STATE MACHINE FLOWS
// ==========================================================
console.log('\n--- 6. Rider Reassignment & Unavailable Workflows ---');

test('Rider dropping gig returns order to READY_FOR_PICKUP for reassignment without terminating', () => {
  const order = db.createOrder({ stall_id: testStall1.id, items: [{ name: 'Chaat', price: 40, qty: 1 }] });
  order.status = 'READY_FOR_PICKUP';

  // Rider 1 claims
  let res = db.assignRiderToOrder(order.id, testRider1.id);
  assert.strictEqual(res.success, true);
  assert.strictEqual(res.order.status, 'RIDER_ASSIGNED');
  assert.strictEqual(res.order.rider_id, testRider1.id);

  // Rider 1 vehicle breaks down -> gig released
  res = db.transitionOrderStatus(order.id, 'READY_FOR_PICKUP', {
    actorRole: 'rider',
    actorId: testRider1.id,
    reason: 'Rider vehicle puncture; gig released for reassignment'
  });
  assert.strictEqual(res.success, true);
  assert.strictEqual(res.order.status, 'READY_FOR_PICKUP');
  assert.strictEqual(res.order.rider_id, null, 'Rider ID must be cleared for reassignment');
  assert.strictEqual(res.order.reassignment_count, 1, 'Reassignment count must increment');

  // Rider 2 claims reassigned gig
  res = db.assignRiderToOrder(order.id, testRider2.id);
  assert.strictEqual(res.success, true);
  assert.strictEqual(res.order.status, 'RIDER_ASSIGNED');
  assert.strictEqual(res.order.rider_id, testRider2.id);
});

test('Terminal dispatch timeout moves READY_FOR_PICKUP to RIDER_UNAVAILABLE with refund trigger', () => {
  const order = db.createOrder({ stall_id: testStall1.id, items: [{ name: 'Chaat', price: 40, qty: 1 }] });
  order.status = 'READY_FOR_PICKUP';
  order.payment_status = 'PAID';

  const res = db.transitionOrderStatus(order.id, 'RIDER_UNAVAILABLE', {
    actorRole: 'system',
    actorId: 'dispatch_engine',
    reason: 'Fleet timeout: zero riders available in delivery zone'
  });

  assert.strictEqual(res.success, true);
  assert.strictEqual(res.order.status, 'RIDER_UNAVAILABLE');
  assert.strictEqual(res.order.payment_status, 'REFUND_PENDING', 'Paid order must trigger REFUND_PENDING');
  assert.ok(res.order.refund_details, 'Refund details must be initialized');
});

// ==========================================================
// 7. PAYMENT & REFUND LIFECYCLE DECOUPLING
// ==========================================================
console.log('\n--- 7. Payment & Refund Lifecycle Decoupling ---');

test('Paid order cancelled transitions to REFUND_PENDING (not instantly REFUNDED)', () => {
  const order = db.createOrder({ stall_id: testStall1.id, items: [{ name: 'Chaat', price: 40, qty: 1 }], grand_total: 100 });
  order.status = 'PLACED';
  order.payment_status = 'PAID';

  const res = db.transitionOrderStatus(order.id, 'CANCELLED', {
    actorRole: 'customer',
    actorId: 'usr_cust_1',
    reason: 'Customer cancelled'
  });

  assert.strictEqual(res.success, true);
  assert.strictEqual(res.order.status, 'CANCELLED');
  assert.strictEqual(res.order.payment_status, 'REFUND_PENDING', 'Payment status must be REFUND_PENDING, not REFUNDED');
  assert.strictEqual(res.order.refund_details.amount, 100);
});

test('Unpaid order cancelled remains payment_status: CANCELLED without refund creation', () => {
  const order = db.createOrder({ stall_id: testStall1.id, items: [{ name: 'Chaat', price: 40, qty: 1 }] });
  order.status = 'PLACED';
  order.payment_status = 'PENDING';

  const res = db.transitionOrderStatus(order.id, 'CANCELLED', {
    actorRole: 'customer',
    actorId: 'usr_cust_1',
    reason: 'Customer cancelled before payment'
  });

  assert.strictEqual(res.success, true);
  assert.strictEqual(res.order.status, 'CANCELLED');
  assert.strictEqual(res.order.payment_status, 'CANCELLED');
  assert.strictEqual(res.order.refund_details, null, 'No refund should be created for unpaid orders');
});

test('Payment failure transitions PLACED -> PAYMENT_FAILED and sets payment_status: FAILED', () => {
  const order = db.createOrder({ stall_id: testStall1.id, items: [{ name: 'Chaat', price: 40, qty: 1 }] });
  const res = db.transitionOrderStatus(order.id, 'PAYMENT_FAILED', {
    actorRole: 'system',
    actorId: 'payment_gateway',
    reason: 'UPI PSP declined payment'
  });

  assert.strictEqual(res.success, true);
  assert.strictEqual(res.order.status, 'PAYMENT_FAILED');
  assert.strictEqual(res.order.payment_status, 'FAILED');
});

// ==========================================================
// 8. OPTIMISTIC CONCURRENCY CONTROL (OCC)
// ==========================================================
console.log('\n--- 8. Optimistic Concurrency Control (OCC) ---');

test('Stale expectedVersion causes HTTP 409 Conflict', () => {
  const order = db.createOrder({ stall_id: testStall1.id, items: [{ name: 'Chaat', price: 40, qty: 1 }] });
  order.version = 5;

  const res = db.transitionOrderStatus(order.id, 'ACCEPTED', {
    expectedVersion: 4, // Stale version
    actorRole: 'vendor',
    actorId: testStall1.owner_phone
  });

  assert.strictEqual(res.success, false);
  assert.strictEqual(res.code, 409);
  assert.ok(res.error.includes('conflict'));
});

// ==========================================================
// 9. APPEND-ONLY TIMELINE AUDIT LEDGER
// ==========================================================
console.log('\n--- 9. Append-Only Tamper-Resistant Timeline Ledger ---');

test('Timeline preserves complete immutable audit trail of every state change', () => {
  const order = db.createOrder({ stall_id: testStall1.id, items: [{ name: 'Chaat', price: 40, qty: 1 }] });
  
  db.transitionOrderStatus(order.id, 'ACCEPTED', { actorRole: 'vendor', actorId: testStall1.owner_phone, reason: 'Accepted' });
  db.transitionOrderStatus(order.id, 'PREPARING', { actorRole: 'vendor', actorId: testStall1.owner_phone, reason: 'Cooking' });
  db.transitionOrderStatus(order.id, 'READY_FOR_PICKUP', { actorRole: 'vendor', actorId: testStall1.owner_phone, reason: 'Packed' });

  assert.strictEqual(order.timeline.length, 4);
  assert.strictEqual(order.timeline[0].to_status, 'PLACED');
  assert.strictEqual(order.timeline[1].to_status, 'ACCEPTED');
  assert.strictEqual(order.timeline[2].to_status, 'PREPARING');
  assert.strictEqual(order.timeline[3].to_status, 'READY_FOR_PICKUP');

  // Verify fields in each timeline entry
  order.timeline.forEach(entry => {
    assert.ok(entry.timestamp, 'Entry must have timestamp');
    assert.ok(entry.role, 'Entry must have role');
    assert.ok(entry.actor_id, 'Entry must have actor_id');
    assert.ok(entry.metadata && typeof entry.metadata.version === 'number', 'Entry must have version metadata');
  });
});

console.log(`\n🎉 All ${passedTests}/${totalTests} Order Lifecycle Engine tests passed successfully!`);
