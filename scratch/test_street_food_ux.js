// scratch/test_street_food_ux.js
const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('================================================================');
console.log('🍢 RUNNING AUTHENTIC THELAEXPRESS STREET FOOD UX TEST SUITE');
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

console.log('--- TEST SUITE 1: Clean Street Food Header & Zero Fake Data ---');
test('Header has neutral location prompt with zero fake addresses', () => {
  assert(html.includes('headerLocation'), 'Missing headerLocation element');
  assert(!html.includes('73A RM Block'), 'Still contains fake address 73A RM Block');
  assert(!html.includes('Sahibabad'), 'Still contains fake address Sahibabad');
  assert(!html.includes('Shivalik'), 'Still contains fake address Shivalik');
});

test('Header has Street Carts badge and zero fake "District" branding', () => {
  assert(html.includes('Street Carts'), 'Missing Street Carts badge');
  assert(!html.includes('>District</span>'), 'Still contains copied Zomato District pill');
});

test('Header wallet pill & neutral avatar icon exist', () => {
  assert(html.includes('headerWalletAmount'), 'Missing wallet pill');
  assert(html.includes('id="authBtn"'), 'Missing auth button');
});

test('Search row has integrated voice mic & pure veg toggle switch', () => {
  assert(html.includes('id="stickySearchRow"'), 'Missing #stickySearchRow');
  assert(html.includes('id="searchMicBtn"'), 'Missing #searchMicBtn');
  assert(html.includes('id="pureVegToggle"'), 'Missing #pureVegToggle');
});

console.log('\n--- TEST SUITE 2: Street Food Hero Carousel & Circular Dishes ---');
test('Festive Hero Carousel exists with 3 slides and pagination dots', () => {
  assert(html.includes('id="heroPromoCarousel"'), 'Missing #heroPromoCarousel');
  assert(html.includes('id="promoTrack"'), 'Missing #promoTrack');
  assert(html.includes('id="carouselDots"'), 'Missing #carouselDots');
  assert(html.includes('THELA70'), 'Missing 70% OFF promo code');
});

test('Circular Food Category Stories Rail has all 11 street dishes', () => {
  assert(html.includes('id="circularCategoriesTrack"'), 'Missing #circularCategoriesTrack');
  const expectedDishes = ['all', 'burger', 'chole', 'rajma', 'chaat', 'vadapav', 'pavbhaji', 'momos', 'south', 'rolls', 'chai'];
  expectedDishes.forEach(dish => {
    assert(html.includes(`filterCategory('${dish}')`), `Missing category filter for ${dish}`);
  });
});

console.log('\n--- TEST SUITE 3: Quick Filter Pills Bar ---');
test('Quick Filter Pills Bar contains 6 fast filters', () => {
  assert(html.includes('id="quickFiltersBar"'), 'Missing #quickFiltersBar');
  assert(html.includes('id="btnFilterAll"'), 'Missing #btnFilterAll');
  assert(html.includes('id="btnNearFast"'), 'Missing #btnNearFast');
  assert(html.includes('id="btnNoPackaging"'), 'Missing #btnNoPackaging');
  assert(html.includes('id="btnTopRated"'), 'Missing #btnTopRated');
  assert(html.includes('id="btnUnder100"'), 'Missing #btnUnder100');
  assert(html.includes('id="btnFavorites"'), 'Missing #btnFavorites');
});

console.log('\n--- TEST SUITE 4: Zero Restaurant "Dining" & Authentic Street Dock ---');
test('Customer UI contains zero restaurant "Dining" tabs or references', () => {
  assert(!html.includes('switchDockTab(\'dining\')'), 'Still contains switchDockTab(dining)');
  assert(!html.includes('dockTabDining'), 'Still contains dockTabDining');
  assert(!html.includes('Dining & experiences'), 'Still contains Dining & experiences');
  assert(!html.includes('Your dining transactions'), 'Still contains Your dining transactions');
  assert(!html.includes('Your dining rewards'), 'Still contains Your dining rewards');
});

test('Floating bottom dock has Home, Under 100, Favorites, and Healthy Mode', () => {
  assert(html.includes('id="floatingBottomDock"'), 'Missing #floatingBottomDock');
  assert(html.includes('switchDockTab(\'home\')'), 'Missing dock home tab');
  assert(html.includes('switchDockTab(\'under100\')'), 'Missing dock under100 tab');
  assert(html.includes('switchDockTab(\'favorites\')'), 'Missing dock favorites tab');
  assert(html.includes('toggleHealthyMode()'), 'Missing dock healthy mode tab');
});

console.log('\n--- TEST SUITE 5: Zero Copied Personal Profiles & Zero Fake Savings ---');
test('Profile modal contains zero hardcoded personal names or emails', () => {
  assert(!html.includes('Anurag</h2>'), 'Still contains hardcoded Anurag header');
  assert(!html.includes('anuragdgsingh614@gmail.com'), 'Still contains personal email');
  assert(!html.includes('value="Anurag"'), 'Still contains hardcoded value="Anurag" in input');
  assert(!html.includes('value="anuragdgsingh614@gmail.com"'), 'Still contains hardcoded email in input');
  assert(!html.includes('saved ₹10,816'), 'Still contains fake savings of ₹10,816');
  assert(!html.includes('saved ₹10816'), 'Still contains fake savings of ₹10816');
});

test('Profile modal defaults to neutral Street Food Explorer', () => {
  assert(html.includes('Street Food Explorer'), 'Missing Street Food Explorer default title');
  assert(html.includes('Street Food Rewards & Wallet'), 'Missing Street Food Rewards & Wallet section');
});

console.log('\n--- TEST SUITE 6: JavaScript Engine Functions & Clean Architecture ---');
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

console.log(`\n🎉 ALL ${passCount} AUTHENTIC STREET FOOD UX SUITE TESTS PASSED COMPLETELY!`);
console.log('================================================================');
