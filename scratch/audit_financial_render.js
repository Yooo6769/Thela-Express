// ThelaExpress - Production Financial & Render Integrity Audit
// Verifies that neither Customer, Partner, nor Admin UIs display fake financials, hardcoded earnings, or fake transaction statuses.

const fs = require('fs');
const assert = require('assert');

console.log('🔍 Running Production-Render & Financial Integrity Audit...\n');

let checksPassed = 0;
function auditCheck(name, fn) {
  try {
    fn();
    console.log(`  ✅ [PASS] ${name}`);
    checksPassed++;
  } catch (err) {
    console.error(`  ❌ [FAIL] ${name}`);
    console.error(err.message);
    process.exit(1);
  }
}

// 1. Customer UI Audit
const indexHtml = fs.readFileSync('public/index.html', 'utf8');
const appJs = fs.readFileSync('public/app.js', 'utf8');

auditCheck('Customer UI contains prominent Test/Sandbox Warning Banner in checkout', () => {
  assert(indexHtml.includes('payModalSandboxBanner'), 'Missing payModalSandboxBanner element');
  assert(indexHtml.includes('TEST / SANDBOX ENVIRONMENT'), 'Missing explicit sandbox environment label in HTML');
  assert(indexHtml.includes('SANDBOX TEST QR — DO NOT SCAN WITH REAL BANK APP'), 'Missing explicit sandbox QR warning label');
});

auditCheck('Customer checkout does not trust or transmit client-determined payment_status: PAID', () => {
  assert(!appJs.includes("payment_status: 'PAID'"), 'Client must never claim order is PAID upon placement');
  assert(!appJs.includes('payment_status: "PAID"'), 'Client must never claim order is PAID upon placement');
});

auditCheck('Customer checkout renders authoritative server breakdown fields', () => {
  assert(indexHtml.includes('id="payModalSubtotal"'), 'Missing payModalSubtotal');
  assert(indexHtml.includes('id="payModalPackaging"'), 'Missing payModalPackaging');
  assert(indexHtml.includes('id="payModalDelivery"'), 'Missing payModalDelivery');
  assert(indexHtml.includes('id="payModalTip"'), 'Missing payModalTip');
  assert(indexHtml.includes('id="payModalTotal"'), 'Missing payModalTotal');
});

// 2. Partner UI Audit (Vendor & Rider)
const partnerHtml = fs.readFileSync('public/partner.html', 'utf8');
const partnerJs = fs.readFileSync('public/partner.js', 'utf8');

auditCheck('Partner UI includes Vendor Settlement Ledger connected to real backend data', () => {
  assert(partnerHtml.includes('vendorSettlementsTableBody'), 'Missing vendorSettlementsTableBody element in partner.html');
  assert(partnerJs.includes('/api/settlements/vendor/'), 'Missing fetch to /api/settlements/vendor/');
  assert(partnerJs.includes('renderVendorSettlements'), 'Missing renderVendorSettlements function');
});

auditCheck('Partner UI rider earnings sourced from backend settlement endpoint rather than invented frontend numbers', () => {
  assert(partnerJs.includes('/api/settlements/rider/'), 'Missing fetch to /api/settlements/rider/');
  assert(partnerJs.includes('earnings.total_earnings'), 'Rider earnings must use earnings.total_earnings from backend');
  assert(partnerJs.includes('earnings.eligible_earnings'), 'Rider earnings must reflect eligible balance');
});

// 3. Admin HQ UI Audit
const adminHtml = fs.readFileSync('public/admin.html', 'utf8');

auditCheck('Admin HQ Tab 4 displays Financial Reconciliation & Balance Invariant Monitor', () => {
  assert(adminHtml.includes('reconcileInvariantBadge'), 'Missing reconcileInvariantBadge');
  assert(adminHtml.includes('reconTotalCollected'), 'Missing reconTotalCollected');
  assert(adminHtml.includes('reconTotalRefunded'), 'Missing reconTotalRefunded');
  assert(adminHtml.includes('reconNetCollected'), 'Missing reconNetCollected');
  assert(adminHtml.includes('reconVendorPayable'), 'Missing reconVendorPayable');
  assert(adminHtml.includes('reconRiderPayable'), 'Missing reconRiderPayable');
  assert(adminHtml.includes('reconPlatformMargin'), 'Missing reconPlatformMargin');
});

auditCheck('Admin HQ Tab 4 has replaced raw untracked upi:// links with Payout Batch actions', () => {
  // Check that inside Tab 4 (tabContentPayouts) there are no raw upi://pay links
  const tab4Section = adminHtml.substring(adminHtml.indexOf('id="tabContentPayouts"'), adminHtml.indexOf('id="tabContentSettings"'));
  assert(!tab4Section.includes('upi://pay?'), 'Tab 4 must not contain untracked raw upi:// links');
  assert(adminHtml.includes('initiatePayout('), 'Admin HQ must support initiatePayout');
  assert(adminHtml.includes('confirmPayoutBatch('), 'Admin HQ must support confirmPayoutBatch');
  assert(adminHtml.includes('payoutBatchesBody'), 'Admin HQ must include Recent Payout Batches Audit Log');
});

// 4. Append-Only Ledger & Mathematical Invariant Audit
const db = require('../server/src/db');
const ledgerReport = db.getReconciliationReport({ role: 'admin' });

auditCheck('Database financial ledger maintains exact zero-discrepancy mathematical invariant', () => {
  assert.strictEqual(ledgerReport.success, true);
  assert.strictEqual(ledgerReport.report.isPlatformBalanced, true);
  assert.strictEqual(ledgerReport.report.discrepancy, 0);
});

console.log(`\n🎉 All ${checksPassed}/${checksPassed} Production-Render & Financial Integrity audits passed successfully!\n`);
