const fs = require('fs');
const path = require('path');

const indexPath = path.join(__dirname, '..', 'public', 'index.html');
let html = fs.readFileSync(indexPath, 'utf8');

// Helper for exact string replacement
function replaceBlock(source, startMarker, endMarker, replacement, desc) {
  const startIdx = source.indexOf(startMarker);
  if (startIdx === -1) {
    throw new Error(`Start marker not found for: ${desc} -> "${startMarker}"`);
  }
  const endIdx = source.indexOf(endMarker, startIdx);
  if (endIdx === -1) {
    throw new Error(`End marker not found for: ${desc} -> "${endMarker}"`);
  }
  const fullEndIdx = endIdx + endMarker.length;
  console.log(`✓ Replaced block: ${desc}`);
  return source.slice(0, startIdx) + replacement + source.slice(fullEndIdx);
}

// 1. UPGRADE HEADER
const headerStart = '  <!-- Top App Navigation & Clean Minimal Location Bar -->';
const headerEnd = '</header>';
const newHeader = `  <!-- Top App Navigation & Clean Minimal Location Bar (Zomato-Style) -->
  <header class="sticky top-0 z-40 bg-white/95 dark:bg-stone-900/95 backdrop-blur-md border-b border-stone-200/80 dark:border-stone-800 shadow-xs transition-all w-full max-w-full overflow-visible">
    <div class="max-w-4xl mx-auto px-2.5 sm:px-4 py-2 sm:py-2.5 flex items-center justify-between gap-1.5 sm:gap-2">
      <!-- Brand Logo & Delivery Location Picker (Screenshot 1) -->
      <div class="flex items-center space-x-2 sm:space-x-3 cursor-pointer shrink min-w-0" onclick="switchView('customer')">
        <div class="w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-gradient-to-br from-amber-600 via-orange-600 to-amber-700 flex items-center justify-center text-white shadow-md shadow-amber-600/20 shrink-0">
          <i class="fa-solid fa-utensils text-xs sm:text-base"></i>
        </div>
        <div class="min-w-0">
          <div class="flex items-center space-x-1.5">
            <span class="font-black text-sm sm:text-base tracking-tight text-stone-900 dark:text-stone-100 flex items-center">
              <span>Home</span>
              <i class="fa-solid fa-chevron-down text-[8px] sm:text-[9px] ml-1 text-stone-400"></i>
            </span>
            <span class="hidden xs:inline-block px-1.5 py-0.2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-[8px] font-black rounded-md tracking-wider uppercase">District</span>
          </div>
          <div class="text-[9px] sm:text-[11px] text-stone-500 dark:text-stone-400 font-medium flex items-center cursor-pointer hover:text-amber-600 transition min-w-0" onclick="event.stopPropagation(); openAddressDrawer();" title="Click to select or change delivery address">
            <i class="fa-solid fa-location-dot text-amber-600 mr-0.5 sm:mr-1 text-[9px] sm:text-xs shrink-0"></i>
            <span id="headerLocation" class="font-bold text-stone-700 dark:text-stone-300 max-w-[110px] xs:max-w-[160px] sm:max-w-[280px] truncate" data-i18n="select_location">73A RM Block, Sector 2, Sahibabad...</span>
          </div>
        </div>
      </div>

      <!-- Consumer Action Controls (Language Selector, Theme Selector, Thela Wallet, Header Cart, Profile) -->
      <div class="flex items-center space-x-1 sm:space-x-2 shrink-0">
        <!-- Language & Theme Switcher Mounts -->
        <div class="langSelectorMount shrink-0"></div>
        <div class="themeSelectorMount shrink-0"></div>

        <!-- Quick Thela Wallet Balance Pill (Screenshot 1) -->
        <button onclick="openWalletDrawer()" class="flex items-center space-x-1 px-2 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200/80 dark:border-amber-900/40 text-xs font-black hover:bg-amber-100 transition shadow-xs shrink-0" title="Thela Wallet">
          <i class="fa-solid fa-wallet text-[11px]"></i>
          <span id="headerWalletAmount">₹0</span>
        </button>

        <!-- Header Cart Button -->
        <button id="headerCartBtn" onclick="openCartDrawer()" class="relative px-2 py-1.5 sm:px-3 sm:py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white flex items-center space-x-1 sm:space-x-1.5 font-bold text-xs shadow-md shadow-amber-600/20 transition shrink-0">
          <i class="fa-solid fa-basket-shopping text-xs"></i>
          <span id="headerCartTotal">₹0</span>
          <span id="headerCartBadge" class="hidden ml-1 px-1.5 py-0.2 bg-white text-amber-700 rounded-full text-[10px] font-black">0</span>
        </button>

        <!-- Auth / Profile Button with VIP Gold Avatar Ring (Screenshot 1 & 4) -->
        <button id="authBtn" onclick="handleAuthBtnClick()" class="relative w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-gradient-to-tr from-amber-400 via-amber-200 to-amber-500 p-0.5 shadow-sm hover:scale-105 transition shrink-0" title="My Profile & Settings">
          <div class="w-full h-full rounded-full bg-stone-900 text-amber-300 flex items-center justify-center font-black text-xs sm:text-sm">
            <span id="headerAvatarInitial">A</span>
          </div>
          <span class="absolute -top-1 -right-1 w-3.5 h-3.5 bg-amber-500 text-stone-900 rounded-full flex items-center justify-center text-[7px] font-black shadow-xs">
            <i class="fa-solid fa-crown text-[6px]"></i>
          </span>
        </button>
      </div>
    </div>
  </header>`;
html = replaceBlock(html, headerStart, headerEnd, newHeader, 'Header');

// 2. UPGRADE TOP DISCOVERY (Search + Veg toggle, Hero Promo Carousel, Circular Category Stories, Quick Filter Pills)
const discStart = '    <!-- Hero Craving & Search Hub -->';
const discEnd = '    <!-- Active Orders Live Bar (If any active orders) -->';
const newDiscovery = `<!-- Zomato-Style Sticky Search & Integrated Veg Mode Row (Screenshot 1) -->
    <div class="pt-1 pb-1 flex items-center gap-2">
      <!-- Search Input Container -->
      <div class="relative group flex-1">
        <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-400 group-focus-within:text-amber-600 transition">
          <i class="fa-solid fa-magnifying-glass text-sm"></i>
        </div>
        <input type="text" id="searchInput" oninput="handleSearch()" 
          data-i18n-placeholder="search_placeholder_craving" 
          placeholder="Search 'ice cream', 'burger', 'momos'..." 
          class="w-full bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl pl-10 pr-20 py-2.5 sm:py-3 text-xs sm:text-sm font-semibold text-stone-900 dark:text-stone-100 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 shadow-xs hover:border-stone-300 transition">
        
        <div class="absolute inset-y-0 right-1.5 flex items-center space-x-1">
          <button id="searchClearBtn" onclick="clearSearch()" class="hidden px-2 py-1 text-xs text-stone-400 hover:text-stone-600 transition" title="Clear search">
            <i class="fa-solid fa-xmark text-sm"></i>
          </button>
          <button onclick="handleVoiceSearch()" class="p-2 text-stone-400 hover:text-amber-600 transition" title="Voice Search">
            <i class="fa-solid fa-microphone text-sm"></i>
          </button>
        </div>
      </div>

      <!-- Integrated Veg Mode Switcher (Screenshot 1) -->
      <div class="flex items-center space-x-1.5 px-3 py-2.5 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xs shrink-0 cursor-pointer select-none hover:border-emerald-500 transition" onclick="toggleVegFilter()" title="Toggle Pure Veg Only">
        <span class="text-[10px] font-black uppercase tracking-wider text-stone-700 dark:text-stone-300">VEG</span>
        <div id="vegSwitchTrack" class="w-8 h-4.5 rounded-full transition-colors relative flex items-center p-0.5 bg-stone-300 dark:bg-stone-700">
          <div id="vegSwitchThumb" class="w-3.5 h-3.5 rounded-full bg-white shadow-sm transition-transform transform translate-x-0"></div>
        </div>
      </div>
    </div>

    <!-- Zomato-Style Festive Promotional Hero Carousel (Screenshot 1) -->
    <div id="heroPromoCarousel" class="relative rounded-3xl overflow-hidden shadow-md select-none group">
      <!-- Carousel Track -->
      <div id="promoTrack" class="flex transition-transform duration-500 ease-out w-full">
        <!-- Slide 1: 70% OFF Street Feast (Screenshot 1 Motif) -->
        <div class="min-w-full relative bg-gradient-to-r from-sky-400 via-blue-500 to-indigo-600 p-5 sm:p-6 text-white overflow-hidden flex flex-col justify-between min-h-[160px] sm:min-h-[190px]">
          <div class="absolute -right-8 -bottom-8 w-44 h-44 rounded-full bg-white/10 blur-xl pointer-events-none"></div>

          <div class="relative z-10 max-w-[65%] sm:max-w-[60%] space-y-1 sm:space-y-1.5">
            <div class="inline-flex items-center space-x-1 bg-white/20 backdrop-blur-md px-2 py-0.5 rounded-md text-[10px] font-black tracking-wider uppercase">
              <span>⚡ LIMITED TIME FEAST</span>
            </div>
            <h2 class="text-2xl sm:text-4xl font-black tracking-tight leading-none text-white drop-shadow-md">
              70% OFF
            </h2>
            <div class="text-sm sm:text-lg font-black text-sky-100 tracking-wide">
              UP TO ₹140
            </div>
            <p class="text-[10px] sm:text-xs text-sky-100/90 font-medium line-clamp-1">
              On iconic street carts in your locality • Code THELA70
            </p>
          </div>

          <div class="relative z-10 pt-2 flex items-center justify-between">
            <button onclick="applyPromoCode('THELA70')" class="px-4 py-1.5 sm:px-5 sm:py-2 rounded-full bg-stone-950 text-white text-xs sm:text-sm font-black hover:bg-black transition flex items-center space-x-1.5 shadow-md active:scale-95">
              <span>Order now</span>
              <i class="fa-solid fa-chevron-right text-[10px]"></i>
            </button>
          </div>

          <!-- Decorative 3D Food Collage Representation -->
          <div class="absolute -right-2 bottom-1 w-36 sm:w-48 h-32 sm:h-40 pointer-events-none flex items-center justify-center">
            <div class="relative w-full h-full">
              <svg viewBox="0 0 160 140" class="w-full h-full drop-shadow-2xl">
                <ellipse cx="80" cy="95" rx="70" ry="32" fill="#0f172a" opacity="0.3" />
                <ellipse cx="80" cy="85" rx="64" ry="28" fill="#f59e0b" stroke="#d97706" stroke-width="3" />
                <ellipse cx="80" cy="82" rx="56" ry="24" fill="#ef4444" />
                <ellipse cx="80" cy="80" rx="50" ry="20" fill="#fef08a" />
                <circle cx="60" cy="76" r="6" fill="#16a34a" />
                <circle cx="95" cy="78" r="7" fill="#dc2626" />
                <circle cx="80" cy="72" r="5" fill="#78350f" />
                <circle cx="105" cy="82" r="5" fill="#16a34a" />
                <circle cx="55" cy="84" r="5" fill="#dc2626" />
                <ellipse cx="125" cy="55" rx="24" ry="12" fill="#d97706" />
                <ellipse cx="125" cy="52" rx="22" ry="10" fill="#fef3c7" />
                <path d="M115 50 C115 45 125 43 125 48 C125 52 115 52 115 50 Z" fill="#fff" stroke="#d97706" stroke-width="1" />
                <path d="M125 48 C125 43 135 43 135 48 C135 52 125 52 125 48 Z" fill="#fff" stroke="#d97706" stroke-width="1" />
                <rect x="25" y="40" width="22" height="35" rx="4" fill="#a855f7" stroke="#7e22ce" stroke-width="2" />
                <ellipse cx="36" cy="40" rx="11" ry="4" fill="#e9d5ff" />
                <line x1="36" y1="40" x2="36" y2="25" stroke="#ec4899" stroke-width="3" stroke-linecap="round" />
              </svg>
            </div>
          </div>
        </div>

        <!-- Slide 2: Thela Gold Club (Royalty & Savings) -->
        <div class="min-w-full relative bg-gradient-to-r from-stone-900 via-zinc-800 to-amber-950 p-5 sm:p-6 text-white overflow-hidden flex flex-col justify-between min-h-[160px] sm:min-h-[190px]">
          <div class="absolute -right-8 -bottom-8 w-44 h-44 rounded-full bg-amber-500/10 blur-xl pointer-events-none"></div>

          <div class="relative z-10 max-w-[65%] sm:max-w-[60%] space-y-1 sm:space-y-1.5">
            <div class="inline-flex items-center space-x-1.5 bg-gradient-to-r from-amber-500 to-yellow-600 text-stone-950 px-2 py-0.5 rounded-md text-[10px] font-black tracking-wider uppercase">
              <i class="fa-solid fa-crown text-[9px]"></i>
              <span>VIP PRIVILEGE</span>
            </div>
            <h2 class="text-2xl sm:text-4xl font-black tracking-tight leading-none text-amber-300 drop-shadow-md">
              THELA GOLD
            </h2>
            <div class="text-sm sm:text-lg font-black text-amber-100 tracking-wide">
              ₹0 Delivery & 0 Packaging Fees
            </div>
            <p class="text-[10px] sm:text-xs text-amber-200/80 font-medium line-clamp-1">
              Join 12,000+ street food lovers saving ₹1,200+ every month
            </p>
          </div>

          <div class="relative z-10 pt-2 flex items-center justify-between">
            <button onclick="openThelaGoldModal()" class="px-4 py-1.5 sm:px-5 sm:py-2 rounded-full bg-gradient-to-r from-amber-400 to-amber-500 text-stone-950 text-xs sm:text-sm font-black hover:from-amber-300 hover:to-amber-400 transition flex items-center space-x-1.5 shadow-md active:scale-95">
              <span>View Benefits</span>
              <i class="fa-solid fa-chevron-right text-[10px]"></i>
            </button>
          </div>

          <div class="absolute right-4 top-1/2 -translate-y-1/2 w-28 sm:w-36 h-28 sm:h-36 pointer-events-none flex items-center justify-center opacity-85">
            <svg viewBox="0 0 100 100" class="w-full h-full drop-shadow-xl text-amber-400">
              <polygon points="15,75 85,75 80,45 65,60 50,30 35,60 20,45" fill="#fde047" stroke="#b45309" stroke-width="2" />
              <circle cx="20" cy="45" r="4" fill="#fef08a" />
              <circle cx="50" cy="30" r="5" fill="#fef08a" />
              <circle cx="80" cy="45" r="4" fill="#fef08a" />
              <rect x="20" y="75" width="60" height="8" rx="2" fill="#78350f" />
            </svg>
          </div>
        </div>

        <!-- Slide 3: Midnight Cravings & Hot Tawa -->
        <div class="min-w-full relative bg-gradient-to-r from-indigo-950 via-purple-900 to-pink-900 p-5 sm:p-6 text-white overflow-hidden flex flex-col justify-between min-h-[160px] sm:min-h-[190px]">
          <div class="absolute -right-8 -bottom-8 w-44 h-44 rounded-full bg-pink-500/10 blur-xl pointer-events-none"></div>

          <div class="relative z-10 max-w-[65%] sm:max-w-[60%] space-y-1 sm:space-y-1.5">
            <div class="inline-flex items-center space-x-1.5 bg-pink-500/30 border border-pink-400/40 text-pink-200 px-2 py-0.5 rounded-md text-[10px] font-black tracking-wider uppercase">
              <i class="fa-solid fa-moon text-[9px]"></i>
              <span>TILL 2:00 AM</span>
            </div>
            <h2 class="text-2xl sm:text-4xl font-black tracking-tight leading-none text-white drop-shadow-md">
              MIDNIGHT CARNIVAL
            </h2>
            <div class="text-sm sm:text-lg font-black text-pink-200 tracking-wide">
              Sizzling Rolls & Butter Pav Bhaji
            </div>
            <p class="text-[10px] sm:text-xs text-pink-100/80 font-medium line-clamp-1">
              Late night hunger? Piping hot street feasts delivered at your door
            </p>
          </div>

          <div class="relative z-10 pt-2 flex items-center justify-between">
            <button onclick="scrollToDiscoverySection('secLateNight')" class="px-4 py-1.5 sm:px-5 sm:py-2 rounded-full bg-white text-stone-900 text-xs sm:text-sm font-black hover:bg-stone-100 transition flex items-center space-x-1.5 shadow-md active:scale-95">
              <span>Order Now</span>
              <i class="fa-solid fa-chevron-right text-[10px]"></i>
            </button>
          </div>
        </div>
      </div>

      <!-- Carousel Pagination Dots -->
      <div class="absolute bottom-2.5 right-4 flex items-center space-x-1.5 z-20">
        <button onclick="setCarouselSlide(0)" class="carousel-dot w-6 h-1.5 rounded-full bg-white transition-all duration-300"></button>
        <button onclick="setCarouselSlide(1)" class="carousel-dot w-2 h-1.5 rounded-full bg-white/50 transition-all duration-300"></button>
        <button onclick="setCarouselSlide(2)" class="carousel-dot w-2 h-1.5 rounded-full bg-white/50 transition-all duration-300"></button>
      </div>
    </div>

    <!-- Zomato-Style Circular Food Category Stories Rail (Screenshots 1 & 2) -->
    <div class="relative py-1">
      <div id="circularCategoriesTrack" class="flex items-start space-x-4 sm:space-x-5 overflow-x-auto hide-scrollbar py-2 px-1 snap-x select-none">
        
        <!-- Tile 1: Explore Banner Tile -->
        <div onclick="scrollToDiscoverySection('secAllStalls')" class="cat-circle-item flex flex-col items-center space-y-1 shrink-0 cursor-pointer group snap-start">
          <div class="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-amber-500 via-orange-500 to-amber-700 p-2 shadow-sm flex flex-col items-center justify-center text-white group-hover:scale-105 transition-all text-center">
            <i class="fa-solid fa-compass text-lg sm:text-xl"></i>
            <span class="text-[9px] sm:text-[10px] font-black uppercase mt-1">Explore</span>
          </div>
          <span class="text-[11px] sm:text-xs font-bold text-stone-700 dark:text-stone-300">Discover</span>
          <div class="w-5 h-0.5 rounded-full bg-transparent"></div>
        </div>

        <!-- Tile 2: All (Active Red Underline Tab) -->
        <div onclick="filterCategory('all')" id="catCircleAll" class="cat-circle-item active flex flex-col items-center space-y-1 shrink-0 cursor-pointer group snap-start">
          <div class="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-white dark:bg-stone-800 p-1 shadow-sm border-2 border-red-500 group-hover:scale-105 transition-all flex items-center justify-center overflow-hidden">
            <img src="https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=150&auto=format&fit=crop&q=80" alt="All Street Food" class="w-full h-full object-cover rounded-full" onerror="handleFoodImageError(this, 'streetfood', 'All')">
          </div>
          <span class="text-[11px] sm:text-xs font-black text-stone-900 dark:text-white text-center">All</span>
          <div class="cat-active-line w-6 h-0.5 rounded-full bg-red-500 transition-all"></div>
        </div>

        <!-- Tile 3: Burger -->
        <div onclick="filterCategory('burger')" class="cat-circle-item flex flex-col items-center space-y-1 shrink-0 cursor-pointer group snap-start">
          <div class="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-white dark:bg-stone-800 p-1 shadow-sm border border-stone-200 dark:border-stone-700 group-hover:border-amber-500 group-hover:scale-105 transition-all flex items-center justify-center overflow-hidden">
            <img src="https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=150&auto=format&fit=crop&q=80" alt="Burger" class="w-full h-full object-cover rounded-full" onerror="handleFoodImageError(this, 'burger', 'Burger')">
          </div>
          <span class="text-[11px] sm:text-xs font-bold text-stone-700 dark:text-stone-300 text-center">Burger</span>
          <div class="cat-active-line w-6 h-0.5 rounded-full bg-transparent group-hover:bg-amber-500 transition-all"></div>
        </div>

        <!-- Tile 4: Chole Bhature -->
        <div onclick="filterCategory('chole')" class="cat-circle-item flex flex-col items-center space-y-1 shrink-0 cursor-pointer group snap-start">
          <div class="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-white dark:bg-stone-800 p-1 shadow-sm border border-stone-200 dark:border-stone-700 group-hover:border-amber-500 group-hover:scale-105 transition-all flex items-center justify-center overflow-hidden">
            <img src="https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?w=150&auto=format&fit=crop&q=80" alt="Chole Bhature" class="w-full h-full object-cover rounded-full" onerror="handleFoodImageError(this, 'chole', 'Chole Bhature')">
          </div>
          <span class="text-[11px] sm:text-xs font-bold text-stone-700 dark:text-stone-300 text-center">Chole Bhature</span>
          <div class="cat-active-line w-6 h-0.5 rounded-full bg-transparent group-hover:bg-amber-500 transition-all"></div>
        </div>

        <!-- Tile 5: Rajma Rice -->
        <div onclick="filterCategory('rajma')" class="cat-circle-item flex flex-col items-center space-y-1 shrink-0 cursor-pointer group snap-start">
          <div class="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-white dark:bg-stone-800 p-1 shadow-sm border border-stone-200 dark:border-stone-700 group-hover:border-amber-500 group-hover:scale-105 transition-all flex items-center justify-center overflow-hidden">
            <img src="https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=150&auto=format&fit=crop&q=80" alt="Rajma Rice" class="w-full h-full object-cover rounded-full" onerror="handleFoodImageError(this, 'rajma', 'Rajma Rice')">
          </div>
          <span class="text-[11px] sm:text-xs font-bold text-stone-700 dark:text-stone-300 text-center">Rajma Rice</span>
          <div class="cat-active-line w-6 h-0.5 rounded-full bg-transparent group-hover:bg-amber-500 transition-all"></div>
        </div>

        <!-- Tile 6: Golgappe & Chaat -->
        <div onclick="filterCategory('chaat')" class="cat-circle-item flex flex-col items-center space-y-1 shrink-0 cursor-pointer group snap-start">
          <div class="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-white dark:bg-stone-800 p-1 shadow-sm border border-stone-200 dark:border-stone-700 group-hover:border-amber-500 group-hover:scale-105 transition-all flex items-center justify-center overflow-hidden">
            <img src="https://images.unsplash.com/photo-1601050690597-df0568f70950?w=150&auto=format&fit=crop&q=80" alt="Chaat" class="w-full h-full object-cover rounded-full" onerror="handleFoodImageError(this, 'chaat', 'Golgappe')">
          </div>
          <span class="text-[11px] sm:text-xs font-bold text-stone-700 dark:text-stone-300 text-center">Golgappe</span>
          <div class="cat-active-line w-6 h-0.5 rounded-full bg-transparent group-hover:bg-amber-500 transition-all"></div>
        </div>

        <!-- Tile 7: Mumbai Vada Pav -->
        <div onclick="filterCategory('vadapav')" class="cat-circle-item flex flex-col items-center space-y-1 shrink-0 cursor-pointer group snap-start">
          <div class="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-white dark:bg-stone-800 p-1 shadow-sm border border-stone-200 dark:border-stone-700 group-hover:border-amber-500 group-hover:scale-105 transition-all flex items-center justify-center overflow-hidden">
            <img src="https://images.unsplash.com/photo-1606491956689-2ea866880c84?w=150&auto=format&fit=crop&q=80" alt="Vada Pav" class="w-full h-full object-cover rounded-full" onerror="handleFoodImageError(this, 'vadapav', 'Vada Pav')">
          </div>
          <span class="text-[11px] sm:text-xs font-bold text-stone-700 dark:text-stone-300 text-center">Vada Pav</span>
          <div class="cat-active-line w-6 h-0.5 rounded-full bg-transparent group-hover:bg-amber-500 transition-all"></div>
        </div>

        <!-- Tile 8: Butter Pav Bhaji -->
        <div onclick="filterCategory('pavbhaji')" class="cat-circle-item flex flex-col items-center space-y-1 shrink-0 cursor-pointer group snap-start">
          <div class="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-white dark:bg-stone-800 p-1 shadow-sm border border-stone-200 dark:border-stone-700 group-hover:border-amber-500 group-hover:scale-105 transition-all flex items-center justify-center overflow-hidden">
            <img src="https://images.unsplash.com/photo-1606491956689-2ea866880c84?w=150&auto=format&fit=crop&q=80" alt="Pav Bhaji" class="w-full h-full object-cover rounded-full" onerror="handleFoodImageError(this, 'pavbhaji', 'Pav Bhaji')">
          </div>
          <span class="text-[11px] sm:text-xs font-bold text-stone-700 dark:text-stone-300 text-center">Pav Bhaji</span>
          <div class="cat-active-line w-6 h-0.5 rounded-full bg-transparent group-hover:bg-amber-500 transition-all"></div>
        </div>

        <!-- Tile 9: Steamed Momos -->
        <div onclick="filterCategory('momos')" class="cat-circle-item flex flex-col items-center space-y-1 shrink-0 cursor-pointer group snap-start">
          <div class="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-white dark:bg-stone-800 p-1 shadow-sm border border-stone-200 dark:border-stone-700 group-hover:border-amber-500 group-hover:scale-105 transition-all flex items-center justify-center overflow-hidden">
            <img src="https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?w=150&auto=format&fit=crop&q=80" alt="Momos" class="w-full h-full object-cover rounded-full" onerror="handleFoodImageError(this, 'momos', 'Momos')">
          </div>
          <span class="text-[11px] sm:text-xs font-bold text-stone-700 dark:text-stone-300 text-center">Momos</span>
          <div class="cat-active-line w-6 h-0.5 rounded-full bg-transparent group-hover:bg-amber-500 transition-all"></div>
        </div>

        <!-- Tile 10: Crispy Benne Dosa -->
        <div onclick="filterCategory('south')" class="cat-circle-item flex flex-col items-center space-y-1 shrink-0 cursor-pointer group snap-start">
          <div class="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-white dark:bg-stone-800 p-1 shadow-sm border border-stone-200 dark:border-stone-700 group-hover:border-amber-500 group-hover:scale-105 transition-all flex items-center justify-center overflow-hidden">
            <img src="https://images.unsplash.com/photo-1668236543090-82eba5ee5976?w=150&auto=format&fit=crop&q=80" alt="Dosa" class="w-full h-full object-cover rounded-full" onerror="handleFoodImageError(this, 'south', 'Dosa')">
          </div>
          <span class="text-[11px] sm:text-xs font-bold text-stone-700 dark:text-stone-300 text-center">Benne Dosa</span>
          <div class="cat-active-line w-6 h-0.5 rounded-full bg-transparent group-hover:bg-amber-500 transition-all"></div>
        </div>

        <!-- Tile 11: Kathi Rolls -->
        <div onclick="filterCategory('rolls')" class="cat-circle-item flex flex-col items-center space-y-1 shrink-0 cursor-pointer group snap-start">
          <div class="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-white dark:bg-stone-800 p-1 shadow-sm border border-stone-200 dark:border-stone-700 group-hover:border-amber-500 group-hover:scale-105 transition-all flex items-center justify-center overflow-hidden">
            <img src="https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?w=150&auto=format&fit=crop&q=80" alt="Kathi Rolls" class="w-full h-full object-cover rounded-full" onerror="handleFoodImageError(this, 'rolls', 'Kathi Rolls')">
          </div>
          <span class="text-[11px] sm:text-xs font-bold text-stone-700 dark:text-stone-300 text-center">Kathi Rolls</span>
          <div class="cat-active-line w-6 h-0.5 rounded-full bg-transparent group-hover:bg-amber-500 transition-all"></div>
        </div>

        <!-- Tile 12: Kulhad Chai -->
        <div onclick="filterCategory('chai')" class="cat-circle-item flex flex-col items-center space-y-1 shrink-0 cursor-pointer group snap-start">
          <div class="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-white dark:bg-stone-800 p-1 shadow-sm border border-stone-200 dark:border-stone-700 group-hover:border-amber-500 group-hover:scale-105 transition-all flex items-center justify-center overflow-hidden">
            <img src="https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=150&auto=format&fit=crop&q=80" alt="Kulhad Chai" class="w-full h-full object-cover rounded-full" onerror="handleFoodImageError(this, 'chai', 'Kulhad Chai')">
          </div>
          <span class="text-[11px] sm:text-xs font-bold text-stone-700 dark:text-stone-300 text-center">Kulhad Chai</span>
          <div class="cat-active-line w-6 h-0.5 rounded-full bg-transparent group-hover:bg-amber-500 transition-all"></div>
        </div>
      </div>
    </div>

    <!-- Zomato-Style Quick Filter Pills Bar (Screenshots 1 & 2) -->
    <div id="quickFiltersBar" class="flex items-center space-x-2 overflow-x-auto hide-scrollbar py-1 text-xs select-none">
      <!-- Filters Dropdown Pill -->
      <button onclick="openFilterDrawer()" class="px-3 py-1.5 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 text-stone-700 dark:text-stone-200 font-bold whitespace-nowrap shadow-xs hover:border-amber-500 transition flex items-center space-x-1 shrink-0">
        <span>Filters</span>
        <i class="fa-solid fa-chevron-down text-[9px] text-stone-400"></i>
      </button>

      <!-- Near & Fast Pill -->
      <button id="pillNearFast" onclick="toggleNearAndFast()" class="px-3 py-1.5 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 text-stone-700 dark:text-stone-200 font-bold whitespace-nowrap shadow-xs hover:border-amber-500 transition flex items-center space-x-1 shrink-0">
        <i class="fa-solid fa-bolt text-amber-500 text-[11px]"></i>
        <span>Near & Fast</span>
      </button>

      <!-- No Packaging Charges Pill -->
      <button id="pillNoPackaging" onclick="toggleNoPackaging()" class="px-3 py-1.5 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 text-stone-700 dark:text-stone-200 font-bold whitespace-nowrap shadow-xs hover:border-amber-500 transition shrink-0">
        <span>No packaging charges</span>
      </button>

      <!-- Rating 4.0+ Pill -->
      <button id="pillTopRated" onclick="toggleTopRated()" class="px-3 py-1.5 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 text-stone-700 dark:text-stone-200 font-bold whitespace-nowrap shadow-xs hover:border-amber-500 transition flex items-center space-x-1 shrink-0">
        <i class="fa-solid fa-star text-amber-500 text-[10px]"></i>
        <span>Rating 4.0+</span>
      </button>

      <!-- Under ₹100 Pill -->
      <button onclick="scrollToDiscoverySection('secUnder100')" class="px-3 py-1.5 rounded-xl border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/60 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300 font-bold whitespace-nowrap shadow-xs hover:border-emerald-500 transition shrink-0">
        <span data-i18n="craving_under100">Under ₹100</span>
      </button>

      <!-- Favorites Pill -->
      <button onclick="filterCategory('favorites')" id="favPillBtn" class="px-3 py-1.5 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 text-stone-700 dark:text-stone-200 font-bold whitespace-nowrap hover:border-red-400 transition shadow-xs flex items-center space-x-1 shrink-0">
        <i class="fa-solid fa-heart text-red-500 text-[11px]"></i>
        <span data-i18n="favorites_tab">Favorites</span>
        <span id="favCountBadge" class="ml-1 bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 px-1.5 py-0.2 rounded-full text-[9px] font-black">0</span>
      </button>
    </div>

    <!-- Legacy category container kept for full script compatibility -->
    <div id="categoriesPillsContainer" class="hidden"></div>\n\n    <!-- Active Orders Live Bar (If any active orders) -->`;
html = replaceBlock(html, discStart, discEnd, newDiscovery, 'Top Discovery');

// 3. UPGRADE CATALOG SECTION HEADER & ADD EXPLORE MORE + PLANET BANNER
const stallsStart = '    <!-- ALL STREET THELAS CATALOG GRID                                -->';
const stallsEnd = '  </main>';
const newAllStalls = `<!-- ============================================================== -->
    <!-- RECOMMENDED FOR YOU / ALL STREET THELAS CATALOG GRID           -->
    <!-- ============================================================== -->
    <section id="secAllStalls" class="pt-2 space-y-3 sm:space-y-4">
      <div class="flex items-center justify-between">
        <div>
          <div class="text-[10px] sm:text-[11px] font-black text-amber-600 dark:text-amber-500 uppercase tracking-widest">
            RECOMMENDED FOR YOU
          </div>
          <h2 class="text-lg sm:text-xl font-black text-stone-900 dark:text-stone-100 tracking-tight" data-i18n="sec_allstalls_title">
            All Verified Street Thelas
          </h2>
          <p class="text-xs text-stone-500 dark:text-stone-400 mt-0.5" data-i18n="sec_allstalls_sub">
            Authentic local food carts in your neighborhood
          </p>
        </div>
        <span id="stallsCount" class="text-xs text-stone-500 dark:text-stone-400 font-bold bg-stone-100 dark:bg-stone-800 px-2.5 py-1 rounded-full">
          Loading authentic carts...
        </span>
      </div>
      
      <!-- Streamlined Food-First Grid (2 columns on mobile / tablet / desktop) -->
      <div id="stallsGrid" class="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        <!-- Rendered dynamically -->
      </div>
    </section>

    <!-- ============================================================== -->
    <!-- ZOMATO-STYLE "EXPLORE MORE" 4-TILE FEATURE HUB (Screenshot 2)   -->
    <!-- ============================================================== -->
    <section id="exploreMoreSection" class="pt-3 space-y-3">
      <div class="flex items-center space-x-2">
        <h2 class="text-xs font-black tracking-wider uppercase text-stone-400 dark:text-stone-500">
          EXPLORE MORE
        </h2>
      </div>

      <div class="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <!-- Tile 1: Offers -->
        <div onclick="openCouponsDrawer()" class="cursor-pointer bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl p-3.5 text-white flex flex-col justify-between h-24 hover:scale-[1.02] active:scale-95 transition shadow-sm group select-none">
          <div class="flex items-center justify-between">
            <div class="w-8 h-8 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center text-sm font-black">
              <i class="fa-solid fa-percent"></i>
            </div>
            <i class="fa-solid fa-sparkles text-xs opacity-75 group-hover:rotate-12 transition"></i>
          </div>
          <div>
            <div class="font-black text-sm">Offers</div>
            <div class="text-[10px] text-blue-100">Up to 70% OFF</div>
          </div>
        </div>

        <!-- Tile 2: Thela Gold Club -->
        <div onclick="openThelaGoldModal()" class="cursor-pointer bg-gradient-to-br from-amber-500 to-yellow-600 rounded-2xl p-3.5 text-stone-950 flex flex-col justify-between h-24 hover:scale-[1.02] active:scale-95 transition shadow-sm group select-none">
          <div class="flex items-center justify-between">
            <div class="w-8 h-8 rounded-xl bg-stone-950/20 backdrop-blur flex items-center justify-center text-sm font-black">
              <i class="fa-solid fa-crown text-stone-950"></i>
            </div>
            <span class="text-[9px] font-black bg-stone-950 text-amber-300 px-1.5 py-0.5 rounded">VIP</span>
          </div>
          <div>
            <div class="font-black text-sm">Thela Gold</div>
            <div class="text-[10px] text-stone-900 font-semibold">Free Deliveries</div>
          </div>
        </div>

        <!-- Tile 3: Food on Train -->
        <div onclick="openTrainFoodModal()" class="cursor-pointer bg-gradient-to-br from-cyan-600 to-teal-700 rounded-2xl p-3.5 text-white flex flex-col justify-between h-24 hover:scale-[1.02] active:scale-95 transition shadow-sm group select-none">
          <div class="flex items-center justify-between">
            <div class="w-8 h-8 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center text-sm font-black">
              <i class="fa-solid fa-train"></i>
            </div>
            <i class="fa-solid fa-arrow-right text-xs opacity-75"></i>
          </div>
          <div>
            <div class="font-black text-sm">Food on Train</div>
            <div class="text-[10px] text-cyan-100">Platform Drop</div>
          </div>
        </div>

        <!-- Tile 4: Chef's Table / Heritage Recipes -->
        <div onclick="scrollToDiscoverySection('secLegends')" class="cursor-pointer bg-gradient-to-br from-orange-600 to-red-700 rounded-2xl p-3.5 text-white flex flex-col justify-between h-24 hover:scale-[1.02] active:scale-95 transition shadow-sm group select-none">
          <div class="flex items-center justify-between">
            <div class="w-8 h-8 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center text-sm font-black">
              <i class="fa-solid fa-kitchen-set"></i>
            </div>
            <i class="fa-solid fa-fire-flame-curved text-xs opacity-75"></i>
          </div>
          <div>
            <div class="font-black text-sm">Chef's Tawa</div>
            <div class="text-[10px] text-orange-100">Heritage Legends</div>
          </div>
        </div>
      </div>

      <!-- Neighborhood Street Thelas Count Separator (Screenshot 2) -->
      <div class="py-2.5 flex items-center justify-center space-x-2 text-[11px] font-black text-stone-400 dark:text-stone-500 uppercase tracking-widest border-y border-stone-200/60 dark:border-stone-800">
        <i class="fa-solid fa-motorcycle text-amber-500"></i>
        <span id="exploreMoreThelasCount">1,971 STREET FOOD THELAS DELIVERING TO YOU</span>
      </div>
    </section>

    <!-- ============================================================== -->
    <!-- ZOMATO-STYLE COMPLIANCE, HYGIENE & PLANET BANNER (Screenshot 3) -->
    <!-- ============================================================== -->
    <section id="ecoPlanetBanner" class="mt-4 bg-stone-900 text-stone-100 rounded-3xl p-5 space-y-4 border border-stone-800 shadow-xl">
      <!-- Top Banner -->
      <div class="flex items-center justify-between bg-gradient-to-r from-emerald-950 via-stone-900 to-emerald-900 p-4 rounded-2xl border border-emerald-800/40">
        <div>
          <div class="text-xs font-black text-emerald-400 uppercase tracking-wider">ECO & ETHICAL COMMERCE</div>
          <div class="text-base sm:text-lg font-black text-white flex items-center space-x-1.5 mt-0.5">
            <span>Delivering for people and planet</span>
            <i class="fa-solid fa-arrow-right text-xs text-emerald-400"></i>
          </div>
        </div>
        <div class="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xl shrink-0">
          <i class="fa-solid fa-leaf"></i>
        </div>
      </div>

      <!-- Bullet Disclosures (Strictly matching Screenshot 3) -->
      <ul class="text-xs text-stone-400 space-y-2 list-disc pl-4 font-medium leading-relaxed">
        <li>Menu items, nutritional information and prices are set directly by authentic street food vendors.</li>
        <li>Nutritional information values displayed are indicative, per serving and may vary depending on ingredients, portion size and customizations.</li>
        <li>An average active adult requires 2,000 kcal energy per day, however, calorie needs may vary.</li>
        <li>Additional taxes & charges including platform fee, delivery and eco-packaging charges may be applicable on cart.</li>
        <li>Packaging charges are decided and charged by the authentic street cart vendor.</li>
      </ul>

      <!-- Report Issue & FSSAI Footer (Screenshot 3) -->
      <div class="pt-2 border-t border-stone-800 flex flex-wrap items-center justify-between gap-2 text-xs">
        <button type="button" onclick="reportMenuIssue()" class="text-red-400 hover:text-red-300 font-bold flex items-center space-x-1">
          <span>Report an issue with the menu</span>
          <i class="fa-solid fa-chevron-right text-[10px]"></i>
        </button>
        <div class="flex items-center space-x-2 text-stone-400 font-mono text-[11px] cursor-pointer" onclick="openTrustModal(STATE.stalls[0]?.id || '')">
          <span class="italic font-serif font-black text-white text-xs">fssai</span>
          <span>Lic. No. 13322004000125</span>
        </div>
      </div>
    </section>

  </main>`;
html = replaceBlock(html, stallsStart, stallsEnd, newAllStalls, 'Catalog & Planet Banner');

// 4. UPGRADE PROFILE MODAL TO FULL ZOMATO-STYLE ACCOUNT CENTER (Screenshots 4 & 5)
const profileStart = '  <!-- DRAWER: USER PROFILE & SETTINGS                                -->';
const profileEnd = '  <!-- DRAWER: SAVED ADDRESS BOOK & ADD NEW ADDRESS                   -->';
const newProfile = `<!-- DRAWER: USER PROFILE & SETTINGS (ZOMATO-STYLE ACCOUNT CENTER - Screenshots 4 & 5) -->
  <div id="profileModal" class="hidden fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex justify-end transition-all">
    <div class="bg-stone-950 text-white w-full sm:max-w-md h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-200 overflow-y-auto hide-scrollbar">
      
      <!-- Top Action Bar with Back Arrow (Screenshot 4) -->
      <div class="p-4 flex items-center justify-between border-b border-stone-800 shrink-0">
        <button onclick="closeProfileModal()" class="w-9 h-9 rounded-full bg-stone-900 text-stone-300 flex items-center justify-center hover:bg-stone-800 transition" title="Back">
          <i class="fa-solid fa-arrow-left"></i>
        </button>
        <span class="text-xs font-black text-stone-400 uppercase tracking-wider">Account Center</span>
        <div class="w-9"></div>
      </div>

      <div class="p-4 space-y-4 flex-1">
        <!-- Profile Header Card (Screenshot 4) -->
        <div class="bg-stone-900 border border-stone-800 rounded-3xl p-4 flex items-center space-x-3.5 relative overflow-hidden">
          <div class="w-14 h-14 rounded-full bg-gradient-to-tr from-amber-400 via-yellow-200 to-amber-500 p-0.5 shadow-md shrink-0">
            <div id="profileAvatar" class="w-full h-full rounded-full bg-stone-950 text-amber-200 flex items-center justify-center font-black text-xl">
              <span id="profileAvatarLetter">A</span>
            </div>
          </div>
          <div class="min-w-0 flex-1">
            <h2 id="profileDisplayName" class="font-black text-lg text-white truncate">Anurag</h2>
            <div id="profileDisplayEmail" class="text-xs text-stone-400 truncate">anuragdgsingh614@gmail.com</div>
            <div id="profileDisplayPhone" class="hidden text-xs text-stone-400">+91 ••••• •••••</div>
            <button type="button" onclick="toggleProfileEditForm()" class="text-xs font-bold text-amber-400 hover:text-amber-300 mt-0.5 flex items-center space-x-1">
              <span>Edit profile</span>
              <i class="fa-solid fa-caret-right text-[10px]"></i>
            </button>
          </div>
        </div>

        <!-- Hidden Stat elements preserved for script backward compatibility -->
        <div class="hidden">
          <span id="statTotalOrders">0</span>
          <span id="statSavedAddresses">0</span>
          <span id="statFavoritesCount">0</span>
        </div>

        <!-- Collapsible Edit Profile Form -->
        <form id="editProfileForm" onsubmit="handleUpdateProfile(event)" class="hidden bg-stone-900 border border-stone-800 rounded-2xl p-4 space-y-3">
          <div class="flex items-center justify-between border-b border-stone-800 pb-2">
            <h3 class="text-xs font-black text-stone-300 uppercase tracking-wider">Edit Personal Details</h3>
            <button type="button" onclick="toggleProfileEditForm()" class="text-[10px] text-stone-400">Cancel</button>
          </div>

          <div class="space-y-1 text-xs">
            <label class="font-bold text-stone-400">Your Full Name</label>
            <input type="text" id="profileNameInput" placeholder="Enter your full name" value="Anurag" required
              class="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 font-semibold text-white focus:outline-none focus:ring-2 focus:ring-amber-500">
          </div>

          <div class="space-y-1 text-xs">
            <label class="font-bold text-stone-400">Email Address</label>
            <input type="email" id="profileEmailInput" placeholder="Enter your email address" value="anuragdgsingh614@gmail.com"
              class="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 font-semibold text-white focus:outline-none focus:ring-2 focus:ring-amber-500">
          </div>

          <div class="flex items-center justify-between bg-stone-950 p-2.5 rounded-xl border border-stone-800">
            <div class="text-xs">
              <div class="font-bold text-stone-200">Pure Veg Mode</div>
              <div class="text-[10px] text-stone-400">Only show 100% vegetarian food carts</div>
            </div>
            <input type="checkbox" id="profileVegPrefToggle" class="w-4 h-4 accent-green-600 rounded cursor-pointer">
          </div>

          <button type="submit" id="saveProfileBtn" class="w-full bg-amber-600 hover:bg-amber-700 text-white rounded-xl py-2.5 text-xs font-black transition shadow-sm">
            Save Profile Changes
          </button>
        </form>

        <!-- Gold Member VIP Card (Screenshot 4) -->
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
            <span>saved ₹10816</span>
            <i class="fa-solid fa-chevron-right text-[9px]"></i>
          </div>
        </div>

        <!-- 2 Quick Cards: Thela Money & Coupons (Screenshot 4) -->
        <div class="grid grid-cols-2 gap-2.5 select-none">
          <div onclick="openWalletDrawer()" class="cursor-pointer bg-stone-900 border border-stone-800 rounded-2xl p-3.5 flex items-center space-x-3 hover:bg-stone-850 transition">
            <div class="w-8 h-8 rounded-xl bg-stone-800 text-stone-300 flex items-center justify-center text-sm">
              <i class="fa-solid fa-wallet"></i>
            </div>
            <div>
              <div class="text-[11px] text-stone-400 font-bold">Thela Money</div>
              <div class="text-sm font-black text-white" id="profileMoneyAmount">₹0</div>
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
        </div>

        <!-- App Update Available (Screenshot 4) -->
        <div class="bg-stone-900 border border-stone-800 rounded-2xl p-3 flex items-center justify-between text-xs select-none">
          <div class="flex items-center space-x-2.5 text-stone-300 font-bold">
            <i class="fa-solid fa-rotate text-stone-400"></i>
            <span>App version</span>
          </div>
          <div class="flex items-center space-x-1.5">
            <span class="text-red-400 font-mono font-bold">v2.2.0</span>
            <i class="fa-solid fa-chevron-right text-[10px] text-stone-500"></i>
          </div>
        </div>

        <!-- Section 1: Your preferences (Screenshot 4) -->
        <div class="space-y-2 select-none">
          <div class="flex items-center space-x-2">
            <div class="w-1 h-3.5 rounded-full bg-red-500"></div>
            <h3 class="text-xs font-black text-stone-300 tracking-wider">Your preferences</h3>
          </div>

          <div class="bg-stone-900 border border-stone-800 rounded-2xl divide-y divide-stone-800 text-xs">
            <!-- Veg Mode -->
            <div class="p-3.5 flex items-center justify-between cursor-pointer hover:bg-stone-850" onclick="toggleVegFilter()">
              <div class="flex items-center space-x-3 text-stone-200 font-bold">
                <span class="w-4 h-4 rounded border border-green-500 flex items-center justify-center p-0.5">
                  <span class="w-2 h-2 rounded-full bg-green-500"></span>
                </span>
                <span>Veg Mode</span>
              </div>
              <div class="flex items-center space-x-1 text-stone-400 font-bold">
                <span id="prefVegModeStatus">Off</span>
                <i class="fa-solid fa-chevron-right text-[10px]"></i>
              </div>
            </div>

            <!-- Personalized Ratings -->
            <div class="p-3.5 flex items-center justify-between">
              <div class="flex items-center space-x-3 text-stone-200 font-bold">
                <i class="fa-regular fa-star text-stone-400"></i>
                <span>Show personalised ratings</span>
              </div>
              <input type="checkbox" id="prefPersonalisedRatings" checked class="w-4 h-4 accent-amber-500 rounded cursor-pointer">
            </div>

            <!-- Appearance -->
            <div class="p-3.5 flex items-center justify-between cursor-pointer hover:bg-stone-850" onclick="cycleThemeMode()">
              <div class="flex items-center space-x-3 text-stone-200 font-bold">
                <i class="fa-solid fa-palette text-stone-400"></i>
                <span>Appearance</span>
              </div>
              <div class="flex items-center space-x-1 text-stone-400 font-bold">
                <span id="prefAppearanceLabel">Automatic</span>
                <i class="fa-solid fa-chevron-right text-[10px]"></i>
              </div>
            </div>

            <!-- Payment Methods -->
            <div class="p-3.5 flex items-center justify-between cursor-pointer hover:bg-stone-850" onclick="openPaymentMethods()">
              <div class="flex items-center space-x-3 text-stone-200 font-bold">
                <i class="fa-regular fa-credit-card text-stone-400"></i>
                <span>Payment methods</span>
              </div>
              <i class="fa-solid fa-chevron-right text-[10px] text-stone-500"></i>
            </div>
          </div>
        </div>

        <!-- Section 2: Food delivery (Screenshots 4 & 5) -->
        <div class="space-y-2 select-none">
          <div class="flex items-center space-x-2">
            <div class="w-1 h-3.5 rounded-full bg-red-500"></div>
            <h3 class="text-xs font-black text-stone-300 tracking-wider">Food delivery</h3>
          </div>

          <div class="bg-stone-900 border border-stone-800 rounded-2xl divide-y divide-stone-800 text-xs">
            <div class="p-3.5 flex items-center justify-between cursor-pointer hover:bg-stone-850" onclick="openOrderHistoryModal()">
              <div class="flex items-center space-x-3 text-stone-200 font-bold">
                <i class="fa-solid fa-bag-shopping text-stone-400"></i>
                <span>Your orders</span>
              </div>
              <i class="fa-solid fa-chevron-right text-[10px] text-stone-500"></i>
            </div>

            <div class="p-3.5 flex items-center justify-between cursor-pointer hover:bg-stone-850" onclick="openAddressDrawer()">
              <div class="flex items-center space-x-3 text-stone-200 font-bold">
                <i class="fa-solid fa-location-dot text-stone-400"></i>
                <span>Address book</span>
              </div>
              <i class="fa-solid fa-chevron-right text-[10px] text-stone-500"></i>
            </div>

            <div class="p-3.5 flex items-center justify-between cursor-pointer hover:bg-stone-850" onclick="filterCategory('favorites'); closeProfileModal();">
              <div class="flex items-center space-x-3 text-stone-200 font-bold">
                <i class="fa-regular fa-bookmark text-stone-400"></i>
                <span>Your collections</span>
              </div>
              <i class="fa-solid fa-chevron-right text-[10px] text-stone-500"></i>
            </div>

            <div class="p-3.5 flex items-center justify-between cursor-pointer hover:bg-stone-850" onclick="openTrainFoodModal()">
              <div class="flex items-center space-x-3 text-stone-200 font-bold">
                <i class="fa-solid fa-train text-stone-400"></i>
                <span>Order on train</span>
              </div>
              <i class="fa-solid fa-chevron-right text-[10px] text-stone-500"></i>
            </div>

            <div class="p-3.5 flex items-center justify-between cursor-pointer hover:bg-stone-850" onclick="openHelpDrawer()">
              <div class="flex items-center space-x-3 text-stone-200 font-bold">
                <i class="fa-regular fa-message text-stone-400"></i>
                <span>Online ordering help</span>
              </div>
              <i class="fa-solid fa-chevron-right text-[10px] text-stone-500"></i>
            </div>

            <div class="p-3.5 flex items-center justify-between cursor-pointer hover:bg-stone-850" onclick="scrollToDiscoverySection('secHiddenGems'); closeProfileModal();">
              <div class="flex items-center space-x-3 text-stone-200 font-bold">
                <i class="fa-regular fa-eye-slash text-stone-400"></i>
                <span>Hidden street stalls</span>
              </div>
              <i class="fa-solid fa-chevron-right text-[10px] text-stone-500"></i>
            </div>
          </div>
        </div>

        <!-- Section 3: Dining & experiences (Screenshot 5) -->
        <div class="space-y-2 select-none">
          <div class="flex items-center space-x-2">
            <div class="w-1 h-3.5 rounded-full bg-red-500"></div>
            <h3 class="text-xs font-black text-stone-300 tracking-wider">Dining & experiences</h3>
          </div>

          <div class="bg-stone-900 border border-stone-800 rounded-2xl divide-y divide-stone-800 text-xs">
            <div class="p-3.5 flex items-center justify-between cursor-pointer hover:bg-stone-850" onclick="showToast('Your dining ledger is clear')">
              <div class="flex items-center space-x-3 text-stone-200 font-bold">
                <i class="fa-solid fa-clock-rotate-left text-stone-400"></i>
                <span>Your dining transactions</span>
              </div>
              <i class="fa-solid fa-chevron-right text-[10px] text-stone-500"></i>
            </div>

            <div class="p-3.5 flex items-center justify-between cursor-pointer hover:bg-stone-850" onclick="showToast('You have 250 ThelaCoins')">
              <div class="flex items-center space-x-3 text-stone-200 font-bold">
                <i class="fa-solid fa-coins text-amber-400"></i>
                <span>Your ThelaCoins</span>
              </div>
              <div class="flex items-center space-x-1 text-amber-400 font-black">
                <span>250</span>
                <i class="fa-solid fa-chevron-right text-[10px]"></i>
              </div>
            </div>

            <div class="p-3.5 flex items-center justify-between cursor-pointer hover:bg-stone-850" onclick="openCouponsDrawer()">
              <div class="flex items-center space-x-3 text-stone-200 font-bold">
                <i class="fa-solid fa-gift text-pink-400"></i>
                <span>Your dining rewards</span>
              </div>
              <i class="fa-solid fa-chevron-right text-[10px] text-stone-500"></i>
            </div>
          </div>
        </div>

        <!-- Logout Button -->
        <div class="pt-2 pb-6">
          <button type="button" onclick="handleLogout()" class="w-full bg-stone-900 hover:bg-stone-850 border border-red-500/30 text-red-400 rounded-2xl py-3 text-xs font-black transition flex items-center justify-center space-x-2">
            <i class="fa-solid fa-arrow-right-from-bracket"></i>
            <span>Log Out of Account</span>
          </button>
        </div>
      </div>
    </div>
  </div>\n\n  <!-- DRAWER: SAVED ADDRESS BOOK & ADD NEW ADDRESS                   -->`;
html = replaceBlock(html, profileStart, profileEnd, newProfile, 'Profile Center');

// 5. ADD FLOATING BOTTOM DOCK & COMPANION DRAWERS (GOLD, COUPONS, TRAIN, WALLET) BEFORE SCRIPTS
const bottomInsertionPoint = '  <!-- Bottom Persistent Floating Cart Bar (for Customer View) -->';

const bottomComponents = `  <!-- ============================================================== -->
  <!-- FLOATING MODERN FROSTED-GLASS BOTTOM DOCK (Screenshots 1 & 2)  -->
  <!-- ============================================================== -->
  <nav id="floatingBottomDock" class="fixed bottom-4 inset-x-0 mx-auto max-w-sm w-[92%] z-30 transition-all duration-300">
    <div class="backdrop-blur-xl bg-stone-900/90 dark:bg-stone-950/95 text-white border border-stone-700/60 dark:border-stone-800 rounded-full shadow-2xl px-3 py-2 flex items-center justify-between select-none">
      <!-- Home Tab -->
      <button onclick="switchDockTab('home')" id="dockTabHome" class="flex flex-col items-center px-3 py-1 rounded-full text-amber-500 font-bold transition">
        <i class="fa-solid fa-house text-sm"></i>
        <span class="text-[9px] mt-0.5">Home</span>
      </button>

      <!-- Under ₹100 Tab -->
      <button onclick="switchDockTab('under100')" id="dockTabUnder100" class="flex flex-col items-center px-3 py-1 rounded-full text-stone-400 hover:text-white font-bold transition">
        <i class="fa-solid fa-receipt text-sm"></i>
        <span class="text-[9px] mt-0.5">Under ₹100</span>
      </button>

      <!-- Dining / Stalls Tab -->
      <button onclick="switchDockTab('dining')" id="dockTabDining" class="flex flex-col items-center px-3 py-1 rounded-full text-stone-400 hover:text-white font-bold transition">
        <i class="fa-solid fa-utensils text-sm"></i>
        <span class="text-[9px] mt-0.5">Dining</span>
      </button>

      <!-- Healthy Mode / Veg Pill Button (Screenshot 1) -->
      <button onclick="toggleHealthyMode()" id="dockHealthyBtn" class="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-full bg-emerald-600/90 hover:bg-emerald-500 text-white text-xs font-black shadow-sm transition active:scale-95">
        <i class="fa-solid fa-heart text-[10px]"></i>
        <span class="text-[10px]">Healthy Mode</span>
      </button>
    </div>
  </nav>

  <!-- ============================================================== -->
  <!-- MODAL: THELA GOLD VIP MEMBERSHIP CLUB                           -->
  <!-- ============================================================== -->
  <div id="thelaGoldModal" class="hidden fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
    <div class="bg-stone-900 border border-amber-500/40 text-white w-full max-w-sm rounded-3xl p-5 space-y-4 shadow-2xl relative overflow-hidden">
      <div class="absolute -right-12 -top-12 w-40 h-40 bg-amber-500/20 rounded-full blur-2xl pointer-events-none"></div>

      <div class="flex items-center justify-between relative z-10">
        <div class="flex items-center space-x-2">
          <div class="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
            <i class="fa-solid fa-crown text-base"></i>
          </div>
          <div>
            <h3 class="font-black text-base text-amber-300">Thela Gold VIP</h3>
            <p class="text-[10px] text-amber-200/80">Exclusive Street Connoisseur Club</p>
          </div>
        </div>
        <button onclick="closeThelaGoldModal()" class="w-8 h-8 rounded-full bg-stone-800 text-stone-400 hover:text-white flex items-center justify-center">
          <i class="fa-solid fa-xmark text-sm"></i>
        </button>
      </div>

      <!-- Savings Pill -->
      <div class="bg-gradient-to-r from-amber-950/80 to-stone-950 p-3 rounded-2xl border border-amber-500/30 flex items-center justify-between">
        <div>
          <div class="text-[10px] text-amber-400/80 uppercase font-black">Lifetime Savings</div>
          <div class="text-xl font-black text-amber-300">₹10,816</div>
        </div>
        <span class="bg-amber-400 text-stone-950 text-[10px] font-black px-2.5 py-1 rounded-full uppercase">Active Member</span>
      </div>

      <div class="space-y-2 text-xs text-stone-300">
        <div class="flex items-center space-x-2.5">
          <i class="fa-solid fa-motorcycle text-amber-400 text-xs w-4"></i>
          <span><strong>Unlimited FREE Delivery</strong> on carts above ₹99</span>
        </div>
        <div class="flex items-center space-x-2.5">
          <i class="fa-solid fa-box text-amber-400 text-xs w-4"></i>
          <span><strong>Zero Packaging Fee</strong> on all verified carts</span>
        </div>
        <div class="flex items-center space-x-2.5">
          <i class="fa-solid fa-bolt text-amber-400 text-xs w-4"></i>
          <span><strong>Priority Kitchen Dispatch</strong> during peak hours</span>
        </div>
        <div class="flex items-center space-x-2.5">
          <i class="fa-solid fa-gift text-amber-400 text-xs w-4"></i>
          <span><strong>Complimentary Street Delicacy</strong> on every 5th order</span>
        </div>
      </div>

      <button onclick="showToast('Your Gold Membership is active & auto-applied!'); closeThelaGoldModal();" class="w-full bg-gradient-to-r from-amber-400 to-amber-500 text-stone-950 rounded-xl py-3 text-xs font-black hover:from-amber-300 hover:to-amber-400 transition shadow-md">
        Continue Enjoying Gold Perks
      </button>
    </div>
  </div>

  <!-- ============================================================== -->
  <!-- DRAWER: COUPONS & PROMO DEALS (12 ACTIVE VOUCHERS)              -->
  <!-- ============================================================== -->
  <div id="couponsDrawer" class="hidden fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex justify-end transition-all">
    <div class="bg-stone-950 text-white w-full sm:max-w-md h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-200 overflow-y-auto hide-scrollbar">
      <div class="p-4 border-b border-stone-800 flex items-center justify-between">
        <div class="flex items-center space-x-2">
          <div class="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
            <i class="fa-solid fa-percent text-xs"></i>
          </div>
          <div>
            <h3 class="font-black text-sm text-white">Your Available Coupons</h3>
            <p class="text-[10px] text-stone-400">12 street food savings vouchers active</p>
          </div>
        </div>
        <button onclick="closeCouponsDrawer()" class="w-8 h-8 rounded-full bg-stone-900 text-stone-400 hover:text-white flex items-center justify-center">
          <i class="fa-solid fa-xmark text-sm"></i>
        </button>
      </div>

      <div class="p-4 space-y-3 flex-1 overflow-y-auto hide-scrollbar" id="couponsListContainer">
        <!-- Rendered dynamically via openCouponsDrawer -->
      </div>
    </div>
  </div>

  <!-- ============================================================== -->
  <!-- MODAL: FOOD ON TRAIN / RAILWAY EXPRESS DELIVERY                 -->
  <!-- ============================================================== -->
  <div id="trainFoodModal" class="hidden fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
    <div class="bg-stone-900 border border-cyan-500/40 text-white w-full max-w-sm rounded-3xl p-5 space-y-4 shadow-2xl">
      <div class="flex items-center justify-between">
        <div class="flex items-center space-x-2">
          <div class="w-9 h-9 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
            <i class="fa-solid fa-train text-base"></i>
          </div>
          <div>
            <h3 class="font-black text-base text-cyan-300">Food on Train</h3>
            <p class="text-[10px] text-cyan-200/80">Delivered right to your coach berth</p>
          </div>
        </div>
        <button onclick="closeTrainFoodModal()" class="w-8 h-8 rounded-full bg-stone-800 text-stone-400 hover:text-white flex items-center justify-center">
          <i class="fa-solid fa-xmark text-sm"></i>
        </button>
      </div>

      <div class="space-y-2.5 text-xs">
        <div>
          <label class="font-bold text-stone-400">Select Railway Station</label>
          <select id="trainStationSelect" class="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 font-semibold text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 mt-1">
            <option>Anand Vihar Terminal (ANVT)</option>
            <option>New Delhi Railway Station (NDLS)</option>
            <option>Old Delhi Jn (DLI)</option>
            <option selected>Sahibabad Jn (SBB)</option>
            <option>Hazrat Nizamuddin (NZM)</option>
          </select>
        </div>

        <div class="grid grid-cols-2 gap-2">
          <div>
            <label class="font-bold text-stone-400">Train No. / Name</label>
            <input type="text" id="trainNoInput" placeholder="e.g. 12004 Shatabdi" class="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 font-semibold text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 mt-1">
          </div>
          <div>
            <label class="font-bold text-stone-400">Coach & Berth</label>
            <input type="text" id="trainBerthInput" placeholder="e.g. B4 - 36" class="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 font-semibold text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 mt-1">
          </div>
        </div>

        <p class="text-[10px] text-cyan-200/70 pt-1">
          Our delivery partner meets your train at the platform during the scheduled halt with thermal-insulated fresh street delicacies.
        </p>

        <button onclick="handleTrainDeliverySave()" class="w-full bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl py-2.5 text-xs font-black transition shadow-md">
          Save Train Journey Details
        </button>
      </div>
    </div>
  </div>

  <!-- ============================================================== -->
  <!-- DRAWER: THELA WALLET & 1-TAP REFUND CREDITS                    -->
  <!-- ============================================================== -->
  <div id="walletDrawer" class="hidden fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex justify-end transition-all">
    <div class="bg-stone-950 text-white w-full sm:max-w-md h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-200 overflow-y-auto hide-scrollbar">
      <div class="p-4 border-b border-stone-800 flex items-center justify-between">
        <div class="flex items-center space-x-2">
          <div class="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
            <i class="fa-solid fa-wallet text-xs"></i>
          </div>
          <div>
            <h3 class="font-black text-sm text-white">Thela Money Wallet</h3>
            <p class="text-[10px] text-stone-400">Instant 1-tap checkout & lightning refunds</p>
          </div>
        </div>
        <button onclick="closeWalletDrawer()" class="w-8 h-8 rounded-full bg-stone-900 text-stone-400 hover:text-white flex items-center justify-center">
          <i class="fa-solid fa-xmark text-sm"></i>
        </button>
      </div>

      <div class="p-4 space-y-4">
        <!-- Balance Card -->
        <div class="bg-gradient-to-br from-amber-600 to-orange-700 rounded-3xl p-5 text-white space-y-2 shadow-lg">
          <div class="text-xs font-black uppercase text-amber-100">Current Balance</div>
          <div class="text-3xl font-black text-white" id="walletTotalBalance">₹0.00</div>
          <div class="text-[10px] text-amber-100/90 font-medium">Linked to Indian Instant UPI & Escrow Ledger</div>
        </div>

        <!-- Recharge Suggestions -->
        <div class="space-y-1.5 text-xs">
          <label class="font-bold text-stone-400">Quick Recharge Amount</label>
          <div class="grid grid-cols-3 gap-2">
            <button onclick="rechargeWallet(200)" class="py-2 rounded-xl bg-stone-900 border border-stone-800 hover:border-amber-500 text-white font-bold transition">+₹200</button>
            <button onclick="rechargeWallet(500)" class="py-2 rounded-xl bg-stone-900 border border-stone-800 hover:border-amber-500 text-white font-bold transition">+₹500</button>
            <button onclick="rechargeWallet(1000)" class="py-2 rounded-xl bg-stone-900 border border-stone-800 hover:border-amber-500 text-white font-bold transition">+₹1000</button>
          </div>
        </div>

        <!-- Transactions history -->
        <div class="space-y-2">
          <div class="text-xs font-black text-stone-400 uppercase tracking-wider">Recent Transactions</div>
          <div class="bg-stone-900 border border-stone-800 rounded-2xl p-4 text-center text-xs text-stone-500">
            <i class="fa-solid fa-clock-rotate-left text-2xl text-stone-700 mb-1"></i>
            <div>No recent wallet debits or recharges</div>
          </div>
        </div>
      </div>
    </div>
  </div>\n\n` + bottomInsertionPoint;

html = replaceBlock(html, bottomInsertionPoint, bottomInsertionPoint, bottomComponents, 'Bottom Components');

fs.writeFileSync(indexPath, html, 'utf8');
console.log('🎉 Successfully applied Zomato-grade design upgrades to public/index.html!');
