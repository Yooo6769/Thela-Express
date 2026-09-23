// scratch/update_app_zomato.js
const fs = require('fs');
const path = require('path');

const appJsPath = path.join(__dirname, '..', 'public', 'app.js');
let appJs = fs.readFileSync(appJsPath, 'utf8');

// Detect line ending
const isCRLF = appJs.includes('\r\n');
const EOL = isCRLF ? '\r\n' : '\n';

console.log('Original public/app.js length:', appJs.length, '| Line ending:', isCRLF ? 'CRLF' : 'LF');

// Helper to replace matching normalized CRLF
function smartReplace(source, targetSearch, replacement) {
  // Normalize both to LF for searching
  const normSource = source.replace(/\r\n/g, '\n');
  const normTarget = targetSearch.replace(/\r\n/g, '\n');
  const normRepl = replacement.replace(/\r\n/g, EOL);

  if (normSource.includes(normTarget)) {
    // Replace in normalized, then restore CRLF if needed
    const replaced = normSource.replace(normTarget, normRepl);
    return isCRLF ? replaced.replace(/\n/g, '\r\n') : replaced;
  }
  console.warn('⚠️ Could not find target:', targetSearch.slice(0, 40));
  return source;
}

// 1. Hook initPromoCarousel in DOMContentLoaded
if (!appJs.includes('initPromoCarousel();')) {
  appJs = smartReplace(
    appJs,
    'AtmosphereManager.init();',
    'AtmosphereManager.init();\n  initPromoCarousel();'
  );
  console.log('✓ Hooked initPromoCarousel in DOMContentLoaded');
}

// 2. Enhance loadStoredUser to seed Anurag profile if no stored user
const targetLoadStored = `async function loadStoredUser() {
  const saved = localStorage.getItem('thela_user');`;

const replLoadStored = `async function loadStoredUser() {
  let saved = localStorage.getItem('thela_user');
  if (!saved) {
    const defaultAnurag = {
      name: 'Anurag',
      phone: '9876543210',
      email: 'anurag@thelaexpress.com',
      goldMember: true,
      goldSavings: 10816,
      walletBalance: 0,
      vegPreference: false,
      addresses: [
        { id: 'addr_1', tag: 'Home', title: 'B-402, Shivalik Residency', address: 'B-402, Shivalik Residency, Near Metro Pillar 142', isDefault: true }
      ],
      favorites: []
    };
    localStorage.setItem('thela_user', JSON.stringify(defaultAnurag));
    saved = JSON.stringify(defaultAnurag);
  }`;

appJs = smartReplace(appJs, targetLoadStored, replLoadStored);
console.log('✓ Seeded default VIP profile in loadStoredUser');

// 3. Update updateHeaderLocation to handle Zomato header pills
const targetUpdateHeader = `function updateHeaderLocation() {
  const locEl = document.getElementById('headerLocation');
  if (!locEl) return;
  if (STATE.activeAddress) {
    const icon = STATE.activeAddress.tag === 'Home' ? '🏠' : (STATE.activeAddress.tag === 'Work' ? '💼' : '📍');
    locEl.innerText = \`\${icon} \${STATE.activeAddress.tag}: \${STATE.activeAddress.title}\`;
  } else {
    locEl.innerText = 'Select Delivery Location';
  }
}`;

const replUpdateHeader = `function updateHeaderLocation() {
  const locEl = document.getElementById('headerLocation');
  const tagEl = document.getElementById('headerLocationTag');
  const addrEl = document.getElementById('headerLocationAddress');
  const walletEl = document.getElementById('headerWalletBalance');

  if (walletEl) {
    walletEl.innerText = \`₹\${STATE.user?.walletBalance || 0}\`;
  }

  if (STATE.activeAddress) {
    const icon = STATE.activeAddress.tag === 'Home' ? '🏠' : (STATE.activeAddress.tag === 'Work' ? '💼' : '📍');
    if (tagEl) tagEl.innerText = STATE.activeAddress.tag || 'Home';
    if (addrEl) addrEl.innerText = STATE.activeAddress.title || STATE.activeAddress.address || 'Select Address';
    if (locEl) locEl.innerText = \`\${icon} \${STATE.activeAddress.tag}: \${STATE.activeAddress.title || STATE.activeAddress.address}\`;
  } else {
    if (tagEl) tagEl.innerText = 'Home';
    if (addrEl) addrEl.innerText = 'B-402, Shivalik Residency, Near Metro Pillar 142';
    if (locEl) locEl.innerText = 'Select Delivery Location';
  }
}`;

appJs = smartReplace(appJs, targetUpdateHeader, replUpdateHeader);
console.log('✓ Updated updateHeaderLocation for Zomato header pills');

// 4. Update toggleVegFilter to sync pureVegToggle
const targetToggleVeg = `function toggleVegFilter() {
  STATE.vegOnly = !STATE.vegOnly;
  const btn = document.getElementById('vegFilterBtn');
  if (btn) {
    btn.classList.toggle('border-emerald-600', STATE.vegOnly);
    btn.classList.toggle('bg-emerald-50', STATE.vegOnly);
    btn.classList.toggle('text-emerald-800', STATE.vegOnly);
  }
  loadStalls();
}`;

const replToggleVeg = `function toggleVegFilter() {
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

appJs = smartReplace(appJs, targetToggleVeg, replToggleVeg);
console.log('✓ Updated toggleVegFilter with switch sync and toast');

// 5. Update filterCategory to highlight circular story track
const targetFilterCat = `function filterCategory(cat) {
  STATE.selectedCategory = cat;

  document.querySelectorAll('.cat-pill').forEach(btn => {
    const onclickAttr = btn.getAttribute('onclick') || '';
    if (onclickAttr.includes(\`filterCategory('\${cat}')\`) || onclickAttr.includes(\`filterCategory("\${cat}")\`)) {
      btn.className = 'cat-pill active px-4 py-2 rounded-xl bg-stone-900 text-white font-bold whitespace-nowrap shadow-xs transition flex items-center space-x-1.5';
    } else {
      btn.className = 'cat-pill px-4 py-2 rounded-xl bg-white border border-stone-200 text-stone-700 font-bold whitespace-nowrap hover:bg-amber-50 transition shadow-xs flex items-center space-x-1.5';
    }
  });

  loadStalls();
}`;

const replFilterCat = `function filterCategory(cat) {
  STATE.selectedCategory = cat;

  document.querySelectorAll('.cat-pill').forEach(btn => {
    const onclickAttr = btn.getAttribute('onclick') || '';
    if (onclickAttr.includes(\`filterCategory('\${cat}')\`) || onclickAttr.includes(\`filterCategory("\${cat}")\`)) {
      btn.className = 'cat-pill active px-4 py-2 rounded-xl bg-stone-900 text-white font-bold whitespace-nowrap shadow-xs transition flex items-center space-x-1.5';
    } else {
      btn.className = 'cat-pill px-4 py-2 rounded-xl bg-white border border-stone-200 text-stone-700 font-bold whitespace-nowrap hover:bg-amber-50 transition shadow-xs flex items-center space-x-1.5';
    }
  });

  // Sync circular category stories rail
  document.querySelectorAll('.cat-circle-item').forEach(item => {
    const itemCat = item.getAttribute('data-category');
    const imgWrap = item.querySelector('.cat-circle-img-wrap');
    const label = item.querySelector('.cat-circle-label');
    const indicator = item.querySelector('.cat-circle-indicator');
    const isMatch = (itemCat === cat || (cat === 'all' && itemCat === 'all'));

    if (isMatch) {
      if (imgWrap) {
        imgWrap.classList.add('ring-2', 'ring-rose-500', 'ring-offset-2', 'scale-105');
        imgWrap.classList.remove('border-stone-200');
      }
      if (label) {
        label.classList.add('font-black', 'text-rose-600', 'dark:text-rose-400');
        label.classList.remove('font-medium', 'text-stone-700', 'dark:text-stone-300');
      }
      if (indicator) indicator.classList.remove('opacity-0');
    } else {
      if (imgWrap) {
        imgWrap.classList.remove('ring-2', 'ring-rose-500', 'ring-offset-2', 'scale-105');
        imgWrap.classList.add('border-stone-200');
      }
      if (label) {
        label.classList.remove('font-black', 'text-rose-600', 'dark:text-rose-400');
        label.classList.add('font-medium', 'text-stone-700', 'dark:text-stone-300');
      }
      if (indicator) indicator.classList.add('opacity-0');
    }
  });

  loadStalls();
}`;

appJs = smartReplace(appJs, targetFilterCat, replFilterCat);
console.log('✓ Updated filterCategory with circular track sync');

// 6. Update openProfileModal to populate Zomato VIP Profile fields
const targetOpenProfile = `  if (nameEl) nameEl.innerText = STATE.user.name || 'Food Explorer';
  if (phoneEl) phoneEl.innerText = \`+91 \${STATE.user.phone}\`;
  if (nameInput) nameInput.value = STATE.user.name || '';
  if (emailInput) emailInput.value = STATE.user.email || '';
  if (vegToggle) vegToggle.checked = !!STATE.user.vegPreference;
  if (ordersStat) ordersStat.innerText = STATE.activeOrders.length || 0;
  if (addrsStat) addrsStat.innerText = (STATE.user.addresses && STATE.user.addresses.length) || 0;
  if (favsStat) favsStat.innerText = STATE.favorites.length || 0;`;

const replOpenProfile = `  if (nameEl) nameEl.innerText = STATE.user.name || 'Anurag';
  if (phoneEl) phoneEl.innerText = \`+91 \${STATE.user.phone || '9876543210'}\`;
  const emailEl = document.getElementById('profileModalEmail');
  if (emailEl) emailEl.innerText = STATE.user.email || 'anurag@thelaexpress.com';
  const goldSavingsEl = document.getElementById('profileGoldSavings');
  if (goldSavingsEl) goldSavingsEl.innerText = \`₹\${(STATE.user.goldSavings || 10816).toLocaleString('en-IN')}\`;
  const walletEl = document.getElementById('profileWalletAmount');
  if (walletEl) walletEl.innerText = \`₹\${STATE.user.walletBalance || 0}\`;

  if (nameInput) nameInput.value = STATE.user.name || 'Anurag';
  if (emailInput) emailInput.value = STATE.user.email || 'anurag@thelaexpress.com';
  if (vegToggle) vegToggle.checked = !!STATE.user.vegPreference;
  if (ordersStat) ordersStat.innerText = STATE.activeOrders.length || 18;
  if (addrsStat) addrsStat.innerText = (STATE.user.addresses && STATE.user.addresses.length) || 2;
  if (favsStat) favsStat.innerText = STATE.favorites.length || 6;`;

appJs = smartReplace(appJs, targetOpenProfile, replOpenProfile);
console.log('✓ Updated openProfileModal with Zomato VIP stats & savings');

// 7. Update updateBillBreakdown to support coupons
const targetBillBreakdown = `function updateBillBreakdown(subtotal) {
  const packaging = subtotal > 0 ? 10 : 0;
  const tip = STATE.riderTip || 0;
  const grandTotal = subtotal + packaging + tip;`;

const replBillBreakdown = `function updateBillBreakdown(subtotal) {
  const packaging = (subtotal > 0 && !activeQuickFilters.noPackaging) ? 10 : 0;
  const tip = STATE.riderTip || 0;
  
  let discount = 0;
  if (STATE.appliedCoupon && subtotal > 0) {
    if (STATE.appliedCoupon === 'THELA70') {
      discount = Math.min(Math.round(subtotal * 0.7), 70);
    } else if (STATE.appliedCoupon === 'GOLD50') {
      discount = Math.min(Math.round(subtotal * 0.5), 50);
    } else if (STATE.appliedCoupon === 'CHAI20') {
      discount = Math.min(20, subtotal);
    } else if (STATE.appliedCoupon === 'STREETCHEF') {
      discount = Math.min(40, subtotal);
    } else {
      discount = Math.min(Math.round(subtotal * 0.2), 50);
    }
  }

  const grandTotal = Math.max(0, subtotal + packaging + tip - discount);

  const discountRow = document.getElementById('couponDiscountRow');
  const discountVal = document.getElementById('couponDiscountVal');
  if (discountRow && discountVal) {
    if (discount > 0) {
      discountRow.classList.remove('hidden');
      discountVal.innerText = \`-₹\${discount} (\${STATE.appliedCoupon})\`;
    } else {
      discountRow.classList.add('hidden');
    }
  }`;

appJs = smartReplace(appJs, targetBillBreakdown, replBillBreakdown);
console.log('✓ Updated updateBillBreakdown with coupon discounts');

// 8. Update renderStalls to feature Zomato-grade visual badges
const targetCardTopLeft = `          <!-- Top-Left: Open / Closed Badge & Prominent Dynamic Delivery ETA -->
          <div class="absolute top-3 left-3 flex items-center space-x-1.5 flex-wrap gap-y-1">
            \${stall.isOpen 
              ? \`<span class="bg-emerald-600/95 backdrop-blur text-white text-[10px] font-black px-2.5 py-1 rounded-full flex items-center shadow-md">
                  <span class="w-1.5 h-1.5 rounded-full bg-white mr-1.5 animate-pulse"></span>OPEN
                </span>\`
              : \`<span class="bg-stone-900/90 backdrop-blur text-stone-200 text-[10px] font-black px-2.5 py-1 rounded-full shadow-md">CLOSED</span>\`
            }
            <span class="thela-eta-badge bg-stone-900/90 backdrop-blur text-white text-[10px] font-black px-2.5 py-1 rounded-full shadow-md flex items-center space-x-1 border border-white/20">
              <i class="fa-solid fa-motorcycle text-amber-400 text-[10px]"></i>
              <span>\${eta.pillText}</span>
            </span>
          </div>`;

const replCardTopLeft = `          <!-- Top-Left: Open / Closed Badge & Zomato Delivery ETA -->
          <div class="absolute top-3 left-3 flex items-center space-x-1.5 flex-wrap gap-y-1 z-10">
            \${stall.isOpen 
              ? \`<span class="bg-emerald-600/95 backdrop-blur text-white text-[10px] font-black px-2.5 py-1 rounded-full flex items-center shadow-md">
                  <span class="w-1.5 h-1.5 rounded-full bg-white mr-1.5 animate-pulse"></span>OPEN
                </span>\`
              : \`<span class="bg-stone-900/90 backdrop-blur text-stone-200 text-[10px] font-black px-2.5 py-1 rounded-full shadow-md">CLOSED</span>\`
            }
            <span class="thela-eta-badge bg-stone-900/90 backdrop-blur text-white text-[10px] font-black px-2.5 py-1 rounded-full shadow-md flex items-center space-x-1 border border-white/20">
              <i class="fa-solid fa-bolt text-amber-400 text-[10px]"></i>
              <span>\${eta.pillText}</span>
            </span>
          </div>`;

appJs = smartReplace(appJs, targetCardTopLeft, replCardTopLeft);

// Update Bottom Overlays in photo to feature Zomato Discount Ribbon
const targetCardBottomOverlay = `          <!-- Bottom Overlays: Distance & Discount (Data-Gated: Omitted if unavailable) -->
          <div class="absolute bottom-3 left-3 right-3 flex items-center justify-between pointer-events-none">
            \${stall.discount ? \`
              <span class="bg-amber-600 text-white text-[10px] font-black px-2.5 py-0.5 rounded-md shadow-md">
                \${stall.discount}
              </span>
            \` : '<span></span>'}
            \${distText ? \`
              <span class="bg-stone-900/80 backdrop-blur text-white text-[10px] font-bold px-2 py-0.5 rounded-md shadow-md flex items-center space-x-1">
                <i class="fa-solid fa-location-dot text-amber-400 text-[9px]"></i>
                <span>\${distText}</span>
              </span>
            \` : ''}
          </div>`;

const replCardBottomOverlay = `          <!-- Zomato Floating Discount Banner & Proximity Badge -->
          <div class="absolute bottom-3 left-3 right-3 flex items-end justify-between pointer-events-none z-10">
            <span class="bg-gradient-to-r from-blue-700 to-indigo-800 text-white text-[11px] font-black px-2.5 py-1 rounded-md shadow-lg flex items-center space-x-1 tracking-tight border border-blue-400/30">
              <i class="fa-solid fa-badge-percent text-amber-300 mr-1 text-[10px]"></i>
              <span>\${stall.discount || (stall.isVeg ? 'Items starting at ₹49' : '20% OFF up to ₹50')}</span>
            </span>
            \${distText ? \`
              <span class="bg-stone-900/85 backdrop-blur-sm text-white text-[10px] font-extrabold px-2 py-1 rounded-md shadow-md flex items-center space-x-1 border border-white/10">
                <i class="fa-solid fa-location-dot text-amber-400 text-[9px]"></i>
                <span>\${distText}</span>
              </span>
            \` : ''}
          </div>`;

appJs = smartReplace(appJs, targetCardBottomOverlay, replCardBottomOverlay);
console.log('✓ Enhanced stall card photo overlays with Zomato discount ribbon');

fs.writeFileSync(appJsPath, appJs, 'utf8');
console.log('🎉 Successfully finished all updates in public/app.js! New length:', appJs.length);
