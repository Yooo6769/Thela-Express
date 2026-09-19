const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('=== VERIFYING THELA EXPRESS STREET-FOOD ATMOSPHERE & ADAPTIVE DENSITY SYSTEM ===\n');

const htmlPath = path.join(__dirname, '..', 'public', 'index.html');
const jsPath = path.join(__dirname, '..', 'public', 'app.js');

const htmlContent = fs.readFileSync(htmlPath, 'utf8');
const jsContent = fs.readFileSync(jsPath, 'utf8');

// 1. Verify Atmosphere Container & Elements in HTML
console.log('1. Checking HTML structure...');
assert(htmlContent.includes('id="thelaAtmosphere"'), 'Missing #thelaAtmosphere container');
assert(htmlContent.includes('pointer-events-none'), 'Missing pointer-events-none on container');
assert(htmlContent.includes('data-density="high"'), 'Missing initial data-density="high"');

const motifs = [
  'Authentic Heritage Street Thela / Cart',
  'Steamed Momos & Bamboo Basket',
  'Curved Indian Green & Red Chillies',
  'Fresh Sliced Lemon & Citrus Droplets',
  'Tandoori Seekh Skewer',
  'Wok & Swirling Street Noodles',
  'Earthen Handi Pot',
  'Cutting Chai Kulhad',
  'Red Onion Rings',
  'Vintage Bazaar Hanging Bulb'
];

motifs.forEach(motif => {
  assert(htmlContent.includes(motif), `Missing motif in HTML: ${motif}`);
});
console.log(`✓ All ${motifs.length} street-food motifs present in index.html`);

// 2. Verify CSS Rules & 4 Density Levels
console.log('\n2. Checking CSS Density Rules...');
const densityLevels = ['high', 'medium', 'low', 'minimal'];
densityLevels.forEach(level => {
  assert(htmlContent.includes(`#thelaAtmosphere[data-density="${level}"]`), `Missing CSS density rule for: ${level}`);
});
assert(htmlContent.includes('pointer-events: none !important'), 'Missing pointer-events: none !important in CSS');
assert(htmlContent.includes('user-select: none !important'), 'Missing user-select: none !important in CSS');
assert(htmlContent.includes('atmosphere-paused'), 'Missing .atmosphere-paused battery-saver class');
assert(htmlContent.includes('prefers-reduced-motion'), 'Missing prefers-reduced-motion media query');
console.log('✓ All 4 density levels, safety rules, battery saver, and reduced-motion media query present in CSS');

// 3. Verify AtmosphereManager in JS
console.log('\n3. Checking AtmosphereManager engine in app.js...');
assert(jsContent.includes('const AtmosphereManager = {'), 'Missing AtmosphereManager definition');
assert(jsContent.includes('AtmosphereManager.init()'), 'Missing AtmosphereManager.init() on DOMContentLoaded');
assert(jsContent.includes('updateBaselineFromScroll()'), 'Missing updateBaselineFromScroll method');
assert(jsContent.includes('pushOverride('), 'Missing pushOverride method');
assert(jsContent.includes('popOverride('), 'Missing popOverride method');
assert(jsContent.includes('visibilitychange'), 'Missing visibilitychange tab listener');

// 4. Verify all 10 Modals/Drawers are hooked with pushOverride and popOverride
console.log('\n4. Checking modal & drawer UI hooks in app.js...');
const expectedHooks = [
  { name: 'stallModal', openFn: 'openStallModal', closeFn: 'closeStallModal', density: 'low' },
  { name: 'trustModal', openFn: 'openTrustModal', closeFn: 'closeTrustModal', density: 'minimal' },
  { name: 'customizer', openFn: 'openCustomizer', closeFn: 'closeCustomizerModal', density: 'minimal' },
  { name: 'cartDrawer', openFn: 'openCartDrawer', closeFn: 'closeCartDrawer', density: 'minimal' },
  { name: 'trackingModal', openFn: 'openTrackingModal', closeFn: 'closeTrackingModal', density: 'minimal' },
  { name: 'authModal', openFn: 'openAuthModal', closeFn: 'closeAuthModal', density: 'minimal' },
  { name: 'profileModal', openFn: 'openProfileModal', closeFn: 'closeProfileModal', density: 'minimal' },
  { name: 'addressDrawer', openFn: 'openAddressDrawer', closeFn: 'closeAddressDrawer', density: 'minimal' },
  { name: 'orderHistoryModal', openFn: 'openOrderHistoryModal', closeFn: 'closeOrderHistoryModal', density: 'minimal' },
  { name: 'ratingModal', openFn: 'openRatingModal', closeFn: 'closeRatingModal', density: 'minimal' }
];

expectedHooks.forEach(hook => {
  const pushCall = `AtmosphereManager.pushOverride('${hook.name}', '${hook.density}')`;
  const popCall = `AtmosphereManager.popOverride('${hook.name}')`;
  assert(jsContent.includes(pushCall), `Missing pushOverride for ${hook.name} (${pushCall})`);
  assert(jsContent.includes(popCall), `Missing popOverride for ${hook.name} (${popCall})`);
  console.log(`  ✓ ${hook.name.padEnd(18)} hooked: push('${hook.density}') & pop()`);
});

// 5. Test Stack State Machine Logic
console.log('\n5. Testing Stack State Machine Logic in simulated runtime...');
let mockContainer = {
  attr: 'high',
  setAttribute(k, v) { this.attr = v; },
  getAttribute(k) { return this.attr; },
  classList: {
    classes: new Set(),
    add(c) { this.classes.add(c); },
    remove(c) { this.classes.delete(c); }
  }
};

let sim = {
  currentDensity: 'high',
  overrideStack: [],
  container: mockContainer,
  updateBaselineFromScroll(mockScrollY = 0) {
    if (this.overrideStack.length > 0) return;
    const target = mockScrollY < 320 ? 'high' : 'medium';
    this.setDensity(target);
  },
  pushOverride(source, density) {
    this.overrideStack = this.overrideStack.filter(o => o.source !== source);
    this.overrideStack.push({ source, density });
    this.applyCurrentDensity();
  },
  popOverride(source) {
    this.overrideStack = this.overrideStack.filter(o => o.source !== source);
    this.applyCurrentDensity();
  },
  applyCurrentDensity() {
    if (this.overrideStack.length > 0) {
      const top = this.overrideStack[this.overrideStack.length - 1];
      this.setDensity(top.density);
    } else {
      this.updateBaselineFromScroll();
    }
  },
  setDensity(density) {
    this.currentDensity = density;
    this.container.setAttribute('data-density', density);
  }
};

// Initial state
assert.strictEqual(sim.currentDensity, 'high');
assert.strictEqual(sim.container.getAttribute('data-density'), 'high');

// Scroll down into catalog (scrollY = 500)
sim.updateBaselineFromScroll(500);
assert.strictEqual(sim.currentDensity, 'medium');
assert.strictEqual(sim.container.getAttribute('data-density'), 'medium');

// User opens a vendor stall page
sim.pushOverride('stallModal', 'low');
assert.strictEqual(sim.currentDensity, 'low');
assert.strictEqual(sim.container.getAttribute('data-density'), 'low');

// While vendor page is open, scroll event occurs (should NOT override focused modal)
sim.updateBaselineFromScroll(100);
assert.strictEqual(sim.currentDensity, 'low');

// From stall page, user taps customizer to customize momos
sim.pushOverride('customizer', 'minimal');
assert.strictEqual(sim.currentDensity, 'minimal');
assert.strictEqual(sim.container.getAttribute('data-density'), 'minimal');

// User closes customizer
sim.popOverride('customizer');
assert.strictEqual(sim.currentDensity, 'low'); // restores vendor page density!

// User opens cart drawer
sim.pushOverride('cartDrawer', 'minimal');
assert.strictEqual(sim.currentDensity, 'minimal');

// User closes cart drawer
sim.popOverride('cartDrawer');
assert.strictEqual(sim.currentDensity, 'low');

// User closes stall modal
sim.popOverride('stallModal');
assert.strictEqual(sim.currentDensity, 'high'); // restores scroll baseline (top)!
console.log('✓ Simulated runtime state stack verified perfectly across nested modals/drawers');

console.log('\n=== ALL ATMOSPHERE & ADAPTIVE DENSITY TESTS PASSED SUCCESSFULLY! ===');
