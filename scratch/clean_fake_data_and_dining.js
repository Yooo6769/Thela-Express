// scratch/clean_fake_data_and_dining.js
const fs = require('fs');
const path = require('path');

const htmlPath = path.join(__dirname, '..', 'public', 'index.html');
const appJsPath = path.join(__dirname, '..', 'public', 'app.js');

let html = fs.readFileSync(htmlPath, 'utf8');
let appJs = fs.readFileSync(appJsPath, 'utf8');

console.log('--- PURGING FAKE DATA, COPIED PROFILES & DINING FROM INDEX.HTML ---');

// 1. Purge District pill
html = html.replace(
  /<span class="hidden xs:inline-block px-1.5 py-0.2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-\[8px\] font-black rounded-md tracking-wider uppercase"[^>]*>District<\/span>/g,
  '<span class="hidden xs:inline-block px-1.5 py-0.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[9px] font-extrabold rounded-md tracking-wide" id="headerDistrictPill">Street Carts</span>'
);

// 2. Purge fake address in header location
html = html.replace(
  '73A RM Block, Sector 2, Sahibabad...',
  'Select Delivery Location'
);

// 3. Purge header avatar letter
html = html.replace(
  '<span id="headerAvatarInitial">A</span>',
  '<span id="headerAvatarInitial"><i class="fa-regular fa-user text-xs"></i></span>'
);

// 4. Purge profile drawer hardcoded data
html = html.replace(
  '<span id="profileAvatarLetter">A</span>',
  '<span id="profileAvatarLetter"><i class="fa-solid fa-user text-base"></i></span>'
);

html = html.replace(
  'class="font-black text-lg text-white truncate">Anurag</h2>',
  'class="font-black text-lg text-white truncate">Street Food Explorer</h2>'
);

html = html.replace(
  'class="text-xs text-stone-400 truncate">anuragdgsingh614@gmail.com</div>',
  'class="text-xs text-stone-400 truncate">Guest User</div>'
);

html = html.replace(
  'value="Anurag"',
  'value=""'
);

html = html.replace(
  'value="anuragdgsingh614@gmail.com"',
  'value=""'
);

html = html.replace(
  '<span id="profileGoldSavings">saved ₹10,816</span>',
  '<span id="profileGoldSavings">Free Delivery Active</span>'
);

html = html.replace(
  '<span>saved ₹10816</span>',
  '<span id="profileGoldSavings">Free Delivery Active</span>'
);

// 5. Purge Dining section in profile drawer
const diningSectionRegex = /<!-- Section 3: Dining & experiences[\s\S]*?<!-- Logout Button -->/;
const streetFoodRewardsSection = `<!-- Section 3: Street Food Rewards & Wallet -->
        <div class="space-y-2 select-none">
          <div class="flex items-center space-x-2">
            <div class="w-1 h-3.5 rounded-full bg-amber-500"></div>
            <h3 class="text-xs font-black text-stone-300 tracking-wider">Street Food Rewards & Wallet</h3>
          </div>

          <div class="bg-stone-900 border border-stone-800 rounded-2xl divide-y divide-stone-800 text-xs">
            <div class="p-3.5 flex items-center justify-between cursor-pointer hover:bg-stone-850" onclick="openOrderHistoryModal()">
              <div class="flex items-center space-x-3 text-stone-200 font-bold">
                <i class="fa-solid fa-clock-rotate-left text-amber-500"></i>
                <span>Your Street Orders</span>
              </div>
              <i class="fa-solid fa-chevron-right text-[10px] text-stone-500"></i>
            </div>

            <div class="p-3.5 flex items-center justify-between cursor-pointer hover:bg-stone-850" onclick="openWalletDrawer()">
              <div class="flex items-center space-x-3 text-stone-200 font-bold">
                <i class="fa-solid fa-wallet text-amber-400"></i>
                <span>Thela Money Wallet</span>
              </div>
              <div class="flex items-center space-x-1 text-amber-400 font-black">
                <span id="profileWalletAmount">₹0</span>
                <i class="fa-solid fa-chevron-right text-[10px]"></i>
              </div>
            </div>

            <div class="p-3.5 flex items-center justify-between cursor-pointer hover:bg-stone-850" onclick="openCouponsDrawer()">
              <div class="flex items-center space-x-3 text-stone-200 font-bold">
                <i class="fa-solid fa-gift text-rose-400"></i>
                <span>Coupons & Street Offers</span>
              </div>
              <i class="fa-solid fa-chevron-right text-[10px] text-stone-500"></i>
            </div>
          </div>
        </div>

        <!-- Logout Button -->`;

if (diningSectionRegex.test(html)) {
  html = html.replace(diningSectionRegex, streetFoodRewardsSection);
  console.log('✓ Replaced Dining section with Street Food Rewards in profile drawer');
}

// 6. Purge Dining from bottom dock and replace with Favorites
html = html.replace(
  /<!-- Dining \/ Stalls Tab -->[\s\S]*?<\/button>/,
  `<!-- Favorites Tab -->
      <button onclick="switchDockTab('favorites')" id="dockTabFavorites" class="flex flex-col items-center px-3 py-1 rounded-full text-stone-400 hover:text-white font-bold transition">
        <i class="fa-solid fa-heart text-sm"></i>
        <span class="text-[9px] mt-0.5">Favorites</span>
      </button>`
);

// 7. Purge ₹10,816 from thelaGoldModal
html = html.replace(
  '<div class="text-xl font-black text-amber-300">₹10,816</div>',
  '<div class="text-xl font-black text-amber-300" id="goldModalSavings">₹0</div>'
);
html = html.replace(
  '<h3 class="font-black text-base text-amber-300">Thela Gold VIP</h3>',
  '<h3 class="font-black text-base text-amber-300">Thela Street Rewards</h3>'
);

// 8. Purge Sahibabad hardcoded default in train station
html = html.replace(
  '<option selected>Sahibabad Jn (SBB)</option>',
  `<option value="" disabled selected>Select Nearest Railway Station</option>
              <option value="NDLS">New Delhi (NDLS)</option>
              <option value="HWH">Howrah Jn (HWH)</option>
              <option value="CSMT">Mumbai CSMT</option>
              <option value="CNB">Kanpur Central (CNB)</option>
              <option value="PNBE">Patna Jn (PNBE)</option>
              <option value="GZB">Ghaziabad Jn (GZB)</option>`
);

fs.writeFileSync(htmlPath, html, 'utf8');
console.log('✓ Successfully cleaned public/index.html');

console.log('\n--- PURGING FAKE DATA, COPIED PROFILES & DINING FROM APP.JS ---');

// Helper for smart LF/CRLF replacement
const isCRLF = appJs.includes('\r\n');
const EOL = isCRLF ? '\r\n' : '\n';

function smartReplace(source, targetSearch, replacement) {
  const normSource = source.replace(/\r\n/g, '\n');
  const normTarget = targetSearch.replace(/\r\n/g, '\n');
  const normRepl = replacement.replace(/\r\n/g, EOL);

  if (normSource.includes(normTarget)) {
    const replaced = normSource.replace(normTarget, normRepl);
    return isCRLF ? replaced.replace(/\n/g, '\r\n') : replaced;
  }
  console.warn('⚠️ Could not find target:', targetSearch.slice(0, 40));
  return source;
}

// 1. Purge defaultAnurag from loadStoredUser() and add cache sanitization
const targetLoadStoredOld = `async function loadStoredUser() {
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

const replLoadStoredClean = `async function loadStoredUser() {
  // Purge any legacy mocked profiles
  try {
    const raw = localStorage.getItem('thela_user');
    if (raw && (raw.includes('anuragdgsingh') || raw.includes('Shivalik') || raw.includes('10816'))) {
      localStorage.removeItem('thela_user');
    }
  } catch (e) {}

  const saved = localStorage.getItem('thela_user');`;

appJs = smartReplace(appJs, targetLoadStoredOld, replLoadStoredClean);
console.log('✓ Purged defaultAnurag from loadStoredUser and added cache sanitizer');

// 2. Purge fake address from updateHeaderLocation
const targetHeaderLoc = `  } else {
    if (tagEl) tagEl.innerText = 'Home';
    if (addrEl) addrEl.innerText = 'B-402, Shivalik Residency, Near Metro Pillar 142';
    if (locEl) locEl.innerText = 'Select Delivery Location';
  }`;

const replHeaderLoc = `  } else {
    if (tagEl) tagEl.innerText = (typeof t === 'function' ? t('select_location', 'Location') : 'Location');
    if (addrEl) addrEl.innerText = (typeof t === 'function' ? t('select_location', 'Select Delivery Location') : 'Select Delivery Location');
    if (locEl) locEl.innerText = (typeof t === 'function' ? t('select_location', 'Select Delivery Location') : 'Select Delivery Location');
  }`;

appJs = smartReplace(appJs, targetHeaderLoc, replHeaderLoc);
console.log('✓ Purged fake address from updateHeaderLocation');

// 3. Purge hardcoded Anurag / 10816 from openProfileModal
const targetOpenProf = `  if (nameEl) nameEl.innerText = STATE.user.name || 'Anurag';
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

const replOpenProf = `  const displayName = (STATE.user && STATE.user.name) ? STATE.user.name : 'Street Food Explorer';
  if (nameEl) nameEl.innerText = displayName;
  if (phoneEl) phoneEl.innerText = (STATE.user && STATE.user.phone) ? \`+91 \${STATE.user.phone}\` : '';
  const emailEl = document.getElementById('profileModalEmail') || document.getElementById('profileDisplayEmail');
  if (emailEl) emailEl.innerText = (STATE.user && STATE.user.email) ? STATE.user.email : 'Add email address';
  const avatarLetter = document.getElementById('profileAvatarLetter');
  if (avatarLetter) avatarLetter.innerText = displayName.charAt(0).toUpperCase() || 'U';
  const goldSavingsEl = document.getElementById('profileGoldSavings');
  if (goldSavingsEl) goldSavingsEl.innerText = (STATE.user && STATE.user.goldSavings) ? \`₹\${STATE.user.goldSavings} saved\` : 'Free Delivery Active';
  const walletEl = document.getElementById('profileWalletAmount');
  if (walletEl) walletEl.innerText = \`₹\${(STATE.user && STATE.user.walletBalance) || 0}\`;

  if (nameInput) nameInput.value = (STATE.user && STATE.user.name) || '';
  if (emailInput) emailInput.value = (STATE.user && STATE.user.email) || '';
  if (vegToggle) vegToggle.checked = !!(STATE.user && STATE.user.vegPreference);
  if (ordersStat) ordersStat.innerText = STATE.activeOrders.length || 0;
  if (addrsStat) addrsStat.innerText = (STATE.user && STATE.user.addresses && STATE.user.addresses.length) || 0;
  if (favsStat) favsStat.innerText = STATE.favorites.length || 0;`;

appJs = smartReplace(appJs, targetOpenProf, replOpenProf);
console.log('✓ Purged hardcoded Anurag / fake numbers from openProfileModal');

// 4. Purge Dining from switchDockTab in app.js
const targetSwitchDock = `function switchDockTab(tab) {
  ['home', 'under100', 'dining', 'healthy', 'account'].forEach(t => {
    const el = document.getElementById(\`dockTab_\${t}\`);
    if (el) {
      if (t === tab) {
        el.classList.add('text-rose-600', 'dark:text-rose-400', 'font-black');
        el.classList.remove('text-stone-500', 'dark:text-stone-400');
      } else {
        el.classList.remove('text-rose-600', 'dark:text-rose-400', 'font-black');
        el.classList.add('text-stone-500', 'dark:text-stone-400');
      }
    }
  });

  if (tab === 'home') {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    filterCategory('all');
  } else if (tab === 'under100') {
    scrollToDiscoverySection('secUnder100');
  } else if (tab === 'dining') {
    scrollToDiscoverySection('secLateNight');
    showToast('🎪 Street Carnival & Night Tawa Feast!');
  } else if (tab === 'healthy') {
    toggleHealthyMode();
  } else if (tab === 'account') {
    handleAuthBtnClick();
  }
}`;

const replSwitchDock = `function switchDockTab(tab) {
  ['home', 'under100', 'favorites', 'healthy', 'account'].forEach(t => {
    const el = document.getElementById(\`dockTab_\${t}\`) || document.getElementById(\`dockTab\${t.charAt(0).toUpperCase() + t.slice(1)}\`);
    if (el) {
      if (t === tab) {
        el.classList.add('text-amber-500', 'font-black');
        el.classList.remove('text-stone-400');
      } else {
        el.classList.remove('text-amber-500', 'font-black');
        el.classList.add('text-stone-400');
      }
    }
  });

  if (tab === 'home') {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    filterCategory('all');
  } else if (tab === 'under100') {
    scrollToDiscoverySection('secUnder100');
  } else if (tab === 'favorites') {
    filterCategory('favorites');
    showToast('❤️ Showing your favorite street carts');
  } else if (tab === 'healthy') {
    toggleHealthyMode();
  } else if (tab === 'account') {
    handleAuthBtnClick();
  }
}`;

appJs = smartReplace(appJs, targetSwitchDock, replSwitchDock);
console.log('✓ Purged dining and wired street food favorites into switchDockTab');

fs.writeFileSync(appJsPath, appJs, 'utf8');
console.log('✓ Successfully cleaned public/app.js');
console.log('\n🎉 ALL FAKE DATA, COPIED PROFILES, AND DINING REMOVED COMPLETELY!');
