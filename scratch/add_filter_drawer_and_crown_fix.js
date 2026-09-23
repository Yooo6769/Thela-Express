// scratch/add_filter_drawer_and_crown_fix.js
const fs = require('fs');
const path = require('path');

const htmlPath = path.join(__dirname, '..', 'public', 'index.html');
const appJsPath = path.join(__dirname, '..', 'public', 'app.js');

let html = fs.readFileSync(htmlPath, 'utf8').replace(/\r\n/g, '\n');
let appJs = fs.readFileSync(appJsPath, 'utf8').replace(/\r\n/g, '\n');

console.log('--- 1. UPDATING HEADER AUTH BUTTON & CROWN BADGE IN INDEX.HTML ---');
const oldAuthBtn = `        <!-- Auth / Profile Button with VIP Gold Avatar Ring (Screenshot 1 & 4) -->
        <button id="authBtn" onclick="handleAuthBtnClick()" class="relative w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-gradient-to-tr from-amber-400 via-amber-200 to-amber-500 p-0.5 shadow-sm hover:scale-105 transition shrink-0" title="My Profile & Settings">
          <div class="w-full h-full rounded-full bg-stone-900 text-amber-300 flex items-center justify-center font-black text-xs sm:text-sm">
            <span id="headerAvatarInitial"><i class="fa-regular fa-user text-xs"></i></span>
          </div>
          <span class="absolute -top-1 -right-1 w-3.5 h-3.5 bg-amber-500 text-stone-900 rounded-full flex items-center justify-center text-[7px] font-black shadow-xs">
            <i class="fa-solid fa-crown text-[6px]"></i>
          </span>
        </button>`;

const newAuthBtn = `        <!-- Auth / Profile Button (Only shows VIP crown if membership bought) -->
        <button id="authBtn" onclick="handleAuthBtnClick()" class="relative w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 shadow-sm hover:scale-105 transition shrink-0" title="My Profile & Settings">
          <div id="headerAvatarInner" class="w-full h-full rounded-full flex items-center justify-center font-black text-xs sm:text-sm text-stone-700 dark:text-stone-200">
            <span id="headerAvatarInitial"><i class="fa-regular fa-user text-xs"></i></span>
          </div>
          <span id="headerCrownBadge" class="hidden absolute -top-1 -right-1 w-3.5 h-3.5 bg-amber-500 text-stone-950 rounded-full flex items-center justify-center text-[7px] font-black shadow-xs">
            <i class="fa-solid fa-crown text-[6px]"></i>
          </span>
        </button>`;

if (html.includes(oldAuthBtn)) {
  html = html.replace(oldAuthBtn, newAuthBtn);
  console.log('✓ Successfully updated header avatar to hide crown unless VIP bought');
} else {
  console.log('Notice: oldAuthBtn not found verbatim, checking regex');
  html = html.replace(/<button id="authBtn"[\s\S]*?<\/button>/, newAuthBtn.trim());
}

console.log('--- 2. ADDING INTERACTIVE FILTER DRAWER MODAL TO INDEX.HTML ---');
const filterDrawerHtml = `  <!-- ============================================================== -->
  <!-- MODAL: INTERACTIVE FILTER & SORT DRAWER                        -->
  <!-- ============================================================== -->
  <div id="filterModal" class="hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 transition-all">
    <div class="bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl p-5 space-y-4 shadow-2xl border border-stone-200 dark:border-stone-800 animate-in slide-in-from-bottom duration-200">
      <div class="flex items-center justify-between border-b border-stone-200 dark:border-stone-800 pb-3">
        <div class="flex items-center space-x-2">
          <div class="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center">
            <i class="fa-solid fa-sliders text-sm"></i>
          </div>
          <h3 class="font-black text-base">Filters & Sorting</h3>
        </div>
        <button onclick="closeFilterDrawer()" class="w-8 h-8 rounded-full bg-stone-100 dark:bg-stone-800 text-stone-500 dark:text-stone-400 hover:bg-stone-200 dark:hover:text-white flex items-center justify-center">
          <i class="fa-solid fa-xmark text-sm"></i>
        </button>
      </div>

      <!-- Quick Toggles -->
      <div class="space-y-2.5 text-xs font-bold">
        <div class="text-[11px] font-black uppercase text-stone-400 tracking-wider">Quick Filters</div>
        
        <label class="flex items-center justify-between p-3 rounded-2xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-800 cursor-pointer hover:border-amber-500 transition">
          <div class="flex items-center space-x-2.5">
            <span class="w-4 h-4 rounded border border-green-500 flex items-center justify-center p-0.5">
              <span class="w-2 h-2 rounded-full bg-green-500"></span>
            </span>
            <span>Pure Veg Stalls Only</span>
          </div>
          <input type="checkbox" id="modalFilterVeg" class="w-4 h-4 accent-emerald-600 rounded">
        </label>

        <label class="flex items-center justify-between p-3 rounded-2xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-800 cursor-pointer hover:border-amber-500 transition">
          <div class="flex items-center space-x-2.5">
            <i class="fa-solid fa-bolt text-amber-500"></i>
            <span>Near & Fast Delivery (&lt; 25 mins)</span>
          </div>
          <input type="checkbox" id="modalFilterNearFast" class="w-4 h-4 accent-amber-500 rounded">
        </label>

        <label class="flex items-center justify-between p-3 rounded-2xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-800 cursor-pointer hover:border-amber-500 transition">
          <div class="flex items-center space-x-2.5">
            <i class="fa-solid fa-leaf text-emerald-500"></i>
            <span>Zero Packaging Fee Stalls</span>
          </div>
          <input type="checkbox" id="modalFilterNoPackaging" class="w-4 h-4 accent-emerald-500 rounded">
        </label>

        <label class="flex items-center justify-between p-3 rounded-2xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-800 cursor-pointer hover:border-amber-500 transition">
          <div class="flex items-center space-x-2.5">
            <i class="fa-solid fa-star text-amber-500"></i>
            <span>Top Rated (4.0+ Stars)</span>
          </div>
          <input type="checkbox" id="modalFilterTopRated" class="w-4 h-4 accent-amber-500 rounded">
        </label>
      </div>

      <div class="pt-2 flex items-center space-x-2">
        <button onclick="clearAllFiltersFromModal()" class="w-1/3 py-2.5 rounded-xl border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300 font-bold text-xs hover:bg-stone-100 dark:hover:bg-stone-800 transition">
          Clear All
        </button>
        <button onclick="applyFiltersFromModal()" class="flex-1 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-black text-xs shadow-md transition">
          Apply Filters
        </button>
      </div>
    </div>
  </div>`;

if (!html.includes('id="filterModal"')) {
  html = html.replace('<!-- ==============================================================\n  <!-- FLOATING MODERN FROSTED-GLASS BOTTOM DOCK', filterDrawerHtml + '\n\n  <!-- ==============================================================\n  <!-- FLOATING MODERN FROSTED-GLASS BOTTOM DOCK');
  console.log('✓ Injected interactive filter modal into index.html');
}

fs.writeFileSync(htmlPath, html.replace(/\n/g, '\r\n'), 'utf8');

console.log('--- 3. UPDATING UPDATEAUTHUI AND OPENFILTERDRAWER IN APP.JS ---');
// Update updateAuthUI
const oldUpdateAuthUI = `function updateAuthUI() {
  const btn = document.getElementById('authBtn');
  if (!btn) return;
  if (STATE.user && STATE.user.phone) {
    const initials = (STATE.user.name || 'SF').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
    btn.innerHTML = \`<span class="text-xs font-black uppercase text-orange-700">\${initials || 'SF'}</span>\`;
    btn.title = \`Profile: \${STATE.user.name} (\${STATE.user.phone})\`;
  } else {
    btn.innerHTML = \`<i class="fa-regular fa-user"></i>\`;
    btn.title = 'Login / Sign Up';
  }
}`;

const newUpdateAuthUI = `function updateAuthUI() {
  const btn = document.getElementById('authBtn');
  const avatarInner = document.getElementById('headerAvatarInner');
  const initialEl = document.getElementById('headerAvatarInitial');
  const crownBadge = document.getElementById('headerCrownBadge');
  if (!btn) return;

  const isVip = !!(STATE.user && STATE.user.goldMember);
  if (crownBadge) {
    crownBadge.classList.toggle('hidden', !isVip);
  }

  if (STATE.user && STATE.user.phone) {
    const initials = (STATE.user.name || 'SF').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
    if (initialEl) initialEl.innerText = initials || 'SF';
    if (avatarInner) {
      if (isVip) {
        btn.className = 'relative w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-gradient-to-tr from-amber-400 via-amber-200 to-amber-500 p-0.5 shadow-sm hover:scale-105 transition shrink-0';
        avatarInner.className = 'w-full h-full rounded-full bg-stone-900 text-amber-300 flex items-center justify-center font-black text-xs sm:text-sm';
      } else {
        btn.className = 'relative w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-stone-100 dark:bg-stone-800 border border-stone-300 dark:border-stone-700 shadow-sm hover:scale-105 transition shrink-0';
        avatarInner.className = 'w-full h-full rounded-full flex items-center justify-center font-black text-xs sm:text-sm text-stone-700 dark:text-stone-200';
      }
    }
    btn.title = \`Profile: \${STATE.user.name || 'User'} (\${STATE.user.phone})\`;
  } else {
    if (initialEl) initialEl.innerHTML = \`<i class="fa-regular fa-user text-xs"></i>\`;
    if (avatarInner) {
      btn.className = 'relative w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 shadow-sm hover:scale-105 transition shrink-0';
      avatarInner.className = 'w-full h-full rounded-full flex items-center justify-center font-black text-xs sm:text-sm text-stone-700 dark:text-stone-200';
    }
    btn.title = 'Login / Sign Up';
  }
}`;

if (appJs.includes(oldUpdateAuthUI)) {
  appJs = appJs.replace(oldUpdateAuthUI, newUpdateAuthUI);
  console.log('✓ Replaced updateAuthUI with dynamic VIP crown display');
}

// Update openFilterDrawer to open #filterModal
const oldOpenFilterDrawer = `function openFilterDrawer() {
  const hasActive = Object.values(activeQuickFilters).some(Boolean);
  if (hasActive) {
    activeQuickFilters = { nearFast: false, noPackaging: false, topRated: false, healthy: false };
    ['btnNearFast', 'btnNoPackaging', 'btnTopRated'].forEach(id => {
      const b = document.getElementById(id);
      if (b) {
        b.className = b.className.replace(/bg-rose-50|border-rose-500|text-rose-600|bg-emerald-50|border-emerald-500|text-emerald-700|bg-amber-50|border-amber-500|text-amber-800/g, '').trim();
      }
    });
    applyActiveFilters();
    showToast('Filters cleared — showing all stalls');
  } else {
    showToast('Select any filter pill above to refine stalls');
  }
}`;

const newOpenFilterDrawer = `function openFilterDrawer() {
  const modal = document.getElementById('filterModal');
  if (modal) {
    const vegInput = document.getElementById('modalFilterVeg');
    const nearFastInput = document.getElementById('modalFilterNearFast');
    const noPackInput = document.getElementById('modalFilterNoPackaging');
    const topRatedInput = document.getElementById('modalFilterTopRated');

    if (vegInput) vegInput.checked = !!STATE.vegOnly;
    if (nearFastInput) nearFastInput.checked = !!activeQuickFilters.nearFast;
    if (noPackInput) noPackInput.checked = !!activeQuickFilters.noPackaging;
    if (topRatedInput) topRatedInput.checked = !!activeQuickFilters.topRated;

    modal.classList.remove('hidden');
    AtmosphereManager.pushOverride('filterModal', 'minimal');
  }
}

function closeFilterDrawer() {
  const modal = document.getElementById('filterModal');
  if (modal) {
    modal.classList.add('hidden');
    AtmosphereManager.popOverride('filterModal');
  }
}

function applyFiltersFromModal() {
  const vegInput = document.getElementById('modalFilterVeg');
  const nearFastInput = document.getElementById('modalFilterNearFast');
  const noPackInput = document.getElementById('modalFilterNoPackaging');
  const topRatedInput = document.getElementById('modalFilterTopRated');

  if (vegInput && vegInput.checked !== STATE.vegOnly) {
    toggleVegFilter();
  }

  activeQuickFilters.nearFast = nearFastInput ? nearFastInput.checked : false;
  activeQuickFilters.noPackaging = noPackInput ? noPackInput.checked : false;
  activeQuickFilters.topRated = topRatedInput ? topRatedInput.checked : false;

  const bNear = document.getElementById('btnNearFast');
  if (bNear) {
    bNear.classList.toggle('bg-rose-50', activeQuickFilters.nearFast);
    bNear.classList.toggle('border-rose-500', activeQuickFilters.nearFast);
    bNear.classList.toggle('text-rose-600', activeQuickFilters.nearFast);
  }
  const bPack = document.getElementById('btnNoPackaging');
  if (bPack) {
    bPack.classList.toggle('bg-emerald-50', activeQuickFilters.noPackaging);
    bPack.classList.toggle('border-emerald-500', activeQuickFilters.noPackaging);
    bPack.classList.toggle('text-emerald-700', activeQuickFilters.noPackaging);
  }
  const bTop = document.getElementById('btnTopRated');
  if (bTop) {
    bTop.classList.toggle('bg-amber-50', activeQuickFilters.topRated);
    bTop.classList.toggle('border-amber-500', activeQuickFilters.topRated);
    bTop.classList.toggle('text-amber-800', activeQuickFilters.topRated);
  }

  applyActiveFilters();
  closeFilterDrawer();
  showToast('Filters updated successfully');
}

function clearAllFiltersFromModal() {
  if (STATE.vegOnly) {
    toggleVegFilter();
  }
  activeQuickFilters = { nearFast: false, noPackaging: false, topRated: false, healthy: false };
  ['btnNearFast', 'btnNoPackaging', 'btnTopRated'].forEach(id => {
    const b = document.getElementById(id);
    if (b) {
      b.className = b.className.replace(/bg-rose-50|border-rose-500|text-rose-600|bg-emerald-50|border-emerald-500|text-emerald-700|bg-amber-50|border-amber-500|text-amber-800/g, '').trim();
    }
  });
  applyActiveFilters();
  closeFilterDrawer();
  showToast('All filters cleared');
}`;

if (appJs.includes(oldOpenFilterDrawer)) {
  appJs = appJs.replace(oldOpenFilterDrawer, newOpenFilterDrawer);
  console.log('✓ Injected interactive openFilterDrawer modal handler');
}

fs.writeFileSync(appJsPath, appJs.replace(/\n/g, '\r\n'), 'utf8');
console.log('✓ app.js successfully saved');
