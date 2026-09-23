// scratch/add_login_option_upgrade.js
const fs = require('fs');
const path = require('path');

const htmlPath = path.join(__dirname, '..', 'public', 'index.html');
const appJsPath = path.join(__dirname, '..', 'public', 'app.js');

let html = fs.readFileSync(htmlPath, 'utf8').replace(/\r\n/g, '\n');
let appJs = fs.readFileSync(appJsPath, 'utf8').replace(/\r\n/g, '\n');

console.log('--- 1. ADDING EXPLICIT LOGIN BUTTON TO HEADER IN INDEX.HTML ---');
const oldHeaderAuthBtn = `        <!-- Auth / Profile Button (Only shows VIP crown if membership bought) -->
        <button id="authBtn" onclick="handleAuthBtnClick()" class="relative w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 shadow-sm hover:scale-105 transition shrink-0" title="My Profile & Settings">
          <div id="headerAvatarInner" class="w-full h-full rounded-full flex items-center justify-center font-black text-xs sm:text-sm text-stone-700 dark:text-stone-200">
            <span id="headerAvatarInitial"><i class="fa-regular fa-user text-xs"></i></span>
          </div>
          <span id="headerCrownBadge" class="hidden absolute -top-1 -right-1 w-3.5 h-3.5 bg-amber-500 text-stone-950 rounded-full flex items-center justify-center text-[7px] font-black shadow-xs">
            <i class="fa-solid fa-crown text-[6px]"></i>
          </span>
        </button>`;

const newHeaderAuthBtn = `        <!-- Auth / Profile / Login Button (Explicit Login pill when logged out, Avatar when logged in) -->
        <button id="authBtn" onclick="handleAuthBtnClick()" class="flex items-center space-x-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-black text-xs shadow-sm transition active:scale-95 shrink-0 cursor-pointer" title="Click to Log In / Sign Up">
          <i class="fa-solid fa-arrow-right-to-bracket text-xs"></i>
          <span>Log in</span>
        </button>`;

if (html.includes(oldHeaderAuthBtn)) {
  html = html.replace(oldHeaderAuthBtn, newHeaderAuthBtn);
  console.log('✓ Replaced header button with prominent Log in pill by default');
} else {
  console.log('Notice: oldHeaderAuthBtn not found verbatim, checking regex');
  html = html.replace(/<button id="authBtn"[\s\S]*?<\/button>/, newHeaderAuthBtn.trim());
}

console.log('--- 2. ADDING LOGIN / ACCOUNT TAB TO FLOATING BOTTOM DOCK ---');
const oldDockFavorites = `      <!-- Favorites Tab -->
      <button onclick="switchDockTab('favorites')" id="dockTabFavorites" class="flex flex-col items-center px-3 py-1 rounded-full text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-white font-bold transition">
        <i class="fa-solid fa-heart text-sm"></i>
        <span class="text-[9px] mt-0.5">Favorites</span>
      </button>`;

const newDockFavoritesAndAccount = `      <!-- Favorites Tab -->
      <button onclick="switchDockTab('favorites')" id="dockTabFavorites" class="flex flex-col items-center px-2.5 py-1 rounded-full text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-white font-bold transition">
        <i class="fa-solid fa-heart text-sm"></i>
        <span class="text-[9px] mt-0.5">Favorites</span>
      </button>

      <!-- Account / Login Tab (Instant 1-tap access from dock) -->
      <button onclick="handleAuthBtnClick()" id="dockTabAccount" class="flex flex-col items-center px-2.5 py-1 rounded-full text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-white font-bold transition" title="Account / Login">
        <i class="fa-regular fa-user text-sm" id="dockAccountIcon"></i>
        <span class="text-[9px] mt-0.5" id="dockAccountLabel">Login</span>
      </button>`;

if (html.includes(oldDockFavorites) && !html.includes('id="dockTabAccount"')) {
  html = html.replace(oldDockFavorites, newDockFavoritesAndAccount);
  console.log('✓ Injected Account / Login tab into floatingBottomDock');
}

console.log('--- 3. ADAPTING AUTHMODAL TO LIGHT/DARK THEME ---');
html = html.replace(
  '<div class="bg-white w-full max-w-sm rounded-3xl p-5 space-y-4 shadow-2xl">',
  '<div class="bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 w-full max-w-sm rounded-3xl p-5 space-y-4 shadow-2xl border border-stone-200 dark:border-stone-800">'
);
html = html.replace(
  '<div class="w-9 h-9 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center font-bold">',
  '<div class="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">'
);
html = html.replace(
  '<h3 class="font-extrabold text-base text-gray-900">Phone Login</h3>',
  '<h3 class="font-extrabold text-base text-stone-900 dark:text-white">Phone Login</h3>'
);
html = html.replace(
  '<p class="text-xs text-gray-500">Enter your name and mobile number to receive live tracking and delivery updates.</p>',
  '<p class="text-xs text-stone-500 dark:text-stone-400">Enter your name and mobile number to receive live tracking and delivery updates.</p>'
);
html = html.replace(
  'class="w-full bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-orange-500"',
  'class="w-full bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 text-stone-900 dark:text-white rounded-xl px-3 py-2.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500"'
);
html = html.replace(
  'class="w-full bg-white border border-gray-200 rounded-xl pl-12 pr-3 py-2.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-orange-500"',
  'class="w-full bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 text-stone-900 dark:text-white rounded-xl pl-12 pr-3 py-2.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500"'
);
html = html.replace(
  'class="w-full text-center tracking-widest text-lg font-mono font-bold bg-gray-50 border border-gray-200 rounded-xl py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"',
  'class="w-full text-center tracking-widest text-lg font-mono font-bold bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 text-stone-900 dark:text-white rounded-xl py-2 focus:outline-none focus:ring-2 focus:ring-amber-500"'
);

fs.writeFileSync(htmlPath, html.replace(/\n/g, '\r\n'), 'utf8');

console.log('--- 4. UPDATING UPDATEAUTHUI IN APP.JS ---');
const oldUpdateAuthUI = `function updateAuthUI() {
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

const newUpdateAuthUI = `function updateAuthUI() {
  const btn = document.getElementById('authBtn');
  const dockLabel = document.getElementById('dockAccountLabel');
  const dockIcon = document.getElementById('dockAccountIcon');
  if (!btn) return;

  const isVip = !!(STATE.user && STATE.user.goldMember);

  if (STATE.user && STATE.user.phone) {
    // LOGGED IN: Show avatar with initials & VIP crown if purchased
    const initials = (STATE.user.name || 'SF').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
    if (isVip) {
      btn.className = 'relative w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-gradient-to-tr from-amber-400 via-amber-200 to-amber-500 p-0.5 shadow-sm hover:scale-105 transition shrink-0';
      btn.innerHTML = \`
        <div class="w-full h-full rounded-full bg-stone-900 text-amber-300 flex items-center justify-center font-black text-xs sm:text-sm">
          <span>\${initials || 'SF'}</span>
        </div>
        <span class="absolute -top-1 -right-1 w-3.5 h-3.5 bg-amber-500 text-stone-950 rounded-full flex items-center justify-center text-[7px] font-black shadow-xs">
          <i class="fa-solid fa-crown text-[6px]"></i>
        </span>
      \`;
    } else {
      btn.className = 'relative w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-stone-100 dark:bg-stone-800 border border-stone-300 dark:border-stone-700 shadow-sm hover:scale-105 transition shrink-0';
      btn.innerHTML = \`
        <div class="w-full h-full rounded-full flex items-center justify-center font-black text-xs sm:text-sm text-stone-700 dark:text-stone-200">
          <span>\${initials || 'SF'}</span>
        </div>
      \`;
    }
    btn.title = \`Account: \${STATE.user.name || 'User'} (\${STATE.user.phone})\`;
    if (dockLabel) dockLabel.innerText = STATE.user.name ? STATE.user.name.split(' ')[0] : 'Account';
    if (dockIcon) dockIcon.className = 'fa-solid fa-user text-sm text-amber-500';
  } else {
    // LOGGED OUT: Show clear, explicit "Log in" pill button!
    btn.className = 'flex items-center space-x-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-black text-xs shadow-sm transition active:scale-95 shrink-0 cursor-pointer';
    btn.innerHTML = \`
      <i class="fa-solid fa-arrow-right-to-bracket text-xs"></i>
      <span>Log in</span>
    \`;
    btn.title = 'Click to Log In / Sign Up';
    if (dockLabel) dockLabel.innerText = 'Login';
    if (dockIcon) dockIcon.className = 'fa-regular fa-user text-sm';
  }
}`;

if (appJs.includes(oldUpdateAuthUI)) {
  appJs = appJs.replace(oldUpdateAuthUI, newUpdateAuthUI);
  console.log('✓ Injected new updateAuthUI with explicit Log in pill button');
} else {
  console.log('Notice: regex replacing updateAuthUI');
  appJs = appJs.replace(/function updateAuthUI\(\) \{[\s\S]*?btn\.title = 'Login \/ Sign Up';\s*\}\s*\}/, newUpdateAuthUI.trim());
}

fs.writeFileSync(appJsPath, appJs.replace(/\n/g, '\r\n'), 'utf8');
console.log('✓ app.js successfully saved');
