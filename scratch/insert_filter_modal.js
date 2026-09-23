// scratch/insert_filter_modal.js
const fs = require('fs');
const path = require('path');

const htmlPath = path.join(__dirname, '..', 'public', 'index.html');
let html = fs.readFileSync(htmlPath, 'utf8').replace(/\r\n/g, '\n');

const target = '  <!-- ==============================================================\n  <!-- FLOATING MODERN FROSTED-GLASS BOTTOM DOCK';

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
  </div>\n\n`;

const anchor = '  <nav id="floatingBottomDock"';
if (html.includes(anchor)) {
  html = html.replace(anchor, filterDrawerHtml + anchor);
  fs.writeFileSync(htmlPath, html.replace(/\n/g, '\r\n'), 'utf8');
  console.log('✓ Injected #filterModal above floatingBottomDock');
} else {
  console.error('Could not find anchor floatingBottomDock');
}
