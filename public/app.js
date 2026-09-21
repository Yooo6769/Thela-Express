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
  radarProgress: 0.2, // 0.0 to 1.0 representing rider progress along route
  customerLocation: null, // { lat: number, lng: number }
  deliveryCapacity: null // { activeRiders: number, activeOrders: number, capacityAvailable: boolean }
};

// ==========================================================
// 1. INITIALIZATION & LIFECYCLE
// ==========================================================
function getAuthHeaders() {
  const headers = { 'Content-Type': 'application/json' };
  const token = localStorage.getItem('thela_token');
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

function rehydrateActiveTrackingSession() {
  try {
    const activeId = localStorage.getItem('thela_active_tracking_id');
    if (!activeId) return;

    fetch(`/api/orders/${activeId}`, {
      headers: getAuthHeaders()
    })
      .then(res => res.json())
      .then(data => {
        if (data && data.order) {
          openTrackingModal(data.order);
        }
      })
      .catch(e => console.warn('Could not rehydrate tracking session:', e));
  } catch (e) {}
}

document.addEventListener('DOMContentLoaded', () => {
  AtmosphereManager.init();
  loadStoredUser();
  initWebSocket();
  loadCategories();
  loadStalls();
  loadCustomerOrders();
  setupRadarCanvas();
  rehydrateActiveTrackingSession();

  const urlParams = new URLSearchParams(window.location.search);
  const view = urlParams.get('view');
  if (view === 'vendor' || view === 'rider') {
    window.location.href = `/partner.html?role=${view}`;
    return;
  }

  window.addEventListener('thela_language_changed', () => {
    if (STATE.stalls) {
      renderDiscoverySections(STATE.stalls);
      renderStalls(STATE.stalls);
    }
    if (typeof loadCategories === 'function') loadCategories();
  });
});

// ==========================================================
// ATMOSPHERE MANAGER (UI-State-Driven Adaptive Density Engine)
// ==========================================================
const AtmosphereManager = {
  currentDensity: 'high',
  overrideStack: [], // Array of { source: string, density: string }
  scrollTicking: false,
  container: null,

  init() {
    this.container = document.getElementById('thelaAtmosphere');
    if (!this.container) return;

    // Initial baseline check based on viewport scroll position
    this.updateBaselineFromScroll();

    // Scroll listener for baseline density transitions (high at top hero, medium in catalog)
    window.addEventListener('scroll', () => {
      if (!this.scrollTicking) {
        window.requestAnimationFrame(() => {
          this.updateBaselineFromScroll();
          this.scrollTicking = false;
        });
        this.scrollTicking = true;
      }
    }, { passive: true });

    // Tab inactive battery saver
    document.addEventListener('visibilitychange', () => {
      if (!this.container) return;
      if (document.visibilityState === 'hidden') {
        this.container.classList.add('atmosphere-paused');
      } else {
        this.container.classList.remove('atmosphere-paused');
      }
    });
  },

  updateBaselineFromScroll() {
    // If any focused UI modal/drawer override is active, that state has absolute priority
    if (this.overrideStack.length > 0) return;

    const scrollY = window.scrollY || window.pageYOffset || 0;
    // Hero & craving hub area (top 320px) = high density
    // Scrolled down into carousels & catalog = medium density
    const target = scrollY < 320 ? 'high' : 'medium';
    this.setDensity(target);
  },

  pushOverride(source, density) {
    this.overrideStack = this.overrideStack.filter(o => o.source !== source);
    this.overrideStack.push({ source, density });
    this.applyCurrentDensity();
  },

  popOverride(source) {
    this.overrideStack = this.overrideStack.filter(o => o.source !== source);
    this.applyCurrentDensity();
  },

  applyCurrentDensity() {
    if (this.overrideStack.length > 0) {
      const topOverride = this.overrideStack[this.overrideStack.length - 1];
      this.setDensity(topOverride.density);
    } else {
      this.updateBaselineFromScroll();
    }
  },

  setDensity(density) {
    if (this.currentDensity === density && this.container && this.container.getAttribute('data-density') === density) return;
    this.currentDensity = density;
    if (this.container) {
      this.container.setAttribute('data-density', density);
    }
  }
};

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
        if (data.payload.etaMinutes !== undefined) {
          STATE.trackingOrder.etaMinutes = data.payload.etaMinutes;
        }
        updateTrackingEta(STATE.trackingOrder);
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
        updateTrackingEta(STATE.trackingOrder);
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
// 5. CUSTOMER VIEW LOGIC (Craving Hub, Discovery & Catalog)
// ==========================================================

function computeGeographicDistanceKm(lat1, lon1, lat2, lon2) {
  const p1 = parseFloat(lat1);
  const l1 = parseFloat(lon1);
  const p2 = parseFloat(lat2);
  const l2 = parseFloat(lon2);
  if (isNaN(p1) || isNaN(l1) || isNaN(p2) || isNaN(l2)) return null;
  const R = 6371; // Earth radius in km
  const dLat = (p2 - p1) * Math.PI / 180;
  const dLon = (l2 - l1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(p1 * Math.PI / 180) * Math.cos(p2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

function getActiveCustomerCoordinates() {
  if (typeof STATE !== 'undefined') {
    if (STATE.customerLocation && typeof STATE.customerLocation.lat === 'number' && typeof STATE.customerLocation.lng === 'number') {
      return STATE.customerLocation;
    }
    if (STATE.activeAddress && typeof STATE.activeAddress.lat === 'number' && typeof STATE.activeAddress.lng === 'number') {
      return { lat: STATE.activeAddress.lat, lng: STATE.activeAddress.lng };
    }
  }
  return null;
}

function calculateDynamicDeliveryTime(distanceKm, prepMin, capacity = null) {
  if (distanceKm === undefined || distanceKm === null || distanceKm === '') return null;
  const km = typeof distanceKm === 'number' ? distanceKm : parseFloat(distanceKm);
  if (isNaN(km) || km <= 0) return null;

  // Zero fiction: prepMin must be positive number from legitimate backend data, NO fallback!
  const prep = (typeof prepMin === 'number' && prepMin > 0)
    ? prepMin
    : (parseInt(prepMin, 10) > 0 ? parseInt(prepMin, 10) : null);
  if (!prep) return null;

  const transitMin = Math.max(3, Math.round(km * 5));
  let capacityBuffer = 0;
  const cap = capacity || (typeof STATE !== 'undefined' && STATE.deliveryCapacity ? STATE.deliveryCapacity : null);
  if (cap && typeof cap.activeRiders === 'number' && cap.activeRiders > 0) {
    const queueRatio = (cap.activeOrders || 0) / cap.activeRiders;
    if (queueRatio > 1) {
      capacityBuffer = Math.min(15, Math.round((queueRatio - 1) * 4));
    }
  }

  const totalMin = prep + transitMin + capacityBuffer;
  const lower = Math.max(10, totalMin - 3);
  const upper = totalMin + 4;
  return `${lower}–${upper} min`;
}

function calculateMarketplaceEta(stall, customerCoords = null, capacity = null) {
  if (!stall) {
    return {
      isAvailable: false,
      reason: 'stall_unavailable',
      pillText: 'ETA unavailable',
      badgeText: '🛵 ETA unavailable',
      displayText: '🛵 ETA unavailable',
      distanceKm: null,
      distanceText: null
    };
  }

  // 1. Resolve customer coordinates
  const cust = customerCoords || (typeof getActiveCustomerCoordinates === 'function' ? getActiveCustomerCoordinates() : null);

  // 2. Resolve distance
  let distKm = null;
  if (cust && typeof cust.lat === 'number' && typeof cust.lng === 'number' &&
      typeof stall.lat === 'number' && typeof stall.lng === 'number') {
    distKm = computeGeographicDistanceKm(cust.lat, cust.lng, stall.lat, stall.lng);
  } else if (typeof stall.distanceKm === 'number' && stall.distanceKm > 0) {
    distKm = stall.distanceKm;
  } else if (typeof stall.distance === 'string' && stall.distance.includes('km')) {
    const parsed = parseFloat(stall.distance);
    if (!isNaN(parsed) && parsed > 0) distKm = parsed;
  }

  const distText = distKm !== null ? `${distKm.toFixed(1)} km` : null;

  // If customer location is missing or distance cannot be computed
  if (distKm === null) {
    if (!cust) {
      return {
        isAvailable: false,
        reason: 'location_required',
        pillText: 'ETA available after location',
        badgeText: '🛵 ETA available after location',
        displayText: '🛵 ETA available after location',
        distanceKm: null,
        distanceText: null
      };
    }
    return {
      isAvailable: false,
      reason: 'vendor_location_missing',
      pillText: 'ETA unavailable',
      badgeText: '🛵 ETA unavailable',
      displayText: '🛵 ETA unavailable',
      distanceKm: null,
      distanceText: null
    };
  }

  // 3. Resolve prep time (Strict Zero-Fiction Standard: positive number, NO fallback)
  const prepTime = (typeof stall.prepTime === 'number' && stall.prepTime > 0)
    ? stall.prepTime
    : (parseInt(stall.prepTime, 10) > 0 ? parseInt(stall.prepTime, 10) : null);

  if (!prepTime) {
    return {
      isAvailable: false,
      reason: 'prep_time_unavailable',
      pillText: 'ETA unavailable',
      badgeText: '🛵 ETA unavailable',
      displayText: '🛵 ETA unavailable',
      distanceKm: distKm,
      distanceText: distText
    };
  }

  // 4. Resolve delivery capacity (activeRiders, activeOrders)
  const cap = capacity || (typeof STATE !== 'undefined' && STATE.deliveryCapacity ? STATE.deliveryCapacity : null);
  let capacityBuffer = 0;
  if (cap && typeof cap.activeRiders === 'number' && cap.activeRiders > 0) {
    const load = (cap.activeOrders || 0) / cap.activeRiders;
    if (load > 1) {
      capacityBuffer = Math.min(15, Math.round((load - 1) * 4));
    }
  }

  // 5. Geographic transit time (~5 min per km straight-line)
  const transitMin = Math.max(3, Math.round(distKm * 5));
  const totalMin = prepTime + transitMin + capacityBuffer;
  const lower = Math.max(10, totalMin - 3);
  const upper = totalMin + 4;
  const timeRange = `${lower}–${upper} min`;
  const fullPill = `${timeRange} · ${distText}`;

  return {
    isAvailable: true,
    reason: null,
    lowerMin: lower,
    upperMin: upper,
    timeRange: timeRange,
    prepTime: prepTime,
    transitMin: transitMin,
    capacityBuffer: capacityBuffer,
    distanceKm: distKm,
    distanceText: distText,
    pillText: fullPill,
    badgeText: `🛵 ${fullPill}`,
    displayText: `🛵 ${fullPill}`
  };
}

function calculateTrackingEta(order, liveRiderTelemetry = null) {
  if (!order) return { text: 'Order details unavailable', isLive: false };
  if (order.status === 'COMPLETED') {
    return { text: typeof t === 'function' ? t('track_completed', 'Delivered & Completed ★') : 'Delivered & Completed ★', isLive: false };
  }
  if (order.status === 'DELIVERED') {
    return { text: typeof t === 'function' ? t('track_delivered', 'Delivered to your doorstep') : 'Delivered to your doorstep', isLive: false };
  }
  if (order.status === 'CANCELLED') {
    const refundNote = order.payment_status === 'REFUND_PENDING' ? ' (Refund processing)' : (order.payment_status === 'REFUNDED' ? ' (Refunded)' : '');
    return { text: `Order cancelled${refundNote}`, isLive: false };
  }
  if (order.status === 'REJECTED') {
    const refundNote = order.payment_status === 'REFUND_PENDING' ? ' (Refund initiated)' : '';
    return { text: `Order declined by stall kitchen${refundNote}`, isLive: false };
  }
  if (order.status === 'VENDOR_UNAVAILABLE') {
    return { text: 'Stall did not respond in time (Refund initiated)', isLive: false };
  }
  if (order.status === 'RIDER_UNAVAILABLE') {
    return { text: 'No delivery partner available in area (Refund initiated)', isLive: false };
  }
  if (order.status === 'PAYMENT_FAILED') {
    return { text: 'Payment authorization failed', isLive: false };
  }
  if (order.etaMinutes && typeof order.etaMinutes === 'number') {
    const label = typeof t === 'function' ? t('estimated_delivery_time', 'Estimated delivery time') : 'Estimated delivery time';
    return { text: `${label}: ~${order.etaMinutes} mins`, isLive: true, remainingMin: order.etaMinutes };
  }
  if (order.estimated_delivery && typeof order.estimated_delivery === 'string') {
    const label = typeof t === 'function' ? t('estimated_delivery_time', 'Estimated delivery time') : 'Estimated delivery time';
    return { text: `${label}: ${order.estimated_delivery}`, isLive: true };
  }
  if (order.status === 'OUT_FOR_DELIVERY') {
    return { text: '🛵 Out for delivery — arriving at your doorstep', isLive: true };
  }
  if (order.status === 'PICKED_UP') {
    return { text: '🛵 Order collected from thela — en route', isLive: true };
  }
  if (order.status === 'RIDER_ARRIVING') {
    return { text: '🛵 Delivery partner arriving at street thela', isLive: true };
  }
  if (order.status === 'RIDER_ASSIGNED') {
    return { text: '🛵 Delivery partner assigned to your order', isLive: true };
  }
  if (order.status === 'READY_FOR_PICKUP') {
    return { text: '📦 Freshly packed in eco dona — waiting for rider', isLive: true };
  }
  if (order.status === 'PREPARING' || order.status === 'COOKING') {
    return { text: '🍳 Freshly preparing your street bite on tawa', isLive: true };
  }
  if (order.status === 'ACCEPTED') {
    return { text: '👨‍🍳 Stall vendor accepted order — preparation starting', isLive: true };
  }
  if (order.status === 'PLACED') {
    return { text: '🔔 Order received — awaiting stall confirmation', isLive: true };
  }
  return { text: typeof t === 'function' ? t('track_eta_pending', 'Calculating live delivery estimate...') : 'Calculating live delivery estimate...', isLive: true };
}

function scrollDiscovery(trackId, delta) {
  const track = document.getElementById(trackId);
  if (track) {
    track.scrollBy({ left: delta, behavior: 'smooth' });
  }
}

function scrollToDiscoverySection(sectionId) {
  const el = document.getElementById(sectionId);
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

function clearSearch() {
  const input = document.getElementById('searchInput');
  const btn = document.getElementById('searchClearBtn');
  if (input) input.value = '';
  if (btn) btn.classList.add('hidden');
  loadStalls();
}

function handleSearch() {
  const input = document.getElementById('searchInput');
  const btn = document.getElementById('searchClearBtn');
  if (input && btn) {
    btn.classList.toggle('hidden', !input.value.trim());
  }
  loadStalls();
}

// ==========================================================
// 4. THELA FOOD PLACEHOLDER & IMAGE UTILITIES
// ==========================================================
function getThelaFoodPlaceholder(category = 'streetfood', name = '') {
  const cat = (category || '').toLowerCase();
  let catLabel = 'Street Food';
  let iconSvg = '';

  if (cat.includes('momo') || cat.includes('dimsum')) {
    catLabel = 'Himalayan Momos';
    iconSvg = '<ellipse cx="50" cy="58" rx="28" ry="12" fill="#d97706" opacity="0.3"/><path d="M30 52 C30 42 45 40 45 48 C45 54 30 54 30 52 Z M45 48 C45 40 60 40 60 48 C60 54 45 54 45 48 Z M60 48 C60 42 70 42 70 52" fill="#fff7ed" stroke="#d97706" stroke-width="2"/>';
  } else if (cat.includes('roll') || cat.includes('kathi') || cat.includes('frankie')) {
    catLabel = 'Kathi Rolls';
    iconSvg = '<rect x="25" y="42" width="50" height="18" rx="9" fill="#fed7aa" stroke="#ea580c" stroke-width="2"/><line x1="38" y1="44" x2="62" y2="44" stroke="#ea580c" stroke-width="2"/><circle cx="68" cy="51" r="3.5" fill="#16a34a"/>';
  } else if (cat.includes('chaat') || cat.includes('puri') || cat.includes('bhel') || cat.includes('sev')) {
    catLabel = 'Chaat & Pani Puri';
    iconSvg = '<circle cx="38" cy="50" r="14" fill="#fde68a" stroke="#d97706" stroke-width="2"/><circle cx="62" cy="50" r="14" fill="#fde68a" stroke="#d97706" stroke-width="2"/><path d="M34 44 Q38 40 42 44" stroke="#16a34a" stroke-width="2" fill="none"/>';
  } else if (cat.includes('dosa') || cat.includes('south') || cat.includes('idli')) {
    catLabel = 'Dosa & South Indian';
    iconSvg = '<path d="M22 58 Q50 32 78 58 Z" fill="#fef3c7" stroke="#d97706" stroke-width="2"/><circle cx="50" cy="62" r="5" fill="#fef08a"/>';
  } else if (cat.includes('pav') || cat.includes('bhaji') || cat.includes('tawa') || cat.includes('misal')) {
    catLabel = 'Pav Bhaji & Tawa';
    iconSvg = '<rect x="24" y="44" width="22" height="18" rx="4" fill="#fed7aa" stroke="#c2410c" stroke-width="2"/><rect x="54" y="44" width="22" height="18" rx="4" fill="#fed7aa" stroke="#c2410c" stroke-width="2"/><circle cx="35" cy="53" r="3" fill="#ea580c"/>';
  } else if (cat.includes('vadapav') || cat.includes('vada')) {
    catLabel = 'Mumbai Vada Pav';
    iconSvg = '<rect x="25" y="42" width="50" height="20" rx="6" fill="#fef3c7" stroke="#b45309" stroke-width="2"/><circle cx="50" cy="52" r="8" fill="#f59e0b"/>';
  } else if (cat.includes('chai') || cat.includes('tea') || cat.includes('beverage') || cat.includes('drink') || cat.includes('lassi')) {
    catLabel = 'Chai & Beverages';
    iconSvg = '<path d="M36 36 L40 70 C40 74 60 74 60 70 L64 36 Z" fill="#fff7ed" stroke="#d97706" stroke-width="2"/><path d="M48 30 Q52 22 48 16" stroke="#ea580c" stroke-width="2" fill="none"/>';
  } else if (cat.includes('sweet') || cat.includes('jalebi') || cat.includes('mithai') || cat.includes('kulfi')) {
    catLabel = 'Mithai & Sweets';
    iconSvg = '<circle cx="50" cy="50" r="16" fill="none" stroke="#ea580c" stroke-width="3"/><circle cx="50" cy="50" r="10" fill="none" stroke="#f59e0b" stroke-width="2.5"/><circle cx="50" cy="50" r="4" fill="#ea580c"/>';
  } else {
    catLabel = name ? name : 'Street Food';
    iconSvg = '<path d="M20 40 L80 40 L75 28 L25 28 Z" fill="#ea580c"/><rect x="25" y="42" width="50" height="20" rx="3" fill="#78350f"/><circle cx="50" cy="72" r="10" stroke="#78350f" stroke-width="3" fill="none"/>';
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 250" width="100%" height="100%" preserveAspectRatio="xMidYMid slice">
    <defs>
      <linearGradient id="thelaBgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#292524" />
        <stop offset="100%" stop-color="#1c1917" />
      </linearGradient>
    </defs>
    <rect width="100%" height="100%" fill="url(#thelaBgGrad)" />
    <circle cx="200" cy="95" r="55" fill="#44403c" opacity="0.4" />
    <g transform="translate(150, 45)">
      ${iconSvg}
    </g>
    <text x="200" y="152" text-anchor="middle" fill="#fef3c7" font-family="system-ui, -apple-system, sans-serif" font-size="13" font-weight="900" letter-spacing="0.5">${catLabel.toUpperCase()}</text>
    <rect x="110" y="168" width="180" height="22" rx="11" fill="#44403c" opacity="0.6" />
    <text x="200" y="183" text-anchor="middle" fill="#d6d3d1" font-family="system-ui, -apple-system, sans-serif" font-size="10" font-weight="700">Real Stall Photo Coming Soon</text>
  </svg>`;

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function handleFoodImageError(imgEl, category = 'streetfood', name = '') {
  if (!imgEl) return;
  imgEl.onerror = null; // Prevent recursion
  imgEl.src = getThelaFoodPlaceholder(category, name);
}

// Discovery categories data (Dynamically populated strictly from live backend database; zero mock cards)
const CURATED_DISCOVERY = {
  trending: [],
  popular: [],
  under100: [],
  legends: [],
  latenight: [],
  hiddengems: []
};

function renderDiscoverySections(stalls) {
  const sections = [
    { key: 'trending', sectionId: 'secTrending', trackId: 'secTrendingTrack', defaultBadge: '🔥 Trending' },
    { key: 'popular', sectionId: 'secPopular', trackId: 'secPopularTrack', defaultBadge: '⭐ Popular' },
    { key: 'under100', sectionId: 'secUnder100', trackId: 'secUnder100Track', defaultBadge: '💰 Under ₹100' },
    { key: 'legends', sectionId: 'secLegends', trackId: 'secLegendsTrack', defaultBadge: '👑 Legend' },
    { key: 'latenight', sectionId: 'secLateNight', trackId: 'secLateNightTrack', defaultBadge: '🌙 Late Night' },
    { key: 'hiddengems', sectionId: 'secHiddenGems', trackId: 'secHiddenGemsTrack', defaultBadge: '💎 Gem' }
  ];

  const tr = (k, fb) => (typeof t === 'function' ? t(k, fb) : fb);

  sections.forEach(({ key, sectionId, trackId, defaultBadge }) => {
    const secEl = document.getElementById(sectionId);
    const track = document.getElementById(trackId);
    if (!track) return;

    // Filter matching live stalls from DB
    let matchingStalls = [];
    if (Array.isArray(stalls) && stalls.length > 0) {
      if (key === 'trending') {
        matchingStalls = stalls.filter(s => parseFloat(s.rating) >= 4.6);
      } else if (key === 'popular') {
        matchingStalls = stalls.filter(s => ['chaat', 'vadapav', 'pavbhaji', 'momos', 'rolls', 'south'].includes(s.category));
      } else if (key === 'under100') {
        matchingStalls = stalls.filter(s => (s.priceForTwo && s.priceForTwo <= 100) || (s.items && s.items.some(i => i.price <= 100)));
      } else if (key === 'legends') {
        matchingStalls = stalls.filter(s => Boolean(s.heritageStory));
      } else if (key === 'latenight') {
        matchingStalls = stalls.filter(s => ['rolls', 'chinese', 'chaat', 'pavbhaji'].includes(s.category) || s.isOpen);
      } else if (key === 'hiddengems') {
        matchingStalls = stalls.filter(s => parseFloat(s.rating) >= 4.7);
      }
    }

    if (STATE.vegOnly) {
      matchingStalls = matchingStalls.filter(s => s.isVeg);
    }

    // If no genuine matching live stalls exist, keep the entire section completely hidden
    if (!matchingStalls || matchingStalls.length === 0) {
      if (secEl) secEl.classList.add('hidden');
      track.innerHTML = '';
      return;
    }

    // Reveal section only when authentic live street carts exist
    if (secEl) secEl.classList.remove('hidden');

    // Convert matching live stalls to cards with STRICT DATA INTEGRITY (zero invented metrics)
    const liveCards = matchingStalls.map(s => {
      const hasGenuineRating = Boolean(s.ratingCount && s.ratingCount > 0) || (typeof s.reviewsCount === 'string' && s.reviewsCount.includes('ratings'));
      return {
        id: s.id,
        name: s.name,
        specialty: s.specialty || '',
        rating: hasGenuineRating ? s.rating : null,
        reviewsCount: hasGenuineRating ? (s.reviewsCount || s.ratingCount + ' ratings') : null,
        priceForTwo: (s.priceForTwo && Number(s.priceForTwo) > 0) ? Number(s.priceForTwo) : null,
        distance: s.distance || null,
        distanceKm: s.distanceKm || null,
        lat: s.lat || null,
        lng: s.lng || null,
        prepTime: (typeof s.prepTime === 'number' && s.prepTime > 0) ? s.prepTime : (parseInt(s.prepTime, 10) > 0 ? parseInt(s.prepTime, 10) : null),
        isVeg: Boolean(s.isVeg),
        badgeText: defaultBadge,
        badgeIcon: '',
        badgeColor: 'bg-stone-900/90 text-white',
        category: s.category || '',
        image: s.imageUrl || getThelaFoodPlaceholder(s.category, s.name),
        isRealStall: true,
        isOpen: Boolean(s.isOpen)
      };
    });

    const custCoords = getActiveCustomerCoordinates();

    track.innerHTML = liveCards.slice(0, 10).map(card => {
      const isFav = STATE.favorites.includes(card.id);
      const eta = calculateMarketplaceEta(card, custCoords, STATE.deliveryCapacity);
      const safeName = card.name.replace(/'/g, "\\'");
      const fallbackImg = getThelaFoodPlaceholder(card.category, card.name);

      return `
        <div onclick="handleDiscoveryCardClick('${card.id}', true, '${card.category}', '${safeName}')"
          class="shrink-0 w-64 sm:w-72 bg-white rounded-3xl border border-stone-200/90 overflow-hidden shadow-xs hover:shadow-xl hover:border-amber-300 transition-all duration-300 cursor-pointer group flex flex-col snap-start">
          
          <!-- Food Hero Photo (Dominant visual hero) -->
          <div class="relative h-44 sm:h-48 w-full overflow-hidden bg-stone-100">
            <img src="${card.image || fallbackImg}" alt="${card.name}" class="w-full h-full object-cover group-hover:scale-106 transition-transform duration-500 ease-out" loading="lazy" decoding="async" onerror="handleFoodImageError(this, '${card.category}', '${safeName}')">
            
            <!-- Gradient Overlay -->
            <div class="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent pointer-events-none"></div>

            <!-- Top-Left Badge -->
            <div class="absolute top-2.5 left-2.5 flex items-center space-x-1.5 flex-wrap gap-y-1">
              <span class="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider backdrop-blur shadow-md ${card.badgeColor}">
                ${card.badgeIcon ? card.badgeIcon + ' ' : ''}${card.badgeText}
              </span>
              ${card.isOpen 
                ? `<span class="bg-emerald-600/90 backdrop-blur text-white text-[9px] font-black px-2 py-0.5 rounded-full shadow-md">OPEN</span>`
                : `<span class="bg-stone-900/90 backdrop-blur text-stone-200 text-[9px] font-black px-2 py-0.5 rounded-full shadow-md">CLOSED</span>`
              }
            </div>

            <!-- Top-Right Favorite Heart -->
            <button onclick="event.stopPropagation(); toggleFavoriteStall('${card.id}')"
              class="absolute top-2.5 right-2.5 w-8 h-8 rounded-full bg-white/95 backdrop-blur flex items-center justify-center text-xs shadow-md transition hover:scale-110 active:scale-95 z-10"
              title="${isFav ? 'Remove from favorites' : 'Save as favorite'}">
              <i class="${isFav ? 'fa-solid fa-heart text-red-500' : 'fa-regular fa-heart text-stone-400 hover:text-red-500'}"></i>
            </button>

            <!-- Bottom Overlay Pills (Prominent Dynamic Delivery ETA & Geographic Distance) -->
            <div class="absolute bottom-2.5 left-2.5 right-2.5 flex items-center justify-between pointer-events-none">
              <div class="thela-eta-badge bg-stone-900/90 backdrop-blur px-2.5 py-1 rounded-lg text-[10px] font-black text-white shadow-md flex items-center space-x-1 border border-white/20">
                <i class="fa-solid fa-motorcycle text-amber-400 text-[10px]"></i>
                <span>${eta.pillText}</span>
              </div>

              ${eta.distanceText ? `
                <div class="bg-stone-900/85 backdrop-blur px-2 py-1 rounded-lg text-[10px] font-bold text-stone-200 shadow-sm flex items-center space-x-1">
                  <i class="fa-solid fa-location-dot text-amber-400 text-[9px]"></i>
                  <span>${eta.distanceText}</span>
                </div>
              ` : ''}
            </div>
          </div>

          <!-- Clean Card Body -->
          <div class="p-3.5 flex-1 flex flex-col justify-between space-y-2">
            <div>
              <div class="flex items-start justify-between gap-1.5">
                <h4 class="font-extrabold text-sm text-stone-900 leading-snug group-hover:text-amber-700 transition-colors line-clamp-1">
                  ${card.name}
                </h4>
                <div class="flex items-center space-x-1 shrink-0 mt-0.5">
                  ${card.isVeg ? `
                    <span class="w-3.5 h-3.5 rounded border border-green-600 flex items-center justify-center p-0.5" title="Pure Veg">
                      <span class="w-1.5 h-1.5 rounded-full bg-green-600"></span>
                    </span>
                  ` : `
                    <span class="w-3.5 h-3.5 rounded border border-red-600 flex items-center justify-center p-0.5" title="Non-Veg">
                      <span class="w-1.5 h-1.5 rounded-full bg-red-600"></span>
                    </span>
                  `}
                </div>
              </div>
              ${card.specialty ? `<p class="text-xs text-stone-500 font-medium mt-0.5 line-clamp-1">${card.specialty}</p>` : ''}
            </div>

            <div class="pt-2 border-t border-stone-100 flex items-center justify-between text-xs">
              ${card.rating ? `
                <div class="flex items-center space-x-1">
                  <span class="bg-amber-50 text-amber-900 font-black text-[10px] px-1.5 py-0.5 rounded flex items-center">
                    <i class="fa-solid fa-star text-amber-500 mr-1 text-[9px]"></i>${card.rating}
                  </span>
                  <span class="text-[10px] text-stone-400 font-medium">(${card.reviewsCount})</span>
                </div>
              ` : `
                <span class="bg-emerald-50 text-emerald-800 font-bold text-[10px] px-1.5 py-0.5 rounded flex items-center">
                  <i class="fa-solid fa-seedling mr-1 text-emerald-600 text-[9px]"></i>New
                </span>
              `}
              ${card.priceForTwo ? `
                <span class="text-xs font-bold text-stone-800">₹${card.priceForTwo} ${tr('for_two', 'for two')}</span>
              ` : `
                <span class="text-[10px] font-bold text-stone-400">Street Cart</span>
              `}
            </div>
          </div>
        </div>
      `;
    }).join('');
  });
}

function handleDiscoveryCardClick(cardId, isRealStall, category, name) {
  if (isRealStall && cardId) {
    openStallModal(cardId);
    return;
  }
  // Check if any real stall matches category or name
  const matchingStall = (STATE.stalls || []).find(s => 
    (category && s.category && s.category.toLowerCase().includes(category.toLowerCase())) ||
    (name && s.specialty && s.specialty.toLowerCase().includes(name.toLowerCase()))
  );
  if (matchingStall) {
    openStallModal(matchingStall.id);
    return;
  }
  // Otherwise filter catalog and scroll down smoothly
  if (category) {
    filterCategory(category);
  } else if (name) {
    const input = document.getElementById('searchInput');
    if (input) {
      input.value = name;
      handleSearch();
    }
  }
  scrollToDiscoverySection('secAllStalls');
  showToast(`🔍 Exploring street thelas for "${name}"`);
}

async function loadStalls() {
  try {
    const params = new URLSearchParams();
    if (STATE.selectedCategory !== 'all' && STATE.selectedCategory !== 'favorites') {
      params.append('category', STATE.selectedCategory);
    }
    if (STATE.vegOnly) params.append('vegOnly', 'true');
    const searchVal = document.getElementById('searchInput')?.value;
    if (searchVal && searchVal.trim()) params.append('search', searchVal.trim());

    const custCoords = getActiveCustomerCoordinates();
    if (custCoords && typeof custCoords.lat === 'number' && typeof custCoords.lng === 'number') {
      params.append('lat', custCoords.lat);
      params.append('lng', custCoords.lng);
    }

    const res = await fetch(`/api/stalls?${params.toString()}`);
    const data = await res.json();
    let stalls = data.stalls || [];
    if (data.capacity) {
      STATE.deliveryCapacity = data.capacity;
    }
    if (STATE.selectedCategory === 'favorites') {
      stalls = stalls.filter(s => STATE.favorites.includes(s.id));
    }
    STATE.stalls = stalls;
    renderDiscoverySections(STATE.stalls);
    renderStalls(STATE.stalls);
    updateVendorStallDropdown();
  } catch (err) {
    console.error('Failed to fetch stalls:', err);
  }
}

function renderStalls(stalls) {
  const container = document.getElementById('stallsGrid');
  const countEl = document.getElementById('stallsCount');
  const tr = (k, fb) => (typeof t === 'function' ? t(k, fb) : fb);

  if (countEl) {
    countEl.innerText = stalls.length > 0 ? `${stalls.length} verified carts` : '0 active stalls';
  }

  if (stalls.length === 0) {
    if (STATE.selectedCategory === 'favorites') {
      container.innerHTML = `
        <div class="col-span-full py-12 text-center text-stone-500 bg-white rounded-3xl border border-stone-200 p-6">
          <i class="fa-regular fa-heart text-3xl text-stone-300 mb-2"></i>
          <p class="font-bold text-sm text-stone-800">${tr('no_favorites_title', 'No favorite stalls saved yet')}</p>
          <p class="text-xs text-stone-400 mt-1">${tr('no_favorites_desc', 'Tap the heart icon on any stall to add it here')}</p>
        </div>
      `;
    } else {
      container.innerHTML = `
        <div class="col-span-full py-12 text-center bg-white dark:bg-zinc-900 rounded-3xl border-2 border-dashed border-stone-200 dark:border-zinc-800 p-6 space-y-3">
          <div class="w-14 h-14 mx-auto rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 flex items-center justify-center text-2xl shadow-xs">
            <i class="fa-solid fa-utensils"></i>
          </div>
          <div>
            <h3 class="font-black text-base text-stone-900 dark:text-stone-100">${tr('customer_no_stalls_title', 'No Street Stalls Live Right Now')}</h3>
            <p class="text-xs text-stone-500 dark:text-stone-400 mt-1 max-w-md mx-auto">
              ${tr('customer_no_stalls_desc', 'Local street food stalls and carts in your neighborhood are currently prepping fresh ingredients or resting. Please check back shortly!')}
            </p>
          </div>
        </div>
      `;
    }
    return;
  }

  const custCoords = getActiveCustomerCoordinates();

  container.innerHTML = stalls.map(stall => {
    const isFav = STATE.favorites.includes(stall.id);
    const eta = calculateMarketplaceEta(stall, custCoords, STATE.deliveryCapacity);
    const distText = eta.distanceText ? `${eta.distanceText} away` : null;
    const priceTwo = (stall.priceForTwo && Number(stall.priceForTwo) > 0) ? `₹${stall.priceForTwo}` : null;
    const safeName = stall.name.replace(/'/g, "\\'");
    const stallImg = stall.imageUrl || getThelaFoodPlaceholder(stall.category, stall.name);

    // Primary trust badge: Strictly based on real backend data
    const badges = stall.trustBadges || [];
    const fssaiBadge = badges.find(b => b.type === 'fssai') || (stall.fssai_status === 'verified' ? { label: 'FSSAI Verified' } : null);
    const hygieneBadge = badges.find(b => b.type === 'hygiene') || ((stall.hygiene_status === 'verified' || stall.hygiene_status === 'certified') ? { label: 'Hygiene Audited' } : null);

    let badgeHtml = `
      <span class="inline-flex items-center space-x-1 text-stone-600 bg-stone-100 border border-stone-200 px-2 py-0.5 rounded-md text-[10px] font-bold" onclick="event.stopPropagation(); openTrustModal('${stall.id}');">
        <i class="fa-solid fa-clock-rotate-left text-stone-400"></i>
        <span>${tr('badge_audits_in_progress', 'Audits in Progress')}</span>
      </span>
    `;
    if (fssaiBadge) {
      badgeHtml = `
        <span class="inline-flex items-center space-x-1 text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md text-[10px] font-bold shadow-xs hover:scale-105 transition" onclick="event.stopPropagation(); openTrustModal('${stall.id}');" title="Click to view verified FSSAI credentials">
          <i class="fa-solid fa-shield-check text-emerald-600"></i>
          <span>${fssaiBadge.label || tr('badge_fssai_verified', 'FSSAI Verified')}</span>
        </span>
      `;
    } else if (hygieneBadge) {
      badgeHtml = `
        <span class="inline-flex items-center space-x-1 text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md text-[10px] font-bold shadow-xs hover:scale-105 transition" onclick="event.stopPropagation(); openTrustModal('${stall.id}');" title="Click to view hygiene inspection report">
          <i class="fa-solid fa-wand-magic-sparkles text-amber-600"></i>
          <span>${hygieneBadge.label || tr('badge_hygiene_verified', 'Thela Hygiene Audited')}</span>
        </span>
      `;
    }

    // Rating & Review Count: Strictly genuine data only
    const hasGenuineRating = Boolean(stall.ratingCount && stall.ratingCount > 0) || (typeof stall.reviewsCount === 'string' && stall.reviewsCount.includes('ratings'));
    
    // Genuine Orders Delivered: Strictly data-backed (omitted if 0)
    const realOrders = typeof stall.ordersCount === 'number' && stall.ordersCount > 0 ? stall.ordersCount : 0;

    // "Known For" / Signature dishes preview strip (Top 2-3 items from stall.items, cleanly omitted if none)
    const knownItems = Array.isArray(stall.items) 
      ? (stall.items.filter(i => i.bestseller || i.isSpecial || i.isPopular).slice(0, 3).length > 0
          ? stall.items.filter(i => i.bestseller || i.isSpecial || i.isPopular).slice(0, 3)
          : stall.items.slice(0, 2))
      : [];

    return `
      <div onclick="openStallModal('${stall.id}')" 
        class="food-hero-card bg-white rounded-3xl border border-stone-200/90 overflow-hidden shadow-xs hover:shadow-xl hover:border-amber-300 transition-all duration-300 cursor-pointer flex flex-col group relative">
        
        <!-- Large Food Hero Image (16:10 aspect ratio, dominant hero photo) -->
        <div class="relative h-50 sm:h-54 w-full overflow-hidden bg-stone-100">
          <img src="${stallImg}" alt="${stall.name}" class="w-full h-full object-cover group-hover:scale-106 transition-transform duration-500 ease-out" loading="lazy" decoding="async" onerror="handleFoodImageError(this, '${stall.category || ''}', '${safeName}')">
          
          <!-- Gradient Top Scrim -->
          <div class="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-black/25 pointer-events-none"></div>

          <!-- Top-Left: Open / Closed Badge & Prominent Dynamic Delivery ETA -->
          <div class="absolute top-3 left-3 flex items-center space-x-1.5 flex-wrap gap-y-1">
            ${stall.isOpen 
              ? `<span class="bg-emerald-600/95 backdrop-blur text-white text-[10px] font-black px-2.5 py-1 rounded-full flex items-center shadow-md">
                  <span class="w-1.5 h-1.5 rounded-full bg-white mr-1.5 animate-pulse"></span>OPEN
                </span>`
              : `<span class="bg-stone-900/90 backdrop-blur text-stone-200 text-[10px] font-black px-2.5 py-1 rounded-full shadow-md">CLOSED</span>`
            }
            <span class="thela-eta-badge bg-stone-900/90 backdrop-blur text-white text-[10px] font-black px-2.5 py-1 rounded-full shadow-md flex items-center space-x-1 border border-white/20">
              <i class="fa-solid fa-motorcycle text-amber-400 text-[10px]"></i>
              <span>${eta.pillText}</span>
            </span>
          </div>

          <!-- Top-Right: Favorite Heart Button -->
          <button onclick="event.stopPropagation(); toggleFavoriteStall('${stall.id}')" 
            class="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/95 backdrop-blur flex items-center justify-center text-xs shadow-md transition hover:scale-110 active:scale-95 z-10"
            title="${isFav ? 'Remove from favorites' : 'Save as favorite'}">
            <i class="${isFav ? 'fa-solid fa-heart text-red-500' : 'fa-regular fa-heart text-stone-400 hover:text-red-500'}"></i>
          </button>

          <!-- Bottom Overlays: Distance & Discount (Data-Gated: Omitted if unavailable) -->
          <div class="absolute bottom-3 left-3 right-3 flex items-center justify-between pointer-events-none">
            ${stall.discount ? `
              <span class="bg-amber-600 text-white text-[10px] font-black px-2.5 py-0.5 rounded-md shadow-md">
                ${stall.discount}
              </span>
            ` : '<span></span>'}
            ${distText ? `
              <span class="bg-stone-900/80 backdrop-blur text-white text-[10px] font-bold px-2 py-0.5 rounded-md shadow-md flex items-center space-x-1">
                <i class="fa-solid fa-location-dot text-amber-400 text-[9px]"></i>
                <span>${distText}</span>
              </span>
            ` : ''}
          </div>
        </div>

        <!-- Streamlined Food-First Card Body -->
        <div class="p-4 flex-1 flex flex-col justify-between space-y-2.5">
          <div class="space-y-1.5">
            <div class="flex items-start justify-between gap-2">
              <h3 class="font-black text-base text-stone-900 leading-snug group-hover:text-amber-700 transition-colors line-clamp-1">
                ${stall.name}
              </h3>
              <div class="flex items-center space-x-1 shrink-0 mt-0.5">
                ${stall.isVeg ? `
                  <span class="w-3.5 h-3.5 rounded border border-green-600 flex items-center justify-center p-0.5" title="Pure Veg Stall">
                    <span class="w-1.5 h-1.5 rounded-full bg-green-600"></span>
                  </span>
                ` : `
                  <span class="w-3.5 h-3.5 rounded border border-red-600 flex items-center justify-center p-0.5" title="Non-Veg Available">
                    <span class="w-1.5 h-1.5 rounded-full bg-red-600"></span>
                  </span>
                `}
              </div>
            </div>
            
            <div class="flex items-center justify-between text-xs text-stone-500 font-medium">
              <p class="line-clamp-1 flex-1 mr-2">${stall.specialty || 'Authentic Street Food'}</p>
              ${priceTwo ? `<span class="font-bold text-stone-800 shrink-0">${priceTwo} ${tr('for_two', 'for two')}</span>` : ''}
            </div>

            <!-- "Known For" Signature Dish Preview Strip (Strictly omitted if no items) -->
            ${knownItems.length > 0 ? `
              <div class="pt-2 border-t border-stone-100 flex flex-wrap gap-1.5 items-center">
                <span class="text-[10px] font-bold text-stone-400 uppercase tracking-wider shrink-0 flex items-center">
                  <i class="fa-solid fa-fire text-amber-500 mr-1 text-[9px]"></i>Known For:
                </span>
                ${knownItems.map(item => `
                  <span class="inline-flex items-center space-x-1 text-[10px] font-extrabold bg-amber-50/90 text-amber-900 border border-amber-200/70 px-2 py-0.5 rounded-lg truncate max-w-[125px]" title="${item.name}">
                    <span>${item.name}</span>
                    ${item.price ? `<span class="text-amber-700 font-black">₹${item.price}</span>` : ''}
                  </span>
                `).join('')}
              </div>
            ` : ''}
          </div>

          <!-- Bottom Row: Star Rating / New Stall, Genuine Orders & Trust Badge -->
          <div class="pt-2.5 border-t border-stone-100 flex items-center justify-between text-xs gap-2 flex-wrap">
            <div class="flex items-center space-x-1.5">
              ${hasGenuineRating ? `
                <span class="bg-amber-50 border border-amber-200 text-amber-900 font-black text-[11px] px-2 py-0.5 rounded-lg flex items-center">
                  <i class="fa-solid fa-star text-amber-500 mr-1 text-[10px]"></i>${stall.rating}
                </span>
                <span class="text-[11px] text-stone-400 font-medium">(${stall.reviewsCount || stall.ratingCount + ' ratings'})</span>
              ` : `
                <span class="bg-emerald-50 border border-emerald-200 text-emerald-800 font-bold text-[10px] px-2 py-0.5 rounded-md flex items-center">
                  <i class="fa-solid fa-seedling mr-1 text-emerald-600 text-[9px]"></i>⭐ New (Verified Stall)
                </span>
              `}
              ${realOrders > 0 ? `
                <span class="text-[10px] font-extrabold text-stone-600 bg-stone-100 px-2 py-0.5 rounded-md flex items-center">
                  <i class="fa-solid fa-bag-shopping text-stone-400 mr-1 text-[9px]"></i>${realOrders}+ orders
                </span>
              ` : ''}
            </div>
            
            <div class="shrink-0">
              ${badgeHtml}
            </div>
          </div>
        </div>
      </div>
    `;
  }).join('');
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

function toggleVegFilter() {
  STATE.vegOnly = !STATE.vegOnly;
  const btn = document.getElementById('vegFilterBtn');
  if (btn) {
    btn.classList.toggle('border-emerald-600', STATE.vegOnly);
    btn.classList.toggle('bg-emerald-50', STATE.vegOnly);
    btn.classList.toggle('text-emerald-800', STATE.vegOnly);
  }
  loadStalls();
}

async function loadCategories() {
  try {
    const res = await fetch('/api/stalls/categories');
    const data = await res.json();
    STATE.categories = data.categories || [];
    appendVendorCategories(STATE.categories);
  } catch (e) {
    console.warn('Failed to load categories:', e);
  }
}

function appendVendorCategories(categories) {
  const container = document.getElementById('categoriesPillsContainer');
  if (!container || !categories) return;
  
  const existingCats = new Set(['all', 'favorites', 'chaat', 'vadapav', 'pavbhaji', 'momos', 'south', 'rolls']);
  
  categories.forEach(cat => {
    if (!existingCats.has(cat.id.toLowerCase())) {
      existingCats.add(cat.id.toLowerCase());
      const btn = document.createElement('button');
      btn.onclick = () => filterCategory(cat.id);
      btn.className = 'cat-pill px-4 py-2 rounded-xl bg-white border border-stone-200 text-stone-700 font-bold whitespace-nowrap hover:bg-amber-50 transition shadow-xs flex items-center space-x-1.5';
      btn.innerHTML = `<span>${cat.icon || '🍲'}</span><span>${cat.name}</span>`;
      container.appendChild(btn);
    }
  });
}

function filterCategory(cat) {
  STATE.selectedCategory = cat;

  document.querySelectorAll('.cat-pill').forEach(btn => {
    const onclickAttr = btn.getAttribute('onclick') || '';
    if (onclickAttr.includes(`filterCategory('${cat}')`) || onclickAttr.includes(`filterCategory("${cat}")`)) {
      btn.className = 'cat-pill active px-4 py-2 rounded-xl bg-stone-900 text-white font-bold whitespace-nowrap shadow-xs transition flex items-center space-x-1.5';
    } else {
      btn.className = 'cat-pill px-4 py-2 rounded-xl bg-white border border-stone-200 text-stone-700 font-bold whitespace-nowrap hover:bg-amber-50 transition shadow-xs flex items-center space-x-1.5';
    }
  });

  loadStalls();
}

// ==========================================================
// 6. STALL MENU MODAL & INDIVIDUAL VENDOR EXPERIENCE (IMPROVEMENT #3)
// ==========================================================
async function openStallModal(stallId) {
  try {
    const res = await fetch(`/api/stalls/${stallId}`);
    const data = await res.json();
    if (!data || !data.stall) {
      showToast('Could not load vendor information');
      return;
    }
    STATE.currentStall = data.stall;
    STATE.currentMenu = data.items || [];

    // 1. Hero Media (Video or Image)
    const imgEl = document.getElementById('modalStallImage');
    const vidEl = document.getElementById('modalStallVideo');
    if (data.stall.videoUrl && vidEl) {
      vidEl.src = data.stall.videoUrl;
      vidEl.classList.remove('hidden');
      if (imgEl) imgEl.classList.add('hidden');
      vidEl.play().catch(() => {});
    } else {
      if (vidEl) {
        vidEl.pause();
        vidEl.classList.add('hidden');
      }
      if (imgEl) {
        imgEl.onerror = () => { imgEl.src = getThelaFoodPlaceholder(data.stall.category, data.stall.name); };
        imgEl.src = data.stall.imageUrl || getThelaFoodPlaceholder(data.stall.category, data.stall.name);
        imgEl.classList.remove('hidden');
      }
    }

    // 2. Live Status Badge (OPEN / CLOSED)
    const badgeTextEl = document.getElementById('modalStallBadgeText');
    const badgeEl = document.getElementById('modalStallBadge');
    if (badgeTextEl && badgeEl) {
      if (data.stall.isOpen) {
        badgeTextEl.innerText = (typeof t === 'function' ? t('stall_status_open', 'OPEN NOW') : 'OPEN NOW');
        badgeEl.className = 'bg-emerald-600/95 backdrop-blur-md text-white text-[11px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider shadow-sm flex items-center space-x-1.5';
      } else {
        badgeTextEl.innerText = (typeof t === 'function' ? t('stall_status_closed', 'CLOSED') : 'CLOSED');
        badgeEl.className = 'bg-stone-700/95 backdrop-blur-md text-stone-200 text-[11px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider shadow-sm flex items-center space-x-1.5';
      }
    }

    // 3. Favorite heart status
    updateModalFavoriteIcon(data.stall.id);

    // 4. Hero Titles & Overlays
    const nameEl = document.getElementById('modalStallName');
    if (nameEl) nameEl.innerText = data.stall.name;

    const specialtyEl = document.getElementById('modalStallSpecialty');
    if (specialtyEl) specialtyEl.innerText = data.stall.specialty || '';

    const catPillEl = document.getElementById('modalCategoryPill');
    if (catPillEl) catPillEl.innerText = (data.stall.category || 'Street Food').toUpperCase();

    const vegPillEl = document.getElementById('modalVegPill');
    if (vegPillEl) {
      if (data.stall.isVeg) {
        vegPillEl.classList.remove('hidden');
      } else {
        vegPillEl.classList.add('hidden');
      }
    }

    // 5. Vitals: Genuine Rating & Reviews (Zero fake claims)
    const ratingBlock = document.getElementById('modalRatingBlock');
    const ratingScore = document.getElementById('modalRatingScore');
    const reviewsCount = document.getElementById('modalReviewsCount');
    const hasGenuineRating = data.stall.ratingCount > 0 || (typeof data.stall.reviewsCount === 'string' && data.stall.reviewsCount.includes('ratings'));
    if (ratingBlock && ratingScore && reviewsCount) {
      if (hasGenuineRating) {
        ratingScore.innerText = data.stall.rating;
        reviewsCount.innerText = `(${data.stall.reviewsCount || data.stall.ratingCount + ' ratings'})`;
      } else {
        ratingScore.innerText = 'New';
        reviewsCount.innerText = '(Verified Stall)';
      }
    }

    // 6. Vitals: Genuine Order Count (Zero fake orders)
    const ordersBlock = document.getElementById('modalOrdersBlock');
    const ordersCountEl = document.getElementById('modalOrdersCount');
    if (ordersBlock && ordersCountEl) {
      const genuineOrders = typeof data.stall.ordersCount === 'number' ? data.stall.ordersCount : 0;
      if (genuineOrders > 0) {
        ordersCountEl.innerText = `${genuineOrders}+ orders delivered`;
        ordersBlock.classList.remove('hidden');
      } else {
        ordersBlock.classList.add('hidden');
      }
    }

    // 7. Distance & Dynamic Delivery Time (Strict Data-Gating & Consistent Engine)
    const custCoords = getActiveCustomerCoordinates();
    const eta = calculateMarketplaceEta(data.stall, custCoords, STATE.deliveryCapacity);

    const distBlock = document.getElementById('modalDistBlock');
    const distEl = document.getElementById('modalStallDistance');
    if (distEl && distBlock) {
      if (eta.distanceText) {
        distEl.innerText = `${eta.distanceText} away`;
        distBlock.classList.remove('hidden');
      } else {
        distBlock.classList.add('hidden');
      }
    }

    const etaBlock = document.getElementById('modalEtaBlock');
    const etaEl = document.getElementById('modalStallEta');
    if (etaEl && etaBlock) {
      etaEl.innerText = eta.pillText;
      etaBlock.classList.remove('hidden');
    }

    const addrEl = document.getElementById('modalStallAddress');
    if (addrEl) addrEl.innerText = data.stall.address || 'Street Vendor Cart';

    const priceEl = document.getElementById('modalStallPriceForTwo');
    if (priceEl) {
      if (data.stall.priceForTwo && Number(data.stall.priceForTwo) > 0) {
        priceEl.innerText = `₹${data.stall.priceForTwo} for two`;
        priceEl.classList.remove('hidden');
      } else {
        priceEl.classList.add('hidden');
      }
    }

    // 8. "Famous For" Section (Top 2-3 signature dishes)
    renderFamousForDishes(data.items || []);

    // 9. "Local Story" Section (Strictly genuine verified history only)
    const storySection = document.getElementById('modalLocalStorySection');
    const storyText = document.getElementById('modalLocalStoryText');
    if (storySection && storyText) {
      const story = (data.stall.heritageStory || '').trim();
      if (story && !story.toLowerCase().includes('demo') && story.length > 5) {
        storyText.innerText = `“${story}”`;
        storySection.classList.remove('hidden');
      } else {
        storySection.classList.add('hidden');
      }
    }

    // 10. Compact "Trust & Verification" Checks
    renderCompactTrustChecks(data.stall);

    // 11. "See It From The Street" Photo Gallery (Only if genuine photos exist)
    const streetSec = document.getElementById('modalStreetPhotosSection');
    const streetGallery = document.getElementById('modalStreetPhotosGallery');
    const photos = data.stall.streetPhotos || data.stall.photos || [];
    if (streetSec && streetGallery) {
      if (Array.isArray(photos) && photos.length > 0) {
        streetGallery.innerHTML = photos.map((url, i) => `
          <div class="shrink-0 w-32 h-24 sm:w-40 sm:h-28 rounded-2xl overflow-hidden bg-stone-800 shadow-sm border border-stone-200 cursor-pointer transition hover:scale-105" onclick="openPhotoViewer('${url}')">
            <img src="${url}" alt="Street Cart Photo ${i+1}" class="w-full h-full object-cover">
          </div>
        `).join('');
        streetSec.classList.remove('hidden');
      } else {
        streetSec.classList.add('hidden');
      }
    }

    // 12. Render Categorized Menu & Sticky Navigation Tabs
    renderCategoryTabsAndMenuItems(data.items || []);

    // 13. Update Sticky Cart Bar
    updateCartFloatingBar();

    // Show modal & prevent background scroll
    const modalEl = document.getElementById('stallModal');
    if (modalEl) modalEl.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    AtmosphereManager.pushOverride('stallModal', 'low');

  } catch (e) {
    console.error('Failed to open stall modal:', e);
    showToast('Failed to load stall menu');
  }
}

function closeStallModal() {
  const modal = document.getElementById('stallModal');
  if (modal) modal.classList.add('hidden');
  document.body.style.overflow = '';
  const vidEl = document.getElementById('modalStallVideo');
  if (vidEl) vidEl.pause();
  AtmosphereManager.popOverride('stallModal');
}

function toggleStallFavoriteFromModal() {
  if (!STATE.currentStall) return;
  toggleFavorite(STATE.currentStall.id);
  updateModalFavoriteIcon(STATE.currentStall.id);
}

function updateModalFavoriteIcon(stallId) {
  const icon = document.getElementById('modalFavIcon');
  if (!icon) return;
  const isFav = (STATE.favorites || []).includes(stallId);
  if (isFav) {
    icon.className = 'fa-solid fa-heart text-sm text-rose-500';
  } else {
    icon.className = 'fa-regular fa-heart text-sm text-white';
  }
}

function shareStallFromModal() {
  if (!STATE.currentStall) return;
  const shareData = {
    title: `${STATE.currentStall.name} on ThelaExpress`,
    text: `Order fresh & piping hot street bites from ${STATE.currentStall.name}!`,
    url: window.location.origin + window.location.pathname + `?stall=${STATE.currentStall.id}`
  };
  if (navigator.share) {
    navigator.share(shareData).catch(() => {});
  } else if (navigator.clipboard) {
    navigator.clipboard.writeText(shareData.url).then(() => {
      showToast('Stall link copied to clipboard!');
    }).catch(() => {
      showToast(`Exploring ${STATE.currentStall.name}`);
    });
  } else {
    showToast(`Exploring ${STATE.currentStall.name}`);
  }
}

function openPhotoViewer(url) {
  window.open(url, '_blank');
}

function renderCompactTrustChecks(stall) {
  const container = document.getElementById('modalTrustChecksList');
  if (!container) return;

  const checks = [];
  if (stall.fssai_status === 'verified') {
    checks.push({
      label: 'FSSAI Food Safety Verified',
      icon: 'fa-shield-check',
      bg: 'bg-emerald-50 text-emerald-800 border-emerald-200'
    });
  }
  if (stall.hygiene_status === 'verified' || stall.hygiene_status === 'certified') {
    checks.push({
      label: `Hygiene Score ${stall.hygiene_score || 95}/100 Audited`,
      icon: 'fa-wand-magic-sparkles',
      bg: 'bg-amber-50 text-amber-900 border-amber-200'
    });
  }
  if (stall.identity_status === 'verified' || stall.is_verified) {
    checks.push({
      label: 'Vendor KYC & ID Verified',
      icon: 'fa-circle-check',
      bg: 'bg-blue-50 text-blue-900 border-blue-200'
    });
  }
  if (stall.address && stall.lat && stall.lng) {
    checks.push({
      label: 'Stall GPS Geo-Tagged',
      icon: 'fa-location-dot',
      bg: 'bg-teal-50 text-teal-900 border-teal-200'
    });
  }

  if (checks.length === 0) {
    checks.push({
      label: 'Audits Underway • Onboarding in Progress',
      icon: 'fa-clock-rotate-left',
      bg: 'bg-stone-50 text-stone-700 border-stone-200'
    });
  }

  container.innerHTML = checks.map(c => `
    <div class="inline-flex items-center space-x-1.5 font-extrabold px-2.5 py-1 rounded-xl border text-[11px] shadow-2xs ${c.bg}">
      <i class="fa-solid ${c.icon}"></i>
      <span>${c.label}</span>
    </div>
  `).join('');
}

function renderFamousForDishes(items) {
  const sec = document.getElementById('modalFamousForSection');
  const container = document.getElementById('modalFamousForContainer');
  if (!sec || !container) return;

  if (!items || items.length === 0) {
    sec.classList.add('hidden');
    return;
  }

  let signature = items.filter(i => i.bestseller || i.isSpecial || i.isPopular);
  if (signature.length === 0) {
    signature = items.slice(0, 2);
  } else if (signature.length > 3) {
    signature = signature.slice(0, 3);
  }

  sec.classList.remove('hidden');
  container.innerHTML = signature.map(item => {
    const inCart = STATE.cart.items.find(i => i.item_id === item.id);
    const qty = inCart ? inCart.qty : 0;
    const safeName = item.name.replace(/'/g, "\\'");
    const itemImg = item.image || getThelaFoodPlaceholder('chaat', item.name);

    return `
      <div class="bg-white p-2.5 rounded-2xl border ${item.isSpecial ? 'border-amber-300 bg-amber-50/20' : 'border-stone-200/80'} shadow-2xs flex items-center justify-between gap-2.5 hover:border-amber-400 transition">
        <div class="flex items-center space-x-2.5 min-w-0">
          <div class="relative w-16 h-16 sm:w-18 sm:h-18 rounded-xl overflow-hidden bg-stone-100 shrink-0">
            <img src="${itemImg}" 
              alt="${item.name}" class="w-full h-full object-cover" loading="lazy" decoding="async" onerror="handleFoodImageError(this, 'chaat', '${safeName}')">
            ${item.isSpecial ? `<span class="absolute top-1 left-1 bg-amber-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded shadow-xs">👑 SIGNATURE</span>` : ''}
          </div>
          <div class="min-w-0">
            <div class="flex items-center space-x-1">
              ${item.isVeg ? `
                <span class="w-3 h-3 rounded border border-green-600 flex items-center justify-center p-0.5 shrink-0" title="Pure Veg">
                  <span class="w-1 h-1 rounded-full bg-green-600"></span>
                </span>
              ` : `
                <span class="w-3 h-3 rounded border border-red-600 flex items-center justify-center p-0.5 shrink-0" title="Non-Veg">
                  <span class="w-1 h-1 rounded-full bg-red-600"></span>
                </span>
              `}
              <span class="font-extrabold text-xs text-stone-900 truncate">${item.name}</span>
            </div>
            <div class="flex items-center space-x-1.5 mt-0.5">
              <span class="text-xs font-black text-amber-700">₹${item.price}</span>
              ${item.originalPrice ? `<span class="text-[10px] text-stone-400 line-through">₹${item.originalPrice}</span>` : ''}
            </div>
          </div>
        </div>

        <!-- Add Button / Stepper -->
        <div class="shrink-0 w-16">
          ${!item.inStock ? `
            <span class="text-[9px] font-black text-stone-400 block text-center">SOLD OUT</span>
          ` : qty === 0 ? `
            <button onclick="handleAddItemClick('${item.id}')" class="w-full bg-amber-500 hover:bg-amber-600 text-white rounded-lg py-1.5 font-black text-xs shadow-xs active:scale-95 transition">
              + ADD
            </button>
          ` : `
            <div class="w-full bg-amber-600 text-white rounded-lg py-1 px-1 flex items-center justify-between font-black text-xs shadow-xs">
              <button onclick="decrementCartItem('${item.id}')" class="w-4 text-center hover:bg-amber-700 rounded">-</button>
              <span>${qty}</span>
              <button onclick="incrementCartItem('${item.id}')" class="w-4 text-center hover:bg-amber-700 rounded">+</button>
            </div>
          `}
        </div>
      </div>
    `;
  }).join('');
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
    AtmosphereManager.pushOverride('trustModal', 'minimal');
  } catch (err) {
    console.error('Failed to open trust modal:', err);
    showToast('Failed to open trust details');
  }
}

function closeTrustModal() {
  const modal = document.getElementById('trustModal');
  if (modal) modal.classList.add('hidden');
  AtmosphereManager.popOverride('trustModal');
}

function renderCategoryTabsAndMenuItems(items) {
  const tabsContainer = document.getElementById('modalCategoryTabs');
  const itemsContainer = document.getElementById('modalMenuItems');
  if (!itemsContainer) return;

  if (!items || items.length === 0) {
    if (tabsContainer) tabsContainer.innerHTML = '';
    itemsContainer.innerHTML = `
      <div class="p-8 text-center space-y-2">
        <i class="fa-solid fa-utensils text-3xl text-stone-300"></i>
        <h4 class="font-black text-sm text-stone-700">No dishes listed yet</h4>
        <p class="text-xs text-stone-400">This authentic vendor is preparing their fresh menu items.</p>
      </div>
    `;
    return;
  }

  // 1. Group items into categories with Popular first
  const categoriesMap = new Map();
  const popularItems = items.filter(i => i.bestseller || i.isPopular || i.isSpecial);
  if (popularItems.length > 0) {
    categoriesMap.set('popular', {
      id: 'popular',
      name: (typeof t === 'function' ? t('menu_category_popular', '⭐ Popular Signatures') : '⭐ Popular Signatures'),
      items: popularItems
    });
  }

  // Group remaining items
  items.forEach(item => {
    let catKey = 'dishes';
    let catName = 'Street Bites';

    if (item.category && item.category.trim()) {
      catKey = item.category.toLowerCase().replace(/[^a-z0-9]/g, '');
      catName = item.category.trim();
    } else {
      const name = item.name.toLowerCase();
      if (name.includes('momo') || name.includes('dimsum')) {
        catKey = 'momos';
        catName = 'Momos & Dimsums';
      } else if (name.includes('roll') || name.includes('frankie')) {
        catKey = 'rolls';
        catName = 'Kathi Rolls & Frankies';
      } else if (name.includes('chaat') || name.includes('puri') || name.includes('bhel') || name.includes('tikki')) {
        catKey = 'chaat';
        catName = 'Chaat & Pani Puri';
      } else if (name.includes('dosa') || name.includes('idli') || name.includes('vada')) {
        catKey = 'south';
        catName = 'Dosa & South Indian';
      } else if (name.includes('pav') || name.includes('bhaji') || name.includes('misal')) {
        catKey = 'pav';
        catName = 'Pav Bhaji & Tawa';
      } else if (name.includes('chai') || name.includes('lassi') || name.includes('juice') || name.includes('shake') || name.includes('drink')) {
        catKey = 'drinks';
        catName = 'Drinks & Beverages';
      } else if (name.includes('combo') || name.includes('thali') || name.includes('platter')) {
        catKey = 'combos';
        catName = 'Combos & Feasts';
      } else if (name.includes('jalebi') || name.includes('sweet') || name.includes('halwa') || name.includes('gulab')) {
        catKey = 'sweets';
        catName = 'Mithai & Sweets';
      }
    }

    if (!categoriesMap.has(catKey)) {
      categoriesMap.set(catKey, { id: catKey, name: catName, items: [] });
    }
    categoriesMap.get(catKey).items.push(item);
  });

  const categories = Array.from(categoriesMap.values());

  // 2. Render Sticky Category Navigation Tabs
  if (tabsContainer) {
    tabsContainer.innerHTML = categories.map((cat, idx) => `
      <button onclick="scrollToMenuCategory('${cat.id}')" 
        class="menu-cat-tab-btn px-3 py-1.5 rounded-full text-xs font-black whitespace-nowrap transition border ${idx === 0 ? 'bg-amber-600 text-white border-amber-600 shadow-xs' : 'bg-stone-100 text-stone-700 border-stone-200 hover:bg-stone-200'}">
        ${cat.name} (${cat.items.length})
      </button>
    `).join('');
  }

  // 3. Render Categorized Sections and Food Cards with 3-tier visual hierarchy
  itemsContainer.innerHTML = categories.map(cat => `
    <div id="cat_section_${cat.id}" class="menu-cat-section space-y-3 pt-2 first:pt-0">
      <div class="flex items-center justify-between border-b border-stone-100 pb-2">
        <h3 class="font-black text-stone-900 text-sm tracking-tight flex items-center space-x-2">
          <span>${cat.name}</span>
        </h3>
        <span class="text-[10px] font-bold text-stone-400 bg-stone-100 px-2.5 py-0.5 rounded-full">${cat.items.length} items</span>
      </div>
      
      <div class="space-y-4 divide-y divide-stone-100">
        ${cat.items.map(item => {
          const inCart = STATE.cart.items.find(i => i.item_id === item.id);
          const qty = inCart ? inCart.qty : 0;
          const hasRating = item.ratingCount > 0 || (item.reviews > 0 && item.rating);
          const safeName = item.name.replace(/'/g, "\\'");
          const itemImg = item.image || getThelaFoodPlaceholder(cat.id, item.name);
          
          // 3-Tier Hierarchy styling
          let cardStyle = 'hover:bg-stone-50/50 p-2.5 rounded-2xl transition border border-transparent';
          if (item.isSpecial) {
            cardStyle = 'bg-gradient-to-r from-amber-50/60 via-amber-50/20 to-white border-2 border-amber-300/80 p-3 rounded-2xl shadow-xs transition';
          } else if (item.bestseller) {
            cardStyle = 'bg-stone-50/30 hover:bg-stone-50 p-2.5 rounded-2xl border border-amber-100 transition';
          }

          return `
            <div class="pt-3.5 first:pt-0 flex items-start justify-between gap-3 sm:gap-4 ${cardStyle}">
              <!-- Item Details -->
              <div class="flex-1 space-y-1 min-w-0">
                <div class="flex items-center space-x-1.5 flex-wrap gap-y-1">
                  ${item.isVeg ? `
                    <span class="w-3.5 h-3.5 rounded border-2 border-green-600 flex items-center justify-center p-0.5 shrink-0" title="Pure Veg">
                      <span class="w-1.5 h-1.5 rounded-full bg-green-600"></span>
                    </span>
                  ` : `
                    <span class="w-3.5 h-3.5 rounded border-2 border-red-600 flex items-center justify-center p-0.5 shrink-0" title="Non-Veg">
                      <span class="w-1.5 h-1.5 rounded-full bg-red-600"></span>
                    </span>
                  `}
                  ${item.isSpecial ? `
                    <span class="text-[9px] font-black bg-amber-500 text-white px-2 py-0.5 rounded shadow-xs flex items-center">
                      <i class="fa-solid fa-crown mr-1 text-[8px]"></i>SIGNATURE
                    </span>
                  ` : item.bestseller ? `
                    <span class="text-[9px] font-black bg-amber-100 text-amber-800 border border-amber-200/80 px-1.5 py-0.5 rounded flex items-center">
                      <i class="fa-solid fa-star text-amber-600 mr-1 text-[8px]"></i>BESTSELLER
                    </span>
                  ` : ''}
                  ${hasRating ? `
                    <span class="text-[10px] font-extrabold text-amber-800 bg-amber-50 border border-amber-200/60 px-1.5 py-0.2 rounded flex items-center">
                      <i class="fa-solid fa-star text-amber-500 mr-1 text-[9px]"></i>${item.rating}
                    </span>
                  ` : ''}
                </div>

                <h4 class="font-extrabold text-sm sm:text-base text-stone-900 leading-tight">${item.name}</h4>
                
                <div class="flex items-center space-x-2">
                  <span class="text-sm sm:text-base font-black text-stone-900">₹${item.price}</span>
                  ${item.originalPrice ? `<span class="text-xs text-stone-400 line-through font-semibold">₹${item.originalPrice}</span>` : ''}
                </div>

                <p class="text-xs text-stone-500 leading-relaxed line-clamp-2">${item.description || 'Prepared piping hot on order with authentic street seasonings.'}</p>

                ${item.customizations && item.customizations.length > 0 ? `
                  <span class="text-[10px] font-bold text-orange-600 inline-flex items-center space-x-1 mt-1">
                    <i class="fa-solid fa-sliders text-[9px]"></i>
                    <span data-i18n="customizable_tag">Customizable options</span>
                  </span>
                ` : ''}
              </div>

              <!-- Item Image & Add / Stepper Button (Enlarged 32x32 thumbnail) -->
              <div class="relative w-28 h-28 sm:w-32 sm:h-32 shrink-0 rounded-2xl overflow-hidden bg-stone-100 flex flex-col justify-end shadow-xs border border-stone-200/60">
                <img src="${itemImg}" 
                  alt="${item.name}" class="absolute inset-0 w-full h-full object-cover" loading="lazy" decoding="async" onerror="handleFoodImageError(this, '${cat.id}', '${safeName}')">
                <div class="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none"></div>
                
                <!-- Add / Stepper Button -->
                <div class="relative z-10 mx-auto mb-2 w-24">
                  ${!item.inStock ? `
                    <div class="bg-stone-900/90 text-white text-[10px] font-black py-1 px-2 rounded-lg text-center backdrop-blur-xs">
                      SOLD OUT
                    </div>
                  ` : qty === 0 ? `
                    <button onclick="handleAddItemClick('${item.id}')" 
                      class="w-full bg-white text-orange-600 border border-orange-200 rounded-xl py-1 font-black text-xs shadow-md hover:bg-orange-50 active:scale-95 transition">
                      + ADD
                    </button>
                  ` : `
                    <div class="w-full bg-orange-600 text-white rounded-xl py-1 px-1.5 flex items-center justify-between font-black text-xs shadow-md">
                      <button onclick="decrementCartItem('${item.id}')" class="w-5 text-center hover:bg-orange-700 rounded transition">-</button>
                      <span>${qty}</span>
                      <button onclick="incrementCartItem('${item.id}')" class="w-5 text-center hover:bg-orange-700 rounded transition">+</button>
                    </div>
                  `}
                </div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `).join('');
}

function scrollToMenuCategory(catId) {
  const section = document.getElementById(`cat_section_${catId}`);
  if (section) {
    section.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

function renderMenuItems(items) {
  renderCategoryTabsAndMenuItems(items);
  renderFamousForDishes(items);
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
  AtmosphereManager.pushOverride('customizer', 'minimal');
}

function closeCustomizerModal() {
  document.getElementById('customizerModal').classList.add('hidden');
  AtmosphereManager.popOverride('customizer');
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
    const activeStall = (STATE.stalls || []).find(s => s.id === STATE.cart.stallId) || STATE.currentStall;
    const eta = activeStall ? calculateMarketplaceEta(activeStall, getActiveCustomerCoordinates(), STATE.deliveryCapacity) : null;

    if (modalCartBar) {
      modalCartBar.classList.remove('hidden');
      document.getElementById('modalCartCount').innerText = `${count} ${count === 1 ? 'ITEM' : 'ITEMS'}`;
      document.getElementById('modalCartTotal').innerText = `₹${subtotal}`;
      const modalCartEta = document.getElementById('modalCartEta');
      if (modalCartEta) {
        if (eta) {
          modalCartEta.innerText = `🛵 ${eta.pillText}`;
          modalCartEta.classList.remove('hidden');
        } else {
          modalCartEta.classList.add('hidden');
        }
      }
    }

    if (stickyCart) {
      stickyCart.classList.remove('hidden');
      document.getElementById('stickyCartBadge').innerText = `${count} ${count === 1 ? 'ITEM' : 'ITEMS'}`;
      document.getElementById('stickyCartTotal').innerText = `₹${subtotal}`;
      const stickyCartEta = document.getElementById('stickyCartEta');
      if (stickyCartEta) {
        if (eta) {
          stickyCartEta.innerText = `🛵 ${eta.pillText}`;
          stickyCartEta.classList.remove('hidden');
        } else {
          stickyCartEta.classList.add('hidden');
        }
      }
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
  AtmosphereManager.pushOverride('cartDrawer', 'minimal');
}

function closeCartDrawer() {
  document.getElementById('cartDrawer').classList.add('hidden');
  AtmosphereManager.popOverride('cartDrawer');
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

  const cartEtaBanner = document.getElementById('cartEtaBanner');
  const cartEtaText = document.getElementById('cartEtaText');
  const activeStall = (STATE.stalls || []).find(s => s.id === STATE.cart.stallId) || STATE.currentStall;
  if (cartEtaBanner && cartEtaText && activeStall) {
    const eta = calculateMarketplaceEta(activeStall, getActiveCustomerCoordinates(), STATE.deliveryCapacity);
    cartEtaText.innerText = `🛵 ${eta.pillText}`;
    cartEtaBanner.classList.remove('hidden');
  } else if (cartEtaBanner) {
    cartEtaBanner.classList.add('hidden');
  }

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
      headers: getAuthHeaders(),
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

      // Open Secure Payment Modal (Collect payment before tracking)
      openPaymentModal(data.order);
      loadCustomerOrders();
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
// SECURE CHECKOUT & PAYMENT MODAL ENGINE
// ==========================================================
async function openPaymentModal(order) {
  STATE.currentCheckoutOrder = order;
  const modal = document.getElementById('paymentModal');
  if (!modal) return;

  // Populate order summary
  const subEl = document.getElementById('payModalSubtotal');
  const packEl = document.getElementById('payModalPackaging');
  const delEl = document.getElementById('payModalDelivery');
  const tipEl = document.getElementById('payModalTip');
  const totEl = document.getElementById('payModalTotal');
  const subtitleEl = document.getElementById('payModalSubtitle');

  if (subEl) subEl.innerText = `₹${order.subtotal || 0}`;
  if (packEl) packEl.innerText = `₹${order.packaging_fee || 10}`;
  if (delEl) delEl.innerText = (order.delivery_fee && order.delivery_fee > 0) ? `₹${order.delivery_fee}` : 'FREE';
  if (tipEl) tipEl.innerText = `₹${order.tip || 0}`;
  if (totEl) totEl.innerText = `₹${order.grand_total || 0}`;
  if (subtitleEl) subtitleEl.innerText = `Order #${order.id} • ${order.stall_name || 'Street Food Thela'}`;

  modal.classList.remove('hidden');

  // Request authoritative payment intent from backend
  try {
    const res = await fetch('/api/payments/create-intent', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ orderId: order.id })
    });
    const intent = await res.json();
    if (intent.success) {
      STATE.currentPaymentIntent = intent;
      const refEl = document.getElementById('payModalTxnRef');
      if (refEl) refEl.innerText = intent.providerTransactionId;
    } else {
      showToast(`Payment Intent Error: ${intent.error || 'Could not initiate'}`);
    }
  } catch (err) {
    console.error('Failed to create payment intent:', err);
  }
}

function closePaymentModal() {
  const modal = document.getElementById('paymentModal');
  if (modal) modal.classList.add('hidden');
  const loader = document.getElementById('payModalLoading');
  if (loader) loader.classList.add('hidden');
}

async function handleVerifyPayment(simulateFailure = false) {
  if (!STATE.currentCheckoutOrder) return;
  const orderId = STATE.currentCheckoutOrder.id;
  const loader = document.getElementById('payModalLoading');
  const verifyBtn = document.getElementById('payModalVerifyBtn');
  const failBtn = document.getElementById('payModalFailBtn');

  if (loader) loader.classList.remove('hidden');
  if (verifyBtn) verifyBtn.disabled = true;
  if (failBtn) failBtn.disabled = true;

  try {
    const res = await fetch('/api/payments/verify', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        orderId,
        txnId: STATE.currentPaymentIntent?.providerTransactionId || `txn_sbx_${orderId}`,
        signature: STATE.currentPaymentIntent?.signature || 'sig_demo',
        testSimulationOutcome: simulateFailure ? 'FAIL' : 'SUCCESS'
      })
    });

    const data = await res.json();
    if (data.success && data.payment_status === 'PAID') {
      showToast('🎉 Payment Verified via Sandbox Gateway!');
      closePaymentModal();

      // Refresh order and open live tracking
      const orderRes = await fetch(`/api/orders/${orderId}`, { headers: getAuthHeaders() });
      const orderData = await orderRes.json();
      if (orderData.success) {
        openTrackingModal(orderData.order);
      } else {
        STATE.currentCheckoutOrder.payment_status = 'PAID';
        openTrackingModal(STATE.currentCheckoutOrder);
      }
      loadCustomerOrders();
    } else {
      showToast(`Payment Failed: ${data.error || 'Transaction declined.'}`);
      closePaymentModal();
      // Refresh order to show failure tracking state
      const orderRes = await fetch(`/api/orders/${orderId}`, { headers: getAuthHeaders() });
      const orderData = await orderRes.json();
      if (orderData.success) {
        openTrackingModal(orderData.order);
      }
    }
  } catch (err) {
    console.error('Verification error:', err);
    showToast('Failed to connect to payment gateway.');
  } finally {
    if (loader) loader.classList.add('hidden');
    if (verifyBtn) verifyBtn.disabled = false;
    if (failBtn) failBtn.disabled = false;
  }
}

// ==========================================================
// 8. LIVE ORDER TRACKING & RADAR TELEMETRY
// ==========================================================
function updateTrackingEta(order) {
  const etaElem = document.getElementById('trackEtaText');
  if (!etaElem || !order) return;
  const result = calculateTrackingEta(order);
  etaElem.innerText = result.text;
}

function openTrackingModal(order) {
  STATE.trackingOrder = order;
  STATE.radarProgress = 0.2; // initial rider progress

  // Save active tracking session to localStorage for rehydration on refresh
  try {
    localStorage.setItem('thela_active_tracking_id', order.id);
  } catch (e) {}

  document.getElementById('trackOrderId').innerText = `#${order.id}`;
  document.getElementById('trackDeliveryOtp').innerText = order.otp || '----';
  updateTrackingEta(order);

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
  AtmosphereManager.pushOverride('trackingModal', 'minimal');

  // Draw initial radar frame
  drawRadarFrame();
}

function closeTrackingModal() {
  document.getElementById('trackingModal').classList.add('hidden');
  AtmosphereManager.popOverride('trackingModal');
  const terminalStatuses = ['DELIVERED', 'COMPLETED', 'CANCELLED', 'REJECTED', 'VENDOR_UNAVAILABLE', 'PAYMENT_FAILED', 'RIDER_UNAVAILABLE'];
  if (STATE.trackingOrder && terminalStatuses.includes(STATE.trackingOrder.status)) {
    try {
      localStorage.removeItem('thela_active_tracking_id');
    } catch (e) {}
  }
}

function renderTrackerSteps(order) {
  const failureStatuses = ['PAYMENT_FAILED', 'VENDOR_UNAVAILABLE', 'REJECTED', 'CANCELLED', 'RIDER_UNAVAILABLE'];
  const container = document.getElementById('trackerStepsList');
  if (!container) return;

  if (failureStatuses.includes(order.status)) {
    const failureTitles = {
      PAYMENT_FAILED: 'Payment Failed',
      VENDOR_UNAVAILABLE: 'Stall Kitchen Unavailable',
      REJECTED: 'Order Declined by Vendor',
      CANCELLED: 'Order Cancelled',
      RIDER_UNAVAILABLE: 'Delivery Fleet Unavailable'
    };
    const failureDescs = {
      PAYMENT_FAILED: 'Your UPI transaction could not be processed. No funds were debited.',
      VENDOR_UNAVAILABLE: 'The vendor did not accept the order within the time limit. Full refund initiated.',
      REJECTED: 'The stall was unable to accept this order due to rush or sold-out items. Full refund initiated.',
      CANCELLED: 'This order was cancelled. Any settled payments are queued for refund.',
      RIDER_UNAVAILABLE: 'No delivery partners were available in this operating zone. Full refund initiated.'
    };

    let refundBadge = '';
    if (order.payment_status === 'REFUND_PENDING') {
      refundBadge = `
        <div class="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-2xl flex items-center justify-between text-xs text-amber-900">
          <div class="flex items-center space-x-2">
            <i class="fa-solid fa-clock-rotate-left text-amber-600"></i>
            <div>
              <div class="font-extrabold">Refund Processing (₹${order.grand_total})</div>
              <div class="text-[11px] text-amber-700">Bank processing to your original payment method.</div>
            </div>
          </div>
          <span class="px-2 py-0.5 rounded-md font-black bg-amber-200 text-amber-900 text-[10px]">PENDING</span>
        </div>
      `;
    } else if (order.payment_status === 'REFUNDED') {
      refundBadge = `
        <div class="mt-3 p-3 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between text-xs text-emerald-900">
          <div class="flex items-center space-x-2">
            <i class="fa-solid fa-check-circle text-emerald-600"></i>
            <div>
              <div class="font-extrabold">Refund Completed (₹${order.grand_total})</div>
              <div class="text-[11px] text-emerald-700">Credited back to your original payment method.</div>
            </div>
          </div>
          <span class="px-2 py-0.5 rounded-md font-black bg-emerald-200 text-emerald-900 text-[10px]">REFUNDED</span>
        </div>
      `;
    }

    container.innerHTML = `
      <div class="p-4 bg-red-50 border-2 border-red-200 rounded-3xl text-left space-y-2">
        <div class="flex items-center space-x-2 text-red-700">
          <i class="fa-solid fa-triangle-exclamation text-lg"></i>
          <h4 class="text-sm font-black">${failureTitles[order.status] || 'Order Incomplete'}</h4>
        </div>
        <p class="text-xs text-red-800">${failureDescs[order.status] || 'Order could not be fulfilled.'}</p>
        ${refundBadge}
      </div>
    `;
    return;
  }

  const steps = [
    { key: 'PLACED', title: 'Order Received', desc: 'Awaiting stall kitchen confirmation' },
    { key: 'ACCEPTED', title: 'Order Accepted', desc: 'Vendor confirmed street food order' },
    { key: 'PREPARING', title: 'Cooking on Tawa', desc: 'Fresh ingredients sizzling on cart' },
    { key: 'READY_FOR_PICKUP', title: 'Packed & Ready', desc: 'Eco dona packed for rider collection' },
    { key: 'RIDER_ASSIGNED', title: 'Rider Assigned', desc: 'Delivery partner assigned to trip' },
    { key: 'RIDER_ARRIVING', title: 'Rider at Thela', desc: 'Reaching food stall counter' },
    { key: 'PICKED_UP', title: 'Order Collected', desc: 'Collected in thermal bag' },
    { key: 'OUT_FOR_DELIVERY', title: 'Out for Delivery', desc: 'Rider heading to your doorstep' },
    { key: 'DELIVERED', title: 'Delivered', desc: 'Doorstep delivery completed with OTP' },
    { key: 'COMPLETED', title: 'Completed & Rated', desc: 'Street food enjoyed & settled' }
  ];

  const canonicalFlow = [
    'PLACED', 'ACCEPTED', 'PREPARING', 'READY_FOR_PICKUP',
    'RIDER_ASSIGNED', 'RIDER_ARRIVING', 'PICKED_UP', 'OUT_FOR_DELIVERY',
    'DELIVERED', 'COMPLETED'
  ];

  // Map legacy COOKING to PREPARING for tracker index
  const normalizedStatus = order.status === 'COOKING' ? 'PREPARING' : order.status;
  const currentIdx = canonicalFlow.indexOf(normalizedStatus);

  container.innerHTML = steps.map((step, idx) => {
    const isCompleted = currentIdx >= idx;
    const isCurrent = (normalizedStatus === step.key);

    return `
      <div class="relative flex items-start space-x-3 pb-3">
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
    if (stall && btn && label) {
      if (stall.status === 'LIVE' && Boolean(stall.isOpen)) {
        btn.className = 'px-3 py-1.5 rounded-full text-xs font-extrabold bg-green-100 text-green-700 flex items-center space-x-1.5 transition';
        label.innerText = 'OPEN FOR ORDERS';
      } else {
        btn.className = 'px-3 py-1.5 rounded-full text-xs font-extrabold bg-gray-100 text-gray-700 flex items-center space-x-1.5 transition cursor-not-allowed';
        label.innerText = stall.store_status_label || (stall.status === 'LIVE' ? 'STORE CLOSED' : 'APPLICATION PENDING');
      }
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
          <span class="text-gray-900">${order.stall_name}${order.stall_address ? ', ' + order.stall_address : ''}</span>
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
  const entered = prompt("Enter customer's 4-digit doorstep delivery OTP:");
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
  AtmosphereManager.pushOverride('authModal', 'minimal');
}

function closeAuthModal() {
  document.getElementById('authModal').classList.add('hidden');
  AtmosphereManager.popOverride('authModal');
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
      showToast(`Verification code sent to +91 ${phone}`);
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
      if (data.token) {
        localStorage.setItem('thela_token', data.token);
      }
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
  AtmosphereManager.pushOverride('profileModal', 'minimal');
}

function closeProfileModal() {
  document.getElementById('profileModal').classList.add('hidden');
  AtmosphereManager.popOverride('profileModal');
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
  localStorage.removeItem('thela_token');
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
  AtmosphereManager.pushOverride('addressDrawer', 'minimal');
}

function closeAddressDrawer() {
  document.getElementById('addressDrawer').classList.add('hidden');
  AtmosphereManager.popOverride('addressDrawer');
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
  AtmosphereManager.pushOverride('orderHistoryModal', 'minimal');

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
  AtmosphereManager.popOverride('orderHistoryModal');
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
  AtmosphereManager.pushOverride('ratingModal', 'minimal');
}

function closeRatingModal() {
  document.getElementById('ratingModal').classList.add('hidden');
  STATE.ratingOrderId = null;
  AtmosphereManager.popOverride('ratingModal');
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
