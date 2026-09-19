/**
 * scratch/test_food_cards.js
 * Comprehensive automated test suite for elevated food photography,
 * vendor-card presentation, and strict Data Integrity (Zero-Fiction Standard).
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('🧪 Starting Food Photography & Card Presentation Integrity Test Suite...\n');

// 1. Verify app.js syntax & read functions
const appJsPath = path.join(__dirname, '..', 'public', 'app.js');
assert(fs.existsSync(appJsPath), 'public/app.js must exist');
const appJs = fs.readFileSync(appJsPath, 'utf8');

// Load sandbox context
const vm = require('vm');
const elementsMap = new Map();
const sandbox = {
  document: {
    addEventListener: () => {},
    getElementById: (id) => elementsMap.get(id) || null,
    querySelectorAll: () => [],
    createElement: () => ({ setAttribute: () => {}, classList: { add: () => {}, remove: () => {} } }),
    body: { style: {} }
  },
  window: {
    addEventListener: () => {},
    matchMedia: () => ({ matches: false, addEventListener: () => {} }),
    location: { origin: 'http://localhost:3000', pathname: '/' },
    scrollY: 0
  },
  localStorage: {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {}
  },
  navigator: {
    clipboard: { writeText: () => Promise.resolve() }
  },
  STATE: {
    favorites: [],
    vegOnly: false,
    stalls: [],
    cart: { items: [] }
  },
  t: (k, fb) => fb,
  console: console,
  setTimeout: () => {},
  setInterval: () => {},
  clearTimeout: () => {},
  clearInterval: () => {}
};
vm.createContext(sandbox);

// Evaluate helper functions from app.js in sandbox
vm.runInContext(appJs, sandbox);

// Test 1: getThelaFoodPlaceholder
console.log('Test 1: getThelaFoodPlaceholder SVG Generator');
assert.strictEqual(typeof sandbox.getThelaFoodPlaceholder, 'function', 'getThelaFoodPlaceholder must be a function');
const chaatPlaceholder = sandbox.getThelaFoodPlaceholder('chaat', 'Pani Puri Corner');
assert(chaatPlaceholder.startsWith('data:image/svg+xml'), 'Must return data URI SVG');
const decodedSvg = decodeURIComponent(chaatPlaceholder);
assert(decodedSvg.includes('PANI PURI') || decodedSvg.includes('CHAAT'), 'Must include category text');
assert(decodedSvg.includes('Real Stall Photo Coming Soon'), 'Must include authentic placeholder text');
console.log('  ✅ getThelaFoodPlaceholder generates authentic branded vector placeholder SVG');

// Test 2: calculateDynamicDeliveryTime Data-Gating
console.log('\nTest 2: calculateDynamicDeliveryTime Data-Gating');
assert.strictEqual(typeof sandbox.calculateDynamicDeliveryTime, 'function');
// Valid distance returns time range
const eta1 = sandbox.calculateDynamicDeliveryTime(1.5, 12);
assert(eta1 && eta1.includes('min'), `Expected min range, got ${eta1}`);
// Missing or invalid distance returns null (Zero Fiction)
assert.strictEqual(sandbox.calculateDynamicDeliveryTime(null), null, 'Null distance must return null');
assert.strictEqual(sandbox.calculateDynamicDeliveryTime(undefined), null, 'Undefined distance must return null');
assert.strictEqual(sandbox.calculateDynamicDeliveryTime(''), null, 'Empty distance must return null');
assert.strictEqual(sandbox.calculateDynamicDeliveryTime(0), null, 'Zero distance must return null');
assert.strictEqual(sandbox.calculateDynamicDeliveryTime(-1), null, 'Negative distance must return null');
assert.strictEqual(sandbox.calculateDynamicDeliveryTime('abc'), null, 'Non-numeric distance must return null');
console.log('  ✅ calculateDynamicDeliveryTime returns null when distance is unknown (no fake ETAs)');

// Test 3: Zero Mock Discovery Cards & Dynamic Section Visibility
console.log('\nTest 3: Zero Mock Discovery Cards & Dynamic Section Visibility');
const CURATED_DISCOVERY = vm.runInContext('CURATED_DISCOVERY', sandbox);
assert(CURATED_DISCOVERY, 'CURATED_DISCOVERY must exist');
const categories = Object.keys(CURATED_DISCOVERY);
assert(categories.length >= 6, `Expected at least 6 categories, got ${categories.length}`);

let totalCurated = 0;
for (const cat of categories) {
  const items = CURATED_DISCOVERY[cat];
  assert(Array.isArray(items), `Category ${cat} must be an array`);
  assert.strictEqual(items.length, 0, `Category ${cat} must contain 0 mock cards (strict zero-fiction policy)`);
  totalCurated += items.length;
}
assert.strictEqual(totalCurated, 0, 'CURATED_DISCOVERY must have exactly 0 hardcoded items');
console.log('  ✅ CURATED_DISCOVERY contains 0 mock cards (zero hardcoded vendors)');

// Verify renderDiscoverySections hides sections when no matching stalls exist
const mockSections = {};
const mockTracks = {};
['Trending', 'Popular', 'Under100', 'Legends', 'LateNight', 'HiddenGems'].forEach(name => {
  mockSections['sec' + name] = {
    classList: {
      classes: new Set(['hidden']),
      add(cls) { this.classes.add(cls); },
      remove(cls) { this.classes.delete(cls); },
      contains(cls) { return this.classes.has(cls); }
    }
  };
  mockTracks['sec' + name + 'Track'] = { innerHTML: 'dummy' };
});

const origGetElementById = sandbox.document.getElementById;
sandbox.document.getElementById = (id) => {
  if (mockSections[id]) return mockSections[id];
  if (mockTracks[id]) return mockTracks[id];
  return origGetElementById ? origGetElementById(id) : null;
};

sandbox.renderDiscoverySections([]);
['Trending', 'Popular', 'Under100', 'Legends', 'LateNight', 'HiddenGems'].forEach(name => {
  assert(mockSections['sec' + name].classList.contains('hidden'), `sec${name} must remain hidden when stalls is empty`);
  assert.strictEqual(mockTracks['sec' + name + 'Track'].innerHTML, '', `sec${name}Track must be empty when stalls is empty`);
});
console.log('  ✅ renderDiscoverySections keeps all discovery sections hidden when 0 live stalls exist');

sandbox.document.getElementById = origGetElementById;

// Test 4: renderStalls Mock Testing (Data Integrity & Known For Strip)
console.log('\nTest 4: renderStalls Rendering Logic & Data Integrity');

// Mock DOM elements
let stallsGridHtml = '';
sandbox.document.getElementById = (id) => {
  if (id === 'stallsGrid') {
    return {
      set innerHTML(val) { stallsGridHtml = val; },
      get innerHTML() { return stallsGridHtml; }
    };
  }
  if (id === 'stallsCount') return { innerText: '' };
  return null;
};

// Case A: Live Stall with full verified data
const stallComplete = {
  id: 'stall_1',
  name: 'Panditji Pav Bhaji',
  specialty: 'Amul Butter Pav Bhaji',
  category: 'pavbhaji',
  rating: '4.8',
  ratingCount: 142,
  reviewsCount: '142 ratings',
  ordersCount: 85,
  priceForTwo: 160,
  distance: '0.8 km',
  prepTime: 12,
  isOpen: true,
  isVeg: true,
  discount: '10% OFF',
  fssai_status: 'verified',
  imageUrl: 'https://images.unsplash.com/photo-1606491956689-2ea866880c84',
  items: [
    { id: 'i1', name: 'Special Amul Pav Bhaji', price: 120, bestseller: true },
    { id: 'i2', name: 'Masala Pav (2 pcs)', price: 60, isSpecial: true }
  ]
};

sandbox.renderStalls([stallComplete]);
assert(stallsGridHtml.includes('Panditji Pav Bhaji'), 'Stall name must render');
assert(stallsGridHtml.includes('4.8'), 'Genuine rating must render');
assert(stallsGridHtml.includes('(142 ratings)'), 'Genuine review count must render');
assert(stallsGridHtml.includes('85+ orders'), 'Genuine orders delivered must render');
assert(stallsGridHtml.includes('₹160'), 'Price for two must render');
assert(stallsGridHtml.includes('0.8 km away'), 'Distance must render');
assert(stallsGridHtml.includes('Known For:'), 'Known For strip must render when items exist');
assert(stallsGridHtml.includes('Special Amul Pav Bhaji'), 'Signature item must render in Known For');
assert(stallsGridHtml.includes('FSSAI Verified'), 'FSSAI badge must render');
assert(stallsGridHtml.includes('OPEN'), 'OPEN status must render');
assert(stallsGridHtml.includes('10% OFF'), 'Discount must render');
console.log('  ✅ Case A: Live stall with genuine data renders all vitals & Known For strip accurately');

// Case B: New Live Stall with missing optional metrics (Strict Omission standard)
const stallNew = {
  id: 'stall_2',
  name: 'New Delhi Chole Bhature',
  specialty: 'Authentic Chole Bhature',
  category: 'chaat',
  isOpen: true,
  isVeg: true,
  // NO rating, NO review count, NO orders, NO distance, NO priceForTwo, NO items, NO discount
  imageUrl: ''
};

sandbox.renderStalls([stallNew]);
assert(stallsGridHtml.includes('New Delhi Chole Bhature'), 'Stall name must render');
assert(stallsGridHtml.includes('⭐ New (Verified Stall)'), 'New stall without ratings must render "New (Verified Stall)"');
assert(!stallsGridHtml.includes('orders delivered') && !stallsGridHtml.includes('+ orders'), 'Orders count must be cleanly omitted');
assert(!stallsGridHtml.includes('for two'), 'Price for two must be cleanly omitted when unknown');
assert(!stallsGridHtml.includes('away'), 'Distance must be cleanly omitted when unknown');
assert(!stallsGridHtml.includes('Known For:'), 'Known For strip must be omitted when stall has no items');
assert(!stallsGridHtml.includes('4.8') && !stallsGridHtml.includes('100+'), 'Must never invent 4.8 or 100+');
console.log('  ✅ Case B: New stall cleanly omits missing metrics (orders, distance, ETA, price-for-two, known-for) with zero fictional data');

// Test 5: renderCategoryTabsAndMenuItems 3-Tier Visual Hierarchy
console.log('\nTest 5: Menu 3-Tier Visual Hierarchy (Signature, Bestseller, Regular)');
let menuItemsHtml = '';
let menuTabsHtml = '';
sandbox.document.getElementById = (id) => {
  if (id === 'modalMenuItems') {
    return {
      set innerHTML(val) { menuItemsHtml = val; },
      get innerHTML() { return menuItemsHtml; }
    };
  }
  if (id === 'modalCategoryTabs') {
    return {
      set innerHTML(val) { menuTabsHtml = val; },
      get innerHTML() { return menuTabsHtml; }
    };
  }
  return null;
};

const menuItems = [
  { id: 'm1', name: 'Royal Kesariya Thandai', price: 90, isSpecial: true, category: 'drinks' },
  { id: 'm2', name: 'Steamed Momos Platter', price: 110, bestseller: true, category: 'momos' },
  { id: 'm3', name: 'Crispy Aloo Tikki', price: 60, category: 'chaat' }
];

sandbox.renderCategoryTabsAndMenuItems(menuItems);
assert(menuItemsHtml.includes('SIGNATURE'), 'Tier 1 Signature badge must render');
assert(menuItemsHtml.includes('BESTSELLER'), 'Tier 2 Bestseller badge must render');
assert(menuItemsHtml.includes('Royal Kesariya Thandai'), 'Special item name must render');
assert(menuItemsHtml.includes('Steamed Momos Platter'), 'Bestseller item name must render');
assert(menuItemsHtml.includes('Crispy Aloo Tikki'), 'Regular item name must render');
assert(menuItemsHtml.includes('w-28 h-28 sm:w-32 sm:h-32'), 'Enlarged thumbnails must be used');
assert(menuItemsHtml.includes('handleFoodImageError'), 'Image error handler must be present on thumbnails');
console.log('  ✅ Menu dishes render with authentic 3-tier visual hierarchy & enlarged food thumbnails');

console.log('\n🎉 ALL FOOD PHOTOGRAPHY & CARD PRESENTATION INTEGRITY TESTS PASSED!');
