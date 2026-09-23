// scratch/apply_theme_harmony_and_fixes.js
const fs = require('fs');
const path = require('path');

const htmlPath = path.join(__dirname, '..', 'public', 'index.html');
const appJsPath = path.join(__dirname, '..', 'public', 'app.js');

let html = fs.readFileSync(htmlPath, 'utf8');
let appJs = fs.readFileSync(appJsPath, 'utf8');

console.log('--- 1. HARMONIZING FLOATING ATMOSPHERE CSS & SVGS ---');

// Replace floating drifter CSS to use watermark blend modes & soft opacities that harmonize with theme
const oldAtmosphereCss = `    /* Floating Drifter Motif Container */
    .thela-motif {
      position: absolute;
      transition: opacity 0.6s cubic-bezier(0.16, 1, 0.3, 1), transform 0.6s cubic-bezier(0.16, 1, 0.3, 1);
      will-change: transform, opacity;
      pointer-events: none !important;
    }`;

const newAtmosphereCss = `    /* Floating Drifter Motif Container — Theme Harmonized */
    .thela-motif {
      position: absolute;
      transition: opacity 0.6s cubic-bezier(0.16, 1, 0.3, 1), transform 0.6s cubic-bezier(0.16, 1, 0.3, 1), filter 0.4s ease;
      will-change: transform, opacity;
      pointer-events: none !important;
      mix-blend-mode: multiply;
      filter: saturate(0.6) sepia(0.18);
    }
    html.dark .thela-motif {
      mix-blend-mode: screen;
      filter: saturate(0.85) brightness(1.2);
    }`;

if (html.includes(oldAtmosphereCss)) {
  html = html.replace(oldAtmosphereCss, newAtmosphereCss);
  console.log('✓ Updated .thela-motif CSS with blend modes');
} else {
  console.log('Notice: .thela-motif CSS pattern not found verbatim, checking regex');
  html = html.replace(/\.thela-motif\s*\{[^}]*\}/, newAtmosphereCss.trim());
}

// Harmonize density rules so they never clash with text
const oldDensity = `    /* 4-Tier Adaptive Density Rules */
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
    #thelaAtmosphere[data-density="minimal"] * { animation-play-state: paused !important; }`;

const newDensity = `    /* 4-Tier Adaptive Density Rules — Harmonized with Theme */
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
    html.dark #thelaAtmosphere[data-density="medium"] .motif-primary { opacity: 0.06; }`;

if (html.includes(oldDensity)) {
  html = html.replace(oldDensity, newDensity);
  console.log('✓ Updated density rules for theme harmony');
}

// Soften Wok SVG colors from harsh solid pitch black to warm bronze
html = html.replace(
  '<path d="M18 50 C18 78 82 78 82 50 Z" fill="#292524" />',
  '<path d="M18 50 C18 78 82 78 82 50 Z" fill="#78350f" fill-opacity="0.8" />'
);
html = html.replace(
  '<path d="M14 50 L86 50" stroke="#44403c" stroke-width="3" stroke-linecap="round" />',
  '<path d="M14 50 L86 50" stroke="#92400e" stroke-width="3" stroke-linecap="round" />'
);

console.log('--- 2. REMOVING HARDCODED 1,971 FAKE STALLS COUNT ---');
const old1971 = `<div class="py-2.5 flex items-center justify-center space-x-2 text-[11px] font-black text-stone-400 dark:text-stone-500 uppercase tracking-widest border-y border-stone-200/60 dark:border-stone-800">
        <i class="fa-solid fa-motorcycle text-amber-500"></i>
        <span id="exploreMoreThelasCount">1,971 STREET FOOD THELAS DELIVERING TO YOU</span>
      </div>`;

const newThelasSeparator = `<div id="thelasCountSeparator" class="hidden py-2.5 flex items-center justify-center space-x-2 text-[11px] font-black text-stone-400 dark:text-stone-500 uppercase tracking-widest border-y border-stone-200/60 dark:border-stone-800">
        <i class="fa-solid fa-motorcycle text-amber-500"></i>
        <span id="exploreMoreThelasCount">0 STREET FOOD THELAS DELIVERING TO YOU</span>
      </div>`;

if (html.includes(old1971)) {
  html = html.replace(old1971, newThelasSeparator);
  console.log('✓ Replaced hardcoded 1,971 stalls count with dynamic hidden container');
} else {
  html = html.replace(/<span id="exploreMoreThelasCount">[^<]*<\/span>/, '<span id="exploreMoreThelasCount">0 STREET FOOD THELAS DELIVERING TO YOU</span>');
}

console.log('--- 3. ADAPTING ECO & PLANET BANNER TO THEME ---');
html = html.replace(
  'id="ecoPlanetBanner" class="mt-4 bg-stone-900 text-stone-100 rounded-3xl p-5 space-y-4 border border-stone-800 shadow-xl"',
  'id="ecoPlanetBanner" class="mt-4 bg-white dark:bg-stone-900 text-stone-800 dark:text-stone-100 rounded-3xl p-5 space-y-4 border border-stone-200/80 dark:border-stone-800 shadow-md"'
);
html = html.replace(
  'bg-gradient-to-r from-emerald-950 via-stone-900 to-emerald-900 p-4 rounded-2xl border border-emerald-800/40',
  'bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-100 dark:from-emerald-950 dark:via-stone-900 dark:to-emerald-900 p-4 rounded-2xl border border-emerald-200 dark:border-emerald-800/40'
);
html = html.replace(
  'text-xs font-black text-emerald-400 uppercase tracking-wider',
  'text-xs font-black text-emerald-700 dark:text-emerald-400 uppercase tracking-wider'
);
html = html.replace(
  'text-base sm:text-lg font-black text-white flex items-center space-x-1.5 mt-0.5',
  'text-base sm:text-lg font-black text-stone-900 dark:text-white flex items-center space-x-1.5 mt-0.5'
);
html = html.replace(
  'w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400',
  'w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400'
);
html = html.replace(
  'text-xs text-stone-400 space-y-2 list-disc pl-4 font-medium leading-relaxed',
  'text-xs text-stone-600 dark:text-stone-400 space-y-2 list-disc pl-4 font-medium leading-relaxed'
);
html = html.replace(
  'pt-2 border-t border-stone-800 flex flex-wrap items-center justify-between gap-2 text-xs',
  'pt-2 border-t border-stone-200 dark:border-stone-800 flex flex-wrap items-center justify-between gap-2 text-xs'
);
html = html.replace(
  '<span class="italic font-serif font-black text-white text-xs">fssai</span>',
  '<span class="italic font-serif font-black text-stone-900 dark:text-white text-xs">fssai</span>'
);

console.log('--- 4. ADAPTING FLOATING BOTTOM DOCK TO THEME ---');
html = html.replace(
  'bg-stone-900/90 dark:bg-stone-950/95 text-white border border-stone-700/60 dark:border-stone-800 rounded-full shadow-2xl px-3 py-2 flex items-center justify-between select-none',
  'bg-white/95 dark:bg-stone-950/95 text-stone-800 dark:text-white border border-stone-200/80 dark:border-stone-800 rounded-full shadow-2xl px-3 py-2 flex items-center justify-between select-none'
);
html = html.replace(
  'id="dockTabUnder100" class="flex flex-col items-center px-3 py-1 rounded-full text-stone-400 hover:text-white font-bold transition"',
  'id="dockTabUnder100" class="flex flex-col items-center px-3 py-1 rounded-full text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-white font-bold transition"'
);
html = html.replace(
  'id="dockTabFavorites" class="flex flex-col items-center px-3 py-1 rounded-full text-stone-400 hover:text-white font-bold transition"',
  'id="dockTabFavorites" class="flex flex-col items-center px-3 py-1 rounded-full text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-white font-bold transition"'
);

console.log('--- 5. ADAPTING USER PROFILE MODAL & CARDS TO THEME ---');
// Profile drawer wrapper
html = html.replace(
  'class="bg-stone-950 text-white w-full sm:max-w-md h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-200 overflow-y-auto hide-scrollbar"',
  'class="bg-white dark:bg-stone-950 text-stone-900 dark:text-stone-100 w-full sm:max-w-md h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-200 overflow-y-auto hide-scrollbar border-l border-stone-200 dark:border-stone-800"'
);

// Top action bar
html = html.replace(
  'class="p-4 flex items-center justify-between border-b border-stone-800 shrink-0"',
  'class="p-4 flex items-center justify-between border-b border-stone-200 dark:border-stone-800 shrink-0"'
);
html = html.replace(
  'class="w-9 h-9 rounded-full bg-stone-900 text-stone-300 flex items-center justify-center hover:bg-stone-800 transition"',
  'class="w-9 h-9 rounded-full bg-stone-100 dark:bg-stone-900 text-stone-600 dark:text-stone-300 flex items-center justify-center hover:bg-stone-200 dark:hover:bg-stone-800 transition"'
);
html = html.replace(
  'class="text-xs font-black text-stone-400 uppercase tracking-wider">Account Center</span>',
  'class="text-xs font-black text-stone-600 dark:text-stone-400 uppercase tracking-wider">Account Center</span>'
);

// Profile Header Card
html = html.replace(
  'class="bg-stone-900 border border-stone-800 rounded-3xl p-4 flex items-center space-x-3.5 relative overflow-hidden"',
  'class="bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-3xl p-4 flex items-center space-x-3.5 relative overflow-hidden"'
);
html = html.replace(
  'class="w-full h-full rounded-full bg-stone-950 text-amber-200 flex items-center justify-center font-black text-xl"',
  'class="w-full h-full rounded-full bg-amber-100 dark:bg-stone-950 text-amber-700 dark:text-amber-200 flex items-center justify-center font-black text-xl"'
);
html = html.replace(
  'id="profileModalName" data-alias="profileDisplayName" class="font-black text-lg text-white truncate"',
  'id="profileModalName" data-alias="profileDisplayName" class="font-black text-lg text-stone-900 dark:text-white truncate"'
);
html = html.replace(
  'id="profileModalEmail" data-alias="profileDisplayEmail" class="text-xs text-stone-400 truncate"',
  'id="profileModalEmail" data-alias="profileDisplayEmail" class="text-xs text-stone-500 dark:text-stone-400 truncate"'
);
html = html.replace(
  'class="text-xs font-bold text-amber-400 hover:text-amber-300 mt-0.5 flex items-center space-x-1"',
  'class="text-xs font-bold text-amber-600 dark:text-amber-400 hover:underline mt-0.5 flex items-center space-x-1"'
);

// Edit profile form
html = html.replace(
  'id="profileEditForm" data-alias="editProfileForm" onsubmit="handleUpdateProfile(event)" class="hidden bg-stone-900 border border-stone-800 rounded-2xl p-4 space-y-3"',
  'id="profileEditForm" data-alias="editProfileForm" onsubmit="handleUpdateProfile(event)" class="hidden bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-4 space-y-3"'
);
html = html.replace(
  'class="flex items-center justify-between border-b border-stone-800 pb-2"',
  'class="flex items-center justify-between border-b border-stone-200 dark:border-stone-800 pb-2"'
);
html = html.replace(
  'class="text-xs font-black text-stone-300 uppercase tracking-wider">Edit Personal Details</h3>',
  'class="text-xs font-black text-stone-700 dark:text-stone-300 uppercase tracking-wider">Edit Personal Details</h3>'
);
html = html.replace(
  'class="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 font-semibold text-white focus:outline-none focus:ring-2 focus:ring-amber-500"',
  'class="w-full bg-white dark:bg-stone-950 border border-stone-300 dark:border-stone-800 rounded-xl px-3 py-2 font-semibold text-stone-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"'
);
html = html.replace(
  'class="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 font-semibold text-white focus:outline-none focus:ring-2 focus:ring-amber-500"',
  'class="w-full bg-white dark:bg-stone-950 border border-stone-300 dark:border-stone-800 rounded-xl px-3 py-2 font-semibold text-stone-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"'
);
html = html.replace(
  'class="flex items-center justify-between bg-stone-950 p-2.5 rounded-xl border border-stone-800"',
  'class="flex items-center justify-between bg-white dark:bg-stone-950 p-2.5 rounded-xl border border-stone-200 dark:border-stone-800"'
);
html = html.replace(
  'class="font-bold text-stone-200">Pure Veg Mode</div>',
  'class="font-bold text-stone-800 dark:text-stone-200">Pure Veg Mode</div>'
);

// VIP Card: Buyable & Dynamic
const oldVipCard = `<!-- Gold Member VIP Card (Screenshot 4) -->
        <div onclick="openThelaGoldModal()" class="cursor-pointer bg-gradient-to-r from-amber-950/80 via-stone-900 to-amber-950/60 border border-amber-500/30 rounded-2xl p-3.5 flex items-center justify-between shadow-md hover:border-amber-500/60 transition group select-none">
          <div class="flex items-center space-x-2.5">
            <div class="w-8 h-8 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center text-sm">
              <i class="fa-solid fa-crown text-amber-400"></i>
            </div>
            <div>
              <div class="font-black text-sm text-amber-200">Gold member</div>
              <div class="text-[10px] text-amber-400/80 font-medium">Free delivery on orders above ₹99</div>
            </div>
          </div>
          <div class="flex items-center space-x-1 bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2.5 py-1 rounded-full text-xs font-black">
            <span id="profileGoldSavings">Free Delivery Active</span>
            <i class="fa-solid fa-chevron-right text-[9px]"></i>
          </div>
        </div>`;

const newVipCard = `<!-- Gold Member VIP Card (Screenshots 3 & 4) — Buyable & Dynamic -->
        <div id="profileVipCard" onclick="openThelaGoldModal()" class="cursor-pointer bg-gradient-to-r from-amber-50 via-orange-50 to-amber-100 dark:from-amber-950/80 dark:via-stone-900 dark:to-amber-950/60 border border-amber-300/80 dark:border-amber-500/30 rounded-2xl p-3.5 flex items-center justify-between shadow-sm hover:border-amber-500/60 transition group select-none">
          <div class="flex items-center space-x-2.5">
            <div class="w-8 h-8 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center text-sm">
              <i class="fa-solid fa-crown text-amber-500 dark:text-amber-400"></i>
            </div>
            <div>
              <div id="profileGoldTitle" class="font-black text-sm text-amber-950 dark:text-amber-200">Thela VIP Club</div>
              <div id="profileGoldSub" class="text-[10px] text-amber-800/90 dark:text-amber-400/80 font-medium">Free delivery on orders above ₹99</div>
            </div>
          </div>
          <div id="profileGoldBadge" class="flex items-center space-x-1 bg-amber-500 text-stone-950 px-2.5 py-1 rounded-full text-xs font-black shadow-xs">
            <span id="profileGoldSavings">Buy @ ₹99</span>
            <i class="fa-solid fa-chevron-right text-[9px]"></i>
          </div>
        </div>`;

if (html.includes(oldVipCard)) {
  html = html.replace(oldVipCard, newVipCard);
  console.log('✓ Replaced hardcoded VIP member card with dynamic buyable card');
}

// 2 Quick Cards: Thela Money & Coupons
const oldQuickCards = `<!-- 2 Quick Cards: Thela Money & Coupons (Screenshot 4) -->
        <div class="grid grid-cols-2 gap-2.5 select-none">
          <div onclick="openWalletDrawer()" class="cursor-pointer bg-stone-900 border border-stone-800 rounded-2xl p-3.5 flex items-center space-x-3 hover:bg-stone-850 transition">
            <div class="w-8 h-8 rounded-xl bg-stone-800 text-stone-300 flex items-center justify-center text-sm">
              <i class="fa-solid fa-wallet"></i>
            </div>
            <div>
              <div class="text-[11px] text-stone-400 font-bold">Thela Money</div>
              <div class="text-sm font-black text-white" id="profileWalletAmount" data-alias="profileMoneyAmount">₹0</div>
            </div>
          </div>

          <div onclick="openCouponsDrawer()" class="cursor-pointer bg-stone-900 border border-stone-800 rounded-2xl p-3.5 flex items-center space-x-3 hover:bg-stone-850 transition">
            <div class="w-8 h-8 rounded-xl bg-stone-800 text-stone-300 flex items-center justify-center text-sm">
              <i class="fa-solid fa-percent text-amber-400"></i>
            </div>
            <div>
              <div class="text-[11px] text-stone-400 font-bold">Your coupons</div>
              <div class="text-xs font-black text-emerald-400">12 new</div>
            </div>
          </div>
        </div>`;

const newQuickCards = `<!-- 2 Quick Cards: Thela Money & Coupons (Screenshots 3 & 4) — Adaptive & Dynamic -->
        <div class="grid grid-cols-2 gap-2.5 select-none">
          <div onclick="openWalletDrawer()" class="cursor-pointer bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-3.5 flex items-center space-x-3 hover:bg-stone-100 dark:hover:bg-stone-850 transition shadow-xs">
            <div class="w-8 h-8 rounded-xl bg-stone-200 dark:bg-stone-800 text-stone-700 dark:text-stone-300 flex items-center justify-center text-sm">
              <i class="fa-solid fa-wallet"></i>
            </div>
            <div>
              <div class="text-[11px] text-stone-500 dark:text-stone-400 font-bold">Thela Money</div>
              <div class="text-sm font-black text-stone-900 dark:text-white" id="profileWalletAmount" data-alias="profileMoneyAmount">₹0</div>
            </div>
          </div>

          <div onclick="openCouponsDrawer()" class="cursor-pointer bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-3.5 flex items-center space-x-3 hover:bg-stone-100 dark:hover:bg-stone-850 transition shadow-xs">
            <div class="w-8 h-8 rounded-xl bg-amber-100 dark:bg-stone-800 text-amber-600 dark:text-amber-400 flex items-center justify-center text-sm">
              <i class="fa-solid fa-percent"></i>
            </div>
            <div>
              <div class="text-[11px] text-stone-500 dark:text-stone-400 font-bold">Your coupons</div>
              <div class="text-xs font-black text-emerald-600 dark:text-emerald-400" id="profileCouponsCount">0 available</div>
            </div>
          </div>
        </div>`;

if (html.includes(oldQuickCards)) {
  html = html.replace(oldQuickCards, newQuickCards);
  console.log('✓ Replaced hardcoded "12 new" coupons card with dynamic "0 available"');
}

// App Version Card
html = html.replace(
  'class="bg-stone-900 border border-stone-800 rounded-2xl p-3 flex items-center justify-between text-xs select-none"',
  'class="bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-3 flex items-center justify-between text-xs select-none"'
);
html = html.replace(
  '<span class="text-red-400 font-mono font-bold">v2.2.0</span>',
  '<span class="text-amber-600 dark:text-amber-400 font-mono font-bold">v2.2.2</span>'
);

// Preferences Section
html = html.replace(
  'class="text-xs font-black text-stone-300 tracking-wider">Your preferences</h3>',
  'class="text-xs font-black text-stone-700 dark:text-stone-300 tracking-wider">Your preferences</h3>'
);
html = html.replace(
  'class="bg-stone-900 border border-stone-800 rounded-2xl divide-y divide-stone-800 text-xs"',
  'class="bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl divide-y divide-stone-200 dark:divide-stone-800 text-xs"'
);
html = html.replace(
  'class="text-xs font-black text-stone-300 tracking-wider">Food delivery</h3>',
  'class="text-xs font-black text-stone-700 dark:text-stone-300 tracking-wider">Food delivery</h3>'
);
html = html.replace(
  'class="bg-stone-900 border border-stone-800 rounded-2xl divide-y divide-stone-800 text-xs"',
  'class="bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl divide-y divide-stone-200 dark:divide-stone-800 text-xs"'
);
html = html.replace(
  'class="text-xs font-black text-stone-300 tracking-wider">Street Food Rewards & Wallet</h3>',
  'class="text-xs font-black text-stone-700 dark:text-stone-300 tracking-wider">Street Food Rewards & Wallet</h3>'
);
html = html.replace(
  'class="bg-stone-900 border border-stone-800 rounded-2xl divide-y divide-stone-800 text-xs"',
  'class="bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl divide-y divide-stone-200 dark:divide-stone-800 text-xs"'
);

// All hover rows and text inside preference sections
html = html.replace(/hover:bg-stone-850/g, 'hover:bg-stone-100 dark:hover:bg-stone-850');
html = html.replace(/text-stone-200 font-bold/g, 'text-stone-800 dark:text-stone-200 font-bold');

// Logout button
html = html.replace(
  'class="w-full bg-stone-900 hover:bg-stone-850 border border-red-500/30 text-red-400 rounded-2xl py-3 text-xs font-black transition flex items-center justify-center space-x-2"',
  'class="w-full bg-stone-50 dark:bg-stone-900 hover:bg-red-50 dark:hover:bg-stone-850 border border-red-200 dark:border-red-500/30 text-red-600 dark:text-red-400 rounded-2xl py-3 text-xs font-black transition flex items-center justify-center space-x-2 shadow-xs"'
);

console.log('--- 6. ADAPTING THELA GOLD MODAL TO THEME ---');
html = html.replace(
  'class="bg-stone-900 border border-amber-500/40 text-white w-full max-w-sm rounded-3xl p-5 space-y-4 shadow-2xl relative overflow-hidden"',
  'class="bg-white dark:bg-stone-900 border border-amber-300 dark:border-amber-500/40 text-stone-900 dark:text-white w-full max-w-sm rounded-3xl p-5 space-y-4 shadow-2xl relative overflow-hidden"'
);
html = html.replace(
  'class="w-8 h-8 rounded-full bg-stone-800 text-stone-400 hover:text-white flex items-center justify-center"',
  'class="w-8 h-8 rounded-full bg-stone-100 dark:bg-stone-800 text-stone-500 dark:text-stone-400 hover:bg-stone-200 dark:hover:text-white flex items-center justify-center"'
);
html = html.replace(
  'class="bg-gradient-to-r from-amber-950/80 to-stone-950 p-3 rounded-2xl border border-amber-500/30 flex items-center justify-between"',
  'id="goldModalStatusBox" class="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/80 dark:to-stone-950 p-3 rounded-2xl border border-amber-200 dark:border-amber-500/30 flex items-center justify-between"'
);
html = html.replace(
  'class="text-xl font-black text-amber-300" id="goldModalSavings"',
  'class="text-xl font-black text-amber-700 dark:text-amber-300" id="goldModalSavings"'
);
html = html.replace(
  '<span class="bg-amber-400 text-stone-950 text-[10px] font-black px-2.5 py-1 rounded-full uppercase">Active Member</span>',
  '<span id="goldModalBadge" class="bg-amber-400 text-stone-950 text-[10px] font-black px-2.5 py-1 rounded-full uppercase">Join Club</span>'
);
html = html.replace(
  'class="space-y-2 text-xs text-stone-300"',
  'class="space-y-2 text-xs text-stone-700 dark:text-stone-300"'
);
html = html.replace(
  `<button onclick="showToast('Your Gold Membership is active & auto-applied!'); closeThelaGoldModal();" class="w-full bg-gradient-to-r from-amber-400 to-amber-500 text-stone-950 rounded-xl py-3 text-xs font-black hover:from-amber-300 hover:to-amber-400 transition shadow-md">
        Continue Enjoying Gold Perks
      </button>`,
  `<button id="goldModalActionBtn" onclick="buyThelaGoldMembership()" class="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 rounded-xl py-3 text-xs font-black transition shadow-md">
        Buy VIP Membership @ ₹99
      </button>`
);

console.log('--- 7. ADAPTING COUPONS DRAWER TO THEME ---');
html = html.replace(
  'id="couponsDrawer" class="hidden fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex justify-end transition-all">\n    <div class="bg-stone-950 text-white w-full sm:max-w-md h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-200 overflow-y-auto hide-scrollbar">',
  'id="couponsDrawer" class="hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex justify-end transition-all">\n    <div class="bg-white dark:bg-stone-950 text-stone-900 dark:text-stone-100 w-full sm:max-w-md h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-200 overflow-y-auto hide-scrollbar border-l border-stone-200 dark:border-stone-800">'
);
html = html.replace(
  'class="p-4 border-b border-stone-800 flex items-center justify-between"',
  'class="p-4 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between"'
);
html = html.replace(
  '<h3 class="font-black text-sm text-white">Your Available Coupons</h3>',
  '<h3 class="font-black text-sm text-stone-900 dark:text-white">Your Available Coupons</h3>'
);
html = html.replace(
  '<p class="text-[10px] text-stone-400">12 street food savings vouchers active</p>',
  '<p class="text-[10px] text-stone-500 dark:text-stone-400" id="couponsDrawerSubtitle">Coupons unlocked by placing street food orders</p>'
);
html = html.replace(
  'class="w-8 h-8 rounded-full bg-stone-900 text-stone-400 hover:text-white flex items-center justify-center"',
  'class="w-8 h-8 rounded-full bg-stone-100 dark:bg-stone-900 text-stone-600 dark:text-stone-400 hover:bg-stone-200 dark:hover:text-white flex items-center justify-center"'
);

console.log('--- 8. ADAPTING THELA WALLET & TRAIN FOOD MODALS TO THEME ---');
html = html.replace(
  'id="walletDrawer" class="hidden fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex justify-end transition-all">\n    <div class="bg-stone-950 text-white w-full sm:max-w-md h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-200 overflow-y-auto hide-scrollbar">',
  'id="walletDrawer" class="hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex justify-end transition-all">\n    <div class="bg-white dark:bg-stone-950 text-stone-900 dark:text-stone-100 w-full sm:max-w-md h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-200 overflow-y-auto hide-scrollbar border-l border-stone-200 dark:border-stone-800">'
);
html = html.replace(
  'id="trainFoodModal" class="hidden fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">\n    <div class="bg-stone-900 border border-cyan-500/40 text-white w-full max-w-sm rounded-3xl p-5 space-y-4 shadow-2xl">',
  'id="trainFoodModal" class="hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">\n    <div class="bg-white dark:bg-stone-900 border border-stone-200 dark:border-cyan-500/40 text-stone-900 dark:text-white w-full max-w-sm rounded-3xl p-5 space-y-4 shadow-2xl">'
);

fs.writeFileSync(htmlPath, html, 'utf8');
console.log('✓ index.html successfully updated and saved');

console.log('--- 9. UPDATING JAVASCRIPT LOGIC IN APP.JS ---');

// 1. Update toggleVegFilter() to visually slide thumb & update track color
const oldToggleVeg = `function toggleVegFilter() {
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

const newToggleVeg = `function toggleVegFilter() {
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

if (appJs.includes(oldToggleVeg)) {
  appJs = appJs.replace(oldToggleVeg, newToggleVeg);
  console.log('✓ Updated toggleVegFilter() with smooth visual sliding & track color');
} else {
  console.log('Warning: old toggleVegFilter not found verbatim');
}

// 2. Update toggleHealthyMode to use dockHealthyBtn
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

// 3. Update renderStalls to dynamically update #thelasCountSeparator
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
  console.log('✓ Updated renderStalls() with dynamic gating of thelas count separator');
}

// 4. Update openProfileModal() for buyable VIP & dynamic earned coupons count
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
  console.log('✓ Updated openProfileModal() with dynamic VIP card & earned coupons count');
}

// 5. Update openThelaGoldModal and add buyThelaGoldMembership()
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
  console.log('✓ Added buyThelaGoldMembership() with confirmation, wallet check, and state updates');
}

// 6. Update openCouponsDrawer to render earned coupons or empty state
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
  console.log('✓ Added dynamic coupon rendering with zero-coupon empty state');
}

fs.writeFileSync(appJsPath, appJs, 'utf8');
console.log('✓ app.js successfully updated and saved');
