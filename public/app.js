// ThelaExpress - Production Client Application Logic
// Realtime WebSocket integration, Multi-Role views, State Machine & Audio Engine

const STATE = {
  currentView: 'customer',
  user: null,
  activeAddress: null,
  stalls: [],
  currentStall: null,
  currentMenu: [],
  cart: {
    stallId: null,
    stallName: '',
    items: [] // { item_id, name, price, qty, customs: {} }
  },
  activeOrders: [],
  selectedCategory: 'all',
  searchQuery: '',
  vegOnly: false,
  favorites: [],
  riderTip: 0,
  ecoPackaging: true,
  selectedStarRating: 5,
  selectedCompliments: [],
  ratingOrderId: null,
  newAddrTag: 'Home',
  ws: null,
  vendorStallId: null,
  vendorOrders: [],
  vendorMenu: [],
  trackingOrder: null,
  riderActiveOrder: null,
  customizerItem: null,
  customizerSelections: {},
  riderSimInterval: null,
  radarProgress: 0.2 // 0.0 to 1.0 representing rider progress along route
};

// ==========================================================
// 1. INITIALIZATION & LIFECYCLE
// ==========================================================
document.addEventListener('DOMContentLoaded', () => {
  loadStoredUser();
  initWebSocket();
  loadCategories();
  loadStalls();
  loadCustomerOrders();
  setupRadarCanvas();

  const urlParams = new URLSearchParams(window.location.search);
  const view = urlParams.get('view');
  if (view === 'vendor' || view === 'rider') {
    window.location.href = `/partner.html?role=${view}`;
    return;
  }

  window.addEventListener('thela_language_changed', () => {
    if (STATE.stalls) renderStalls(STATE.stalls);
    if (typeof loadCategories === 'function') loadCategories();
  });
});

async function loadStoredUser() {
  const saved = localStorage.getItem('thela_user');
  if (saved) {
    try {
      STATE.user = JSON.parse(saved);
      if (STATE.user.favorites) STATE.favorites = STATE.user.favorites;
      if (STATE.user.vegPreference) {
        STATE.vegOnly = STATE.user.vegPreference;
        const vegBtn = document.getElementById('vegFilterBtn');
        if (vegBtn) vegBtn.className = 'flex items-center space-x-1.5 px-3 py-2.5 rounded-xl border-2 border-green-600 bg-green-50 text-xs font-black text-green-800 transition shadow-sm whitespace-nowrap';
      }
      
      // Set active delivery address from user addresses if available
      if (STATE.user.addresses && STATE.user.addresses.length > 0) {
        const defaultAddr = STATE.user.addresses.find(a => a.isDefault) || STATE.user.addresses[0];
        STATE.activeAddress = defaultAddr;
      }

      updateAuthUI();
      updateHeaderLocation();
      updateFavoriteCountBadge();
      updateCartAddressDisplay();

      // Fetch latest profile from server
      if (STATE.user.phone) {
        fetch(`/api/users/${STATE.user.phone}`)
          .then(res => res.json())
          .then(data => {
            if (data.success && data.user) {
              STATE.user = { ...STATE.user, ...data.user };
              localStorage.setItem('thela_user', JSON.stringify(STATE.user));
              if (STATE.user.favorites) STATE.favorites = STATE.user.favorites;
              if (STATE.user.addresses && STATE.user.addresses.length > 0) {
                STATE.activeAddress = STATE.user.addresses.find(a => a.isDefault) || STATE.user.addresses[0];
              }
              updateAuthUI();
              updateHeaderLocation();
              updateFavoriteCountBadge();
              updateCartAddressDisplay();
            }
          })
          .catch(e => console.warn('Profile sync warning:', e));
      }
    } catch (e) {
      console.warn('Failed to parse stored user:', e);
    }
  } else {
    updateHeaderLocation();
  }
}

function updateAuthUI() {
  const btn = document.getElementById('authBtn');
  if (!btn) return;
  if (STATE.user && STATE.user.phone) {
    const initials = (STATE.user.name || 'SF').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
    btn.innerHTML = `<span class="text-xs font-black uppercase text-orange-700">${initials || 'SF'}</span>`;
    btn.title = `Profile: ${STATE.user.name} (${STATE.user.phone})`;
  } else {
    btn.innerHTML = `<i class="fa-regular fa-user"></i>`;
    btn.title = 'Login / Sign Up';
  }
}

function handleAuthBtnClick() {
  if (STATE.user && STATE.user.phone) {
    openProfileModal();
  } else {
    openAuthModal();
  }
}

function updateHeaderLocation() {
  const locEl = document.getElementById('headerLocation');
  if (!locEl) return;
  if (STATE.activeAddress) {
    const icon = STATE.activeAddress.tag === 'Home' ? '🏠' : (STATE.activeAddress.tag === 'Work' ? '💼' : '📍');
    locEl.innerText = `${icon} ${STATE.activeAddress.tag}: ${STATE.activeAddress.title}`;
  } else {
    locEl.innerText = 'Select Delivery Location';
  }
}

function updateFavoriteCountBadge() {
  const badge = document.getElementById('favCountBadge');
  if (badge) {
    badge.innerText = STATE.favorites.length;
  }
}

// ==========================================================
// 2. WEBSOCKET REALTIME SUBSCRIPTION HUB
// ==========================================================
function initWebSocket() {
  const wsDot = document.getElementById('wsDot');
  const wsText = document.getElementById('wsText');

  try {
    const wsProto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${wsProto}//${window.location.host}/ws`;

    STATE.ws = new WebSocket(wsUrl);

    STATE.ws.onopen = () => {
      console.log('[WS] Connected to ThelaExpress Realtime Gateway');
      if (wsDot) wsDot.className = 'w-2 h-2 rounded-full bg-emerald-500';
      if (wsText) wsText.innerText = 'Online';

      // Re-subscribe to any active order
      if (STATE.trackingOrder) {
        subscribeToOrder(STATE.trackingOrder.id);
      }
    };

    STATE.ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        handleWebSocketMessage(msg);
      } catch (e) {
        console.error('[WS] Error processing message:', e);
      }
    };

    STATE.ws.onclose = () => {
      console.warn('[WS] Disconnected, attempting reconnect in 3s...');
      if (wsDot) wsDot.className = 'w-2 h-2 rounded-full bg-amber-500 animate-pulse';
      if (wsText) wsText.innerText = 'Reconnecting';
      setTimeout(initWebSocket, 3000);
    };

    STATE.ws.onerror = (err) => {
      console.warn('[WS] Socket error:', err);
    };
  } catch (err) {
    console.error('[WS] Init failed:', err);
  }
}

function subscribeToOrder(orderId) {
  if (STATE.ws && STATE.ws.readyState === WebSocket.OPEN) {
    STATE.ws.send(JSON.stringify({
      type: 'SUBSCRIBE',
      payload: { orderId: orderId }
    }));
  }
}

function subscribeToStall(stallId) {
  if (STATE.ws && STATE.ws.readyState === WebSocket.OPEN) {
    STATE.ws.send(JSON.stringify({
      type: 'SUBSCRIBE',
      payload: { stallId: stallId, role: 'vendor' }
    }));
  }
}

function handleWebSocketMessage(data) {
  console.log('[WS INCOMING]', data);

  switch (data.type) {
    case 'NEW_ORDER_RECEIVED':
      playChime();
      showToast(`🔔 New Order #${data.payload.order.id} received! ₹${data.payload.order.grand_total}`);
      incrementVendorBadge();
      loadVendorOrders();
      break;

    case 'ORDER_STATUS_CHANGED':
      const { orderId, status } = data.payload;
      showToast(`⚡ Order #${orderId} status: ${formatStatus(status)}`);
      
      // Update tracking modal if active
      if (STATE.trackingOrder && STATE.trackingOrder.id === orderId) {
        STATE.trackingOrder.status = status;
        renderTrackerSteps(STATE.trackingOrder);
      }

      loadCustomerOrders();
      break;

    case 'RIDER_LOCATION_UPDATE':
      if (STATE.trackingOrder) {
        // Increment rider telemetry animation progress
        STATE.radarProgress = Math.min(1.0, STATE.radarProgress + 0.15);
        drawRadarFrame();
      }
      break;

    case 'ORDER_DELIVERED':
      playDeliverySuccessChime();
      showToast(`🎉 Order #${data.payload.orderId} Delivered! Enjoy your street bites.`);
      if (STATE.trackingOrder && STATE.trackingOrder.id === data.payload.orderId) {
        STATE.trackingOrder.status = 'DELIVERED';
        renderTrackerSteps(STATE.trackingOrder);
      }
      loadCustomerOrders();
      break;

    case 'STALL_STATUS_CHANGED':
    case 'STALL_VERIFICATION_CHANGED':
    case 'ITEM_STOCK_CHANGED':
      loadStalls();
      loadCategories();
      if (STATE.currentStall) {
        openStallModal(STATE.currentStall.id);
      }
      break;
  }
}

function incrementVendorBadge() {
  const badge = document.getElementById('vendorBadge');
  const current = parseInt(badge.innerText || '0', 10) + 1;
  badge.innerText = current;
  badge.classList.remove('hidden');
}

// ==========================================================
// 3. SOUND SYNTHESIS ENGINE (Web Audio API)
// ==========================================================
function playChime() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    
    // Resume context if suspended (iOS requirement)
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    const now = ctx.currentTime;
    
    // High-pitched clear pleasant double ding (like Swiggy / Zomato order alert)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, now); // D5
    osc1.frequency.setValueAtTime(880.00, now + 0.12); // A5
    gain1.gain.setValueAtTime(0.4, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.9);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.9);

    // Second resonance chime
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(880.00, now + 0.12);
    osc2.frequency.setValueAtTime(1174.66, now + 0.28); // D6
    gain2.gain.setValueAtTime(0.3, now + 0.12);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 1.2);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.12);
    osc2.stop(now + 1.2);
  } catch (e) {
    console.warn('Web Audio chime could not play:', e);
  }
}

function playDeliverySuccessChime() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    if (ctx.state === 'suspended') ctx.resume();

    const now = ctx.currentTime;
    // Major chord triumphant chime
    [523.25, 659.25, 783.99, 1046.50].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + i * 0.09);
      gain.gain.setValueAtTime(0.25, now + i * 0.09);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.09 + 0.7);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + i * 0.09);
      osc.stop(now + i * 0.09 + 0.7);
    });
  } catch (e) {
    console.warn('Delivery sound failed:', e);
  }
}

function testChime() {
  playChime();
  showToast('🔔 Kitchen chime audio test triggered!');
}

// ==========================================================
// 4. VIEW & ROLE SWITCHING
// ==========================================================
function switchView(viewName) {
  if (viewName === 'vendor' || viewName === 'rider') {
    window.location.href = `/partner.html?role=${viewName}`;
    return;
  }

  STATE.currentView = 'customer';
  const custView = document.getElementById('viewCustomer');
  if (custView) custView.classList.remove('hidden');

  // Sticky bottom cart only in customer view when items present
  const stickyCart = document.getElementById('stickyBottomCart');
  if (stickyCart) stickyCart.classList.toggle('hidden', STATE.cart.items.length === 0);
}

// ==========================================================
// 5. CUSTOMER VIEW LOGIC (Catalog, Filter, Search)
// ==========================================================
async function loadStalls() {
  try {
    const params = new URLSearchParams();
    if (STATE.selectedCategory !== 'all' && STATE.selectedCategory !== 'favorites') {
      params.append('category', STATE.selectedCategory);
    }
    if (STATE.vegOnly) params.append('vegOnly', 'true');
    const searchVal = document.getElementById('searchInput')?.value;
    if (searchVal && searchVal.trim()) params.append('search', searchVal.trim());

    const res = await fetch(`/api/stalls?${params.toString()}`);
    const data = await res.json();
    let stalls = data.stalls || [];
    if (STATE.selectedCategory === 'favorites') {
      stalls = stalls.filter(s => STATE.favorites.includes(s.id));
    }
    STATE.stalls = stalls;
    renderStalls(STATE.stalls);
    updateVendorStallDropdown();
  } catch (err) {
    console.error('Failed to fetch stalls:', err);
  }
}

function renderStalls(stalls) {
  const container = document.getElementById('stallsGrid');
  const countEl = document.getElementById('stallsCount');
  if (countEl) {
    countEl.innerText = stalls.length > 0 ? `${stalls.length} iconic street carts` : '0 active stalls';
  }

  if (stalls.length === 0) {
    const tr = (k, fb) => (typeof t === 'function' ? t(k, fb) : fb);
    if (STATE.selectedCategory === 'favorites') {
      container.innerHTML = `
        <div class="col-span-full py-12 text-center text-gray-500 bg-white rounded-3xl border border-gray-200 p-6">
          <i class="fa-regular fa-heart text-3xl text-gray-300 mb-2"></i>
          <p class="font-bold text-sm text-gray-800">${tr('no_favorites_title', 'No favorite stalls saved yet')}</p>
          <p class="text-xs text-gray-400 mt-1">${tr('no_favorites_desc', 'Tap the heart icon on any stall to add it here')}</p>
        </div>
      `;
    } else {
      container.innerHTML = `
        <div class="col-span-full py-12 text-center bg-white rounded-3xl border-2 border-dashed border-orange-200 p-6 space-y-3">
          <div class="w-14 h-14 mx-auto rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center text-2xl">
            <i class="fa-solid fa-store"></i>
          </div>
          <div>
            <h3 class="font-black text-base text-gray-900">${tr('no_stalls_title', 'No Street Stalls Live Yet')}</h3>
            <p class="text-xs text-gray-500 mt-1 max-w-md mx-auto">
              ${tr('no_stalls_desc', 'All demo food carts have been removed. Are you a local street vendor or food cart owner? Register your cart in 2 minutes and start receiving live customer orders!')}
            </p>
          </div>
          <div class="pt-2">
            <a href="/onboard-vendor.html" class="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-black shadow-md shadow-orange-600/20 transition">
              <i class="fa-solid fa-plus-circle"></i>
              <span>${tr('register_stall_btn', 'Register Real Street Stall Now ➔')}</span>
            </a>
          </div>
        </div>
      `;
    }
    return;
  }

  container.innerHTML = stalls.map(stall => `
    <div onclick="openStallModal('${stall.id}')" 
      class="bg-white rounded-2xl border border-gray-200/80 overflow-hidden shadow-sm hover:shadow-md hover:border-orange-200 transition-all cursor-pointer flex flex-col group relative">
      
      <!-- Stall Photo Banner -->
      <div class="relative h-40 w-full overflow-hidden bg-gray-100">
        <img src="${stall.imageUrl}" alt="${stall.name}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300">
        
        <!-- Status & Delivery Tags -->
        <div class="absolute top-2.5 left-2.5 flex flex-wrap gap-1.5">
          ${stall.isOpen 
            ? `<span class="bg-emerald-600/95 backdrop-blur text-white text-[10px] font-black px-2 py-0.5 rounded-full flex items-center shadow-sm">
                <span class="w-1.5 h-1.5 rounded-full bg-white mr-1.5 animate-pulse"></span>OPEN NOW
              </span>`
            : `<span class="bg-gray-800/95 backdrop-blur text-gray-200 text-[10px] font-black px-2 py-0.5 rounded-full">CLOSED</span>`
          }
          <span class="bg-white/95 backdrop-blur text-gray-900 text-[10px] font-extrabold px-2 py-0.5 rounded-full shadow-sm flex items-center">
            <i class="fa-regular fa-clock text-orange-500 mr-1"></i>${stall.deliveryTime}
          </span>
        </div>

        <!-- Favorite Heart Bookmark Button -->
        <button onclick="event.stopPropagation(); toggleFavoriteStall('${stall.id}')" 
          class="absolute top-2.5 right-2.5 w-8 h-8 rounded-full bg-white/95 backdrop-blur flex items-center justify-center text-sm shadow-md transition hover:scale-110 active:scale-95 z-10"
          title="${STATE.favorites.includes(stall.id) ? 'Remove from favorites' : 'Save as favorite'}">
          <i class="${STATE.favorites.includes(stall.id) ? 'fa-solid fa-heart text-red-500' : 'fa-regular fa-heart text-gray-400 hover:text-red-500'}"></i>
        </button>

        <!-- Rating Pill -->
        <div class="absolute bottom-2.5 right-2.5 bg-white/95 backdrop-blur px-2 py-0.5 rounded-lg text-xs font-black text-gray-900 shadow-sm flex items-center space-x-1">
          <i class="fa-solid fa-star text-amber-500"></i>
          <span>${stall.rating}</span>
          <span class="text-[10px] text-gray-400">(${stall.reviewsCount})</span>
        </div>

        ${stall.discount ? `
          <div class="absolute bottom-2.5 left-2.5 bg-orange-600 text-white text-[10px] font-extrabold px-2 py-0.5 rounded-md shadow-sm">
            ${stall.discount}
          </div>
        ` : ''}
      </div>

      <!-- Stall Info Body -->
      <div class="p-3.5 flex-1 flex flex-col justify-between space-y-2">
        <div>
          <div class="flex items-start justify-between">
            <h3 class="font-extrabold text-base text-gray-900 leading-tight group-hover:text-orange-600 transition-colors">
              ${stall.name}
            </h3>
            ${stall.isVeg ? `
              <span class="w-4 h-4 rounded border-2 border-green-600 flex items-center justify-center p-0.5 ml-1 shrink-0" title="Pure Veg Stall">
                <span class="w-1.5 h-1.5 rounded-full bg-green-600"></span>
              </span>
            ` : `
              <span class="w-4 h-4 rounded border-2 border-red-600 flex items-center justify-center p-0.5 ml-1 shrink-0" title="Non-Veg Available">
                <span class="w-1.5 h-1.5 rounded-full bg-red-600"></span>
              </span>
            `}
          </div>
          <p class="text-xs text-gray-600 font-medium mt-0.5 line-clamp-1">${stall.specialty}</p>
          <p class="text-[11px] text-gray-400 italic line-clamp-1 mt-0.5">"${stall.heritageStory}"</p>
        </div>

        <!-- Trust Badges (Clickable to view full inspection dossier) -->
        <div class="pt-2 border-t border-gray-100 flex items-center justify-between text-[11px]">
          <div class="flex items-center space-x-1 flex-wrap gap-y-1" onclick="event.stopPropagation(); openTrustModal('${stall.id}');">
            ${(stall.trustBadges || []).map(b => {
              let colorClass = 'bg-gray-100 text-gray-700 border-gray-200';
              let iconClass = 'fa-clock-rotate-left text-gray-500';
              if (b.type === 'fssai') {
                colorClass = 'bg-emerald-50 text-emerald-800 border-emerald-200';
                iconClass = 'fa-shield-check text-emerald-600';
              } else if (b.type === 'hygiene') {
                colorClass = 'bg-amber-50 text-amber-800 border-amber-200';
                iconClass = 'fa-wand-magic-sparkles text-amber-600';
              } else if (b.type === 'identity') {
                colorClass = 'bg-blue-50 text-blue-800 border-blue-200';
                iconClass = 'fa-circle-check text-blue-600';
              }
              return `
                <span class="inline-flex items-center space-x-1 font-extrabold px-2 py-0.5 rounded-md border text-[10px] shadow-sm hover:scale-105 active:scale-95 transition ${colorClass}" title="Click to view full inspection report">
                  <i class="fa-solid ${iconClass}"></i>
                  <span>${b.label}</span>
                </span>
              `;
            }).join('')}
          </div>
          <span class="font-bold text-gray-500 shrink-0 ml-2">${stall.distance} away</span>
        </div>
      </div>
    </div>
  `).join('');
}

async function toggleFavoriteStall(stallId) {
  if (!STATE.user || !STATE.user.phone) {
    openAuthModal();
    showToast('Please login to save favorite stalls');
    return;
  }
  try {
    const res = await fetch(`/api/users/${STATE.user.phone}/favorites/${stallId}`, {
      method: 'POST'
    });
    const data = await res.json();
    if (data.success) {
      STATE.favorites = data.favorites || [];
      if (STATE.user) STATE.user.favorites = STATE.favorites;
      localStorage.setItem('thela_user', JSON.stringify(STATE.user));
      updateFavoriteCountBadge();
      loadStalls();
      showToast(data.isFavorite ? '❤️ Saved to favorites!' : 'Removed from favorites');
    }
  } catch (e) {
    console.error('Failed to toggle favorite:', e);
  }
}

function handleSearch() {
  loadStalls();
}

function toggleVegFilter() {
  STATE.vegOnly = !STATE.vegOnly;
  const btn = document.getElementById('vegFilterBtn');
  btn.classList.toggle('border-green-600', STATE.vegOnly);
  btn.classList.toggle('bg-green-50', STATE.vegOnly);
  btn.classList.toggle('text-green-800', STATE.vegOnly);
  loadStalls();
}

async function loadCategories() {
  try {
    const res = await fetch('/api/stalls/categories');
    const data = await res.json();
    STATE.categories = data.categories || [];
    renderCategories(STATE.categories);
  } catch (e) {
    console.warn('Failed to load categories:', e);
  }
}

function renderCategories(categories) {
  const container = document.getElementById('categoriesPillsContainer');
  if (!container || !categories || categories.length === 0) return;

  container.innerHTML = categories.map(cat => {
    const isActive = STATE.selectedCategory.toLowerCase() === cat.id.toLowerCase();
    const btnClass = isActive 
      ? 'cat-pill active px-4 py-2 rounded-full bg-orange-600 text-white font-bold text-xs whitespace-nowrap shadow-sm transition'
      : 'cat-pill px-4 py-2 rounded-full bg-white border border-gray-200 text-gray-700 font-bold text-xs whitespace-nowrap hover:bg-orange-50 transition shadow-sm';
    
    return `
      <button onclick="filterCategory('${cat.id}')" class="${btnClass}">
        ${cat.icon || '🍲'} ${cat.name}
      </button>
    `;
  }).join('');
}

function filterCategory(cat) {
  STATE.selectedCategory = cat;
  const favBtn = document.getElementById('favCatPill');
  if (favBtn) {
    if (cat === 'favorites') {
      favBtn.className = 'cat-pill active px-4 py-2 rounded-full bg-red-500 text-white font-bold text-xs whitespace-nowrap shadow-sm transition flex items-center space-x-1';
      const badge = document.getElementById('favCountBadge');
      if (badge) badge.className = 'ml-1 bg-white text-red-600 px-1.5 py-0.5 rounded-full text-[10px] font-black';
    } else {
      favBtn.className = 'cat-pill px-4 py-2 rounded-full bg-white border border-gray-200 text-gray-700 font-bold text-xs whitespace-nowrap hover:bg-orange-50 transition shadow-sm flex items-center space-x-1';
      const badge = document.getElementById('favCountBadge');
      if (badge) badge.className = 'ml-1 bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full text-[10px] font-black';
    }
  }

  if (STATE.categories && STATE.categories.length > 0) {
    renderCategories(STATE.categories);
  } else {
    document.querySelectorAll('.cat-pill:not(#favCatPill)').forEach(btn => {
      const isThis = btn.getAttribute('onclick')?.includes(`'${cat}'`);
      if (isThis) {
        btn.className = 'cat-pill active px-4 py-2 rounded-full bg-orange-600 text-white font-bold text-xs whitespace-nowrap shadow-sm transition';
      } else {
        btn.className = 'cat-pill px-4 py-2 rounded-full bg-white border border-gray-200 text-gray-700 font-bold text-xs whitespace-nowrap hover:bg-orange-50 transition shadow-sm';
      }
    });
  }
  loadStalls();
}

// ==========================================================
// 6. STALL MENU MODAL & CUSTOMIZER
// ==========================================================
async function openStallModal(stallId) {
  try {
    const res = await fetch(`/api/stalls/${stallId}`);
    const data = await res.json();
    STATE.currentStall = data.stall;
    STATE.currentMenu = data.items;

    document.getElementById('modalStallName').innerText = data.stall.name;
    document.getElementById('modalStallSpecialty').innerText = data.stall.specialty;
    document.getElementById('modalStallImage').src = data.stall.imageUrl;
    document.getElementById('modalStallRating').innerHTML = `<i class="fa-solid fa-star mr-1"></i>${data.stall.rating} (${data.stall.reviewsCount})`;
    document.getElementById('modalStallBadge').innerText = data.stall.isOpen ? 'OPEN NOW' : 'CLOSED';

    // Update Trust Badges in Modal Bar
    const badgesEl = document.getElementById('modalStallBadges');
    if (badgesEl) {
      const badges = data.stall.trustBadges || [];
      badgesEl.innerHTML = badges.map(b => {
        let colorClass = 'bg-amber-100 text-amber-900 border-amber-300';
        let iconClass = 'fa-clock-rotate-left text-amber-700';
        if (b.type === 'fssai') {
          colorClass = 'bg-emerald-100 text-emerald-900 border-emerald-300';
          iconClass = 'fa-shield-check text-emerald-700';
        } else if (b.type === 'hygiene') {
          colorClass = 'bg-amber-100 text-amber-900 border-amber-300';
          iconClass = 'fa-wand-magic-sparkles text-amber-700';
        } else if (b.type === 'identity') {
          colorClass = 'bg-blue-100 text-blue-900 border-blue-300';
          iconClass = 'fa-circle-check text-blue-700';
        }
        return `
          <span class="inline-flex items-center space-x-1 font-extrabold px-2 py-0.5 rounded-md border text-[10px] ${colorClass}">
            <i class="fa-solid ${iconClass}"></i>
            <span>${b.label}</span>
          </span>
        `;
      }).join('');
    }

    renderMenuItems(data.items);
    updateCartFloatingBar();

    document.getElementById('stallModal').classList.remove('hidden');
  } catch (e) {
    console.error('Failed to open stall modal:', e);
  }
}

function closeStallModal() {
  document.getElementById('stallModal').classList.add('hidden');
}

async function openTrustModal(stallId) {
  try {
    const res = await fetch(`/api/stalls/${stallId}/trust`);
    const data = await res.json();
    if (!data.success) {
      showToast('Could not load trust details');
      return;
    }
    const { stall, fssai, hygiene, identity, badges } = data;
    const tr = (k, fb) => (typeof t === 'function' ? t(k, fb) : fb);

    const nameEl = document.getElementById('trustModalStallName');
    if (nameEl) nameEl.innerText = stall.name;

    const badgesEl = document.getElementById('trustModalBadgesRow');
    if (badgesEl) {
      badgesEl.innerHTML = (badges || []).map(b => {
        let colorClass = 'bg-gray-100 text-gray-700 border-gray-200';
        let iconClass = 'fa-clock-rotate-left text-gray-500';
        if (b.type === 'fssai') {
          colorClass = 'bg-emerald-50 text-emerald-800 border-emerald-200';
          iconClass = 'fa-shield-check text-emerald-600';
        } else if (b.type === 'hygiene') {
          colorClass = 'bg-amber-50 text-amber-800 border-amber-200';
          iconClass = 'fa-wand-magic-sparkles text-amber-600';
        } else if (b.type === 'identity') {
          colorClass = 'bg-blue-50 text-blue-800 border-blue-200';
          iconClass = 'fa-circle-check text-blue-600';
        }
        return `
          <span class="inline-flex items-center space-x-1.5 font-extrabold px-2.5 py-1 rounded-lg border text-xs shadow-sm ${colorClass}">
            <i class="fa-solid ${iconClass}"></i>
            <span>${b.label}</span>
          </span>
        `;
      }).join('');
    }

    // FSSAI status
    const fssaiStatusEl = document.getElementById('trustModalFssaiStatus');
    if (fssaiStatusEl) {
      let statusClass = 'bg-amber-100 text-amber-800';
      let statusLabel = tr('fssai_status_submitted', 'Submitted (Under Review)');
      if (fssai.status === 'verified') {
        statusClass = 'bg-emerald-100 text-emerald-800';
        statusLabel = tr('fssai_status_verified', 'Verified FSSAI');
      } else if (fssai.status === 'rejected') {
        statusClass = 'bg-red-100 text-red-800';
        statusLabel = tr('fssai_status_rejected', 'Rejected');
      } else if (fssai.status === 'expired') {
        statusClass = 'bg-red-100 text-red-800';
        statusLabel = tr('fssai_status_expired', 'Expired');
      }
      fssaiStatusEl.className = `px-2.5 py-0.5 rounded-full text-[10px] font-black ${statusClass}`;
      fssaiStatusEl.innerText = statusLabel;
    }

    const fssaiNoEl = document.getElementById('trustModalFssaiNo');
    if (fssaiNoEl) fssaiNoEl.innerText = fssai.registrationNumber || 'Not submitted';

    const fssaiDateEl = document.getElementById('trustModalFssaiDate');
    if (fssaiDateEl) {
      fssaiDateEl.innerText = fssai.verifiedAt ? new Date(fssai.verifiedAt).toLocaleDateString() : (fssai.status === 'verified' ? 'Verified' : 'Pending Verification');
    }

    const fssaiNoteWrap = document.getElementById('trustModalFssaiNoteWrapper');
    const fssaiNoteEl = document.getElementById('trustModalFssaiNote');
    if (fssai.rejectionReason && fssaiNoteWrap && fssaiNoteEl) {
      fssaiNoteEl.innerText = `Note: ${fssai.rejectionReason}`;
      fssaiNoteWrap.classList.remove('hidden');
    } else if (fssaiNoteWrap) {
      fssaiNoteWrap.classList.add('hidden');
    }

    // Hygiene status
    const hygieneStatusEl = document.getElementById('trustModalHygieneStatus');
    if (hygieneStatusEl) {
      let hClass = 'bg-amber-100 text-amber-800';
      let hLabel = tr('badge_not_inspected', 'Audit Pending');
      if (hygiene.status === 'certified') {
        hClass = 'bg-emerald-100 text-emerald-800';
        hLabel = tr('hygiene_certified', 'Passed & Certified');
      } else if (hygiene.status === 'needs_improvement') {
        hClass = 'bg-amber-100 text-amber-800';
        hLabel = 'Needs Improvement';
      } else if (hygiene.status === 'failed') {
        hClass = 'bg-red-100 text-red-800';
        hLabel = 'Audit Failed';
      }
      hygieneStatusEl.className = `px-2.5 py-0.5 rounded-full text-[10px] font-black ${hClass}`;
      hygieneStatusEl.innerText = hLabel;
    }

    const hygieneScoreEl = document.getElementById('trustModalHygieneScore');
    if (hygieneScoreEl) {
      hygieneScoreEl.innerText = hygiene.score ? `${hygiene.score}/100` : 'Pending';
    }

    const hygieneAuditorEl = document.getElementById('trustModalHygieneAuditor');
    if (hygieneAuditorEl) {
      hygieneAuditorEl.innerText = hygiene.inspectedBy 
        ? `${hygiene.inspectedBy} (${hygiene.verifiedAt ? new Date(hygiene.verifiedAt).toLocaleDateString() : 'Verified'})` 
        : 'Physical audit scheduled';
    }

    // Hygiene Checklist Breakdown
    const checklistEl = document.getElementById('trustModalChecklistContainer');
    if (checklistEl) {
      const verifiedList = hygiene.checklistVerified || [];
      const selfDeclList = hygiene.selfDeclaration || [];
      const standardItems = [
        { label: tr('audit_water', 'RO / Packaged Water Standard'), key: 'ro_water' },
        { label: tr('audit_covered_cart', 'Covered Food Cart & Sneeze Guards'), key: 'covered_cart' },
        { label: tr('audit_dona', 'Food-Grade Dona & Eco Packaging'), key: 'food_grade_packaging' },
        { label: tr('audit_oil', 'Fresh Oil Quality Standard (Zero Reheating)'), key: 'zero_oil_reheat' },
        { label: tr('audit_sanitization', 'Vendor Cart Sanitization & Aprons'), key: 'clean_aprons' }
      ];

      checklistEl.innerHTML = standardItems.map(item => {
        const isVerified = verifiedList.includes(item.key) || verifiedList.some(v => v.toLowerCase().includes(item.key.replace(/_/g, ' ')));
        const isSelfDeclared = selfDeclList.includes(item.key) || selfDeclList.some(v => v.toLowerCase().includes(item.key.replace(/_/g, ' ')));
        return `
          <div class="flex items-center justify-between text-xs py-0.5">
            <span class="flex items-center space-x-1.5">
              <i class="fa-solid ${isVerified ? 'fa-circle-check text-emerald-600' : 'fa-circle-dot text-gray-400'} text-xs"></i>
              <span class="${isVerified ? 'text-gray-800 font-semibold' : 'text-gray-500'}">${item.label}</span>
            </span>
            <span class="text-[10px] font-bold ${isVerified ? 'text-emerald-700' : (isSelfDeclared ? 'text-amber-600' : 'text-gray-400')}">
              ${isVerified ? '✓ Inspected' : (isSelfDeclared ? 'Self-declared' : 'Pending')}
            </span>
          </div>
        `;
      }).join('');
    }

    // Address & Location
    const addressEl = document.getElementById('trustModalAddress');
    if (addressEl) addressEl.innerText = stall.address || 'Street Vendor Cart';

    const coordsEl = document.getElementById('trustModalCoords');
    if (coordsEl && stall.location) {
      coordsEl.innerText = `GPS: ${Number(stall.location.lat).toFixed(4)}° N, ${Number(stall.location.lng).toFixed(4)}° E`;
    }

    document.getElementById('trustModal').classList.remove('hidden');
  } catch (err) {
    console.error('Failed to open trust modal:', err);
    showToast('Failed to open trust details');
  }
}

function closeTrustModal() {
  const modal = document.getElementById('trustModal');
  if (modal) modal.classList.add('hidden');
}

function renderMenuItems(items) {
  const container = document.getElementById('modalMenuItems');
  container.innerHTML = items.map(item => {
    const inCart = STATE.cart.items.find(i => i.item_id === item.id);
    const qty = inCart ? inCart.qty : 0;

    return `
      <div class="pt-3.5 first:pt-0 flex items-start justify-between gap-4">
        <!-- Item Details -->
        <div class="flex-1 space-y-1">
          <div class="flex items-center space-x-1.5">
            ${item.isVeg ? `
              <span class="w-3.5 h-3.5 rounded border-2 border-green-600 flex items-center justify-center p-0.5">
                <span class="w-1.5 h-1.5 rounded-full bg-green-600"></span>
              </span>
            ` : `
              <span class="w-3.5 h-3.5 rounded border-2 border-red-600 flex items-center justify-center p-0.5">
                <span class="w-1.5 h-1.5 rounded-full bg-red-600"></span>
              </span>
            `}
            ${item.bestseller ? `<span class="text-[10px] font-extrabold bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded">BESTSELLER</span>` : ''}
          </div>

          <h4 class="font-extrabold text-sm text-gray-900">${item.name}</h4>
          
          <div class="flex items-center space-x-2">
            <span class="text-sm font-black text-gray-900">₹${item.price}</span>
            ${item.originalPrice ? `<span class="text-xs text-gray-400 line-through">₹${item.originalPrice}</span>` : ''}
          </div>

          <p class="text-xs text-gray-500 leading-relaxed">${item.description}</p>

          ${item.customizations && item.customizations.length > 0 ? `
            <span class="text-[10px] font-bold text-orange-600 inline-block mt-0.5">Customizable options</span>
          ` : ''}
        </div>

        <!-- Item Image & Add Button -->
        <div class="relative w-24 h-24 sm:w-28 sm:h-28 shrink-0 rounded-2xl overflow-hidden bg-gray-100 flex flex-col justify-end">
          <img src="${item.image}" alt="${item.name}" class="absolute inset-0 w-full h-full object-cover">
          
          <!-- Add / Stepper Button -->
          <div class="relative z-10 mx-auto mb-1.5 w-20">
            ${!item.inStock ? `
              <div class="bg-gray-800/90 text-white text-[10px] font-bold py-1 px-2 rounded-lg text-center">
                SOLD OUT
              </div>
            ` : qty === 0 ? `
              <button onclick="handleAddItemClick('${item.id}')" class="w-full bg-white text-orange-600 border border-orange-200 rounded-lg py-1 font-black text-xs shadow-md hover:bg-orange-50 transition">
                ADD
              </button>
            ` : `
              <div class="w-full bg-orange-600 text-white rounded-lg py-1 px-1 flex items-center justify-between font-black text-xs shadow-md">
                <button onclick="decrementCartItem('${item.id}')" class="w-5 text-center hover:bg-orange-700 rounded">-</button>
                <span>${qty}</span>
                <button onclick="incrementCartItem('${item.id}')" class="w-5 text-center hover:bg-orange-700 rounded">+</button>
              </div>
            `}
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function handleAddItemClick(itemId) {
  const item = STATE.currentMenu.find(i => i.id === itemId);
  if (!item) return;

  // If item has customizable options, open customizer modal
  if (item.customizations && item.customizations.length > 0) {
    openCustomizer(item);
  } else {
    addItemToCart(item, {});
  }
}

function openCustomizer(item) {
  STATE.customizerItem = item;
  STATE.customizerSelections = {};

  document.getElementById('customizerItemName').innerText = item.name;
  document.getElementById('customizerItemBasePrice').innerText = `Base: ₹${item.price}`;

  const container = document.getElementById('customizerOptionsContainer');
  container.innerHTML = item.customizations.map(group => {
    // Default selection is first option
    STATE.customizerSelections[group.name] = group.options[0];

    return `
      <div class="space-y-1.5">
        <label class="block text-xs font-black text-gray-800 uppercase tracking-wider">${group.name}</label>
        <div class="grid grid-cols-1 gap-1.5">
          ${group.options.map(opt => `
            <label class="flex items-center justify-between p-2.5 rounded-xl border border-gray-200 cursor-pointer hover:border-orange-500 transition">
              <span class="text-xs font-semibold text-gray-800">${opt}</span>
              <input type="radio" name="${group.name}" value="${opt}" 
                ${opt === group.options[0] ? 'checked' : ''}
                onchange="STATE.customizerSelections['${group.name}'] = '${opt}'"
                class="text-orange-600 focus:ring-orange-500">
            </label>
          `).join('')}
        </div>
      </div>
    `;
  }).join('');

  document.getElementById('customizerModal').classList.remove('hidden');
}

function closeCustomizerModal() {
  document.getElementById('customizerModal').classList.add('hidden');
}

function confirmCustomizationAndAdd() {
  if (STATE.customizerItem) {
    addItemToCart(STATE.customizerItem, { ...STATE.customizerSelections });
  }
  closeCustomizerModal();
}

// ==========================================================
// 7. CART ENGINE & CHECKOUT
// ==========================================================
function addItemToCart(item, customs) {
  // Reset cart if adding from another stall
  if (STATE.cart.stallId && STATE.cart.stallId !== STATE.currentStall.id) {
    if (!confirm(`Your cart contains items from another stall. Clear cart and add from ${STATE.currentStall.name}?`)) {
      return;
    }
    STATE.cart.items = [];
  }

  STATE.cart.stallId = STATE.currentStall.id;
  STATE.cart.stallName = STATE.currentStall.name;

  const existing = STATE.cart.items.find(i => i.item_id === item.id);
  if (existing) {
    existing.qty += 1;
  } else {
    STATE.cart.items.push({
      item_id: item.id,
      name: item.name,
      price: item.price,
      qty: 1,
      customs: customs
    });
  }

  renderMenuItems(STATE.currentMenu);
  updateCartFloatingBar();
  showToast(`Added ${item.name} to cart`);
}

function incrementCartItem(itemId) {
  const item = STATE.cart.items.find(i => i.item_id === itemId);
  if (item) {
    item.qty += 1;
    renderMenuItems(STATE.currentMenu);
    updateCartFloatingBar();
    renderCartDrawerItems();
  }
}

function decrementCartItem(itemId) {
  const idx = STATE.cart.items.findIndex(i => i.item_id === itemId);
  if (idx > -1) {
    if (STATE.cart.items[idx].qty > 1) {
      STATE.cart.items[idx].qty -= 1;
    } else {
      STATE.cart.items.splice(idx, 1);
    }

    if (STATE.cart.items.length === 0) {
      STATE.cart.stallId = null;
      STATE.cart.stallName = '';
    }

    renderMenuItems(STATE.currentMenu);
    updateCartFloatingBar();
    renderCartDrawerItems();
  }
}

function updateCartFloatingBar() {
  const modalCartBar = document.getElementById('modalCartBar');
  const stickyCart = document.getElementById('stickyBottomCart');
  const headerCartTotal = document.getElementById('headerCartTotal');
  const headerCartBadge = document.getElementById('headerCartBadge');

  const count = STATE.cart.items.reduce((s, i) => s + i.qty, 0);
  const subtotal = STATE.cart.items.reduce((s, i) => s + (i.price * i.qty), 0);

  if (headerCartTotal) headerCartTotal.innerText = `₹${subtotal}`;
  if (headerCartBadge) {
    if (count > 0) {
      headerCartBadge.innerText = count;
      headerCartBadge.classList.remove('hidden');
    } else {
      headerCartBadge.classList.add('hidden');
    }
  }

  if (count > 0) {
    if (modalCartBar) {
      modalCartBar.classList.remove('hidden');
      document.getElementById('modalCartCount').innerText = `${count} ${count === 1 ? 'ITEM' : 'ITEMS'}`;
      document.getElementById('modalCartTotal').innerText = `₹${subtotal}`;
    }

    if (stickyCart) {
      stickyCart.classList.remove('hidden');
      document.getElementById('stickyCartBadge').innerText = `${count} ${count === 1 ? 'ITEM' : 'ITEMS'}`;
      document.getElementById('stickyCartTotal').innerText = `₹${subtotal}`;
    }
  } else {
    if (modalCartBar) modalCartBar.classList.add('hidden');
    if (stickyCart) stickyCart.classList.add('hidden');
  }
}

function openCartDrawer() {
  updateCartAddressDisplay();
  renderCartDrawerItems();
  document.getElementById('cartDrawer').classList.remove('hidden');
}

function closeCartDrawer() {
  document.getElementById('cartDrawer').classList.add('hidden');
}

function updateCartAddressDisplay() {
  const tagEl = document.getElementById('cartSelectedAddressTag');
  const titleEl = document.getElementById('cartSelectedAddressTitle');
  if (!tagEl || !titleEl) return;
  if (STATE.activeAddress) {
    tagEl.innerText = STATE.activeAddress.tag || 'Saved';
    titleEl.innerText = STATE.activeAddress.title || STATE.activeAddress.address;
  } else {
    tagEl.innerText = 'Select';
    titleEl.innerText = 'Tap to choose delivery address';
  }
}

function selectTip(amount) {
  STATE.riderTip = amount;
  [0, 10, 20, 30, 50].forEach(amt => {
    const btn = document.getElementById(`tipBtn${amt}`);
    if (btn) {
      if (amt === amount) {
        btn.className = 'px-3 py-1.5 rounded-xl border-2 border-orange-600 bg-orange-50 text-orange-700 font-black text-xs transition';
      } else {
        btn.className = 'px-3 py-1.5 rounded-xl border border-gray-200 bg-white text-gray-700 font-bold text-xs hover:border-gray-300 transition';
      }
    }
  });
  const subtotal = STATE.cart.items.reduce((s, i) => s + (i.price * i.qty), 0);
  updateBillBreakdown(subtotal);
}

function toggleEcoPackaging() {
  const toggle = document.getElementById('ecoPackagingToggle');
  STATE.ecoPackaging = toggle ? toggle.checked : true;
}

function renderCartDrawerItems() {
  const list = document.getElementById('cartItemsList');
  document.getElementById('cartStallName').innerText = STATE.cart.stallName || 'Street Cart';

  if (STATE.cart.items.length === 0) {
    list.innerHTML = `
      <div class="py-12 text-center text-gray-400">
        <i class="fa-solid fa-basket-shopping text-4xl mb-2 text-gray-300"></i>
        <p class="font-bold text-sm text-gray-600">Your cart is empty</p>
        <p class="text-xs">Add your favourite chaat or momos to get started!</p>
      </div>
    `;
    updateBillBreakdown(0);
    return;
  }

  list.innerHTML = STATE.cart.items.map(item => `
    <div class="pt-3 first:pt-0 flex items-center justify-between text-xs">
      <div class="flex-1">
        <h4 class="font-extrabold text-gray-900">${item.name}</h4>
        <div class="text-gray-500 font-medium">₹${item.price} each</div>
        ${Object.keys(item.customs).length > 0 ? `
          <div class="text-[10px] text-orange-600 font-semibold mt-0.5">
            ${Object.values(item.customs).join(', ')}
          </div>
        ` : ''}
      </div>

      <!-- Stepper -->
      <div class="bg-orange-50 border border-orange-200 rounded-lg px-2 py-1 flex items-center space-x-2 font-bold text-orange-700">
        <button onclick="decrementCartItem('${item.item_id}')" class="w-4 text-center">-</button>
        <span>${item.qty}</span>
        <button onclick="incrementCartItem('${item.item_id}')" class="w-4 text-center">+</button>
      </div>

      <div class="w-14 text-right font-black text-gray-900">
        ₹${item.price * item.qty}
      </div>
    </div>
  `).join('');

  const subtotal = STATE.cart.items.reduce((s, i) => s + (i.price * i.qty), 0);
  updateBillBreakdown(subtotal);
}

function updateBillBreakdown(subtotal) {
  const packaging = subtotal > 0 ? 10 : 0;
  const tip = STATE.riderTip || 0;
  const grandTotal = subtotal + packaging + tip;

  const tipRow = document.getElementById('tipBreakdownRow');
  if (tipRow) {
    tipRow.classList.toggle('hidden', tip === 0);
    const billTip = document.getElementById('billTip');
    if (billTip) billTip.innerText = `₹${tip}`;
  }

  const billSubtotal = document.getElementById('billSubtotal');
  if (billSubtotal) billSubtotal.innerText = `₹${subtotal}`;

  const billPackaging = document.getElementById('billPackaging');
  if (billPackaging) billPackaging.innerText = `₹${packaging}`;

  const billGrandTotal = document.getElementById('billGrandTotal');
  if (billGrandTotal) billGrandTotal.innerText = `₹${grandTotal}`;
}

// Place Order Action
async function handlePlaceOrder() {
  if (STATE.cart.items.length === 0) {
    showToast('Your cart is empty!');
    return;
  }

  // Ensure customer is authenticated with their real name and phone
  if (!STATE.user || !STATE.user.phone) {
    openAuthModal();
    showToast('Please enter your name & phone number to place order');
    return;
  }

  const btn = document.getElementById('placeOrderBtn');
  btn.disabled = true;
  btn.innerHTML = `<i class="fa-solid fa-spinner animate-spin mr-2"></i>Placing Order...`;

  const subtotal = STATE.cart.items.reduce((s, i) => s + (i.price * i.qty), 0);
  const packaging = 10;
  const tip = STATE.riderTip || 0;
  const grandTotal = subtotal + packaging + tip;
  const instruction = document.getElementById('cartInstructionInput')?.value.trim() || 'Leave at Door';
  const customAddress = document.getElementById('cartAddressInput')?.value.trim();
  const deliveryAddress = STATE.activeAddress 
    ? `${STATE.activeAddress.tag}: ${STATE.activeAddress.title}${STATE.activeAddress.address ? ' - ' + STATE.activeAddress.address : ''}` 
    : (customAddress || 'Doorstep Delivery');

  try {
    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customer_id: STATE.user.id,
        customer_name: STATE.user.name || 'Customer',
        customer_phone: STATE.user.phone,
        stall_id: STATE.cart.stallId,
        stall_name: STATE.cart.stallName,
        items: STATE.cart.items,
        subtotal: subtotal,
        delivery_fee: 0,
        packaging_fee: packaging,
        tip: tip,
        eco_packaging: STATE.ecoPackaging,
        grand_total: grandTotal,
        delivery_address: deliveryAddress,
        delivery_instruction: instruction,
        payment_method: 'UPI'
      })
    });

    const data = await res.json();
    if (data.success) {
      // Clear cart
      STATE.cart.items = [];
      STATE.cart.stallId = null;
      STATE.cart.stallName = '';
      STATE.riderTip = 0;
      closeCartDrawer();
      closeStallModal();
      updateCartFloatingBar();

      // Subscribe to live order updates
      subscribeToOrder(data.order.id);

      // Open Live Tracking Modal
      openTrackingModal(data.order);
      loadCustomerOrders();
      showToast(`🎉 Order #${data.order.id} placed successfully!`);
    } else {
      showToast(`Failed: ${data.error || 'Please try again'}`);
    }
  } catch (err) {
    console.error('Order creation error:', err);
    showToast('Failed to connect to backend server.');
  } finally {
    btn.disabled = false;
    btn.innerHTML = `<span>Place Order</span><i class="fa-solid fa-arrow-right ml-2"></i>`;
  }
}

// ==========================================================
// 8. LIVE ORDER TRACKING & RADAR TELEMETRY
// ==========================================================
function openTrackingModal(order) {
  STATE.trackingOrder = order;
  STATE.radarProgress = 0.2; // initial rider progress

  document.getElementById('trackOrderId').innerText = `#${order.id}`;
  document.getElementById('trackDeliveryOtp').innerText = order.otp || '4829';
  document.getElementById('trackEtaText').innerText = `Estimated Delivery in ${order.etaMinutes || 14} mins`;

  const riderNameElem = document.getElementById('trackRiderName');
  if (riderNameElem) {
    riderNameElem.innerText = order.rider_name ? `${order.rider_name} (${order.rider_vehicle || 'Delivery Partner'})` : 'Assigned Delivery Partner';
  }
  const riderPhoneBtn = document.getElementById('trackRiderPhoneBtn');
  if (riderPhoneBtn) {
    riderPhoneBtn.href = order.rider_phone ? `tel:${order.rider_phone}` : '#';
  }

  renderTrackerSteps(order);
  document.getElementById('trackingModal').classList.remove('hidden');

  // Draw initial radar frame
  drawRadarFrame();
}

function closeTrackingModal() {
  document.getElementById('trackingModal').classList.add('hidden');
}

function renderTrackerSteps(order) {
  const steps = [
    { key: 'PLACED', title: 'Order Confirmed', desc: 'Thela received your order' },
    { key: 'COOKING', title: 'Preparing on Tawa', desc: 'Authentic spices sizzling fresh' },
    { key: 'READY_FOR_PICKUP', title: 'Packed in Thermal Box', desc: 'Rider reaching stall' },
    { key: 'OUT_FOR_DELIVERY', title: 'Out for Delivery', desc: 'Rider on Ather 450X EV' },
    { key: 'DELIVERED', title: 'Delivered at Doorstep', desc: 'Verified with OTP' }
  ];

  const statusOrder = ['PLACED', 'ACCEPTED', 'COOKING', 'READY_FOR_PICKUP', 'OUT_FOR_DELIVERY', 'DELIVERED'];
  const currentIndex = statusOrder.indexOf(order.status);

  const container = document.getElementById('trackerStepsList');
  container.innerHTML = steps.map((step, idx) => {
    const stepIdx = statusOrder.indexOf(step.key);
    const isCompleted = currentIndex >= stepIdx;
    const isCurrent = (order.status === step.key) || (order.status === 'ACCEPTED' && step.key === 'PLACED');

    return `
      <div class="relative flex items-start space-x-3">
        <!-- Step Indicator Dot -->
        <span class="absolute -left-[31px] top-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all ${
          isCompleted 
            ? 'bg-orange-600 border-orange-600 text-white' 
            : 'bg-white border-gray-300 text-transparent'
        }">
          ${isCompleted ? '<i class="fa-solid fa-check text-[9px]"></i>' : ''}
        </span>

        <div>
          <h4 class="text-xs font-black ${isCurrent ? 'text-orange-600' : isCompleted ? 'text-gray-900' : 'text-gray-400'}">
            ${step.title}
          </h4>
          <p class="text-[11px] text-gray-500">${step.desc}</p>
        </div>
      </div>
    `;
  }).join('');
}

// Setup & Draw Simulated Radar Canvas
function setupRadarCanvas() {
  const canvas = document.getElementById('radarCanvas');
  if (!canvas) return;
  drawRadarFrame();
}

function drawRadarFrame() {
  const canvas = document.getElementById('radarCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;

  ctx.clearRect(0, 0, w, h);

  // Background map street curves
  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.moveTo(30, 40);
  ctx.bezierCurveTo(150, 40, 100, 150, 360, 140);
  ctx.stroke();

  // Highlighted delivery route path
  ctx.strokeStyle = '#f97316';
  ctx.lineWidth = 4;
  ctx.setLineDash([6, 6]);
  ctx.beginPath();
  ctx.moveTo(50, 60);
  ctx.bezierCurveTo(160, 60, 140, 130, 340, 120);
  ctx.stroke();
  ctx.setLineDash([]);

  // Stall Icon (Point A)
  ctx.fillStyle = '#22c55e';
  ctx.beginPath();
  ctx.arc(50, 60, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 9px sans-serif';
  ctx.fillText('STALL', 36, 82);

  // Customer House (Point B)
  ctx.fillStyle = '#38bdf8';
  ctx.beginPath();
  ctx.arc(340, 120, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 9px sans-serif';
  ctx.fillText('YOU', 332, 142);

  // Rider position along the bezier curve
  const t = STATE.radarProgress;
  // Bezier curve interpolation: (1-t)^3*P0 + 3(1-t)^2*t*P1 + 3(1-t)*t^2*P2 + t^3*P3
  const p0 = { x: 50, y: 60 };
  const p1 = { x: 160, y: 60 };
  const p2 = { x: 140, y: 130 };
  const p3 = { x: 340, y: 120 };

  const rx = Math.pow(1 - t, 3) * p0.x + 3 * Math.pow(1 - t, 2) * t * p1.x + 3 * (1 - t) * Math.pow(t, 2) * p2.x + Math.pow(t, 3) * p3.x;
  const ry = Math.pow(1 - t, 3) * p0.y + 3 * Math.pow(1 - t, 2) * t * p1.y + 3 * (1 - t) * Math.pow(t, 2) * p2.y + Math.pow(t, 3) * p3.y;

  // Rider pulsating glow ring
  ctx.fillStyle = 'rgba(249, 115, 22, 0.3)';
  ctx.beginPath();
  ctx.arc(rx, ry, 16, 0, Math.PI * 2);
  ctx.fill();

  // Rider Core Dot
  ctx.fillStyle = '#ea580c';
  ctx.beginPath();
  ctx.arc(rx, ry, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Rider Label
  ctx.fillStyle = '#fbbf24';
  ctx.font = 'bold 10px sans-serif';
  ctx.fillText('🛵 Rider', rx - 16, ry - 14);
}

// Load customer's active orders
async function loadCustomerOrders() {
  if (!STATE.user || !STATE.user.phone) {
    STATE.activeOrders = [];
    renderActiveOrdersBar([]);
    return;
  }
  const phone = STATE.user.phone;
  try {
    const res = await fetch(`/api/orders/user/${phone}`);
    const data = await res.json();
    STATE.activeOrders = data.orders || [];
    renderActiveOrdersBar(STATE.activeOrders);
  } catch (e) {
    console.warn('Failed to load active orders:', e);
  }
}

function renderActiveOrdersBar(orders) {
  const bar = document.getElementById('activeOrdersBar');
  const active = orders.filter(o => o.status !== 'DELIVERED' && o.status !== 'CANCELLED');

  if (active.length === 0) {
    bar.classList.add('hidden');
    return;
  }

  bar.classList.remove('hidden');
  bar.innerHTML = active.map(order => `
    <div onclick="openTrackingModal(${JSON.stringify(order).replace(/"/g, '&quot;')})" 
      class="bg-gradient-to-r from-orange-600 to-amber-600 text-white rounded-2xl p-3 shadow-md flex items-center justify-between cursor-pointer hover:shadow-lg transition">
      <div class="flex items-center space-x-3">
        <div class="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center font-bold text-sm">
          <i class="fa-solid fa-bell-concierge animate-bounce"></i>
        </div>
        <div>
          <div class="text-xs font-black">Live: ${order.stall_name}</div>
          <div class="text-[11px] text-orange-100 flex items-center space-x-2">
            <span>Status: <strong>${formatStatus(order.status)}</strong></span>
            <span>•</span>
            <span>OTP: <strong class="font-mono bg-white/20 px-1 rounded">${order.otp}</strong></span>
          </div>
        </div>
      </div>
      <div class="text-right">
        <span class="text-xs font-black bg-white/20 px-2 py-1 rounded-lg">Track Live ➔</span>
      </div>
    </div>
  `).join('');
}

// ==========================================================
// 9. VENDOR KITCHEN POS LOGIC
// ==========================================================
function initVendorView() {
  updateVendorStallDropdown();
  loadVendorOrders();
  loadVendorMenuItems();
}

function updateVendorStallDropdown() {
  const select = document.getElementById('vendorStallSelect');
  if (!select) return;
  select.innerHTML = STATE.stalls.map(s => `
    <option value="${s.id}" ${s.id === STATE.vendorStallId ? 'selected' : ''}>${s.name}</option>
  `).join('');
}

function onVendorStallChange() {
  const select = document.getElementById('vendorStallSelect');
  STATE.vendorStallId = select.value;
  subscribeToStall(STATE.vendorStallId);
  loadVendorOrders();
  loadVendorMenuItems();
}

async function loadVendorOrders() {
  try {
    const res = await fetch(`/api/orders/stall/${STATE.vendorStallId}`);
    const data = await res.json();
    STATE.vendorOrders = data.orders || [];
    renderVendorOrders(STATE.vendorOrders);
  } catch (e) {
    console.error('Failed to load vendor orders:', e);
  }
}

function renderVendorOrders(orders) {
  const container = document.getElementById('vendorOrdersList');
  const countEl = document.getElementById('vendorActiveCount');
  
  const activeOrders = orders.filter(o => o.status !== 'DELIVERED' && o.status !== 'CANCELLED');
  countEl.innerText = `${activeOrders.length} Active`;

  if (activeOrders.length === 0) {
    container.innerHTML = `
      <div class="py-10 text-center text-gray-400 bg-white rounded-2xl border border-gray-200">
        <i class="fa-solid fa-mug-hot text-3xl mb-2 text-gray-300"></i>
        <p class="font-bold text-sm text-gray-600">No active kitchen orders right now</p>
        <p class="text-xs text-gray-400 mt-1">When a customer places an order, your bell will chime automatically!</p>
      </div>
    `;
    return;
  }

  container.innerHTML = activeOrders.map(order => `
    <div class="bg-white rounded-2xl border-2 ${order.status === 'PLACED' ? 'border-orange-500 shadow-md ring-2 ring-orange-500/10' : 'border-gray-200'} p-4 space-y-3">
      <!-- Order Header -->
      <div class="flex items-center justify-between border-b border-gray-100 pb-2.5">
        <div>
          <div class="flex items-center space-x-2">
            <span class="font-black text-base text-gray-900">Order #${order.id}</span>
            <span class="text-[10px] font-black px-2 py-0.5 rounded-full ${getStatusBadgeClass(order.status)}">
              ${formatStatus(order.status)}
            </span>
          </div>
          <p class="text-xs text-gray-500 mt-0.5">Customer: <strong>${order.customer_name}</strong> (${order.customer_phone})</p>
        </div>
        <div class="text-right">
          <div class="text-base font-black text-gray-900">₹${order.grand_total}</div>
          <div class="text-[11px] text-green-700 font-bold bg-green-50 px-1.5 py-0.2 rounded">${order.payment_method} PAID</div>
        </div>
      </div>

      <!-- Item Checklist -->
      <div class="space-y-1.5 text-xs">
        ${order.items.map(item => `
          <div class="flex justify-between items-start">
            <div class="font-semibold text-gray-800">
              <span class="w-5 inline-block font-black text-orange-600">${item.qty}x</span>
              <span>${item.name}</span>
              ${item.customs && Object.keys(item.customs).length > 0 ? `
                <span class="text-[10px] text-gray-500 ml-1">(${Object.values(item.customs).join(', ')})</span>
              ` : ''}
            </div>
            <span class="font-mono text-gray-500">₹${item.price * item.qty}</span>
          </div>
        `).join('')}
      </div>

      <!-- Cooking Instruction Note -->
      ${order.delivery_instruction ? `
        <div class="bg-amber-50 text-amber-900 text-[11px] px-3 py-1.5 rounded-xl border border-amber-200">
          <i class="fa-solid fa-note-sticky mr-1 text-amber-600"></i>
          <strong>Customer Note:</strong> ${order.delivery_instruction}
        </div>
      ` : ''}

      <!-- Stage Progression Action Buttons -->
      <div class="pt-2 border-t border-gray-100 flex items-center justify-between gap-2">
        ${order.status === 'PLACED' ? `
          <button onclick="updateOrderStatus('${order.id}', 'ACCEPTED')" 
            class="flex-1 bg-orange-600 text-white rounded-xl py-2.5 font-bold text-xs hover:bg-orange-700 transition flex items-center justify-center space-x-1.5">
            <i class="fa-solid fa-check"></i>
            <span>Accept Order</span>
          </button>
        ` : order.status === 'ACCEPTED' ? `
          <button onclick="updateOrderStatus('${order.id}', 'COOKING')" 
            class="flex-1 bg-amber-600 text-white rounded-xl py-2.5 font-bold text-xs hover:bg-amber-700 transition flex items-center justify-center space-x-1.5">
            <i class="fa-solid fa-fire-burner"></i>
            <span>Start Cooking / Tawa</span>
          </button>
        ` : order.status === 'COOKING' ? `
          <button onclick="updateOrderStatus('${order.id}', 'READY_FOR_PICKUP')" 
            class="flex-1 bg-emerald-600 text-white rounded-xl py-2.5 font-bold text-xs hover:bg-emerald-700 transition flex items-center justify-center space-x-1.5">
            <i class="fa-solid fa-box"></i>
            <span>Mark Ready for Pickup</span>
          </button>
        ` : `
          <div class="text-xs text-gray-500 font-medium">
            <i class="fa-solid fa-person-biking mr-1 text-emerald-600"></i>Rider picking up for delivery
          </div>
        `}
      </div>
    </div>
  `).join('');
}

async function updateOrderStatus(orderId, status) {
  try {
    const res = await fetch(`/api/orders/${orderId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: status })
    });
    const data = await res.json();
    if (data.success) {
      showToast(`Order #${orderId} moved to ${formatStatus(status)}`);
      loadVendorOrders();
      loadRiderOrders();
    }
  } catch (e) {
    console.error('Status update failed:', e);
  }
}

async function loadVendorMenuItems() {
  const container = document.getElementById('vendorMenuItemsList');
  try {
    const res = await fetch(`/api/stalls/${STATE.vendorStallId}`);
    const data = await res.json();
    STATE.vendorMenu = data.items || [];

    // Also update stall open label
    const stall = data.stall;
    const btn = document.getElementById('vendorToggleOpenBtn');
    const label = document.getElementById('vendorOpenLabel');
    if (stall.isOpen) {
      btn.className = 'px-3 py-1.5 rounded-full text-xs font-extrabold bg-green-100 text-green-700 flex items-center space-x-1.5 transition';
      label.innerText = 'OPEN FOR ORDERS';
    } else {
      btn.className = 'px-3 py-1.5 rounded-full text-xs font-extrabold bg-red-100 text-red-700 flex items-center space-x-1.5 transition';
      label.innerText = 'CLOSED';
    }

    container.innerHTML = STATE.vendorMenu.map(item => `
      <div class="py-3 flex items-center justify-between text-xs">
        <div>
          <div class="font-extrabold text-gray-900">${item.name}</div>
          <div class="text-gray-500">₹${item.price}</div>
        </div>

        <button onclick="toggleItemStock('${item.id}', ${!item.inStock})" 
          class="px-3 py-1.5 rounded-xl font-bold text-xs transition ${
            item.inStock 
              ? 'bg-green-100 text-green-700 hover:bg-green-200' 
              : 'bg-red-100 text-red-700 hover:bg-red-200'
          }">
          ${item.inStock ? 'In Stock (Active)' : 'Out of Stock (86ed)'}
        </button>
      </div>
    `).join('');
  } catch (e) {
    console.error('Vendor menu load failed:', e);
  }
}

async function toggleStallOpenStatus() {
  try {
    const res = await fetch(`/api/stalls/${STATE.vendorStallId}/toggle-open`, { method: 'PATCH' });
    const data = await res.json();
    if (data.success) {
      showToast(`Stall status updated to: ${data.stall.isOpen ? 'OPEN' : 'CLOSED'}`);
      loadVendorMenuItems();
      loadStalls();
    }
  } catch (e) {
    console.error('Toggle stall status error:', e);
  }
}

async function toggleItemStock(itemId, inStock) {
  try {
    const res = await fetch(`/api/stalls/menu/${itemId}/stock`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ inStock: inStock })
    });
    const data = await res.json();
    if (data.success) {
      showToast(`${data.item.name} marked ${inStock ? 'IN STOCK' : 'OUT OF STOCK'}`);
      loadVendorMenuItems();
    }
  } catch (e) {
    console.error('Stock toggle failed:', e);
  }
}

// ==========================================================
// 10. RIDER DELIVERY CONSOLE LOGIC
// ==========================================================
async function initRiderView() {
  loadRiderOrders();
}

async function loadRiderOrders() {
  try {
    const res = await fetch('/api/orders'); // fetch all orders across the platform
    const data = await res.json();
    const orders = data.orders || [];

    // Find active gig needing pickup or delivery
    const activeGig = orders.find(o => ['ACCEPTED', 'COOKING', 'READY_FOR_PICKUP', 'OUT_FOR_DELIVERY'].includes(o.status));
    STATE.riderActiveOrder = activeGig || null;
    renderRiderGig(activeGig);

    // Completed trips list
    const completed = orders.filter(o => o.status === 'DELIVERED');
    renderRiderCompletedTrips(completed);

    // Dynamic earnings update (₹42 per completed trip)
    const earningsElem = document.getElementById('riderEarningsTotal');
    if (earningsElem) {
      earningsElem.innerText = `₹${(completed.length * 42).toFixed(2)}`;
    }
  } catch (e) {
    console.error('Rider orders fetch error:', e);
  }
}

function renderRiderGig(order) {
  const container = document.getElementById('riderActiveGig');
  if (!order) {
    container.innerHTML = `
      <div class="py-8 text-center text-gray-400">
        <i class="fa-solid fa-motorcycle text-3xl mb-2 text-gray-300"></i>
        <p class="font-bold text-sm text-gray-600">No active delivery assignments</p>
        <p class="text-xs">Place an order from the Customer tab to dispatch a delivery gig here.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <div class="space-y-4">
      <div class="flex items-center justify-between border-b border-gray-100 pb-3">
        <div>
          <div class="flex items-center space-x-2">
            <span class="font-black text-base text-gray-900">Gig #${order.id}</span>
            <span class="text-[10px] font-black px-2 py-0.5 rounded-full ${getStatusBadgeClass(order.status)}">
              ${formatStatus(order.status)}
            </span>
          </div>
          <div class="text-xs text-gray-500 mt-0.5">Stall: <strong>${order.stall_name}</strong></div>
        </div>
        <div class="text-right">
          <div class="text-emerald-600 font-black text-base">₹42 Payout</div>
          <div class="text-[11px] text-gray-400">1.2 km Distance</div>
        </div>
      </div>

      <!-- Pickup & Drop addresses -->
      <div class="space-y-2 text-xs">
        <div class="flex items-center space-x-2">
          <span class="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
          <span class="font-bold text-gray-700">Pickup:</span>
          <span class="text-gray-900">${order.stall_name}, Indiranagar 100ft Rd</span>
        </div>
        <div class="flex items-center space-x-2">
          <span class="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
          <span class="font-bold text-gray-700">Drop:</span>
          <span class="text-gray-900">${order.delivery_address} (${order.customer_name})</span>
        </div>
      </div>

      <!-- Rider Action Controls -->
      <div class="pt-2 border-t border-gray-100 flex flex-wrap gap-2">
        ${order.status === 'READY_FOR_PICKUP' || order.status === 'COOKING' ? `
          <button onclick="updateOrderStatus('${order.id}', 'OUT_FOR_DELIVERY')" 
            class="flex-1 bg-emerald-600 text-white rounded-xl py-2.5 font-bold text-xs hover:bg-emerald-700 transition flex items-center justify-center space-x-1.5">
            <i class="fa-solid fa-box-check"></i>
            <span>Confirm Pickup & Start Delivery</span>
          </button>
        ` : ''}

        ${order.status === 'OUT_FOR_DELIVERY' ? `
          <button onclick="startRiderGpsSimulation('${order.id}')" 
            class="flex-1 bg-amber-500 text-white rounded-xl py-2.5 font-bold text-xs hover:bg-amber-600 transition flex items-center justify-center space-x-1.5">
            <i class="fa-solid fa-satellite-dish animate-pulse"></i>
            <span>Simulate Live GPS Movement</span>
          </button>

          <button onclick="promptDeliveryOtp('${order.id}')" 
            class="flex-1 bg-emerald-600 text-white rounded-xl py-2.5 font-bold text-xs hover:bg-emerald-700 transition flex items-center justify-center space-x-1.5">
            <i class="fa-solid fa-key"></i>
            <span>Verify OTP & Deliver</span>
          </button>
        ` : ''}
      </div>
    </div>
  `;
}

function renderRiderCompletedTrips(trips) {
  const container = document.getElementById('riderTripsList');
  if (trips.length === 0) {
    container.innerHTML = `<div class="py-3 text-center text-gray-400">No completed trips yet today.</div>`;
    return;
  }
  container.innerHTML = trips.slice(0, 5).map(t => `
    <div class="py-2.5 flex justify-between items-center">
      <div>
        <div class="font-bold text-gray-900">Order #${t.id} - ${t.stall_name}</div>
        <div class="text-gray-500">${new Date(t.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
      </div>
      <div class="font-bold text-emerald-600">+₹42.00</div>
    </div>
  `).join('');
}

// Simulated GPS Broadcast from Rider to Customer Tracker
function startRiderGpsSimulation(orderId) {
  if (STATE.riderSimInterval) {
    clearInterval(STATE.riderSimInterval);
  }

  showToast('📡 Live GPS broadcast started (Streaming coordinates to Customer map)');
  let step = 0;
  const totalSteps = 6;

  STATE.riderSimInterval = setInterval(() => {
    step++;
    const progress = step / totalSteps;
    
    // Broadcast via WS
    if (STATE.ws && STATE.ws.readyState === WebSocket.OPEN) {
      STATE.ws.send(JSON.stringify({
        type: 'RIDER_TELEMETRY',
        payload: {
          riderId: 'rdr_1',
          orderId: orderId,
          lat: 12.9730 + (progress * 0.002),
          lng: 77.6400 + (progress * 0.001)
        }
      }));
    }

    if (step >= totalSteps) {
      clearInterval(STATE.riderSimInterval);
      STATE.riderSimInterval = null;
      showToast('📍 Rider arrived at customer doorstep!');
    }
  }, 1500);
}

// Rider prompts customer for 4-digit OTP
async function promptDeliveryOtp(orderId) {
  const entered = prompt(`Enter customer's 4-digit doorstep delivery OTP (Dev demo bypass: 1234):`, '1234');
  if (!entered) return;

  try {
    const res = await fetch(`/api/orders/${orderId}/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ otp: entered.trim() })
    });
    const data = await res.json();
    if (data.success) {
      showToast('✅ Delivery verified! Payout credited to rider account.');
      loadRiderOrders();
      loadCustomerOrders();
      loadVendorOrders();
    } else {
      alert(`Verification failed: ${data.error}`);
    }
  } catch (e) {
    console.error('OTP verify error:', e);
  }
}

// ==========================================================
// 11. PHONE NUMBER OTP AUTHENTICATION
// ==========================================================
function openAuthModal() {
  document.getElementById('authModal').classList.remove('hidden');
}

function closeAuthModal() {
  document.getElementById('authModal').classList.add('hidden');
}

async function handleSendOtp() {
  const phone = document.getElementById('authPhoneInput').value.trim();
  if (phone.length < 10) {
    alert('Please enter a valid 10-digit mobile number');
    return;
  }

  const btn = document.getElementById('authActionBtn');
  btn.disabled = true;
  btn.innerText = 'Sending OTP...';

  try {
    const res = await fetch('/api/auth/send-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone })
    });
    const data = await res.json();
    if (data.success) {
      document.getElementById('authOtpSection').classList.remove('hidden');
      btn.innerText = 'Verify & Continue';
      btn.onclick = handleVerifyOtp;
      showToast(`OTP sent to +91 ${phone} (Dev: 1234)`);
    } else {
      alert(data.error);
      btn.innerText = 'Send OTP';
    }
  } catch (e) {
    console.error('Send OTP error:', e);
    alert('Failed to connect to authentication server');
    btn.innerText = 'Send OTP';
  } finally {
    btn.disabled = false;
  }
}

async function handleVerifyOtp() {
  const enteredName = document.getElementById('authNameInput')?.value.trim();
  const phone = document.getElementById('authPhoneInput').value.trim();
  const otp = document.getElementById('authOtpInput').value.trim();
  const name = enteredName || 'Customer';

  const btn = document.getElementById('authActionBtn');
  btn.disabled = true;
  btn.innerText = 'Verifying...';

  try {
    const res = await fetch('/api/auth/verify-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, otp, name })
    });
    const data = await res.json();
    if (data.success) {
      STATE.user = data.user;
      localStorage.setItem('thela_user', JSON.stringify(data.user));
      updateAuthUI();
      closeAuthModal();
      showToast(`Welcome, ${data.user.name}!`);
      loadCustomerOrders();
    } else {
      alert(data.error || 'Invalid OTP');
    }
  } catch (e) {
    console.error('Verify OTP error:', e);
    alert('Failed to verify OTP');
  } finally {
    btn.disabled = false;
    btn.innerText = 'Verify & Continue';
  }
}

// ==========================================================
// 12. UTILITIES & TOAST ALERTS
// ==========================================================
function formatStatus(status) {
  const map = {
    PLACED: 'Order Placed',
    ACCEPTED: 'Stall Accepted',
    COOKING: 'Live Cooking',
    READY_FOR_PICKUP: 'Packed & Ready',
    OUT_FOR_DELIVERY: 'Out for Delivery',
    DELIVERED: 'Delivered',
    CANCELLED: 'Cancelled'
  };
  return map[status] || status;
}

function getStatusBadgeClass(status) {
  switch (status) {
    case 'PLACED': return 'bg-orange-100 text-orange-700';
    case 'ACCEPTED': return 'bg-blue-100 text-blue-700';
    case 'COOKING': return 'bg-amber-100 text-amber-700';
    case 'READY_FOR_PICKUP': return 'bg-purple-100 text-purple-700';
    case 'OUT_FOR_DELIVERY': return 'bg-emerald-100 text-emerald-700';
    case 'DELIVERED': return 'bg-gray-100 text-gray-700';
    default: return 'bg-gray-100 text-gray-600';
  }
}

function showToast(message) {
  const existing = document.getElementById('thelaToast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.id = 'thelaToast';
  toast.className = 'fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-gray-900/95 backdrop-blur text-white px-4 py-2.5 rounded-2xl shadow-xl font-bold text-xs flex items-center space-x-2 border border-white/10 animate-in fade-in slide-in-from-top-2 duration-200';
  toast.innerHTML = `<span>${message}</span>`;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// ==========================================================
// 12. USER PROFILE, ADDRESS BOOK & ORDER REORDER EXTENSIONS
// ==========================================================

// Profile Drawer
function openProfileModal() {
  if (!STATE.user || !STATE.user.phone) {
    openAuthModal();
    return;
  }

  const nameEl = document.getElementById('profileModalName');
  const phoneEl = document.getElementById('profileModalPhone');
  const nameInput = document.getElementById('profileNameInput');
  const emailInput = document.getElementById('profileEmailInput');
  const vegToggle = document.getElementById('profileVegPrefToggle');
  const ordersStat = document.getElementById('statTotalOrders');
  const addrsStat = document.getElementById('statSavedAddresses');
  const favsStat = document.getElementById('statFavoritesCount');

  if (nameEl) nameEl.innerText = STATE.user.name || 'Food Explorer';
  if (phoneEl) phoneEl.innerText = `+91 ${STATE.user.phone}`;
  if (nameInput) nameInput.value = STATE.user.name || '';
  if (emailInput) emailInput.value = STATE.user.email || '';
  if (vegToggle) vegToggle.checked = !!STATE.user.vegPreference;
  if (ordersStat) ordersStat.innerText = STATE.activeOrders.length || 0;
  if (addrsStat) addrsStat.innerText = (STATE.user.addresses && STATE.user.addresses.length) || 0;
  if (favsStat) favsStat.innerText = STATE.favorites.length || 0;

  document.getElementById('profileModal').classList.remove('hidden');
}

function closeProfileModal() {
  document.getElementById('profileModal').classList.add('hidden');
}

async function handleUpdateProfile(event) {
  if (event) event.preventDefault();
  if (!STATE.user || !STATE.user.phone) return;

  const btn = document.getElementById('saveProfileBtn');
  const originalText = btn ? btn.innerText : 'Save';
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = `<i class="fa-solid fa-spinner animate-spin mr-2"></i>Saving...`;
  }

  const name = document.getElementById('profileNameInput')?.value.trim();
  const email = document.getElementById('profileEmailInput')?.value.trim();
  const vegPreference = document.getElementById('profileVegPrefToggle')?.checked || false;

  try {
    const res = await fetch(`/api/users/${STATE.user.phone}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, vegPreference })
    });
    const data = await res.json();
    if (data.success && data.user) {
      STATE.user = { ...STATE.user, ...data.user };
      STATE.vegOnly = vegPreference;
      localStorage.setItem('thela_user', JSON.stringify(STATE.user));

      const vegBtn = document.getElementById('vegFilterBtn');
      if (vegBtn) {
        vegBtn.className = vegPreference
          ? 'flex items-center space-x-1.5 px-3 py-2.5 rounded-xl border-2 border-green-600 bg-green-50 text-xs font-black text-green-800 transition shadow-sm whitespace-nowrap'
          : 'flex items-center space-x-1.5 px-3 py-2.5 rounded-xl border border-gray-200 bg-white text-xs font-bold text-gray-700 hover:border-gray-300 transition shadow-sm whitespace-nowrap';
      }

      updateAuthUI();
      loadStalls();
      closeProfileModal();
      showToast('✅ Profile updated successfully!');
    } else {
      showToast(data.error || 'Failed to update profile');
    }
  } catch (err) {
    console.error('Update profile error:', err);
    showToast('Network error while updating profile');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerText = originalText;
    }
  }
}

function handleLogout() {
  localStorage.removeItem('thela_user');
  STATE.user = null;
  STATE.activeAddress = null;
  STATE.favorites = [];
  STATE.vegOnly = false;
  
  const vegBtn = document.getElementById('vegFilterBtn');
  if (vegBtn) {
    vegBtn.className = 'flex items-center space-x-1.5 px-3 py-2.5 rounded-xl border border-gray-200 bg-white text-xs font-bold text-gray-700 hover:border-gray-300 transition shadow-sm whitespace-nowrap';
  }

  updateAuthUI();
  updateHeaderLocation();
  updateFavoriteCountBadge();
  updateCartAddressDisplay();
  loadStalls();
  closeProfileModal();
  showToast('Logged out of ThelaExpress');
}

// Address Drawer Logic
function openAddressDrawer() {
  if (!STATE.user || !STATE.user.phone) {
    openAuthModal();
    return;
  }
  renderSavedAddresses();
  document.getElementById('addressDrawer').classList.remove('hidden');
}

function closeAddressDrawer() {
  document.getElementById('addressDrawer').classList.add('hidden');
}

function renderSavedAddresses() {
  const container = document.getElementById('savedAddressesContainer');
  if (!container) return;

  const addresses = (STATE.user && STATE.user.addresses) || [];
  if (addresses.length === 0) {
    container.innerHTML = `
      <div class="py-6 text-center text-gray-400 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
        <i class="fa-solid fa-map-pin text-2xl text-gray-300 mb-1"></i>
        <p class="text-xs font-bold text-gray-600">No saved addresses yet</p>
        <p class="text-[10px] text-gray-400">Add your Home or Office address below for 1-tap delivery</p>
      </div>
    `;
    return;
  }

  container.innerHTML = addresses.map(addr => {
    const isSelected = STATE.activeAddress && (STATE.activeAddress.id === addr.id);
    const tagIcon = addr.tag === 'Home' ? '🏠' : (addr.tag === 'Work' ? '💼' : '📍');

    return `
      <div onclick="selectDeliveryAddress('${addr.id}')"
        class="p-3.5 rounded-2xl border-2 transition cursor-pointer flex items-start justify-between ${
          isSelected 
            ? 'border-orange-500 bg-orange-50/50 shadow-sm' 
            : 'border-gray-200 bg-white hover:border-gray-300'
        }">
        <div class="flex items-start space-x-3 flex-1">
          <div class="w-8 h-8 rounded-xl bg-orange-100 text-orange-700 flex items-center justify-center font-bold text-sm shrink-0 mt-0.5">
            ${tagIcon}
          </div>
          <div>
            <div class="flex items-center space-x-2">
              <h4 class="text-xs font-black text-gray-900">${addr.tag}: ${addr.title}</h4>
              ${addr.isDefault ? '<span class="bg-orange-100 text-orange-700 text-[9px] font-black px-1.5 py-0.5 rounded">PRIMARY</span>' : ''}
            </div>
            <p class="text-[11px] text-gray-500 mt-0.5 line-clamp-2">${addr.address}</p>
          </div>
        </div>

        <div class="flex items-center space-x-2 shrink-0 ml-2">
          ${isSelected ? '<span class="text-orange-600 text-sm"><i class="fa-solid fa-circle-check"></i></span>' : ''}
          <button onclick="event.stopPropagation(); handleDeleteAddress('${addr.id}')" 
            class="text-gray-300 hover:text-red-500 p-1 transition" title="Delete Address">
            <i class="fa-regular fa-trash-can text-xs"></i>
          </button>
        </div>
      </div>
    `;
  }).join('');
}

function setNewAddrTag(tag) {
  STATE.newAddrTag = tag;
  ['Home', 'Work', 'Other'].forEach(t => {
    const btn = document.getElementById(`tagBtn${t}`);
    if (btn) {
      if (t === tag) {
        btn.className = 'tag-pill px-3 py-1.5 rounded-xl border-2 border-orange-600 bg-orange-50 text-orange-700 font-bold flex items-center space-x-1';
      } else {
        btn.className = 'tag-pill px-3 py-1.5 rounded-xl border border-gray-200 bg-white text-gray-700 font-bold flex items-center space-x-1';
      }
    }
  });
}

function captureCustomerGps() {
  const label = document.getElementById('gpsDetectLabel');
  if (!navigator.geolocation) {
    showToast('GPS geolocation is not supported on this device');
    return;
  }

  if (label) label.innerText = 'Detecting...';

  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const lat = pos.coords.latitude.toFixed(4);
      const lon = pos.coords.longitude.toFixed(4);
      
      const houseInput = document.getElementById('newAddrHouse');
      const streetInput = document.getElementById('newAddrStreet');
      if (houseInput) houseInput.value = 'GPS Detected Point';
      if (streetInput) streetInput.value = `Near Lat ${lat}, Long ${lon}`;

      if (label) label.innerText = 'GPS Locked ✓';
      showToast(`📍 GPS pinned at ${lat}, ${lon}`);
    },
    (err) => {
      console.warn('GPS error:', err);
      if (label) label.innerText = 'Use Live GPS';
      showToast('Could not access GPS. Please enter your address manually.');
    },
    { enableHighAccuracy: true, timeout: 8000 }
  );
}

async function handleSaveAddress(event) {
  if (event) event.preventDefault();
  if (!STATE.user || !STATE.user.phone) return;

  const house = document.getElementById('newAddrHouse')?.value.trim();
  const street = document.getElementById('newAddrStreet')?.value.trim();
  const landmark = document.getElementById('newAddrLandmark')?.value.trim();
  const isDefault = document.getElementById('newAddrDefaultToggle')?.checked || false;

  if (!house || !street) {
    showToast('Please fill in Flat/House and Street details');
    return;
  }

  const title = house;
  const address = landmark ? `${street}, Landmark: ${landmark}` : street;
  const tag = STATE.newAddrTag || 'Home';

  const btn = document.getElementById('saveAddressBtn');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = `<i class="fa-solid fa-spinner animate-spin mr-2"></i>Saving...`;
  }

  try {
    const res = await fetch(`/api/users/${STATE.user.phone}/addresses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tag, title, address, isDefault })
    });

    const data = await res.json();
    if (data.success && data.addresses) {
      STATE.user.addresses = data.addresses;
      if (data.address) {
        STATE.activeAddress = data.address;
      } else if (isDefault || !STATE.activeAddress) {
        STATE.activeAddress = data.addresses[data.addresses.length - 1];
      }
      localStorage.setItem('thela_user', JSON.stringify(STATE.user));

      // Reset form
      const houseInput = document.getElementById('newAddrHouse');
      const streetInput = document.getElementById('newAddrStreet');
      const landmarkInput = document.getElementById('newAddrLandmark');
      if (houseInput) houseInput.value = '';
      if (streetInput) streetInput.value = '';
      if (landmarkInput) landmarkInput.value = '';

      renderSavedAddresses();
      updateHeaderLocation();
      updateCartAddressDisplay();
      closeAddressDrawer();
      showToast('✅ Delivery address saved!');
    } else {
      showToast(data.error || 'Failed to save address');
    }
  } catch (err) {
    console.error('Save address error:', err);
    showToast('Failed to save address. Check connection.');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerText = 'Save & Deliver Here';
    }
  }
}

async function handleDeleteAddress(addrId) {
  if (!STATE.user || !STATE.user.phone) return;
  try {
    const res = await fetch(`/api/users/${STATE.user.phone}/addresses/${addrId}`, {
      method: 'DELETE'
    });
    const data = await res.json();
    if (data.success) {
      STATE.user.addresses = data.addresses || [];
      if (STATE.activeAddress && STATE.activeAddress.id === addrId) {
        STATE.activeAddress = STATE.user.addresses.find(a => a.isDefault) || STATE.user.addresses[0] || null;
      }
      localStorage.setItem('thela_user', JSON.stringify(STATE.user));
      renderSavedAddresses();
      updateHeaderLocation();
      updateCartAddressDisplay();
      showToast('Address removed');
    }
  } catch (err) {
    console.error('Delete address error:', err);
  }
}

function selectDeliveryAddress(addrId) {
  const addr = STATE.user?.addresses?.find(a => a.id === addrId);
  if (addr) {
    STATE.activeAddress = addr;
    updateHeaderLocation();
    updateCartAddressDisplay();
    closeAddressDrawer();
    showToast(`📍 Delivering to ${addr.tag}: ${addr.title}`);
  }
}

// Order History & 1-Tap Reorder
async function openOrderHistoryModal() {
  if (!STATE.user || !STATE.user.phone) {
    openAuthModal();
    return;
  }

  const container = document.getElementById('orderHistoryList');
  if (container) {
    container.innerHTML = `
      <div class="py-12 text-center text-gray-400">
        <i class="fa-solid fa-spinner animate-spin text-2xl text-orange-500 mb-2"></i>
        <p class="text-xs font-bold">Loading your orders...</p>
      </div>
    `;
  }

  document.getElementById('orderHistoryModal').classList.remove('hidden');

  try {
    const res = await fetch(`/api/orders/user/${STATE.user.phone}`);
    const data = await res.json();
    const orders = data.orders || [];

    if (!container) return;

    if (orders.length === 0) {
      container.innerHTML = `
        <div class="py-12 text-center text-gray-400">
          <i class="fa-solid fa-receipt text-3xl text-gray-300 mb-2"></i>
          <p class="font-bold text-sm text-gray-700">No past orders yet</p>
          <p class="text-xs text-gray-400 mt-1">Your order history and 1-tap reorder options will appear here!</p>
        </div>
      `;
      return;
    }

    container.innerHTML = orders.map(order => {
      const dateStr = new Date(order.created_at).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
      });

      const itemsSummary = (order.items || []).map(i => `${i.qty}x ${i.name}`).join(', ');

      return `
        <div class="bg-gray-50 border border-gray-200 rounded-2xl p-4 space-y-3 shadow-sm hover:border-orange-200 transition">
          <div class="flex items-start justify-between">
            <div>
              <h3 class="font-extrabold text-sm text-gray-900">${order.stall_name}</h3>
              <p class="text-[11px] text-gray-400 font-medium">${dateStr} • Order #${order.id}</p>
            </div>
            <span class="text-[11px] font-black px-2.5 py-1 rounded-full ${getStatusBadgeClass(order.status)}">
              ${formatStatus(order.status)}
            </span>
          </div>

          <div class="text-xs text-gray-600 bg-white border border-gray-100 rounded-xl p-2.5">
            <span class="font-bold text-gray-800">Items:</span> ${itemsSummary}
          </div>

          <div class="flex items-center justify-between pt-1 border-t border-gray-100">
            <div class="text-xs font-black text-gray-900">
              ₹${order.grand_total} <span class="text-[10px] text-gray-400 font-normal">(${order.payment_method || 'UPI'})</span>
            </div>

            <div class="flex items-center space-x-2">
              ${order.status === 'DELIVERED' ? `
                <button onclick="openRatingModal('${order.id}')" 
                  class="px-3 py-1.5 rounded-xl border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-black transition flex items-center space-x-1">
                  <i class="fa-solid fa-star text-amber-500"></i>
                  <span>${order.rating ? `${order.rating}★ Rated` : 'Rate'}</span>
                </button>
              ` : ''}

              <button onclick="handleReorder('${order.id}')" 
                class="px-3.5 py-1.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-black transition flex items-center space-x-1 shadow-sm">
                <i class="fa-solid fa-rotate-right"></i>
                <span>Repeat Order</span>
              </button>
            </div>
          </div>
        </div>
      `;
    }).join('');
  } catch (err) {
    console.error('Failed to load past orders:', err);
    if (container) {
      container.innerHTML = `
        <div class="py-12 text-center text-red-500 text-xs font-bold">
          Failed to load past orders. Please try again.
        </div>
      `;
    }
  }
}

function closeOrderHistoryModal() {
  document.getElementById('orderHistoryModal').classList.add('hidden');
}

async function handleReorder(orderId) {
  try {
    const res = await fetch(`/api/orders/${orderId}`);
    const data = await res.json();
    const order = data.order;
    if (!order || !order.items || order.items.length === 0) {
      showToast('Could not reload items for this order');
      return;
    }

    STATE.cart.stallId = order.stall_id;
    STATE.cart.stallName = order.stall_name;
    STATE.cart.items = order.items.map(item => ({
      item_id: item.item_id,
      name: item.name,
      price: item.price,
      qty: item.qty || 1,
      customs: item.customs || {}
    }));

    closeOrderHistoryModal();
    updateCartFloatingBar();
    openCartDrawer();
    showToast(`🛒 Order #${orderId} items loaded into cart!`);
  } catch (err) {
    console.error('Reorder error:', err);
    showToast('Failed to repeat order');
  }
}

// 5-Star Rating & Street Compliments
function openRatingModal(orderId) {
  STATE.ratingOrderId = orderId;
  STATE.selectedStarRating = 5;
  STATE.selectedCompliments = [];

  const subTitle = document.getElementById('ratingModalSubtitle');
  if (subTitle) subTitle.innerText = `Order #${orderId} delivered hot & fresh`;

  setStarRating(5);

  document.querySelectorAll('.compliment-pill').forEach(btn => {
    btn.className = 'compliment-pill px-2.5 py-1 rounded-xl text-xs font-bold border border-gray-200 bg-gray-50 text-gray-700 hover:border-orange-500';
  });

  const commentInput = document.getElementById('ratingCommentInput');
  if (commentInput) commentInput.value = '';

  document.getElementById('ratingModal').classList.remove('hidden');
}

function closeRatingModal() {
  document.getElementById('ratingModal').classList.add('hidden');
  STATE.ratingOrderId = null;
}

function setStarRating(rating) {
  STATE.selectedStarRating = rating;
  const container = document.getElementById('starRatingContainer');
  const label = document.getElementById('starRatingLabel');

  const labels = ['', 'Terrible (1 Star)', 'Bad (2 Stars)', 'Average (3 Stars)', 'Very Good (4 Stars)', 'Super Delicious! 😋 (5 Stars)'];
  if (label) label.innerText = labels[rating] || `${rating} Stars`;

  if (container) {
    const stars = container.querySelectorAll('i');
    stars.forEach((star, idx) => {
      if (idx < rating) {
        star.className = 'fa-solid fa-star cursor-pointer hover:scale-125 transition text-amber-500';
      } else {
        star.className = 'fa-regular fa-star cursor-pointer hover:scale-125 transition text-gray-300';
      }
    });
  }
}

function toggleCompliment(btn, text) {
  const index = STATE.selectedCompliments.indexOf(text);
  if (index > -1) {
    STATE.selectedCompliments.splice(index, 1);
    btn.className = 'compliment-pill px-2.5 py-1 rounded-xl text-xs font-bold border border-gray-200 bg-gray-50 text-gray-700 hover:border-orange-500';
  } else {
    STATE.selectedCompliments.push(text);
    btn.className = 'compliment-pill px-2.5 py-1 rounded-xl text-xs font-black border-2 border-orange-600 bg-orange-50 text-orange-700 shadow-sm';
  }
}

async function handleSubmitRating() {
  if (!STATE.ratingOrderId) return;

  const comment = document.getElementById('ratingCommentInput')?.value.trim() || '';

  try {
    const res = await fetch(`/api/orders/${STATE.ratingOrderId}/rate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        rating: STATE.selectedStarRating,
        review: comment,
        compliments: STATE.selectedCompliments
      })
    });

    const data = await res.json();
    if (data.success) {
      showToast('⭐ Thank you for rating this street food hero!');
      closeRatingModal();
      loadCustomerOrders();
    } else {
      showToast(data.error || 'Failed to submit rating');
    }
  } catch (err) {
    console.error('Submit rating error:', err);
    showToast('Failed to connect to server');
  }
}
