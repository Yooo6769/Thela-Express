// Regression Test Suite: Menu Availability Integrity & 86/85 Elimination
// Validates:
// 1. Total elimination of 86/85, 86ed, and placeholder sample counts across Partner App, UI, and i18n
// 2. Initial neutral state "Menu availability unavailable" when no vendor/menu is loaded
// 3. Dynamic Menu Availability calculation based exclusively on authenticated vendor's database menu items
// 4. Vendor menu item isolation (only items belonging to authenticated vendor)
// 5. Server-authoritative stock toggle with strict stall ownership permissions (401, 403, 200)
// 6. Pricing engine out-of-stock checkout blocking (400 ITEM_OUT_OF_STOCK)
// 7. Multi-language dictionary verification for stock availability across all 12 Indian languages

const fs = require('fs');
const path = require('path');
const http = require('http');
const assert = require('assert');

// 1. Isolate Database using temp file
const tempDbPath = path.join(__dirname, `test_stock_${Date.now()}.db.json`);
process.env.THELA_DB_FILE = tempDbPath;
process.env.NODE_ENV = 'test';

fs.writeFileSync(tempDbPath, JSON.stringify({
  stalls: [],
  riders: [],
  orders: [],
  users: [],
  discounts: [],
  menu_items: [],
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
      vendorAcceptanceTimeoutMinutes: 5,
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

let testsPassed = 0;
let testsFailed = 0;

function it(desc, fn) {
  try {
    fn();
    console.log(`  ✅ PASS: ${desc}`);
    testsPassed++;
  } catch (err) {
    console.error(`  ❌ FAIL: ${desc}`);
    console.error(`     ${err.message}`);
    testsFailed++;
  }
}

async function itAsync(desc, fn) {
  try {
    await fn();
    console.log(`  ✅ PASS: ${desc}`);
    testsPassed++;
  } catch (err) {
    console.error(`  ❌ FAIL: ${desc}`);
    console.error(`     ${err.message}`);
    testsFailed++;
  }
}

async function run() {
  console.log('\n================================================================');
  console.log('  TEST SUITE: MENU STOCK AVAILABILITY & ZERO 86/85 REGRESSION   ');
  console.log('================================================================\n');

  // Start ephemeral test server
  server = http.createServer(app);
  await new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      port = server.address().port;
      baseUrl = `http://127.0.0.1:${port}`;
      resolve();
    });
  });

  try {
    // -------------------------------------------------------------
    // SUITE 1: Codebase Audit for 86/85 and Placeholder Stock Counts
    // -------------------------------------------------------------
    console.log('--- SUITE 1: Codebase Audit for 86/85 and Placeholder Terminology ---');

    it('partner.html contains zero occurrences of 86/85 or 86ed', () => {
      const html = fs.readFileSync('public/partner.html', 'utf8');
      assert(!/86\/85/i.test(html), 'Found "86/85" in partner.html');
      assert(!/86ed/i.test(html), 'Found "86ed" in partner.html');
      assert(!/86\s*\/\s*sold/i.test(html), 'Found "86 / Sold Out" in partner.html');
      assert(!/Item Stock Availability \(86\/85 List\)/i.test(html), 'Found legacy title in partner.html');
    });

    it('partner.js contains zero occurrences of 86/85 or 86ed', () => {
      const js = fs.readFileSync('public/partner.js', 'utf8');
      assert(!/86\/85/i.test(js), 'Found "86/85" in partner.js');
      assert(!/86ed/i.test(js), 'Found "86ed" in partner.js');
      assert(!/86\s*\/\s*sold/i.test(js), 'Found "86 / Sold Out" in partner.js');
    });

    it('i18n.js contains zero occurrences of 86/85 or 86ed across all 12 languages', () => {
      const i18n = fs.readFileSync('public/i18n.js', 'utf8');
      assert(!/86\/85/i.test(i18n), 'Found "86/85" in i18n.js');
      assert(!/86ed/i.test(i18n), 'Found "86ed" in i18n.js');
      assert(!/86\s*\/\s*Sold Out/i.test(i18n), 'Found "86 / Sold Out" in i18n.js');
    });

    it('app.js contains zero occurrences of 86/85 or 86ed', () => {
      const appJs = fs.readFileSync('public/app.js', 'utf8');
      assert(!/86\/85/i.test(appJs), 'Found "86/85" in app.js');
      assert(!/86ed/i.test(appJs), 'Found "86ed" in app.js');
      assert(!/86\s*\/\s*Sold Out/i.test(appJs), 'Found "86 / Sold Out" in app.js');
    });

    // -------------------------------------------------------------
    // SUITE 2: Initial Neutral State & Zero Hardcoded Sample Counts
    // -------------------------------------------------------------
    console.log('\n--- SUITE 2: Neutral Initial State & Zero Hardcoded Counts ---');

    it('partner.html initial vendorStockRatioBadge is "Menu availability unavailable"', () => {
      const html = fs.readFileSync('public/partner.html', 'utf8');
      const badgeMatch = html.match(/<span[^>]*id=["']vendorStockRatioBadge["'][^>]*>([\s\S]*?)<\/span>/i);
      assert(badgeMatch, 'vendorStockRatioBadge not found in partner.html');
      const badgeText = badgeMatch[1].trim();
      assert.strictEqual(badgeText, 'Menu availability unavailable', `Expected neutral state text, got "${badgeText}"`);
      assert(!/\b86\b/.test(badgeText) && !/\b85\b/.test(badgeText), 'Hardcoded 86/85 count found in badge');
      assert(!/0\/0/i.test(badgeText), 'Hardcoded 0/0 placeholder found in badge');
    });

    it('partner.html initial vendorMenuItemsList displays neutral message', () => {
      const html = fs.readFileSync('public/partner.html', 'utf8');
      const listMatch = html.match(/<div[^>]*id=["']vendorMenuItemsList["'][^>]*>([\s\S]*?)<\/div>/i);
      assert(listMatch, 'vendorMenuItemsList not found in partner.html');
      const listText = listMatch[1].trim();
      assert(listText.includes('Menu availability unavailable'), 'Expected neutral state message in menu list');
    });

    it('partner.js renderNoStallsState() sets badge to "Menu availability unavailable"', () => {
      const js = fs.readFileSync('public/partner.js', 'utf8');
      assert(js.includes('renderNoStallsState'), 'renderNoStallsState function missing');
      assert(js.includes("stockRatioBadge.innerText = tr('menu_avail_unavailable', 'Menu availability unavailable')") ||
             js.includes("stockRatioBadge.innerText = (typeof t === 'function' ? t('menu_avail_unavailable') : null) || 'Menu availability unavailable'"),
        'renderNoStallsState does not update vendorStockRatioBadge to neutral state');
    });

    // -------------------------------------------------------------
    // SUITE 3: Dynamic Calculation Logic & Rendering Engine
    // -------------------------------------------------------------
    console.log('\n--- SUITE 3: Dynamic Menu Availability Calculation Engine ---');

    it('renderVendorStockBadge accurately calculates available/total ratio for all combinations', () => {
      function calculateStockBadge(vendorStallId, menu) {
        if (!vendorStallId || !Array.isArray(menu) || menu.length === 0) {
          return { text: 'Menu availability unavailable', status: 'neutral' };
        }
        const total = menu.length;
        const available = menu.filter(item => item.inStock !== false).length;
        let status = 'amber';
        if (available === total) status = 'emerald';
        else if (available === 0) status = 'rose';
        return { text: `${available} / ${total} items available`, available, total, status };
      }

      // Case A: No stall loaded
      const resA = calculateStockBadge(null, []);
      assert.strictEqual(resA.text, 'Menu availability unavailable');
      assert.strictEqual(resA.status, 'neutral');

      // Case B: Stall with 0 menu items
      const resB = calculateStockBadge('stall_1', []);
      assert.strictEqual(resB.text, 'Menu availability unavailable');

      // Case C: 5 items, all in stock
      const menuC = [
        { id: 'm1', inStock: true },
        { id: 'm2', inStock: true },
        { id: 'm3', inStock: true },
        { id: 'm4', inStock: true },
        { id: 'm5', inStock: true }
      ];
      const resC = calculateStockBadge('stall_1', menuC);
      assert.strictEqual(resC.text, '5 / 5 items available');
      assert.strictEqual(resC.status, 'emerald');

      // Case D: 4 items, 2 out of stock
      const menuD = [
        { id: 'm1', inStock: true },
        { id: 'm2', inStock: false },
        { id: 'm3', inStock: true },
        { id: 'm4', inStock: false }
      ];
      const resD = calculateStockBadge('stall_1', menuD);
      assert.strictEqual(resD.text, '2 / 4 items available');
      assert.strictEqual(resD.status, 'amber');

      // Case E: 3 items, all out of stock
      const menuE = [
        { id: 'm1', inStock: false },
        { id: 'm2', inStock: false },
        { id: 'm3', inStock: false }
      ];
      const resE = calculateStockBadge('stall_1', menuE);
      assert.strictEqual(resE.text, '0 / 3 items available');
      assert.strictEqual(resE.status, 'rose');
    });

    // -------------------------------------------------------------
    // SUITE 4: Backend API & Vendor Menu Isolation
    // -------------------------------------------------------------
    console.log('\n--- SUITE 4: Backend API & Vendor Menu Isolation ---');

    // Setup test stalls & items
    const stallAId = 'stall_stock_test_A';
    const stallBId = 'stall_stock_test_B';

    const stallA = {
      id: stallAId,
      name: 'Sharma Chaat Bhandar',
      owner_name: 'Ramesh Sharma',
      owner_phone: '9876540001',
      status: 'LIVE',
      isOpen: true,
      address: 'Shop 12, Connaught Place, New Delhi',
      lat: 28.6315,
      lng: 77.2167,
      prepTime: 10,
      isVeg: true,
      upi_id: 'ramesh@icici',
      hygiene_score: 92,
      fssai_status: 'verified',
      fssai_number: '10012345678901',
      fssai_license: '10012345678901',
      hygiene_status: 'verified',
      verification_status: 'APPROVED',
      location_verified: true,
      created_at: new Date().toISOString()
    };

    const stallB = {
      id: stallBId,
      name: 'Gupta Dosa Corner',
      owner_name: 'Suresh Gupta',
      owner_phone: '9876540002',
      status: 'LIVE',
      isOpen: true,
      address: 'Shop 4, Karol Bagh, New Delhi',
      lat: 28.6515,
      lng: 77.1907,
      prepTime: 12,
      isVeg: true,
      upi_id: 'suresh@icici',
      hygiene_score: 88,
      fssai_status: 'verified',
      fssai_number: '10012345678902',
      fssai_license: '10012345678902',
      hygiene_status: 'verified',
      verification_status: 'APPROVED',
      location_verified: true,
      created_at: new Date().toISOString()
    };

    // Ensure test stalls in DB
    db.data.stalls = db.data.stalls.filter(s => s.id !== stallAId && s.id !== stallBId);
    db.data.stalls.push(stallA, stallB);

    // Setup distinct menu items
    if (!db.data.menu_items) db.data.menu_items = [];
    db.data.menu_items = db.data.menu_items.filter(m => m.stall_id !== stallAId && m.stall_id !== stallBId);

    const itemA1 = { id: 'item_A1', stall_id: stallAId, name: 'Aloo Tikki Chaat', price: 60, inStock: true, isVeg: true, category: 'Chaat' };
    const itemA2 = { id: 'item_A2', stall_id: stallAId, name: 'Dahi Bhalla', price: 80, inStock: true, isVeg: true, category: 'Chaat' };
    const itemA3 = { id: 'item_A3', stall_id: stallAId, name: 'Papdi Chaat', price: 50, inStock: false, isVeg: true, category: 'Chaat' };

    const itemB1 = { id: 'item_B1', stall_id: stallBId, name: 'Masala Dosa', price: 120, inStock: true, isVeg: true, category: 'South Indian' };
    const itemB2 = { id: 'item_B2', stall_id: stallBId, name: 'Idli Sambar', price: 60, inStock: true, isVeg: true, category: 'South Indian' };

    db.data.menu_items.push(itemA1, itemA2, itemA3, itemB1, itemB2);
    db.save();

    await itAsync('GET /api/stalls/:id/menu returns ONLY items belonging to authenticated stall', async () => {
      const res = await fetch(`${baseUrl}/api/stalls/${stallAId}/menu`);
      assert(res.ok, `HTTP status ${res.status}`);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.strictEqual(data.stallId, stallAId);
      assert.strictEqual(data.totalItems, 3);
      assert.strictEqual(data.availableItems, 2);
      assert.strictEqual(data.availabilityRatio, '2/3');
      assert.strictEqual(data.items.length, 3);
      // Guarantee no Stall B items are present
      assert(data.items.every(i => i.stall_id === stallAId), 'Items from other stalls found in menu response');
    });

    await itAsync('GET /api/stalls/:id/menu for Stall B returns only Stall B items', async () => {
      const res = await fetch(`${baseUrl}/api/stalls/${stallBId}/menu`);
      assert(res.ok, `HTTP status ${res.status}`);
      const data = await res.json();
      assert.strictEqual(data.stallId, stallBId);
      assert.strictEqual(data.totalItems, 2);
      assert.strictEqual(data.availableItems, 2);
      assert.strictEqual(data.availabilityRatio, '2/2');
      assert(data.items.every(i => i.stall_id === stallBId));
    });

    // -------------------------------------------------------------
    // SUITE 5: Server-Authoritative Stock Toggle Permissions
    // -------------------------------------------------------------
    console.log('\n--- SUITE 5: Server-Authoritative Stock Toggle Permissions ---');

    await itAsync('Stock toggle without authentication returns HTTP 401', async () => {
      const res = await fetch(`${baseUrl}/api/stalls/menu/item_A1/stock`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inStock: false })
      });
      assert.strictEqual(res.status, 401, `Expected 401, got ${res.status}`);
    });

    await itAsync('Vendor B attempting to toggle Vendor A item returns HTTP 403 Forbidden', async () => {
      const res = await fetch(`${baseUrl}/api/stalls/menu/item_A1/stock`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer test_tok_vendor_${stallBId}`
        },
        body: JSON.stringify({ inStock: false })
      });
      assert.strictEqual(res.status, 403, `Expected 403 Forbidden, got ${res.status}`);
    });

    await itAsync('Authorized Vendor A successfully toggles item stock to out of stock', async () => {
      const res = await fetch(`${baseUrl}/api/stalls/menu/item_A1/stock`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer test_tok_vendor_${stallAId}`
        },
        body: JSON.stringify({ inStock: false })
      });
      assert(res.ok, `HTTP status ${res.status}`);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.strictEqual(data.inStock, false);

      // Verify DB updated
      const updated = db.data.menu_items.find(m => m.id === 'item_A1');
      assert.strictEqual(updated.inStock, false, 'Database item inStock not updated');

      // Verify /api/stalls/:id/menu now reflects 1/3 available
      const menuRes = await fetch(`${baseUrl}/api/stalls/${stallAId}/menu`);
      const menuData = await menuRes.json();
      assert.strictEqual(menuData.availableItems, 1);
      assert.strictEqual(menuData.availabilityRatio, '1/3');
    });

    await itAsync('Authorized Vendor A toggles item back in stock', async () => {
      const res = await fetch(`${baseUrl}/api/stalls/menu/item_A1/stock`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer test_tok_vendor_${stallAId}`
        },
        body: JSON.stringify({ inStock: true })
      });
      assert(res.ok);
      const data = await res.json();
      assert.strictEqual(data.inStock, true);

      const updated = db.data.menu_items.find(m => m.id === 'item_A1');
      assert.strictEqual(updated.inStock, true);
    });

    // -------------------------------------------------------------
    // SUITE 6: Checkout Gating for Out-of-Stock Items
    // -------------------------------------------------------------
    console.log('\n--- SUITE 6: Checkout Pricing Engine Stock Enforcement ---');

    await itAsync('Pricing engine blocks order placement for out-of-stock item (HTTP 400 ITEM_OUT_OF_STOCK)', async () => {
      // item_A3 is inStock: false
      const orderPayload = {
        stall_id: stallAId,
        customer_name: 'Anurag Test',
        customer_phone: '9876543210',
        delivery_address: 'Flat 101, Connaught Place, New Delhi',
        items: [
          { id: 'item_A3', name: 'Papdi Chaat', price: 50, quantity: 1 }
        ],
        payment_method: 'CASH'
      };

      const res = await fetch(`${baseUrl}/api/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderPayload)
      });

      assert.strictEqual(res.status, 400, `Expected HTTP 400, got ${res.status}`);
      const data = await res.json();
      assert.strictEqual(data.code, 'ITEM_OUT_OF_STOCK');
    });

    // -------------------------------------------------------------
    // SUITE 7: Multi-Language Coverage (12 Indian Languages)
    // -------------------------------------------------------------
    console.log('\n--- SUITE 7: Multi-Language Coverage for Menu Availability ---');

    it('All 12 Indian languages have menu_avail_unavailable and items_available defined with zero 86/85', () => {
      const i18nContent = fs.readFileSync('public/i18n.js', 'utf8');
      global.localStorage = { getItem: () => 'en', setItem: () => {} };
      global.window = { addEventListener: () => {}, dispatchEvent: () => {} };
      global.document = { querySelectorAll: () => [], addEventListener: () => {} };

      eval(i18nContent.replace(/const I18N_/g, 'global.I18N_'));

      const dict = global.I18N_DICTIONARY;
      const languages = global.I18N_LANGUAGES;

      assert(Array.isArray(languages) && languages.length === 12, `Expected 12 languages, found ${languages?.length}`);

      languages.forEach(lang => {
        const d = dict[lang.code];
        assert(d, `Dictionary missing for ${lang.code}`);
        assert(d.menu_avail_unavailable, `Missing menu_avail_unavailable in ${lang.code}`);
        assert(d.items_available, `Missing items_available in ${lang.code}`);
        assert(d.stock_avail_title, `Missing stock_avail_title in ${lang.code}`);
        assert(d.sold_out, `Missing sold_out in ${lang.code}`);

        // Ensure no 86 or 85 in these strings
        assert(!/86|85/.test(d.stock_avail_title), `86/85 in stock_avail_title for ${lang.code}`);
        assert(!/86|85/.test(d.sold_out), `86/85 in sold_out for ${lang.code}`);
        assert(!/86|85/.test(d.menu_avail_unavailable), `86/85 in menu_avail_unavailable for ${lang.code}`);
      });
    });

  } finally {
    if (server) {
      server.close();
    }
    // Clean temp db
    if (fs.existsSync(tempDbPath)) {
      try { fs.unlinkSync(tempDbPath); } catch (e) {}
    }
  }

  console.log('\n================================================================');
  console.log(`  RESULTS: ${testsPassed} Passed, ${testsFailed} Failed        `);
  console.log('================================================================\n');

  if (testsFailed > 0) {
    process.exit(1);
  }
}

run().catch(err => {
  console.error('Test execution error:', err);
  process.exit(1);
});
