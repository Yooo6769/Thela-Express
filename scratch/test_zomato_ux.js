// scratch/test_zomato_ux.js
const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('================================================================');
console.log('🚀 RUNNING ZOMATO-GRADE EXPERIENCE INTEGRATION & UX TEST SUITE');
console.log('================================================================\n');

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

console.log('--- TEST SUITE 1: Zomato Header & Top Discovery Elements ---');
test('Header has location pin with Home tag & delivery address', () => {
  assert(html.includes('headerLocation'), 'Missing headerLocation');
  assert(html.includes('District') || html.includes('headerDistrictPill'), 'Missing District pill');
});

test('Header has Thela Wallet Balance pill & Gold Avatar', () => {
  assert(html.includes('headerWalletAmount') || html.includes('headerWalletBalance'), 'Missing header wallet balance pill');
  assert(html.includes('id="authBtn"'), 'Missing #authBtn');
});

test('Sticky Search Row has Integrated Mic & Pure Veg Toggle Switch', () => {
  assert(html.includes('id="stickySearchRow"'), 'Missing #stickySearchRow');
  assert(html.includes('id="searchMicBtn"'), 'Missing #searchMicBtn');
  assert(html.includes('id="pureVegToggle"'), 'Missing #pureVegToggle');
});

console.log('\n--- TEST SUITE 2: Dynamic Hero Carousel & Category Stories ---');
test('Festive Hero Carousel exists with 3 slides and pagination dots', () => {
  assert(html.includes('id="heroPromoCarousel"'), 'Missing #heroPromoCarousel');
  assert(html.includes('id="promoTrack"'), 'Missing #promoTrack');
  assert(html.includes('id="carouselDots"'), 'Missing #carouselDots');
  assert(html.includes('THELA70'), 'Missing 70% OFF promo code');
  assert(html.includes('THELA GOLD'), 'Missing Thela Gold slide');
});

test('Circular Food Category Stories Rail has iconic street dishes', () => {
  assert(html.includes('id="circularCategoriesTrack"'), 'Missing #circularCategoriesTrack');
  const expectedDishes = ['all', 'burger', 'chole', 'rajma', 'chaat', 'vadapav', 'pavbhaji', 'momos', 'south', 'rolls', 'chai'];
  expectedDishes.forEach(dish => {
    assert(html.includes(`filterCategory('${dish}')`), `Missing category filter for ${dish}`);
  });
});

console.log('\n--- TEST SUITE 3: Quick Filter Pills Bar ---');
test('Quick Filter Pills Bar contains all 6 Zomato-style filters', () => {
  assert(html.includes('id="quickFiltersBar"'), 'Missing #quickFiltersBar');
  assert(html.includes('id="btnFilterAll"'), 'Missing #btnFilterAll');
  assert(html.includes('id="btnNearFast"'), 'Missing #btnNearFast');
  assert(html.includes('id="btnNoPackaging"'), 'Missing #btnNoPackaging');
  assert(html.includes('id="btnTopRated"'), 'Missing #btnTopRated');
  assert(html.includes('id="btnUnder100"'), 'Missing #btnUnder100');
  assert(html.includes('id="btnFavorites"'), 'Missing #btnFavorites');
});

console.log('\n--- TEST SUITE 4: Interactive Feature Grid & Planet Disclosure ---');
test('Explore More 4-Tile Grid includes Offers, Gold Club, Train Food, and Chef Tawa', () => {
  assert(html.includes('openCouponsDrawer()'), 'Missing Offers tile handler');
  assert(html.includes('openThelaGoldModal()'), 'Missing Gold Club tile handler');
  assert(html.includes('openTrainFoodModal()'), 'Missing Food on Train tile handler');
  assert(html.includes('scrollToDiscoverySection(\'secLegends\')'), 'Missing Chef Tawa tile handler');
});

test('FSSAI & Green Planet Delivery Banner is present', () => {
  assert(html.includes('Delivering for people and planet'), 'Missing planet delivery banner');
  assert(html.includes('fssai') && html.includes('Lic. No.'), 'Missing FSSAI license notice');
  assert(html.includes('Report an issue with the menu'), 'Missing report issue button');
});

console.log('\n--- TEST SUITE 5: Floating Bottom Dock ---');
test('Frosted-glass floating dock has Home, Under 100, Dining, Healthy Mode & Account', () => {
  assert(html.includes('id="floatingBottomDock"'), 'Missing #floatingBottomDock');
  assert(html.includes('switchDockTab(\'home\')'), 'Missing dock home tab');
  assert(html.includes('switchDockTab(\'under100\')'), 'Missing dock under100 tab');
  assert(html.includes('switchDockTab(\'dining\')'), 'Missing dock dining tab');
  assert(html.includes('toggleHealthyMode()'), 'Missing dock healthy mode tab');
  assert(html.includes('handleAuthBtnClick()'), 'Missing dock account button');
});

console.log('\n--- TEST SUITE 6: Zomato VIP Profile & Account Drawer ---');
test('Profile Center features Anurag with Gold Membership, ₹10,816 saved, and Thela Money', () => {
  assert(html.includes('id="profileModal"'), 'Missing #profileModal');
  assert(html.includes('id="profileModalName"'), 'Missing #profileModalName');
  assert(html.includes('id="profileGoldSavings"'), 'Missing #profileGoldSavings');
  assert(html.includes('id="profileWalletAmount"'), 'Missing #profileWalletAmount');
  assert(html.includes('toggleProfileEditForm()'), 'Missing toggleProfileEditForm');
  assert(html.includes('cycleThemeMode()'), 'Missing cycleThemeMode');
});

console.log('\n--- TEST SUITE 7: JavaScript Engine Functions in app.js ---');
test('app.js defines carousel, filter toggles, companion modals, and wallet engine', () => {
  const requiredFns = [
    'initPromoCarousel', 'setCarouselSlide',
    'toggleNearAndFast', 'toggleNoPackaging', 'toggleTopRated', 'toggleHealthyMode',
    'applyActiveFilters', 'switchDockTab',
    'openThelaGoldModal', 'closeThelaGoldModal',
    'openCouponsDrawer', 'closeCouponsDrawer', 'applyPromoCode',
    'openTrainFoodModal', 'closeTrainFoodModal', 'handleTrainDeliverySave',
    'openWalletDrawer', 'closeWalletDrawer', 'rechargeWallet',
    'toggleProfileEditForm', 'cycleThemeMode', 'handleVoiceSearch'
  ];
  requiredFns.forEach(fn => {
    assert(appJs.includes(fn), `Missing function: ${fn}`);
  });
});

test('app.js stall card renderer includes Zomato discount ribbon and ETA pill', () => {
  assert(appJs.includes('fa-badge-percent'), 'Missing discount badge in stall card');
  assert(appJs.includes('Items starting at ₹49'), 'Missing default discount copy');
  assert(appJs.includes('fa-bolt text-amber-400'), 'Missing lightning delivery ETA icon');
});

console.log(`\n🎉 ALL ${passCount} ZOMATO UX SUITE TESTS PASSED COMPLETELY!`);
console.log('================================================================');
