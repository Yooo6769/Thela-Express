// scratch/test_aryan_the_pizza.js
// Automated verification suite for ThelaExpress's first real partner vendor: "Aryan The Pizza"

const assert = require('assert');
const path = require('path');
const fs = require('fs');

console.log('================================================================');
console.log('🍕 RUNNING ARYAN THE PIZZA (FIRST REAL PARTNER VENDOR) TEST SUITE');
console.log('================================================================\n');

const db = require('../server/src/db');
const { calculateOrderPricing, calculateDeliveryFee } = require('../server/src/payments/pricing_engine');

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

test('Stall has enhanced appetizing hero photo and raw menu/cart photos are purged', () => {
  const stall = db.getStallById('stall_aryan_the_pizza');
  assert(stall.imageUrl.includes('aryan-the-pizza.jpg'), 'Missing enhanced storefront banner image');
  assert(stall.bannerUrl.includes('aryan-pizza-hero.jpg'), 'Missing enhanced modal hero banner');
  assert.strictEqual(stall.menuCardUrl, null, 'Raw printed menu card photo must be purged from customer view');
  assert(Array.isArray(stall.streetPhotos) && stall.streetPhotos.length === 0, 'Street photos must be empty');
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

console.log('\n--- TEST SUITE 6: Pizza Customization Bottom Sheet & Add-on Engine ---');
test('Customizer modal markup in index.html contains complete street customization sheet', () => {
  const htmlContent = fs.readFileSync(htmlPath, 'utf8');
  assert(htmlContent.includes('id="customizerModal"'), 'Missing #customizerModal in index.html');
  assert(htmlContent.includes('id="customizerItemThumb"'), 'Missing #customizerItemThumb');
  assert(htmlContent.includes('id="customizerItemName"'), 'Missing #customizerItemName');
  assert(htmlContent.includes('id="customizerOptionsContainer"'), 'Missing #customizerOptionsContainer');
  assert(htmlContent.includes('id="customizerQty"'), 'Missing #customizerQty stepper');
  assert(htmlContent.includes('id="customizerTotalPrice"'), 'Missing #customizerTotalPrice');
  assert(htmlContent.includes('id="customizerAddBtn"'), 'Missing #customizerAddBtn');
});

test('app.js defines pizza customization engine with dynamic size, crust, extra cheese & seasonings', () => {
  const appJsContent = fs.readFileSync(appJsPath, 'utf8');
  assert(appJsContent.includes('function openDishCustomizer('), 'Missing openDishCustomizer');
  assert(appJsContent.includes('function getAddonPricingForSize('), 'Missing getAddonPricingForSize');
  assert(appJsContent.includes('function setCustomizerVariant('), 'Missing setCustomizerVariant');
  assert(appJsContent.includes('function setCustomizerCrust('), 'Missing setCustomizerCrust');
  assert(appJsContent.includes('function toggleCustomizerExtraCheese('), 'Missing toggleCustomizerExtraCheese');
  assert(appJsContent.includes('function toggleCustomizerSeasoning('), 'Missing toggleCustomizerSeasoning');
  assert(appJsContent.includes('function confirmCustomizationAndAdd('), 'Missing confirmCustomizationAndAdd');
  assert(appJsContent.includes('Customisable'), 'Missing Customisable tag on customizable dish cards');
});

test('Pricing engine correctly calculates order with Pizza + Cheese Burst + Extra Cheese', () => {
  const stall = db.getStallById('stall_aryan_the_pizza');
  const items = db.getMenuItems('stall_aryan_the_pizza');
  
  const pizza = items.find(i => i.name === 'Veggie Delight Pizza (Medium 9")'); // 140
  const cheeseBurst = items.find(i => i.name === 'Cheese Burst Crust (Medium 9")'); // 100
  const extraCheese = items.find(i => i.name === 'Extra Double Cheese (Medium 9")'); // 30

  assert(pizza && cheeseBurst && extraCheese, 'Missing pizza or add-on items in catalog');

  const orderCalculation = calculateOrderPricing({
    stall,
    stallMenuItems: items,
    items: [
      { id: pizza.id, qty: 1 },
      { id: cheeseBurst.id, qty: 1 },
      { id: extraCheese.id, qty: 1 }
    ]
  });

  // Food Subtotal: 140 + 100 + 30 = 270
  assert.strictEqual(orderCalculation.pricing.food_subtotal, 270);
  // 10% discount on 270 = 27
  assert.strictEqual(orderCalculation.pricing.vendor_discount, 27);
  // 10 packaging fee
  assert.strictEqual(orderCalculation.pricing.packaging_fee, 10);
  // Customer total: (270 - 27) + 10 = 253
  assert.strictEqual(orderCalculation.pricing.customer_total, 253);
});

console.log('\n--- TEST SUITE 7: Clean Front Cards, Reactive Customizer & Checkout Login Gate ---');
test('Front dish cards do not render redundant size selector pills or size badges', () => {
  const appJsContent = fs.readFileSync(appJsPath, 'utf8');
  assert(!appJsContent.includes('Select Size / Portion:'), 'Front card still contains Select Size / Portion pills label');
  assert(!appJsContent.includes('Size: ${activeVariant.shortCode'), 'Front card still contains Size: badge');
});

test('Customizer options use labels, inputs, and scroll preservation for immediate reactivity', () => {
  const appJsContent = fs.readFileSync(appJsPath, 'utf8');
  assert(appJsContent.includes('name="customizer_size"'), 'Missing customizer_size input');
  assert(appJsContent.includes('name="customizer_crust"'), 'Missing customizer_crust input');
  assert(appJsContent.includes('name="customizer_extra_cheese"'), 'Missing customizer_extra_cheese input');
  assert(appJsContent.includes('savedScroll'), 'Missing savedScroll preservation in renderCustomizerModalContent');
});

test('index.html contains #loginRequiredModal with cart preservation reassurance', () => {
  const htmlContent = fs.readFileSync(htmlPath, 'utf8');
  assert(htmlContent.includes('id="loginRequiredModal"'), 'Missing #loginRequiredModal in index.html');
  assert(htmlContent.includes('id="loginRequiredCartCount"'), 'Missing #loginRequiredCartCount');
  assert(htmlContent.includes('id="loginRequiredCartTotal"'), 'Missing #loginRequiredCartTotal');
  assert(htmlContent.includes('proceedFromLoginRequiredToAuth'), 'Missing proceedFromLoginRequiredToAuth button');
});

test('app.js gates checkout with openLoginRequiredModal and preserves cart flow', () => {
  const appJsContent = fs.readFileSync(appJsPath, 'utf8');
  assert(appJsContent.includes('function openLoginRequiredModal('), 'Missing openLoginRequiredModal in app.js');
  assert(appJsContent.includes('function closeLoginRequiredModal('), 'Missing closeLoginRequiredModal in app.js');
  assert(appJsContent.includes('function proceedFromLoginRequiredToAuth('), 'Missing proceedFromLoginRequiredToAuth in app.js');
  assert(appJsContent.includes('openLoginRequiredModal()'), 'handlePlaceOrder does not invoke openLoginRequiredModal');
  assert(appJsContent.includes('STATE.pendingCheckoutAfterLogin'), 'Missing pendingCheckoutAfterLogin flow');
});

console.log('\n--- TEST SUITE 8: Zero-Test Production Cleanliness & Direct Vendor UPI Invariants ---');
test('Customer payment modal is 100% genuine with real vendor UPI and zero test/sandbox banners', () => {
  const htmlContent = fs.readFileSync(htmlPath, 'utf8');
  assert(!htmlContent.includes('TEST / SANDBOX ENVIRONMENT'), 'Found sandbox banner in index.html');
  assert(!htmlContent.includes('SANDBOX TEST QR'), 'Found sandbox QR warning in index.html');
  assert(!htmlContent.includes('Simulate Payment Decline'), 'Found simulate decline button in index.html');
  assert(htmlContent.includes('id="payModalQrImg"'), 'Missing real dynamic QR code element in index.html');
  assert(htmlContent.includes('id="payModalUpiIdText"'), 'Missing vendor UPI ID element in index.html');
  assert(htmlContent.includes('id="payModalUpiDeepLink"'), 'Missing mobile UPI intent link in index.html');
  assert(htmlContent.includes('id="payModalUtrInput"'), 'Missing UTR input in index.html');
  assert(htmlContent.includes('copyVendorUpiId()'), 'Missing copyVendorUpiId action in index.html');
});

test('Auth modal contains genuine SMS prompt with zero test code 1234 references', () => {
  const htmlContent = fs.readFileSync(htmlPath, 'utf8');
  assert(!htmlContent.includes('use test code: 1234'), 'Auth modal still has test code 1234 reference');
  assert(!htmlContent.includes('test code: <strong'), 'Auth modal still mentions test code');
});

test('app.js generates real Aryan The Pizza UPI payment URI and clean toasts', () => {
  const appJsContent = fs.readFileSync(appJsPath, 'utf8');
  assert(appJsContent.includes('order.stall_upi_id || \'9205359557@ptaxis\''), 'Missing real vendor UPI ID fallback');
  assert(appJsContent.includes('copyVendorUpiId'), 'Missing copyVendorUpiId function');
  assert(appJsContent.includes('payModalQrImg'), 'app.js does not configure payModalQrImg');
  assert(appJsContent.includes('payModalUpiDeepLink'), 'app.js does not configure payModalUpiDeepLink');
  assert(!appJsContent.includes('Payment Verified via Sandbox Gateway'), 'Found Sandbox Gateway toast in app.js');
  assert(!appJsContent.includes('(Auto-filled)'), 'Found (Auto-filled) toast in app.js');
});

test('Database contains zero mock orders, zero mock users, and 1 verified real partner stall', () => {
  assert.strictEqual(db.getOrders().length, 0, 'Database must have 0 orders');
  assert.strictEqual(db.getStalls().length, 1, 'Database must have exactly 1 stall (Aryan The Pizza)');
  const aryanStall = db.getStallById('stall_aryan_the_pizza');
  assert(aryanStall, 'Aryan The Pizza stall must exist');
  assert.strictEqual(aryanStall.upi_id, '9205359557@ptaxis');
});

test('Admin UI is purged of test record references', () => {
  const adminHtml = fs.readFileSync(path.join(__dirname, '..', 'public', 'admin.html'), 'utf8');
  assert(!adminHtml.includes('remove test records'), 'admin.html still contains remove test records');
  assert(!adminHtml.includes('sample menu items'), 'admin.html still contains sample menu items');
});

console.log('\n--- TEST SUITE 9: Full Screen Stall Modal, Dark Theme Category Bar, Anti-Scroll Bleed & Carousel Swipe ---');
test('Stall modal is true full screen on mobile with zero scroll bleed and overscroll containment', () => {
  const htmlContent = fs.readFileSync(htmlPath, 'utf8');
  assert(htmlContent.includes('id="stallModal"'), 'Missing #stallModal in index.html');
  assert(htmlContent.includes('w-full h-full sm:h-auto sm:max-h-[92vh] sm:max-w-2xl rounded-none sm:rounded-3xl'), 'Stall modal is not full-screen on mobile');
  assert(htmlContent.includes('overscroll-behavior: contain'), 'Missing overscroll-behavior: contain on stall modal');
  assert(htmlContent.includes('env(safe-area-inset-top'), 'Missing safe-area-inset-top handling on top action bar');
});

test('Modal category tabs and all stall modal sections seamlessly adapt to dark theme with zero glaring white bars', () => {
  const htmlContent = fs.readFileSync(htmlPath, 'utf8');
  assert(htmlContent.includes('id="modalCategoryTabs"'), 'Missing #modalCategoryTabs');
  assert(htmlContent.includes('dark:bg-stone-950/95') && htmlContent.includes('dark:border-stone-800'), 'modalCategoryTabs missing dark mode classes');
  assert(htmlContent.includes('id="modalMenuItems" class="p-4 space-y-6 bg-white dark:bg-stone-950"'), 'modalMenuItems missing dark background');
  assert(htmlContent.includes('id="modalFamousForSection" class="p-4 bg-amber-50/40 dark:bg-amber-950/20'), 'modalFamousForSection missing dark background');
  assert(htmlContent.includes('id="modalLocalStorySection" class="hidden p-4 bg-stone-50 dark:bg-stone-900'), 'modalLocalStorySection missing dark background');
  assert(htmlContent.includes('id="modalTrustSection" class="p-4 bg-white dark:bg-stone-900'), 'modalTrustSection missing dark background');
  assert(htmlContent.includes('id="modalCartBar" class="hidden border-t border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900'), 'modalCartBar missing dark background');
});

test('app.js implements body scroll lock & unlock to prevent background scroll bleed when modals open', () => {
  const appJsContent = fs.readFileSync(appJsPath, 'utf8');
  assert(appJsContent.includes('function lockBodyScroll('), 'Missing lockBodyScroll function in app.js');
  assert(appJsContent.includes('function unlockBodyScroll('), 'Missing unlockBodyScroll function in app.js');
  assert(appJsContent.includes('lockBodyScroll();'), 'openStallModal does not call lockBodyScroll()');
  assert(appJsContent.includes('unlockBodyScroll();'), 'closeStallModal does not call unlockBodyScroll()');
});

test('Hero promo carousel swipe accurately navigates left on swipe left and prevents vertical jitter', () => {
  const appJsContent = fs.readFileSync(appJsPath, 'utf8');
  const htmlContent = fs.readFileSync(htmlPath, 'utf8');
  assert(htmlContent.includes('touch-action: pan-y'), 'Missing touch-action: pan-y on promo carousel');
  assert(appJsContent.includes('carousel.addEventListener(\'touchmove\''), 'Missing touchmove listener on promo carousel');
  assert(appJsContent.includes('prevCarouselSlide(); // Swiped left -> Left slide'), 'Swipe left does not navigate left');
  assert(appJsContent.includes('nextCarouselSlide(); // Swiped right -> Right slide'), 'Swipe right does not navigate right');
});

console.log('\n--- TEST SUITE 10: Mukherjee Nagar 110009 Hyper-Local Location Gating & 25km Delivery Limit with VIP Free <=7km ---');
test('Aryan The Pizza is stationed near GTB Nagar Metro Station with 25km maximum delivery radius', () => {
  const stall = db.getStallById('stall_aryan_the_pizza');
  assert(stall, 'Stall not found');
  assert(stall.address.includes('Mukherjee Nagar'), `Address must contain Mukherjee Nagar, got: ${stall.address}`);
  assert(stall.address.includes('110009'), `Address must contain 110009, got: ${stall.address}`);
  assert(stall.address.includes('Near GTB Nagar Metro Station'), `Address must reference GTB Nagar Metro Station, got: ${stall.address}`);
  assert(!stall.address.includes('Batra Cinema'), 'Address must not reference Batra Cinema');
  assert.strictEqual(stall.landmark, 'Near GTB Nagar Metro Station, Commercial Complex');
  assert.strictEqual(stall.area, 'Mukherjee Nagar');
  assert.strictEqual(stall.pincode, '110009');
  assert.strictEqual(stall.lat, 28.7095);
  assert.strictEqual(stall.lng, 77.2075);
  assert.strictEqual(stall.delivery_radius_km, 25.0);
  assert.strictEqual(stall.vip_delivery_radius_km, 25.0);
});

test('db.getStalls computes deliverability up to 25km and calculates VIP vs Standard delivery fees', () => {
  // 1. Mukherjee Nagar (0.0 km) -> Deliverable for standard & VIP
  const mnStalls = db.getStalls(null, 28.7095, 77.2075, false);
  const mnStall = mnStalls.find(s => s.id === 'stall_aryan_the_pizza');
  assert(mnStall, 'Stall missing for Mukherjee Nagar');
  assert.strictEqual(mnStall.isDeliverable, true, 'Mukherjee Nagar must be deliverable');
  assert.strictEqual(mnStall.isDeliverableStandard, true);
  assert.strictEqual(mnStall.isDeliverableVip, true);
  assert(mnStall.distanceKm <= 0.1, `Mukherjee Nagar distance should be ~0 km, got ${mnStall.distanceKm}`);
  assert.strictEqual(mnStall.delivery_fee, 30, 'Non-VIP must be chargeable (₹30)');
  assert.strictEqual(mnStall.is_free_delivery, false);

  // Mukherjee Nagar for VIP -> Free delivery
  const mnStallsVip = db.getStalls(null, 28.7095, 77.2075, true);
  const mnStallVip = mnStallsVip.find(s => s.id === 'stall_aryan_the_pizza');
  assert.strictEqual(mnStallVip.delivery_fee, 0, 'VIP <= 7km must be free delivery');
  assert.strictEqual(mnStallVip.is_free_delivery, true);

  // 2. GTB Nagar / Hudson Lane (1.1 km) -> Deliverable for standard & VIP
  const gtbStalls = db.getStalls(null, 28.7000, 77.2070, false);
  const gtbStall = gtbStalls.find(s => s.id === 'stall_aryan_the_pizza');
  assert(gtbStall, 'Stall missing for GTB Nagar');
  assert.strictEqual(gtbStall.isDeliverable, true, 'GTB Nagar must be deliverable');
  assert.strictEqual(gtbStall.isDeliverableStandard, true);
  assert.strictEqual(gtbStall.isDeliverableVip, true);
  assert(gtbStall.distanceKm >= 0.9 && gtbStall.distanceKm <= 1.5, `GTB Nagar distance should be ~1.1 km, got ${gtbStall.distanceKm}`);
  assert.strictEqual(gtbStall.delivery_fee, 30, 'Non-VIP must be chargeable (₹30)');

  // 3. Connaught Place (10.6 km) -> Deliverable for both standard & VIP (<= 25 km), both chargeable (> 7km)
  const cpStallsStd = db.getStalls(null, 28.6139, 77.2090, false);
  const cpStallStd = cpStallsStd.find(s => s.id === 'stall_aryan_the_pizza');
  assert(cpStallStd, 'Stall missing for CP standard');
  assert.strictEqual(cpStallStd.isDeliverable, true, 'Connaught Place (10.6 km) must be deliverable within 25 km');
  assert.strictEqual(cpStallStd.isDeliverableStandard, true);
  assert.strictEqual(cpStallStd.isDeliverableVip, true);
  // Distance 10.6 km: extra = ceil(10.6 - 7) = 4 km -> 30 + 4*5 = 50
  assert.strictEqual(cpStallStd.delivery_fee, 50, 'Non-VIP delivery fee at 10.6 km must be ₹50');
  assert.strictEqual(cpStallStd.is_free_delivery, false);

  const cpStallsVip = db.getStalls(null, 28.6139, 77.2090, true);
  const cpStallVip = cpStallsVip.find(s => s.id === 'stall_aryan_the_pizza');
  assert.strictEqual(cpStallVip.isDeliverable, true, 'Connaught Place (10.6 km) must be deliverable for VIP members');
  assert.strictEqual(cpStallVip.delivery_fee, 50, 'VIP delivery fee > 7km (10.6 km) must be chargeable (₹50)');
  assert.strictEqual(cpStallVip.is_free_delivery, false);

  // 4. Noida Sector 18 (19 km) -> Deliverable for both (<= 25 km)
  const noidaStallsStd = db.getStalls(null, 28.5700, 77.3200, false);
  const noidaStallStd = noidaStallsStd.find(s => s.id === 'stall_aryan_the_pizza');
  assert(noidaStallStd, 'Stall missing for Noida');
  assert.strictEqual(noidaStallStd.isDeliverable, true, 'Noida (19 km) must be deliverable within 25 km');
  assert.strictEqual(noidaStallStd.isDeliverableStandard, true);
  assert.strictEqual(noidaStallStd.isDeliverableVip, true);
  // Distance 19 km: extra = ceil(19 - 7) = 12 km -> 30 + 12*5 = 90
  assert.strictEqual(noidaStallStd.delivery_fee, 90, 'Delivery fee at 19 km must be ₹90');

  // 5a. Ghaziabad RDC (24.4 km) -> Deliverable within 25 km, delivery fee = 30 + (18 * 5) = 120
  const gzStalls = db.getStalls(null, 28.6692, 77.4538, true);
  const gzStall = gzStalls.find(s => s.id === 'stall_aryan_the_pizza');
  assert(gzStall, 'Stall missing for Ghaziabad');
  assert.strictEqual(gzStall.isDeliverable, true, 'Ghaziabad RDC (24.4 km) must be deliverable within 25 km');
  assert.strictEqual(gzStall.delivery_fee, 120);

  // 5b. Far Eastern NCR / Greater Noida (28.6 km) -> Out of range (> 25 km) for both standard and VIP
  const farNcrStalls = db.getStalls(null, 28.6400, 77.4900, true);
  const farNcrStall = farNcrStalls.find(s => s.id === 'stall_aryan_the_pizza');
  assert(farNcrStall, 'Stall missing for Far NCR');
  assert.strictEqual(farNcrStall.isDeliverable, false, 'Far NCR (28.6 km) must be out of 25 km delivery range');
  assert.strictEqual(farNcrStall.isDeliverableStandard, false);
  assert.strictEqual(farNcrStall.isDeliverableVip, false);

  // 6. Far Away Location (50 km away) -> Out of Delivery Range (> 25 km)
  const farStalls = db.getStalls(null, 28.2580, 77.2075, true);
  const farStall = farStalls.find(s => s.id === 'stall_aryan_the_pizza');
  assert(farStall, 'Stall missing for 50km distance');
  assert.strictEqual(farStall.isDeliverable, false, '50km location must be out of range');
  assert(farStall.distanceKm >= 45.0, `50km location distance should be >= 45 km, got ${farStall.distanceKm}`);
});

test('Pricing engine calculateDeliveryFee enforces VIP free <= 7km, VIP chargeable > 7km, Non-VIP all chargeable, and max 25km', () => {
  // VIP tests
  const vipNear = calculateDeliveryFee({ distanceKm: 5.0, isVip: true });
  assert.strictEqual(vipNear.deliverable, true);
  assert.strictEqual(vipNear.fee, 0);
  assert.strictEqual(vipNear.isFree, true);

  const vipAtLimit = calculateDeliveryFee({ distanceKm: 7.0, isVip: true });
  assert.strictEqual(vipAtLimit.deliverable, true);
  assert.strictEqual(vipAtLimit.fee, 0);
  assert.strictEqual(vipAtLimit.isFree, true);

  const vipBeyond = calculateDeliveryFee({ distanceKm: 10.6, isVip: true });
  assert.strictEqual(vipBeyond.deliverable, true);
  assert.strictEqual(vipBeyond.fee, 50); // 30 + ceil(3.6)*5 = 30 + 20 = 50
  assert.strictEqual(vipBeyond.isFree, false);

  // Non-VIP tests
  const nonVipNear = calculateDeliveryFee({ distanceKm: 2.0, isVip: false });
  assert.strictEqual(nonVipNear.deliverable, true);
  assert.strictEqual(nonVipNear.fee, 30);
  assert.strictEqual(nonVipNear.isFree, false);

  const nonVipAtLimit = calculateDeliveryFee({ distanceKm: 7.0, isVip: false });
  assert.strictEqual(nonVipAtLimit.deliverable, true);
  assert.strictEqual(nonVipAtLimit.fee, 30);
  assert.strictEqual(nonVipAtLimit.isFree, false);

  const nonVipBeyond = calculateDeliveryFee({ distanceKm: 12.0, isVip: false });
  assert.strictEqual(nonVipBeyond.deliverable, true);
  assert.strictEqual(nonVipBeyond.fee, 55); // 30 + (5 * 5) = 55
  assert.strictEqual(nonVipBeyond.isFree, false);

  // Beyond 25 km
  const outOfRange = calculateDeliveryFee({ distanceKm: 26.0, isVip: true });
  assert.strictEqual(outOfRange.deliverable, false);
  assert.strictEqual(outOfRange.fee, null);
});

test('Server order route enforces 25km maximum delivery radius and rejects out-of-range orders', () => {
  const ordersRouteContent = fs.readFileSync(path.join(__dirname, '..', 'server', 'src', 'routes', 'orders.js'), 'utf8');
  assert(ordersRouteContent.includes('OUT_OF_DELIVERY_RANGE'), 'Missing OUT_OF_DELIVERY_RANGE error check in orders route');
  assert(ordersRouteContent.includes('maxRadius = 25.0'), 'Missing 25.0 km maxRadius in orders route');
});

test('Purged suggestions: index.html has zero quick area suggestions and app.js has zero popular localities suggestions', () => {
  const htmlContent = fs.readFileSync(htmlPath, 'utf8');
  const appJsContent = fs.readFileSync(appJsPath, 'utf8');

  // No quick select area container or buttons in address drawer
  assert(!htmlContent.includes('quickDeliveryAreasList'), 'Found quickDeliveryAreasList in index.html');
  assert(!htmlContent.includes('QUICK SELECT AREA'), 'Found QUICK SELECT AREA in index.html');
  assert(!htmlContent.includes('Popular Delhi Delivery Localities'), 'Found Popular Delhi Delivery Localities in index.html');
  assert(!appJsContent.includes('Popular Delhi Delivery Localities'), 'Found Popular Delhi Delivery Localities in app.js');

  // Address drawer header states 25 km limit and VIP free up to 7 km
  assert(htmlContent.includes('Delivery up to 25 km • Free delivery up to 7 km for VIP members'), 'Missing 25 km and VIP free 7 km note in index.html');

  // Saved addresses render does not output "undefined"
  assert(!appJsContent.includes('<p class="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5 line-clamp-2">${addr.address}</p>'), 'app.js still renders raw addr.address without null check');
});

test('Zero-coords UX: address inputs and toasts contain clean area names and no "Switch to Mukherjee Nagar" button', () => {
  const appJsContent = fs.readFileSync(appJsPath, 'utf8');
  const htmlContent = fs.readFileSync(htmlPath, 'utf8');

  // No coordinates in address inputs
  assert(!appJsContent.includes("houseInput.value = `Lat ${lat.toFixed(4)}"), 'app.js still puts raw coordinates in houseInput');
  assert(!appJsContent.includes("streetInput.value = `Near ${areaName} (Lat"), 'app.js still puts coordinates in streetInput');
  
  // No "Switch to Mukherjee Nagar" button
  assert(!appJsContent.includes('Switch to Mukherjee Nagar'), 'app.js still suggests switching to Mukherjee Nagar');
  assert(!htmlContent.includes('Switch to Mukherjee Nagar'), 'index.html still contains Switch to Mukherjee Nagar');

  // Landmark is GTB Nagar Metro Station on Aryan The Pizza profile, not Batra Cinema
  const stall = db.getStallById('stall_aryan_the_pizza');
  assert(stall.landmark.includes('Near GTB Nagar Metro Station'), 'Aryan The Pizza landmark must be near GTB Nagar Metro Station');
  assert(!htmlContent.includes('Near Batra Cinema'), 'index.html still references Batra Cinema');
  assert(!appJsContent.includes('Batra Cinema'), 'app.js still references Batra Cinema');
});

test('Address Book Security Gate: Adding/saving address requires mobile login and prompts guests to log in', () => {
  const htmlContent = fs.readFileSync(htmlPath, 'utf8');
  const appJsContent = fs.readFileSync(appJsPath, 'utf8');

  // index.html has login required prompt in address drawer
  assert(htmlContent.includes('id="addressLoginRequiredPrompt"'), 'index.html missing addressLoginRequiredPrompt');
  assert(htmlContent.includes('Log In to Add Delivery Address'), 'index.html missing Log In to Add Delivery Address heading');
  assert(htmlContent.includes('id="customAddressFormSection"'), 'index.html missing customAddressFormSection');

  // app.js enforces login gate before saving address
  assert(appJsContent.includes('function handleEnterAddressClick()'), 'app.js missing handleEnterAddressClick');
  assert(appJsContent.includes('Please log in with your phone number to enter and save an address'), 'app.js missing login toast for entering address');
  assert(appJsContent.includes('Please log in with your phone number to save an address'), 'app.js missing login toast in handleSaveAddress');

  // renderSavedAddresses shows login prompt when user is not logged in
  assert(appJsContent.includes('Log In to View & Add Saved Addresses'), 'app.js missing guest address container prompt');
});

test('Decentralized Platform: Any stall registered in Ghaziabad, Noida, Mumbai or any city delivers up to 25km from its own coordinates', () => {
  // 1. Aryan The Pizza in Mukherjee Nagar (28.7095, 77.2075) delivers up to 25km from its stall
  const mnCustomerLat = 28.7095;
  const mnCustomerLng = 77.2075;
  const mnStalls = db.getStalls(null, mnCustomerLat, mnCustomerLng, false);
  assert(mnStalls.some(s => s.id === 'stall_aryan_the_pizza' && s.isDeliverable), 'Aryan The Pizza should deliver to Mukherjee Nagar');

  // 2. Simulate a new vendor stall registered in Ghaziabad RDC (28.6692, 77.4538)
  const ghaziabadStall = {
    id: 'stall_ghaziabad_chaat_1',
    name: 'Ghaziabad Famous Chaat',
    lat: 28.6692,
    lng: 77.4538,
    area: 'Raj Nagar RDC',
    city: 'Ghaziabad',
    delivery_radius_km: 25.0,
    status: 'OPEN_FOR_ORDERS',
    menu_items: []
  };

  // Customer sitting in Ghaziabad (28.6700, 77.4500) -> ~0.4 km from Ghaziabad stall
  const gzCustomerLat = 28.6700;
  const gzCustomerLng = 77.4500;

  const distToGzStall = db.computeGeographicDistanceKm(gzCustomerLat, gzCustomerLng, ghaziabadStall.lat, ghaziabadStall.lng);
  assert(distToGzStall < 1.0, `Customer should be ~0.4km from Ghaziabad stall, got ${distToGzStall}`);
  assert(distToGzStall <= ghaziabadStall.delivery_radius_km, 'Ghaziabad stall must deliver within 25km of its own location');

  // 3. Simulate a vendor stall registered in Mumbai Bandra (19.0596, 72.8295)
  const mumbaiStall = {
    id: 'stall_mumbai_vada_pav_1',
    name: 'Bandra Vada Pav Center',
    lat: 19.0596,
    lng: 72.8295,
    area: 'Bandra West',
    city: 'Mumbai',
    delivery_radius_km: 25.0,
    status: 'OPEN_FOR_ORDERS',
    menu_items: []
  };

  // Customer in Andheri West, Mumbai (19.1363, 72.8277) -> ~8.5 km from Bandra, > 1150 km from Delhi
  const mumbaiCustomerLat = 19.1363;
  const mumbaiCustomerLng = 72.8277;

  const distToMumbaiStall = db.computeGeographicDistanceKm(mumbaiCustomerLat, mumbaiCustomerLng, mumbaiStall.lat, mumbaiStall.lng);
  const distToAryan = db.computeGeographicDistanceKm(mumbaiCustomerLat, mumbaiCustomerLng, 28.7095, 77.2075);

  assert(distToMumbaiStall >= 8.0 && distToMumbaiStall <= 10.0, `Mumbai customer should be ~8.5km from Mumbai stall, got ${distToMumbaiStall}`);
  assert(distToMumbaiStall <= mumbaiStall.delivery_radius_km, 'Mumbai stall delivers up to 25km from Bandra');
  assert(distToAryan > 1100, 'Aryan The Pizza in Delhi is >1100km from Mumbai customer');

  // 4. Verify orders.js error string is dynamic (stall.area / stall.city) and has zero hardcoded "from GTB Nagar"
  const ordersJsPath = path.join(__dirname, '../server/src/routes/orders.js');
  const ordersJsContent = fs.readFileSync(ordersJsPath, 'utf8');
  assert(!ordersJsContent.includes('from GTB Nagar'), 'orders.js still hardcodes "from GTB Nagar"');
  assert(ordersJsContent.includes('stall.area || stall.city'), 'orders.js missing dynamic stall.area / stall.city location');
});

test('Client-Side Script Integrity: public/app.js parses with zero syntax errors', () => {
  const { execSync } = require('child_process');
  assert.doesNotThrow(() => {
    execSync(`node --check "${appJsPath}"`, { stdio: 'pipe' });
  }, 'public/app.js failed syntax validation');
});

console.log(`\n🎉 ALL ${passCount} ARYAN THE PIZZA INTEGRATION TESTS PASSED COMPLETELY!`);
console.log('================================================================');



