const fs = require('fs');

console.log('================================================================');
console.log('🧪 RUNNING CUSTOMER / PARTNER APP STRICT SEPARATION & UI TEST');
console.log('================================================================\n');

let failed = false;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ ${message}`);
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    failed = true;
  }
}

// 1. Customer App Separation Invariants
console.log('--- SUITE 1: Customer App Strict Domain Separation ---');
const indexHtml = fs.readFileSync('public/index.html', 'utf8');
const appJs = fs.readFileSync('public/app.js', 'utf8');

assert(!indexHtml.includes('/partner.html'), 'public/index.html contains zero links to /partner.html');
assert(!indexHtml.includes('/onboard-vendor.html'), 'public/index.html contains zero links to /onboard-vendor.html');
assert(!indexHtml.includes('/onboard-rider.html'), 'public/index.html contains zero links to /onboard-rider.html');
assert(!indexHtml.includes('Open Partner App'), 'public/index.html contains zero "Open Partner App" callouts');
assert(!indexHtml.includes('Own a Street Cart or Want to Deliver'), 'public/index.html contains zero vendor/rider recruitment cards');

assert(!appJs.includes('/onboard-vendor.html'), 'public/app.js contains zero links to /onboard-vendor.html');
assert(!appJs.includes('/onboard-rider.html'), 'public/app.js contains zero links to /onboard-rider.html');
assert(!appJs.includes('Register Real Street Stall Now'), 'public/app.js contains zero vendor registration CTA buttons');

// 2. Onboarding Back Buttons and Navigation
console.log('\n--- SUITE 2: Onboarding Large Accessible Back Buttons ---');
const vendorHtml = fs.readFileSync('public/onboard-vendor.html', 'utf8');
const riderHtml = fs.readFileSync('public/onboard-rider.html', 'utf8');

assert(vendorHtml.includes('h-10 px-3.5') || vendorHtml.includes('h-10 px-4'), 'onboard-vendor.html back button has large touch target (h-10 px-3.5/4)');
assert(vendorHtml.includes('fa-arrow-left') && vendorHtml.includes('back_to_partner'), 'onboard-vendor.html back button has visible icon and text');
assert(vendorHtml.includes('history.back()') && vendorHtml.includes('/partner.html'), 'onboard-vendor.html back button navigates back to partner app');
assert(vendorHtml.includes('<a href="/partner.html" class="flex items-center space-x-2 shrink min-w-0">'), 'onboard-vendor.html logo points to /partner.html');

assert(riderHtml.includes('h-10 px-3.5') || riderHtml.includes('h-10 px-4'), 'onboard-rider.html back button has large touch target (h-10 px-3.5/4)');
assert(riderHtml.includes('fa-arrow-left') && riderHtml.includes('back_to_partner'), 'onboard-rider.html back button has visible icon and text');
assert(riderHtml.includes('history.back()') && riderHtml.includes('/partner.html'), 'onboard-rider.html back button navigates back to partner app');
assert(riderHtml.includes('<a href="/partner.html" class="flex items-center space-x-2 shrink min-w-0">'), 'onboard-rider.html logo points to /partner.html');

// 3. Partner App Integration
console.log('\n--- SUITE 3: Partner App Prominent Links ---');
const partnerHtml = fs.readFileSync('public/partner.html', 'utf8');

assert(partnerHtml.includes('/onboard-vendor.html'), 'partner.html includes /onboard-vendor.html');
assert(partnerHtml.includes('/onboard-rider.html'), 'partner.html includes /onboard-rider.html');
assert(partnerHtml.includes('New Stall Register'), 'partner.html includes New Stall Register in vendor controls');
assert(partnerHtml.includes('New Rider Sign-Up'), 'partner.html includes New Rider Sign-Up in rider console');

console.log('\n================================================================');
if (failed) {
  console.error('❌ SOME TESTS FAILED');
  process.exit(1);
} else {
  console.log('🎉 ALL SEPARATION & ACCESSIBLE UI TESTS PASSED FLAWLESSLY!');
  console.log('================================================================');
  process.exit(0);
}
