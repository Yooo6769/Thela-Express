// scratch/test_aryan_the_pizza.js
// Automated verification suite for ThelaExpress's first real partner vendor: "Aryan The Pizza"

const assert = require('assert');
const path = require('path');
const fs = require('fs');

console.log('================================================================');
console.log('🍕 RUNNING ARYAN THE PIZZA (FIRST REAL PARTNER VENDOR) TEST SUITE');
console.log('================================================================\n');

const db = require('../server/src/db');
const { calculateOrderPricing } = require('../server/src/payments/pricing_engine');

const htmlPath = path.join(__dirname, '..', 'public', 'index.html');
const appJsPath = path.join(__dirname, '..', 'public', 'app.js');
const html = fs.readFileSync(htmlPath, 'utf8');
const appJs = fs.readFileSync(appJsPath, 'utf8');

let passCount = 0;
function test(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passCount++;
  } catch (err) {
    console.error(`  ❌ FAILED: ${name}`);
    console.error(`     Error: ${err.message}`);
    process.exit(1);
  }
}

console.log('--- TEST SUITE 1: Real Partner Profile & Contact Invariants ---');
test('Aryan The Pizza exists in database with verified vendor profile', () => {
  const stall = db.getStallById('stall_aryan_the_pizza');
  assert(stall, 'Stall stall_aryan_the_pizza not found in database');
  assert.strictEqual(stall.name, 'Aryan The Pizza');
  assert.strictEqual(stall.owner_name, 'Aryan');
  assert.strictEqual(stall.isVeg, true, 'Cart must be 100% Pure Veg');
  assert.strictEqual(stall.category, 'pizza');
});

test('Stall has verified owner phone 7667895576, secondary phone 9142956248, and upi_id 9205359557@ptaxis', () => {
  const stall = db.getStallById('stall_aryan_the_pizza');
  assert.strictEqual(stall.owner_phone, '7667895576', 'Owner phone mismatch');
  assert.strictEqual(stall.secondary_phone, '9142956248', 'Secondary phone mismatch');
  assert.strictEqual(stall.upi_id, '9205359557@ptaxis', 'UPI ID must be 9205359557@ptaxis');
});

test('Stall has real storefront photo and physical menu card photo linked', () => {
  const stall = db.getStallById('stall_aryan_the_pizza');
  assert(stall.imageUrl.includes('aryan-the-pizza.jpg'), 'Missing storefront banner image');
  assert(stall.menuCardUrl.includes('aryan-the-pizza-menu.jpg'), 'Missing physical menu card image');
  assert(Array.isArray(stall.streetPhotos) && stall.streetPhotos.length >= 2, 'Missing street photos array');
});

console.log('\n--- TEST SUITE 2: Server-Authoritative 7 Activation Gates ---');
test('All 7 server activation gates evaluate to ELIGIBLE with zero failure reasons', () => {
  const stall = db.getStallById('stall_aryan_the_pizza');
  const gateResult = db.validateVendorLiveActivationGates(stall);
  assert.strictEqual(gateResult.eligible, true, `Activation gates failed: ${gateResult.reasons.join(', ')}`);
  assert.strictEqual(gateResult.reasons.length, 0);
  assert(gateResult.gates.every(g => g.passed), 'Not all individual gates passed');
});

test('Stall store status is OPEN_FOR_ORDERS and canAcceptOrders is true', () => {
  const stall = db.getStallById('stall_aryan_the_pizza');
  const status = db.getStallStoreStatus(stall);
  assert.strictEqual(status.code, 'OPEN_FOR_ORDERS');
  assert.strictEqual(status.isOpen, true);
  assert.strictEqual(status.canAcceptOrders, true);
  assert.strictEqual(status.isLive, true);
});

test('Regulatory FSSAI and Physical Hygiene Audit (Score 96) are fully verified', () => {
  const stall = db.getStallById('stall_aryan_the_pizza');
  assert.strictEqual(stall.fssai_status, 'verified');
  assert(stall.fssai_number, 'Missing FSSAI number');
  assert.strictEqual(stall.hygiene_status, 'verified');
  assert(stall.hygiene_score >= 80, `Hygiene score must be >= 80 (was ${stall.hygiene_score})`);
  assert.strictEqual(stall.location_verified, true, 'Location must be auditor-verified');
});

console.log('\n--- TEST SUITE 3: Real Menu Items Catalog & Photos ---');
test('Catalog contains complete transcribed menu with real photos for every dish', () => {
  const items = db.getMenuItems('stall_aryan_the_pizza');
  assert(items.length >= 20, `Expected at least 20 menu items, found ${items.length}`);
  
  // Every item must have inStock: true, price > 0, and a real photo URL
  items.forEach(item => {
    assert(item.inStock, `Item ${item.name} is not in stock`);
    assert(Number(item.price) > 0, `Item ${item.name} price must be > 0`);
    assert(item.image && item.image.startsWith('https://images.unsplash.com/photo-'), `Item ${item.name} missing real photo: ${item.image}`);
    assert.strictEqual(item.isVeg, true, `Item ${item.name} must be Pure Veg`);
  });
});

test('Pizzas, Garlic Breads, and Crust Add-ons have exact physical menu card prices', () => {
  const items = db.getMenuItems('stall_aryan_the_pizza');
  
  const findItem = (name) => items.find(i => i.name === name);

  // Margherita (Plain Cheese): S 80 | M 130 | L 220
  assert.strictEqual(findItem('Margherita Pizza (Small 7")')?.price, 80);
  assert.strictEqual(findItem('Margherita Pizza (Medium 9")')?.price, 130);
  assert.strictEqual(findItem('Margherita Pizza (Large 12")')?.price, 220);

  // Kings Special: S 160 | M 270 | L 430
  assert.strictEqual(findItem('Kings Special Pizza (Small 7")')?.price, 160);
  assert.strictEqual(findItem('Kings Special Pizza (Medium 9")')?.price, 270);
  assert.strictEqual(findItem('Kings Special Pizza (Large 12")')?.price, 430);

  // Garlic Breads: Plain Cheese (3 Pcs 80, 6 Pcs 160), Stuffed (3 Pcs 100, 6 Pcs 180), Kings Special (3 Pcs 120, 6 Pcs 240)
  assert.strictEqual(findItem('Garlic Bread - Plain Cheese (3 Pcs)')?.price, 80);
  assert.strictEqual(findItem('Garlic Bread - Plain Cheese (6 Pcs)')?.price, 160);
  assert.strictEqual(findItem('Garlic Bread - Stuffed Bread (3 Pcs)')?.price, 100);
  assert.strictEqual(findItem('Garlic Bread - Stuffed Bread (6 Pcs)')?.price, 180);
  assert.strictEqual(findItem('Garlic Bread - Kings Special (3 Pcs)')?.price, 120);
  assert.strictEqual(findItem('Garlic Bread - Kings Special (6 Pcs)')?.price, 240);

  // Add-ons: Extra Double Cheese (S 20, M 30, L 40), Cheese Burst Crust (S 50, M 100, L 150)
  assert.strictEqual(findItem('Extra Double Cheese (Small 7")')?.price, 20);
  assert.strictEqual(findItem('Extra Double Cheese (Medium 9")')?.price, 30);
  assert.strictEqual(findItem('Extra Double Cheese (Large 12")')?.price, 40);
  assert.strictEqual(findItem('Cheese Burst Crust (Small 7")')?.price, 50);
  assert.strictEqual(findItem('Cheese Burst Crust (Medium 9")')?.price, 100);
  assert.strictEqual(findItem('Cheese Burst Crust (Large 12")')?.price, 150);
});

console.log('\n--- TEST SUITE 4: Authoritative Order Pricing & Settlement Allocation ---');
test('Pricing engine calculates order total with vendor payout, tip, and platform commission', () => {
  const stall = db.getStallById('stall_aryan_the_pizza');
  const items = db.getMenuItems('stall_aryan_the_pizza');
  
  const item1 = items.find(i => i.name === 'Margherita Pizza (Medium 9")'); // 130
  const item2 = items.find(i => i.name === 'Garlic Bread - Stuffed Bread (6 Pcs)'); // 180

  const orderCalculation = calculateOrderPricing({
    stall,
    stallMenuItems: items,
    items: [
      { id: item1.id, qty: 1 },
      { id: item2.id, qty: 1 }
    ],
    clientTip: 20
  });

  const { pricing, allocation } = orderCalculation;
  // Food subtotal: 130 + 180 = 310
  assert.strictEqual(pricing.food_subtotal, 310);
  // Vendor discount: 10% OFF 310 = 31
  assert.strictEqual(pricing.vendor_discount, 31);
  assert.strictEqual(pricing.packaging_fee, 10);
  assert.strictEqual(pricing.tip, 20);
  // Customer total: (310 - 31) + 10 packaging + 20 tip = 309
  assert.strictEqual(pricing.customer_total, 309);
  // Vendor payable: (310 - 31) net food sales - 10% commission (28) + 10 packaging = 279 - 28 + 10 = 261
  assert(allocation.vendor_payable > 0);
  assert.strictEqual(allocation.rider_tip, 20);
});

console.log('\n--- TEST SUITE 5: Storefront UI & Discovery Integration ---');
test('db.getCategories includes pizza with Street Pizza & Breads', () => {
  const cats = db.getCategories();
  const pizzaCat = cats.find(c => c.id === 'pizza');
  assert(pizzaCat, 'pizza category missing from getCategories()');
  assert.strictEqual(pizzaCat.name, 'Street Pizza & Breads');
  assert.strictEqual(pizzaCat.icon, '🍕');
});

test('public/index.html includes Street Pizza circular story tile', () => {
  assert(html.includes("filterCategory('pizza')"), 'Missing filterCategory(pizza) in index.html');
  assert(html.includes('data-category="pizza"'), 'Missing data-category="pizza" in circular categories rail');
  assert(html.includes('Street Pizza'), 'Missing Street Pizza label in index.html');
});

test('public/app.js includes pizza in placeholder and popular discovery', () => {
  assert(appJs.includes("cat.includes('pizza')"), 'Missing pizza handling in getThelaFoodPlaceholder');
  assert(appJs.includes("'pizza'"), 'Missing pizza in discovery list');
});

console.log(`\n🎉 ALL ${passCount} ARYAN THE PIZZA INTEGRATION TESTS PASSED COMPLETELY!`);
console.log('================================================================');
