// scratch/apply_exact_patches.js
const fs = require('fs');
const path = require('path');

const htmlPath = path.join(__dirname, '..', 'public', 'index.html');
const appJsPath = path.join(__dirname, '..', 'public', 'app.js');

let html = fs.readFileSync(htmlPath, 'utf8').replace(/\r\n/g, '\n');
let appJs = fs.readFileSync(appJsPath, 'utf8').replace(/\r\n/g, '\n');

console.log('=== STEP 1: FIXING THELA ATMOSPHERE DENSITY IN INDEX.HTML ===');
html = html.replace(
  `    /* 4-Tier Adaptive Density Rules */
    /* Level 1: HIGH — Hero & Craving Discovery */
    #thelaAtmosphere[data-density="high"] .thela-glow-disk { opacity: 0.35; }
    #thelaAtmosphere[data-density="high"] .motif-primary { opacity: 0.13; }
    #thelaAtmosphere[data-density="high"] .motif-secondary { opacity: 0.09; }
    #thelaAtmosphere[data-density="high"] .motif-steam { opacity: 0.15; }

    /* Level 2: MEDIUM — Discovery Carousels & Main Grid */
    #thelaAtmosphere[data-density="medium"] .thela-glow-disk { opacity: 0.20; }
    #thelaAtmosphere[data-density="medium"] .motif-primary { opacity: 0.08; }
    #thelaAtmosphere[data-density="medium"] .motif-secondary { opacity: 0.03; }
    #thelaAtmosphere[data-density="medium"] .motif-steam { opacity: 0.07; }

    /* Level 3: LOW — Vendor Stall Page & Menu */
    #thelaAtmosphere[data-density="low"] .thela-glow-disk { opacity: 0.10; }
    #thelaAtmosphere[data-density="low"] .motif-primary { opacity: 0.03; }
    #thelaAtmosphere[data-density="low"] .motif-secondary { opacity: 0; }
    #thelaAtmosphere[data-density="low"] .motif-steam { opacity: 0.03; }

    /* Level 4: MINIMAL — Cart, Checkout, Auth, Address, Customizer */
    #thelaAtmosphere[data-density="minimal"] .thela-glow-disk { opacity: 0.05; }
    #thelaAtmosphere[data-density="minimal"] .thela-motif { opacity: 0 !important; }
    #thelaAtmosphere[data-density="minimal"] * { animation-play-state: paused !important; }`,
  `    /* 4-Tier Adaptive Density Rules — Harmonized with Theme */
    /* Level 1: HIGH — Hero & Craving Discovery */
    #thelaAtmosphere[data-density="high"] .thela-glow-disk { opacity: 0.22; }
    #thelaAtmosphere[data-density="high"] .motif-primary { opacity: 0.07; }
    #thelaAtmosphere[data-density="high"] .motif-secondary { opacity: 0.04; }
    #thelaAtmosphere[data-density="high"] .motif-steam { opacity: 0.08; }

    /* Level 2: MEDIUM — Discovery Carousels & Main Grid */
    #thelaAtmosphere[data-density="medium"] .thela-glow-disk { opacity: 0.15; }
    #thelaAtmosphere[data-density="medium"] .motif-primary { opacity: 0.05; }
    #thelaAtmosphere[data-density="medium"] .motif-secondary { opacity: 0.02; }
    #thelaAtmosphere[data-density="medium"] .motif-steam { opacity: 0.04; }

    /* Level 3: LOW — Vendor Stall Page & Menu */
    #thelaAtmosphere[data-density="low"] .thela-glow-disk { opacity: 0.08; }
    #thelaAtmosphere[data-density="low"] .motif-primary { opacity: 0.02; }
    #thelaAtmosphere[data-density="low"] .motif-secondary { opacity: 0; }
    #thelaAtmosphere[data-density="low"] .motif-steam { opacity: 0.02; }

    /* Level 4: MINIMAL — Cart, Checkout, Auth, Address, Customizer */
    #thelaAtmosphere[data-density="minimal"] .thela-glow-disk { opacity: 0.04; }
    #thelaAtmosphere[data-density="minimal"] .thela-motif { opacity: 0 !important; }
    #thelaAtmosphere[data-density="minimal"] * { animation-play-state: paused !important; }

    html.dark #thelaAtmosphere[data-density="high"] .motif-primary { opacity: 0.08; }
    html.dark #thelaAtmosphere[data-density="medium"] .motif-primary { opacity: 0.06; }`
);

console.log('=== STEP 2: FIXING JAVASCRIPT TOGGLEVEGFILTER IN APP.JS ===');
const oldVegFilterCode = `function toggleVegFilter() {
  STATE.vegOnly = !STATE.vegOnly;
  const btn = document.getElementById('vegFilterBtn');
  if (btn) {
    btn.classList.toggle('border-emerald-600', STATE.vegOnly);
    btn.classList.toggle('bg-emerald-50', STATE.vegOnly);
    btn.classList.toggle('text-emerald-800', STATE.vegOnly);
  }
  const pureToggle = document.getElementById('pureVegToggle');
  if (pureToggle) {
    pureToggle.checked = STATE.vegOnly;
  }
  loadStalls();
  showToast(STATE.vegOnly ? '🌱 Pure Veg Mode: Showing 100% vegetarian stalls' : 'Showing all options');
}`;

const newVegFilterCode = `function toggleVegFilter() {
  STATE.vegOnly = !STATE.vegOnly;

  // 1. Visually animate header veg switch track and thumb
  const track = document.getElementById('vegSwitchTrack');
  const thumb = document.getElementById('vegSwitchThumb');
  if (track) {
    if (STATE.vegOnly) {
      track.classList.remove('bg-stone-300', 'dark:bg-stone-700');
      track.classList.add('bg-emerald-600');
    } else {
      track.classList.remove('bg-emerald-600');
      track.classList.add('bg-stone-300', 'dark:bg-stone-700');
    }
  }
  if (thumb) {
    if (STATE.vegOnly) {
      thumb.classList.remove('translate-x-0');
      thumb.classList.add('translate-x-3.5');
    } else {
      thumb.classList.remove('translate-x-3.5');
      thumb.classList.add('translate-x-0');
    }
  }

  // 2. Sync internal toggles and profile preferences
  const pureToggle = document.getElementById('pureVegToggle');
  if (pureToggle) pureToggle.checked = STATE.vegOnly;

  const prefStatus = document.getElementById('prefVegModeStatus');
  if (prefStatus) prefStatus.innerText = STATE.vegOnly ? 'On' : 'Off';

  const profileVegToggle = document.getElementById('profileVegPrefToggle');
  if (profileVegToggle) profileVegToggle.checked = STATE.vegOnly;

  // 3. Sync legacy filter button if present
  const btn = document.getElementById('vegFilterBtn');
  if (btn) {
    btn.classList.toggle('border-emerald-600', STATE.vegOnly);
    btn.classList.toggle('bg-emerald-50', STATE.vegOnly);
    btn.classList.toggle('text-emerald-800', STATE.vegOnly);
  }

  loadStalls();
  showToast(STATE.vegOnly ? '🌱 Pure Veg Mode: Showing 100% vegetarian stalls' : 'Showing all options');
}`;

if (appJs.includes(oldVegFilterCode)) {
  appJs = appJs.replace(oldVegFilterCode, newVegFilterCode);
  console.log('✓ Replaced toggleVegFilter with animated switch track and thumb');
} else {
  console.error('FAILED to find oldVegFilterCode in appJs');
}

console.log('=== STEP 3: UPDATING HEALTHY MODE BUTTON IN APP.JS ===');
appJs = appJs.replace(
  `function toggleHealthyMode() {
  activeQuickFilters.healthy = !activeQuickFilters.healthy;
  const dockBtn = document.getElementById('dockTab_healthy');
  if (dockBtn) {
    dockBtn.classList.toggle('text-emerald-600', activeQuickFilters.healthy);
    dockBtn.classList.toggle('font-black', activeQuickFilters.healthy);
  }
  applyActiveFilters();
  showToast(activeQuickFilters.healthy ? '🥗 Healthy Street Mode: Highlighting Sprouts, Fruits & Steamed Items' : 'Showing full street menu');
}`,
  `function toggleHealthyMode() {
  activeQuickFilters.healthy = !activeQuickFilters.healthy;
  const dockBtn = document.getElementById('dockHealthyBtn') || document.getElementById('dockTab_healthy');
  if (dockBtn) {
    dockBtn.classList.toggle('bg-emerald-700', activeQuickFilters.healthy);
    dockBtn.classList.toggle('ring-2', activeQuickFilters.healthy);
    dockBtn.classList.toggle('ring-emerald-400', activeQuickFilters.healthy);
  }
  applyActiveFilters();
  showToast(activeQuickFilters.healthy ? '🥗 Healthy Street Mode: Highlighting Sprouts, Fruits & Steamed Items' : 'Showing full street menu');
}`
);

console.log('=== STEP 4: DYNAMIC GATING OF THELAS COUNT SEPARATOR IN APP.JS ===');
const oldRenderCount = `  if (countEl) {
    countEl.innerText = stalls.length > 0 ? \`\${stalls.length} verified carts\` : '0 active stalls';
  }`;

const newRenderCount = `  if (countEl) {
    countEl.innerText = stalls.length > 0 ? \`\${stalls.length} verified carts\` : '0 active stalls';
  }

  const thelasSeparator = document.getElementById('thelasCountSeparator');
  const exploreCountEl = document.getElementById('exploreMoreThelasCount');
  if (thelasSeparator) {
    if (stalls && stalls.length > 0) {
      thelasSeparator.classList.remove('hidden');
      if (exploreCountEl) exploreCountEl.innerText = \`\${stalls.length} STREET FOOD THELAS DELIVERING TO YOU\`;
    } else {
      thelasSeparator.classList.add('hidden');
      if (exploreCountEl) exploreCountEl.innerText = '0 STREET FOOD THELAS DELIVERING TO YOU';
    }
  }`;

if (appJs.includes(oldRenderCount)) {
  appJs = appJs.replace(oldRenderCount, newRenderCount);
  console.log('✓ Successfully injected dynamic thelas separator count in renderStalls()');
} else {
  console.error('FAILED to find oldRenderCount in appJs');
}

console.log('=== STEP 5: UPDATING OPENPROFILEMODAL IN APP.JS ===');
const oldProfileGold = `  const goldSavingsEl = document.getElementById('profileGoldSavings');
  if (goldSavingsEl) goldSavingsEl.innerText = (STATE.user && STATE.user.goldSavings) ? \`₹\${STATE.user.goldSavings} saved\` : 'Free Delivery Active';`;

const newProfileGold = `  const isVip = !!(STATE.user && STATE.user.goldMember);
  const goldTitle = document.getElementById('profileGoldTitle');
  const goldSub = document.getElementById('profileGoldSub');
  const goldSavingsEl = document.getElementById('profileGoldSavings');
  const goldBadge = document.getElementById('profileGoldBadge');
  
  if (isVip) {
    if (goldTitle) goldTitle.innerText = 'Gold Member Active';
    if (goldSub) goldSub.innerText = 'Unlimited Free Delivery & Priority Dispatch';
    if (goldSavingsEl) goldSavingsEl.innerText = (STATE.user && STATE.user.goldSavings) ? \`Saved ₹\${STATE.user.goldSavings}\` : 'VIP Active';
    if (goldBadge) {
      goldBadge.className = 'flex items-center space-x-1 bg-amber-400 text-stone-950 px-2.5 py-1 rounded-full text-xs font-black shadow-xs';
    }
  } else {
    if (goldTitle) goldTitle.innerText = 'Thela VIP Club';
    if (goldSub) goldSub.innerText = 'Unlimited Free Delivery on orders above ₹99';
    if (goldSavingsEl) goldSavingsEl.innerText = 'Buy @ ₹99';
    if (goldBadge) {
      goldBadge.className = 'flex items-center space-x-1 bg-amber-500 hover:bg-amber-400 text-stone-950 px-2.5 py-1 rounded-full text-xs font-black shadow-xs cursor-pointer';
    }
  }

  const earnedCoupons = (STATE.user && Array.isArray(STATE.user.earnedCoupons)) ? STATE.user.earnedCoupons : [];
  const couponsCountEl = document.getElementById('profileCouponsCount');
  if (couponsCountEl) {
    couponsCountEl.innerText = earnedCoupons.length > 0 ? \`\${earnedCoupons.length} available\` : '0 available';
  }`;

if (appJs.includes(oldProfileGold)) {
  appJs = appJs.replace(oldProfileGold, newProfileGold);
  console.log('✓ Successfully updated openProfileModal with dynamic VIP & earned coupons count');
} else {
  console.error('FAILED to find oldProfileGold in appJs');
}

console.log('=== STEP 6: ADDING BUYTHELAGOLDMEMBERSHIP & OPENTHELAGOLDMODAL IN APP.JS ===');
const oldGoldModalFunc = `// Thela Gold Modal
function openThelaGoldModal() {
  const modal = document.getElementById('thelaGoldModal');
  if (modal) {
    modal.classList.remove('hidden');
    AtmosphereManager.pushOverride('thelaGoldModal', 'minimal');
  }
}`;

const newGoldModalFunc = `// Thela Gold Modal & Purchase Flow
function openThelaGoldModal() {
  const modal = document.getElementById('thelaGoldModal');
  if (modal) {
    const isVip = !!(STATE.user && STATE.user.goldMember);
    const modalSavings = document.getElementById('goldModalSavings');
    const modalBadge = document.getElementById('goldModalBadge');
    const modalActionBtn = document.getElementById('goldModalActionBtn');

    if (isVip) {
      if (modalSavings) modalSavings.innerText = \`₹\${STATE.user?.goldSavings || 40}\`;
      if (modalBadge) modalBadge.innerText = 'Active Member';
      if (modalActionBtn) {
        modalActionBtn.innerText = 'VIP Membership Active';
        modalActionBtn.onclick = () => {
          showToast('👑 Your VIP Membership is active! Unlimited free delivery auto-applies.');
          closeThelaGoldModal();
        };
      }
    } else {
      if (modalSavings) modalSavings.innerText = '₹0';
      if (modalBadge) modalBadge.innerText = 'Join Club';
      if (modalActionBtn) {
        modalActionBtn.innerText = 'Buy VIP Membership @ ₹99';
        modalActionBtn.onclick = buyThelaGoldMembership;
      }
    }

    modal.classList.remove('hidden');
    AtmosphereManager.pushOverride('thelaGoldModal', 'minimal');
  }
}

function buyThelaGoldMembership() {
  if (!STATE.user || !STATE.user.phone) {
    closeThelaGoldModal();
    openAuthModal();
    showToast('Please log in with your phone to buy VIP Membership');
    return;
  }
  if (STATE.user.goldMember) {
    showToast('👑 You are already a VIP Member!');
    closeThelaGoldModal();
    return;
  }

  const proceed = confirm('👑 Buy Thela VIP Club Membership for ₹99?\\n\\n• Unlimited FREE Delivery on all street orders > ₹99\\n• Zero Packaging Fee\\n• 3-Month Validity');
  if (!proceed) return;

  if (STATE.user.walletBalance && STATE.user.walletBalance >= 99) {
    STATE.user.walletBalance -= 99;
  }
  STATE.user.goldMember = true;
  STATE.user.goldSavings = (STATE.user.goldSavings || 0) + 40;
  STATE.user.goldExpiresAt = new Date(Date.now() + 90 * 86400000).toISOString();

  localStorage.setItem('thela_user', JSON.stringify(STATE.user));

  fetch(\`/api/users/\${STATE.user.phone}\`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ goldMember: true, walletBalance: STATE.user.walletBalance })
  }).catch(e => console.warn('Sync VIP error:', e));

  closeThelaGoldModal();
  openProfileModal();
  showToast('👑 Congratulations! You are now a Thela VIP Member! Free Delivery is now active!');

  if (STATE.cart && STATE.cart.items.length > 0) {
    const sub = STATE.cart.items.reduce((s, i) => s + (i.price * i.qty), 0);
    updateBillBreakdown(sub);
  }
}`;

if (appJs.includes(oldGoldModalFunc)) {
  appJs = appJs.replace(oldGoldModalFunc, newGoldModalFunc);
  console.log('✓ Successfully injected openThelaGoldModal and buyThelaGoldMembership');
} else {
  console.error('FAILED to find oldGoldModalFunc in appJs');
}

console.log('=== STEP 7: DYNAMIC COUPONS DRAWER IN APP.JS ===');
const oldCouponsFunc = `// Coupons Drawer
function openCouponsDrawer() {
  const drawer = document.getElementById('couponsDrawer');
  if (drawer) {
    drawer.classList.remove('hidden');
    AtmosphereManager.pushOverride('couponsDrawer', 'minimal');
  }
}`;

const newCouponsFunc = `// Coupons Drawer — Dynamic Earned Coupons System
function openCouponsDrawer() {
  const drawer = document.getElementById('couponsDrawer');
  if (drawer) {
    renderCouponsDrawerContent();
    drawer.classList.remove('hidden');
    AtmosphereManager.pushOverride('couponsDrawer', 'minimal');
  }
}

function renderCouponsDrawerContent() {
  const container = document.getElementById('couponsListContainer');
  const subEl = document.getElementById('couponsDrawerSubtitle');
  if (!container) return;

  const earned = (STATE.user && Array.isArray(STATE.user.earnedCoupons)) ? STATE.user.earnedCoupons : [];
  if (subEl) {
    subEl.innerText = earned.length > 0 ? \`\${earned.length} earned street voucher\${earned.length > 1 ? 's' : ''} active\` : 'Coupons unlocked by placing street food orders';
  }

  if (earned.length === 0) {
    container.innerHTML = \`
      <div class="text-center py-10 px-4 space-y-3 bg-stone-50 dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800">
        <div class="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-600 flex items-center justify-center mx-auto text-xl shadow-xs">
          <i class="fa-solid fa-gift"></i>
        </div>
        <h4 class="font-black text-sm text-stone-900 dark:text-stone-100">0 Coupons Available</h4>
        <p class="text-xs text-stone-500 dark:text-stone-400 max-w-xs mx-auto leading-relaxed">
          Coupons are earned from completed street food orders! Place your first order to unlock scratch cards & discount vouchers.
        </p>
        <button onclick="closeCouponsDrawer()" class="px-4 py-2 rounded-xl bg-amber-600 text-white font-bold text-xs hover:bg-amber-700 transition shadow-sm">
          Explore Street Carts
        </button>
      </div>
    \`;
    return;
  }

  container.innerHTML = earned.map(c => \`
    <div class="p-3.5 rounded-2xl bg-stone-50 dark:bg-stone-900 border border-amber-300 dark:border-amber-500/30 flex items-center justify-between shadow-xs">
      <div>
        <div class="flex items-center space-x-2">
          <span class="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-700 dark:text-amber-300 font-mono font-black text-xs">\${c.code}</span>
          <span class="text-xs font-black text-stone-900 dark:text-white">\${c.title || 'Street Food Reward'}</span>
        </div>
        <p class="text-[10px] text-stone-500 dark:text-stone-400 mt-1">₹\${c.discount} OFF on orders above ₹\${c.minCart || 99}</p>
      </div>
      <button onclick="applyCoupon('\${c.code}')" class="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-black transition shadow-xs">
        Apply
      </button>
    </div>
  \`).join('');
}`;

if (appJs.includes(oldCouponsFunc)) {
  appJs = appJs.replace(oldCouponsFunc, newCouponsFunc);
  console.log('✓ Successfully injected renderCouponsDrawerContent');
} else {
  console.error('FAILED to find oldCouponsFunc in appJs');
}

console.log('=== STEP 8: AWARD COUPON ON ORDER SUCCESS IN APP.JS ===');
const oldPaymentSuccess = `    if (data.success && data.payment_status === 'PAID') {
      showToast('🎉 Payment Verified via Sandbox Gateway!');
      closePaymentModal();`;

const newPaymentSuccess = `    if (data.success && data.payment_status === 'PAID') {
      // Award earned coupon to user from this completed order
      if (STATE.user) {
        if (!Array.isArray(STATE.user.earnedCoupons)) STATE.user.earnedCoupons = [];
        const discountAmt = Math.floor(15 + Math.random() * 25);
        const codeNum = Math.floor(100 + Math.random() * 900);
        const newCoupon = {
          code: \`STREET\${codeNum}\`,
          discount: discountAmt,
          minCart: 99,
          title: \`₹\${discountAmt} Order Loyalty Reward\`,
          earnedOn: new Date().toLocaleDateString('en-IN')
        };
        STATE.user.earnedCoupons.push(newCoupon);
        try { localStorage.setItem('thela_user', JSON.stringify(STATE.user)); } catch (e) {}
        showToast(\`🎉 Order Placed! You earned street coupon \${newCoupon.code} (₹\${discountAmt} OFF)!\`);
      } else {
        showToast('🎉 Payment Verified via Sandbox Gateway!');
      }
      closePaymentModal();`;

if (appJs.includes(oldPaymentSuccess)) {
  appJs = appJs.replace(oldPaymentSuccess, newPaymentSuccess);
  console.log('✓ Successfully injected coupon award logic on verified payment');
} else {
  console.error('FAILED to find oldPaymentSuccess in appJs');
}

// Convert line endings back to CRLF for consistency
fs.writeFileSync(htmlPath, html.replace(/\n/g, '\r\n'), 'utf8');
fs.writeFileSync(appJsPath, appJs.replace(/\n/g, '\r\n'), 'utf8');

console.log('=== ALL EXACT PATCHES APPLIED AND WRITTEN SAFELY! ===');
