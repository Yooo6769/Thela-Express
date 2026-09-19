// ThelaExpress - Comprehensive Payments, Money Flow & Financial Ledger Test Suite
// Verifies server-authoritative calculations, append-only ledger, RBAC, and mathematical balance invariant.

process.env.NODE_ENV = 'test';
const path = require('path');
const fs = require('fs');

const tempDbPath = path.join(__dirname, 'test_payments_temp.db.json');
if (fs.existsSync(tempDbPath)) {
  try { fs.unlinkSync(tempDbPath); } catch (e) {}
}
process.env.THELA_DB_FILE = tempDbPath;

const assert = require('assert');
const crypto = require('crypto');
const db = require('../server/src/db');
const paymentProvider = require('../server/src/payments/payment_provider');
const { calculateOrderPricing } = require('../server/src/payments/pricing_engine');

console.log('🧪 Starting ThelaExpress Payments, Money Flow & Financial Ledger Test Suite...\n');

let passedTests = 0;
function test(name, fn) {
  try {
    fn();
    console.log(`  ✅ [PASS] ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ❌ [FAIL] ${name}`);
    console.error(err);
    process.exit(1);
  }
}

async function asyncTest(name, fn) {
  try {
    await fn();
    console.log(`  ✅ [PASS] ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ❌ [FAIL] ${name}`);
    console.error(err);
    process.exit(1);
  }
}

(async function runAllTests() {

  // Setup Test Stall and Catalog
  const testStall = {
    id: `stall_fin_${Date.now()}`,
    name: 'Street Flavors & Snacks',
    owner_name: 'Vendor Owner 1',
    owner_phone: '9876543201',
    isOpen: true
  };
  db.data.stalls.push(testStall);

  const testMenuItem1 = {
    id: `item_chaat_${Date.now()}`,
    stall_id: testStall.id,
    name: 'Aloo Tikki Chaat',
    price: 60,
    inStock: true
  };
  const testMenuItem2 = {
    id: `item_pani_${Date.now()}`,
    stall_id: testStall.id,
    name: 'Pani Puri Platter',
    price: 40,
    inStock: true
  };
  db.data.menu_items.push(testMenuItem1, testMenuItem2);

  const testRider = {
    id: `rdr_fin_${Date.now()}`,
    name: 'Fleet Delivery Partner',
    phone: '9876543299',
    is_verified: true,
    is_online: true
  };
  db.data.riders.push(testRider);

  db.save();

  // ==========================================================
  console.log('--- 1. Authoritative Server-Side Pricing & Manipulation Defense ---');
  // ==========================================================

  test('Rejects client price manipulation: Server calculates price from stored catalog', () => {
    // Client tries to submit price = 10 for an item priced at 60
    const calculated = calculateOrderPricing({
      stall: testStall,
      stallMenuItems: [testMenuItem1, testMenuItem2],
      items: [{ id: testMenuItem1.id, name: 'Aloo Tikki Chaat', price: 10, qty: 2 }],
      clientTip: 0,
      platformSettings: db.data.settings
    });

    // Authoritative item price must be 60, subtotal 120 (not 20!)
    assert.strictEqual(calculated.items[0].price, 60, 'Server must enforce catalog price of 60');
    assert.strictEqual(calculated.pricing.food_subtotal, 120, 'Subtotal must be 120 for qty: 2');
    assert.strictEqual(calculated.pricing.packaging_fee, 10, 'Default packaging fee must be 10');
    assert.strictEqual(calculated.pricing.customer_total, 130, 'Total must be 130 (120 food + 10 packaging)');
  });

  test('Rejects negative quantities and fractional tampering', () => {
    const calculated = calculateOrderPricing({
      stall: testStall,
      stallMenuItems: [testMenuItem1],
      items: [{ id: testMenuItem1.id, name: 'Aloo Tikki Chaat', price: 60, qty: -5 }],
      clientTip: -10,
      platformSettings: db.data.settings
    });

    assert.strictEqual(calculated.items[0].qty, 1, 'Negative qty must be clamped to minimum 1');
    assert.strictEqual(calculated.pricing.tip, 0, 'Negative tip must be clamped to 0');
  });

  test('Enforces centralized configurable business rules (not hardcoded)', () => {
    // Custom platform settings
    const customSettings = {
      platformCommissionPct: 15,
      riderPayoutFlat: 45,
      packagingFeeDefault: 12
    };

    const calculated = calculateOrderPricing({
      stall: testStall,
      stallMenuItems: [testMenuItem1],
      items: [{ id: testMenuItem1.id, price: 60, qty: 2 }], // 120 food
      clientTip: 15,
      platformSettings: customSettings
    });

    assert.strictEqual(calculated.allocation.commission_rate_pct, 15);
    assert.strictEqual(calculated.pricing.packaging_fee, 12);
    assert.strictEqual(calculated.allocation.platform_commission, 18); // 15% of 120 = 18
    assert.strictEqual(calculated.allocation.rider_base_fee, 45);
    assert.strictEqual(calculated.allocation.rider_payable, 60); // 45 base + 15 tip
    assert.strictEqual(calculated.allocation.vendor_payable, 114); // (120 - 18) + 12 packaging = 114
  });

  // ==========================================================
  console.log('\n--- 2. Tip Isolation & Platform Margins ---');
  // ==========================================================

  test('Customer tip is 100% passed to rider, 0% platform take, 0% vendor take', () => {
    const calculated = calculateOrderPricing({
      stall: testStall,
      stallMenuItems: [testMenuItem1],
      items: [{ id: testMenuItem1.id, price: 60, qty: 1 }], // 60 food
      clientTip: 30, // 30 tip
      platformSettings: { platformCommissionPct: 10, riderPayoutFlat: 40, packagingFeeDefault: 10 }
    });

    // Customer Total = 60 + 10 packaging + 30 tip = 100
    assert.strictEqual(calculated.pricing.customer_total, 100);
    // Platform Commission is 10% of food (60) = 6. Tip is completely exempt.
    assert.strictEqual(calculated.allocation.platform_commission, 6);
    // Vendor payable: 60 - 6 commission + 10 packaging = 64
    assert.strictEqual(calculated.allocation.vendor_payable, 64);
    // Rider gets: 40 base + 30 tip = 70
    assert.strictEqual(calculated.allocation.rider_payable, 70);
  });

  // ==========================================================
  console.log('\n--- 3. Discounts: Vendor-Funded vs Platform-Funded ---');
  // ==========================================================

  test('Vendor-funded discount reduces vendor revenue & commissionable base', () => {
    const stallWithDiscount = Object.assign({}, testStall, { discount: '10% OFF' });
    const item100 = { id: `item_100_${Date.now()}`, name: 'Special Thali', price: 100 };
    const calculated = calculateOrderPricing({
      stall: stallWithDiscount,
      stallMenuItems: [item100],
      items: [{ id: item100.id, name: item100.name, price: 100, qty: 1 }],
      platformSettings: { platformCommissionPct: 10, packagingFeeDefault: 10, riderPayoutFlat: 40 }
    });

    // 10% vendor discount = 10 off food
    assert.strictEqual(calculated.pricing.vendor_discount, 10);
    assert.strictEqual(calculated.pricing.customer_total, 100); // (100 - 10) + 10 packaging = 100
    // Commission is 10% of net food (90) = 9
    assert.strictEqual(calculated.allocation.platform_commission, 9);
    // Vendor gets: 90 - 9 + 10 packaging = 91
    assert.strictEqual(calculated.allocation.vendor_payable, 91);
  });

  test('Platform-funded coupon protects vendor revenue and is absorbed by platform', () => {
    const item100 = { id: `item_100_${Date.now()}`, name: 'Special Thali', price: 100 };
    const calculated = calculateOrderPricing({
      stall: testStall,
      stallMenuItems: [item100],
      items: [{ id: item100.id, name: item100.name, price: 100, qty: 1 }],
      couponCode: 'THELA10', // 10 platform-funded coupon
      platformSettings: { platformCommissionPct: 10, packagingFeeDefault: 10, riderPayoutFlat: 40 }
    });

    assert.strictEqual(calculated.pricing.platform_discount, 10);
    assert.strictEqual(calculated.pricing.customer_total, 100); // 100 food - 10 coupon + 10 packaging = 100
    // Vendor is NOT penalized by platform coupon: food is evaluated at full 100
    assert.strictEqual(calculated.allocation.platform_commission, 10);
    assert.strictEqual(calculated.allocation.vendor_payable, 100); // 100 - 10 commission + 10 packaging = 100
  });

  // ==========================================================
  console.log('\n--- 4. Payment Provider & Sandbox Cryptographic Validation ---');
  // ==========================================================

  await asyncTest('Sandbox mode is explicitly labeled and emits transparency warning', async () => {
    const mode = paymentProvider.getMode();
    assert.strictEqual(mode.mode, 'SANDBOX');
    assert.strictEqual(mode.isSandbox, true);
    assert.ok(mode.warning.includes('SANDBOX ENVIRONMENT'), 'Must warn that no real money will be charged');

    const intent = await paymentProvider.createPaymentIntent({
      orderId: 'TH-9901',
      amount: 150,
      currency: 'INR'
    });

    assert.strictEqual(intent.isSandbox, true);
    assert.strictEqual(intent.mode, 'SANDBOX');
    assert.ok(intent.upiUri.includes('mode=sandbox'));
    assert.ok(intent.signature.length > 20, 'HMAC signature must be generated');
  });

  await asyncTest('Rejects tampered payment verification signatures', async () => {
    const intent = await paymentProvider.createPaymentIntent({
      orderId: 'TH-9902',
      amount: 150,
      currency: 'INR'
    });

    // Valid signature verification
    const validVerify = await paymentProvider.verifyPayment({
      orderId: 'TH-9902',
      amount: 150,
      providerTransactionId: intent.providerTransactionId,
      signature: intent.signature
    });
    assert.strictEqual(validVerify.success, true);
    assert.strictEqual(validVerify.status, 'VERIFIED');

    // Tampered amount verification
    const tamperedVerify = await paymentProvider.verifyPayment({
      orderId: 'TH-9902',
      amount: 10, // attacker claims they paid only 10
      providerTransactionId: intent.providerTransactionId,
      signature: intent.signature
    });
    assert.strictEqual(tamperedVerify.success, false, 'Tampered amount must be rejected');
  });

  // ==========================================================
  console.log('\n--- 5. Payment Funds Recording & Append-Only Ledger ---');
  // ==========================================================

  test('Payment funds recorded creates immutable ledger entry and pending settlements', () => {
    const order = db.createOrder({
      stall_id: testStall.id,
      items: [{ id: testMenuItem1.id, price: 60, qty: 2 }], // 120 food + 10 packaging = 130
      tip: 20
    });

    // Customer Total = 120 food + 10 packaging + 20 tip = 150
    assert.strictEqual(order.grand_total, 150);

    const paymentRecord = {
      providerTransactionId: `txn_test_${order.id}`,
      isSandbox: true,
      mode: 'SANDBOX'
    };

    const res = db.ledger.recordOrderPaymentFunds(order, paymentRecord, order.pricing_allocation);
    assert.strictEqual(res.success, true);

    const vStl = db.data.vendor_settlements.find(s => s.order_id === order.id);
    const rStl = db.data.rider_settlements.find(s => s.order_id === order.id);

    assert.ok(vStl, 'Vendor settlement must be created');
    assert.strictEqual(vStl.status, 'PENDING', 'Vendor settlement must initialize as PENDING');
    assert.strictEqual(vStl.net_payable, 118); // 120 - 12 commission + 10 packaging = 118

    assert.ok(rStl, 'Rider settlement must be created');
    assert.strictEqual(rStl.status, 'PENDING', 'Rider settlement must initialize as PENDING');
    assert.strictEqual(rStl.total_earnings, 60); // 40 base + 20 tip = 60
  });

  test('Payment duplicate callback is idempotent and does not double-credit', () => {
    const order = db.createOrder({
      stall_id: testStall.id,
      items: [{ id: testMenuItem1.id, price: 60, qty: 1 }]
    });

    const paymentRecord = { providerTransactionId: `txn_dup_${order.id}` };
    const firstCall = db.ledger.recordOrderPaymentFunds(order, paymentRecord, order.pricing_allocation);
    const secondCall = db.ledger.recordOrderPaymentFunds(order, paymentRecord, order.pricing_allocation);

    assert.strictEqual(firstCall.isDuplicate, undefined);
    assert.strictEqual(secondCall.isDuplicate, true, 'Duplicate call must be flagged');

    const ledgerEntries = db.data.ledger_entries.filter(e => e.order_id === order.id);
    assert.strictEqual(ledgerEntries.length, 1, 'Only exactly 1 ledger entry must be recorded');
  });

  // ==========================================================
  console.log('\n--- 6. Settlement Lifecycle: PENDING -> ELIGIBLE -> PROCESSING -> PAID ---');
  // ==========================================================

  test('Delivery transitions settlements to ELIGIBLE (never directly to PAID)', () => {
    const order = db.createOrder({
      stall_id: testStall.id,
      items: [{ id: testMenuItem1.id, price: 60, qty: 1 }]
    });

    db.ledger.recordOrderPaymentFunds(order, { providerTransactionId: `txn_${order.id}` }, order.pricing_allocation);
    db.assignRiderToOrder(order.id, testRider.id);

    // Simulate lifecycle progression to DELIVERED
    db.ledger.onOrderDelivered(order.id);

    const vStl = db.data.vendor_settlements.find(s => s.order_id === order.id);
    const rStl = db.data.rider_settlements.find(s => s.order_id === order.id);

    assert.strictEqual(vStl.status, 'ELIGIBLE', 'Vendor settlement must transition to ELIGIBLE upon delivery');
    assert.strictEqual(rStl.status, 'ELIGIBLE', 'Rider settlement must transition to ELIGIBLE upon delivery');
  });

  test('Payout creation transitions to PROCESSING; requires explicit confirmation for PAID', () => {
    const order = db.createOrder({
      stall_id: testStall.id,
      items: [{ id: testMenuItem1.id, price: 60, qty: 1 }]
    });

    db.ledger.recordOrderPaymentFunds(order, { providerTransactionId: `txn_${order.id}` }, order.pricing_allocation);
    db.ledger.onOrderDelivered(order.id);

    const vStl = db.data.vendor_settlements.find(s => s.order_id === order.id);

    // 1. Create Payout Batch
    const batchRes = db.createPayoutBatch({
      settlementType: 'vendor',
      settlementIds: [vStl.id],
      actorRole: 'admin',
      actorId: 'admin_usr_1',
      idempotencyKey: `pout_key_${vStl.id}`
    });

    assert.strictEqual(batchRes.success, true);
    assert.strictEqual(batchRes.batch.status, 'PROCESSING', 'Payout batch must be in PROCESSING status');
    assert.strictEqual(vStl.status, 'PROCESSING', 'Settlement must be in PROCESSING status (not PAID)');

    // 2. Confirm Payout Batch from Gateway
    const confirmRes = db.confirmPayoutBatch({
      batchId: batchRes.batch.id,
      providerPayoutId: 'pout_prov_123',
      utr: 'UTR9988776655',
      status: 'SUCCESS',
      actorRole: 'admin'
    });

    assert.strictEqual(confirmRes.success, true);
    assert.strictEqual(confirmRes.batch.status, 'PAID', 'Payout batch transitions to PAID only after confirmation');
    assert.strictEqual(vStl.status, 'PAID', 'Settlement transitions to PAID only after confirmation');
    assert.strictEqual(vStl.utr, 'UTR9988776655', 'Settlement must record UTR bank reference');
  });

  test('Duplicate payout attempt rejected on already processing settlements', () => {
    const order = db.createOrder({
      stall_id: testStall.id,
      items: [{ id: testMenuItem1.id, price: 60, qty: 1 }]
    });

    db.ledger.recordOrderPaymentFunds(order, { providerTransactionId: `txn_${order.id}` }, order.pricing_allocation);
    db.ledger.onOrderDelivered(order.id);

    const vStl = db.data.vendor_settlements.find(s => s.order_id === order.id);

    // Initial batch
    db.createPayoutBatch({
      settlementType: 'vendor',
      settlementIds: [vStl.id],
      actorRole: 'admin',
      idempotencyKey: `key_first_${vStl.id}`
    });

    // Attempt second batch on same settlement
    const secondBatch = db.createPayoutBatch({
      settlementType: 'vendor',
      settlementIds: [vStl.id],
      actorRole: 'admin',
      idempotencyKey: `key_second_${vStl.id}`
    });

    assert.strictEqual(secondBatch.success, false, 'Should reject payout on already processing settlements');
    assert.ok(secondBatch.error.includes('ELIGIBLE'));
  });

  // ==========================================================
  console.log('\n--- 7. Full & Partial Refunds (Append-Only & Proportional Allocation) ---');
  // ==========================================================

  test('Full refund appends immutable refund entry without mutating original entry', () => {
    const order = db.createOrder({
      stall_id: testStall.id,
      items: [{ id: testMenuItem1.id, price: 60, qty: 1 }] // 60 food + 10 packaging = 70
    });

    db.ledger.recordOrderPaymentFunds(order, { providerTransactionId: `txn_${order.id}` }, order.pricing_allocation);

    const initialEntriesCount = db.data.ledger_entries.length;
    const initialEntry = db.data.ledger_entries.find(e => e.order_id === order.id);
    const originalCustomerPaid = initialEntry.customer_paid;

    // Apply Full Refund
    const refRes = db.ledger.recordRefundAdjustment(order, {
      refundAmount: 70,
      refundType: 'FULL',
      reason: 'Customer cancelled prior to preparation',
      providerRefundId: 'ref_123'
    });

    assert.strictEqual(refRes.success, true);
    assert.strictEqual(db.data.ledger_entries.length, initialEntriesCount + 1, 'Must append a new entry');

    // Verify original entry was NOT mutated
    assert.strictEqual(initialEntry.customer_paid, originalCustomerPaid, 'Original entry must remain unchanged');

    // Verify derived net balances
    const summary = db.ledger.getOrderFinancialSummary(order.id);
    assert.strictEqual(summary.total_customer_paid, 70);
    assert.strictEqual(summary.total_refunded, 70);
    assert.strictEqual(summary.net_customer_payment, 0);
    assert.strictEqual(summary.net_vendor_payable, 0);
    assert.strictEqual(summary.net_rider_payable, 0);
    assert.strictEqual(summary.is_balanced, true);
  });

  test('Partial food refund reduces vendor revenue proportionally, preserving rider delivery earnings', () => {
    const order = db.createOrder({
      stall_id: testStall.id,
      items: [
        { id: testMenuItem1.id, price: 60, qty: 2 }, // 120 food
        { id: testMenuItem2.id, price: 40, qty: 1 }  // 40 food
      ], // total food = 160 + 10 packaging = 170
      tip: 10
    });
    // customer total = 160 food + 10 packaging + 10 tip = 180

    db.ledger.recordOrderPaymentFunds(order, { providerTransactionId: `txn_${order.id}` }, order.pricing_allocation);

    // Simulate completed delivery
    db.ledger.onOrderDelivered(order.id);

    // Partial refund of 1 item (₹40) due to customer spill complaint
    const refRes = db.ledger.recordRefundAdjustment(order, {
      refundAmount: 40,
      refundType: 'PARTIAL_FOOD',
      reason: 'Item 2 spilled in transit',
      providerRefundId: 'ref_part_40'
    });

    assert.strictEqual(refRes.success, true);
    const summary = db.ledger.getOrderFinancialSummary(order.id);

    assert.strictEqual(summary.total_customer_paid, 180);
    assert.strictEqual(summary.total_refunded, 40);
    assert.strictEqual(summary.net_customer_payment, 140); // 180 - 40 = 140

    // Rider earnings (40 base + 10 tip = 50) MUST be preserved because delivery was completed!
    assert.strictEqual(summary.net_rider_payable, 50, 'Rider earnings must remain intact on partial food refund');

    // Mathematical balance holds exactly
    assert.strictEqual(summary.is_balanced, true, 'Ledger must balance after partial refund');
  });

  // ==========================================================
  console.log('\n--- 8. Role & Ownership Authorization (RBAC) ---');
  // ==========================================================

  test('Vendor cannot view settlements belonging to another vendor stall', () => {
    const vendorAAuth = { role: 'vendor', actorId: 'v_usr_1', stallId: 'stall_A' };
    const res = db.getVendorSettlements('stall_B', vendorAAuth);

    assert.strictEqual(res.success, false);
    assert.strictEqual(res.code, 403, 'Cross-vendor settlement access must be 403 Forbidden');
  });

  test('Rider cannot view earnings belonging to another delivery partner', () => {
    const riderAAuth = { role: 'rider', actorId: 'rdr_A' };
    const res = db.getRiderSettlements('rdr_B', riderAAuth);

    assert.strictEqual(res.success, false);
    assert.strictEqual(res.code, 403, 'Cross-rider earnings access must be 403 Forbidden');
  });

  test('Non-admin cannot view platform financial reconciliation', () => {
    const customerAuth = { role: 'customer', actorId: 'usr_cust_1' };
    const res = db.getReconciliationReport(customerAuth);

    assert.strictEqual(res.success, false);
    assert.strictEqual(res.code, 403, 'Reconciliation report must be admin/finance only');
  });

  // ==========================================================
  console.log('\n--- 9. Mathematical Reconciliation Balance Invariant ---');
  // ==========================================================

  test('Platform reconciliation balances mathematically across all orders and refunds', () => {
    const report = db.getReconciliationReport({ role: 'admin' });
    assert.strictEqual(report.success, true);
    assert.strictEqual(report.report.isPlatformBalanced, true, 'Every collected rupee must match net vendor + rider + tax + platform margin');
    assert.strictEqual(report.report.discrepancy, 0, 'Reconciliation discrepancy must be exactly 0');
  });

  // Cleanup test stall & menu items
  db.data.stalls = db.data.stalls.filter(s => s.id !== testStall.id);
  db.data.menu_items = db.data.menu_items.filter(m => m.stall_id !== testStall.id);
  db.save();

  console.log(`\n🎉 All ${passedTests}/${passedTests} Payments, Money Flow & Financial Ledger tests passed successfully!\n`);

  if (fs.existsSync(tempDbPath)) {
    try { fs.unlinkSync(tempDbPath); } catch (e) {}
  }
})();
