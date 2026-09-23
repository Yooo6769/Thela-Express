// scratch/fix_theme_and_carousel.js
const fs = require('fs');
const path = require('path');

const htmlPath = path.join(__dirname, '..', 'public', 'index.html');
const cssPath = path.join(__dirname, '..', 'public', 'theme.css');
const appJsPath = path.join(__dirname, '..', 'public', 'app.js');

let html = fs.readFileSync(htmlPath, 'utf8').replace(/\r\n/g, '\n');
let css = fs.readFileSync(cssPath, 'utf8').replace(/\r\n/g, '\n');
let appJs = fs.readFileSync(appJsPath, 'utf8').replace(/\r\n/g, '\n');

console.log('=== 1. FIXING THEME.CSS: PREVENT WHITE HIGHLIGHTS IN DARK MODE ===');
const oldHoverCss = `html.dark .hover\\:bg-gray-50:hover,
html.dark .hover\\:bg-gray-100:hover,
html.dark .hover\\:bg-slate-50:hover,
html.dark .hover\\:bg-slate-100:hover {
  background-color: #27272a !important;
}`;

const newHoverCss = `/* Bulletproof dark mode hover & active protection (Eliminates white flashes on tap/touch/hover) */
html.dark .hover\\:bg-stone-50:hover,
html.dark .hover\\:bg-stone-100:hover,
html.dark .hover\\:bg-stone-200:hover,
html.dark .hover\\:bg-stone-50:active,
html.dark .hover\\:bg-stone-100:active,
html.dark .hover\\:bg-stone-200:active,
html.dark .hover\\:bg-gray-50:hover,
html.dark .hover\\:bg-gray-100:hover,
html.dark .hover\\:bg-gray-200:hover,
html.dark .hover\\:bg-gray-50:active,
html.dark .hover\\:bg-gray-100:active,
html.dark .hover\\:bg-gray-200:active,
html.dark .hover\\:bg-slate-50:hover,
html.dark .hover\\:bg-slate-100:hover,
html.dark .hover\\:bg-slate-200:hover,
html.dark .hover\\:bg-slate-50:active,
html.dark .hover\\:bg-slate-100:active,
html.dark .hover\\:bg-slate-200:active,
html.dark .hover\\:bg-zinc-50:hover,
html.dark .hover\\:bg-zinc-100:hover,
html.dark .hover\\:bg-zinc-200:hover,
html.dark .hover\\:bg-neutral-50:hover,
html.dark .hover\\:bg-neutral-100:hover,
html.dark .hover\\:bg-neutral-200:hover {
  background-color: #27272a !important;
  color: var(--thela-text-primary) !important;
}`;

if (css.includes(oldHoverCss)) {
  css = css.replace(oldHoverCss, newHoverCss);
  console.log('✓ Updated theme.css with comprehensive dark hover/active rules');
} else {
  console.log('Notice: oldHoverCss not exact match, appending to theme.css');
  css += '\n\n' + newHoverCss;
}
fs.writeFileSync(cssPath, css.replace(/\n/g, '\r\n'), 'utf8');

console.log('=== 2. FIXING PROFILE MODAL IN PUBLIC/INDEX.HTML ===');
// Replace dark:hover:bg-stone-850 with dark:hover:bg-stone-800
html = html.replace(/dark:hover:bg-stone-100 dark:hover:bg-stone-850/g, 'dark:hover:bg-stone-800');
html = html.replace(/dark:hover:bg-stone-850/g, 'dark:hover:bg-stone-800');
console.log('✓ Replaced all stone-850 invalid classes with dark:hover:bg-stone-800');

console.log('=== 3. ADDING REAL PHOTOS AND ACCESSIBLE CONTROLS TO CAROUSEL IN INDEX.HTML ===');

const oldCarouselSectionRegex = /<!-- Zomato-Style Festive Promotional Hero Carousel[\s\S]*?<!-- Zomato-Style Circular Food Category Stories Rail/;

const newCarouselSection = `<!-- Zomato-Style Festive Promotional Hero Carousel (Real Photos + Touch/Swipe Accessible) -->
    <div id="heroPromoCarousel" role="region" aria-roledescription="carousel" aria-label="Festive Street Food Promotions" tabindex="0" class="relative rounded-3xl overflow-hidden shadow-md select-none group focus:outline-none focus:ring-2 focus:ring-amber-500/50 cursor-grab active:cursor-grabbing">
      <!-- Carousel Track -->
      <div id="promoTrack" class="flex transition-transform duration-500 ease-out w-full">
        <!-- Slide 1: 70% OFF Street Feast (Real Street Samosas & Chaat Photo) -->
        <div class="min-w-full relative bg-gradient-to-r from-sky-500 via-blue-600 to-indigo-700 p-5 sm:p-6 text-white overflow-hidden flex flex-col justify-between min-h-[170px] sm:min-h-[200px]" role="group" aria-roledescription="slide" aria-label="1 of 3: 70% OFF Limited Time Feast">
          <div class="absolute -right-8 -bottom-8 w-48 h-48 rounded-full bg-white/10 blur-xl pointer-events-none"></div>

          <div class="relative z-10 max-w-[58%] sm:max-w-[55%] space-y-1 sm:space-y-1.5">
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
            <button onclick="applyPromoCode('THELA70')" class="px-4 py-1.5 sm:px-5 sm:py-2 rounded-full bg-stone-950 hover:bg-black text-white text-xs sm:text-sm font-black transition flex items-center space-x-1.5 shadow-md active:scale-95 cursor-pointer">
              <span>Order now</span>
              <i class="fa-solid fa-chevron-right text-[10px]"></i>
            </button>
          </div>

          <!-- Real Mouth-Watering Samosas & Street Snacks Photo -->
          <div class="absolute right-2 sm:right-4 top-2.5 sm:top-3 bottom-2.5 sm:bottom-3 w-[38%] sm:w-[42%] max-w-[210px] pointer-events-none flex items-center justify-center">
            <div class="relative w-full h-full rounded-2xl overflow-hidden shadow-2xl border-2 border-white/20 group-hover:scale-105 transition duration-500">
              <img src="https://images.unsplash.com/photo-1601050690597-df0568f70950?w=500&auto=format&fit=crop&q=80" 
                   alt="Crispy Hot Street Samosas & Chaat" 
                   class="w-full h-full object-cover" 
                   loading="eager">
              <div class="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent"></div>
              <span class="absolute bottom-1.5 left-2 text-[9px] font-black bg-black/60 backdrop-blur-sm px-1.5 py-0.5 rounded text-amber-300">
                Fresh & Hot
              </span>
            </div>
          </div>
        </div>

        <!-- Slide 2: Thela Gold Club (Real Authentic Street Feast Photo) -->
        <div class="min-w-full relative bg-gradient-to-r from-stone-900 via-zinc-800 to-amber-950 p-5 sm:p-6 text-white overflow-hidden flex flex-col justify-between min-h-[170px] sm:min-h-[200px]" role="group" aria-roledescription="slide" aria-label="2 of 3: Thela Gold VIP Club">
          <div class="absolute -right-8 -bottom-8 w-48 h-48 rounded-full bg-amber-500/10 blur-xl pointer-events-none"></div>

          <div class="relative z-10 max-w-[58%] sm:max-w-[55%] space-y-1 sm:space-y-1.5">
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
            <button onclick="openThelaGoldModal()" class="px-4 py-1.5 sm:px-5 sm:py-2 rounded-full bg-gradient-to-r from-amber-400 to-amber-500 text-stone-950 text-xs sm:text-sm font-black hover:from-amber-300 hover:to-amber-400 transition flex items-center space-x-1.5 shadow-md active:scale-95 cursor-pointer">
              <span>View Benefits</span>
              <i class="fa-solid fa-chevron-right text-[10px]"></i>
            </button>
          </div>

          <!-- Real Royal Street Food Spread Photo -->
          <div class="absolute right-2 sm:right-4 top-2.5 sm:top-3 bottom-2.5 sm:bottom-3 w-[38%] sm:w-[42%] max-w-[210px] pointer-events-none flex items-center justify-center">
            <div class="relative w-full h-full rounded-2xl overflow-hidden shadow-2xl border-2 border-amber-400/40 group-hover:scale-105 transition duration-500">
              <img src="https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=500&auto=format&fit=crop&q=80" 
                   alt="Royal Indian Street Food Platter" 
                   class="w-full h-full object-cover">
              <div class="absolute inset-0 bg-gradient-to-t from-stone-950/50 via-transparent to-transparent"></div>
              <span class="absolute bottom-1.5 left-2 text-[9px] font-black bg-amber-500 text-stone-950 px-1.5 py-0.5 rounded shadow">
                <i class="fa-solid fa-crown text-[8px] mr-0.5"></i> VIP Feast
              </span>
            </div>
          </div>
        </div>

        <!-- Slide 3: Midnight Carnival (Real Sizzling Pav Bhaji & Rolls Photo) -->
        <div class="min-w-full relative bg-gradient-to-r from-indigo-950 via-purple-900 to-pink-900 p-5 sm:p-6 text-white overflow-hidden flex flex-col justify-between min-h-[170px] sm:min-h-[200px]" role="group" aria-roledescription="slide" aria-label="3 of 3: Midnight Carnival">
          <div class="absolute -right-8 -bottom-8 w-48 h-48 rounded-full bg-pink-500/10 blur-xl pointer-events-none"></div>

          <div class="relative z-10 max-w-[58%] sm:max-w-[55%] space-y-1 sm:space-y-1.5">
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
            <button onclick="scrollToDiscoverySection('secLateNight')" class="px-4 py-1.5 sm:px-5 sm:py-2 rounded-full bg-white text-stone-900 text-xs sm:text-sm font-black hover:bg-stone-100 transition flex items-center space-x-1.5 shadow-md active:scale-95 cursor-pointer">
              <span>Order Now</span>
              <i class="fa-solid fa-chevron-right text-[10px]"></i>
            </button>
          </div>

          <!-- Real Butter Pav Bhaji Photo -->
          <div class="absolute right-2 sm:right-4 top-2.5 sm:top-3 bottom-2.5 sm:bottom-3 w-[38%] sm:w-[42%] max-w-[210px] pointer-events-none flex items-center justify-center">
            <div class="relative w-full h-full rounded-2xl overflow-hidden shadow-2xl border-2 border-pink-400/30 group-hover:scale-105 transition duration-500">
              <img src="https://images.unsplash.com/photo-1606491956689-2ea866880c84?w=500&auto=format&fit=crop&q=80" 
                   alt="Sizzling Butter Pav Bhaji" 
                   class="w-full h-full object-cover">
              <div class="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent"></div>
              <span class="absolute bottom-1.5 left-2 text-[9px] font-black bg-pink-600 text-white px-1.5 py-0.5 rounded shadow">
                🌙 Late Night
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Accessible Prev & Next Arrow Controls (Allows manual sliding by tap/click) -->
      <button id="carouselPrevBtn" onclick="prevCarouselSlide()" aria-label="Previous Slide" 
        class="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-stone-950/60 hover:bg-stone-950 text-white backdrop-blur-md flex items-center justify-center text-xs shadow-lg transition active:scale-90 z-20 cursor-pointer border border-white/20" title="Previous Banner">
        <i class="fa-solid fa-chevron-left"></i>
      </button>
      <button id="carouselNextBtn" onclick="nextCarouselSlide()" aria-label="Next Slide" 
        class="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-stone-950/60 hover:bg-stone-950 text-white backdrop-blur-md flex items-center justify-center text-xs shadow-lg transition active:scale-90 z-20 cursor-pointer border border-white/20" title="Next Banner">
        <i class="fa-solid fa-chevron-right"></i>
      </button>

      <!-- Carousel Pagination Indicator Dots (Accessible 1-tap jump) -->
      <div id="carouselDots" class="absolute bottom-2.5 right-4 flex items-center space-x-1.5 z-20" role="tablist" aria-label="Carousel Slides">
        <button onclick="setCarouselSlide(0)" role="tab" aria-label="Go to slide 1" class="carousel-dot p-1 flex items-center justify-center focus:outline-none cursor-pointer">
          <span class="dot-bar w-6 h-1.5 rounded-full bg-white block transition-all duration-300"></span>
        </button>
        <button onclick="setCarouselSlide(1)" role="tab" aria-label="Go to slide 2" class="carousel-dot p-1 flex items-center justify-center focus:outline-none cursor-pointer">
          <span class="dot-bar w-2 h-1.5 rounded-full bg-white/50 block transition-all duration-300"></span>
        </button>
        <button onclick="setCarouselSlide(2)" role="tab" aria-label="Go to slide 3" class="carousel-dot p-1 flex items-center justify-center focus:outline-none cursor-pointer">
          <span class="dot-bar w-2 h-1.5 rounded-full bg-white/50 block transition-all duration-300"></span>
        </button>
      </div>
    </div>

    <!-- Zomato-Style Circular Food Category Stories Rail`;

if (oldCarouselSectionRegex.test(html)) {
  html = html.replace(oldCarouselSectionRegex, newCarouselSection);
  console.log('✓ Injected real photos & accessible slide controls into public/index.html');
} else {
  console.log('Error: Could not locate carousel section regex in index.html');
}

fs.writeFileSync(htmlPath, html.replace(/\n/g, '\r\n'), 'utf8');

console.log('=== 4. UPDATING CAROUSEL CONTROLS, TOUCH SWIPES & KEYBOARD IN APP.JS ===');

const oldCarouselJsRegex = /let promoCarouselIndex = 0;[\s\S]*?function setCarouselSlide\(idx\) \{[\s\S]*?\n\}/;

const newCarouselJs = `// ==========================================================
// ZOMATO-STYLE HERO PROMO CAROUSEL (SWIPE, DRAG & KEYBOARD ACCESSIBLE)
// ==========================================================
let promoCarouselIndex = 0;
let promoCarouselTimer = null;

function resetPromoCarouselTimer() {
  if (promoCarouselTimer) clearInterval(promoCarouselTimer);
  promoCarouselTimer = setInterval(() => {
    nextCarouselSlide();
  }, 5000);
}

function nextCarouselSlide() {
  setCarouselSlide((promoCarouselIndex + 1) % 3);
  resetPromoCarouselTimer();
}

function prevCarouselSlide() {
  setCarouselSlide((promoCarouselIndex - 1 + 3) % 3);
  resetPromoCarouselTimer();
}

function initPromoCarousel() {
  const carousel = document.getElementById('heroPromoCarousel');
  if (!carousel) return;
  
  resetPromoCarouselTimer();

  // Pause on hover
  carousel.addEventListener('mouseenter', () => {
    if (promoCarouselTimer) clearInterval(promoCarouselTimer);
  });
  carousel.addEventListener('mouseleave', () => {
    resetPromoCarouselTimer();
  });

  // Touch swipe support (Mobile thumb gestures)
  let touchStartX = 0;
  let touchStartY = 0;
  let touchEndX = 0;
  let touchEndY = 0;
  let isTouchSwiping = false;

  carousel.addEventListener('touchstart', (e) => {
    if (!e.changedTouches || e.changedTouches.length === 0) return;
    touchStartX = e.changedTouches[0].clientX;
    touchStartY = e.changedTouches[0].clientY;
    isTouchSwiping = true;
  }, { passive: true });

  carousel.addEventListener('touchend', (e) => {
    if (!isTouchSwiping || !e.changedTouches || e.changedTouches.length === 0) return;
    isTouchSwiping = false;
    touchEndX = e.changedTouches[0].clientX;
    touchEndY = e.changedTouches[0].clientY;
    
    const diffX = touchEndX - touchStartX;
    const diffY = touchEndY - touchStartY;
    
    // Only trigger if horizontal swipe is dominant and exceeds 35px threshold
    if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 35) {
      if (diffX < 0) {
        nextCarouselSlide(); // Swiped left -> Next slide
      } else {
        prevCarouselSlide(); // Swiped right -> Previous slide
      }
    }
  }, { passive: true });

  // Pointer drag support (Desktop mouse/trackpad dragging)
  let isPointerDown = false;
  let pointerStartX = 0;

  carousel.addEventListener('pointerdown', (e) => {
    // Ignore button clicks
    if (e.target.closest('button')) return;
    isPointerDown = true;
    pointerStartX = e.clientX;
  });

  carousel.addEventListener('pointerup', (e) => {
    if (!isPointerDown) return;
    isPointerDown = false;
    const diff = e.clientX - pointerStartX;
    if (Math.abs(diff) > 40) {
      if (diff < 0) {
        nextCarouselSlide();
      } else {
        prevCarouselSlide();
      }
    }
  });

  carousel.addEventListener('pointercancel', () => {
    isPointerDown = false;
  });

  // Keyboard navigation when carousel is focused
  carousel.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      nextCarouselSlide();
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      prevCarouselSlide();
    }
  });
}

function setCarouselSlide(idx) {
  promoCarouselIndex = idx;
  const track = document.getElementById('promoTrack');
  const dots = document.querySelectorAll('.carousel-dot');
  
  if (track) {
    track.style.transform = \`translateX(-\${idx * 100}%)\`;
  }
  
  dots.forEach((dot, i) => {
    const bar = dot.querySelector('.dot-bar') || dot;
    if (i === idx) {
      bar.className = 'dot-bar w-6 h-1.5 rounded-full bg-white transition-all duration-300';
      dot.setAttribute('aria-selected', 'true');
    } else {
      bar.className = 'dot-bar w-2 h-1.5 rounded-full bg-white/50 transition-all duration-300';
      dot.setAttribute('aria-selected', 'false');
    }
  });
}`;

if (oldCarouselJsRegex.test(appJs)) {
  appJs = appJs.replace(oldCarouselJsRegex, newCarouselJs);
  console.log('✓ Successfully injected swipe, drag, next/prev & keyboard navigation into app.js');
} else {
  console.log('Error: Could not locate carousel JS regex in app.js');
}

fs.writeFileSync(appJsPath, appJs.replace(/\n/g, '\r\n'), 'utf8');

console.log('=== FIX COMPLETE ===');
