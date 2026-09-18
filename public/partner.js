// ThelaExpress Partner Portal Engine (Vendor Kitchen POS & Delivery Fleet)

const PARTNER_STATE = {
  currentRole: 'vendor', // 'vendor' or 'rider'
  stalls: [],
  vendorStallId: null,
  vendorOrders: [],
  vendorMenu: [],
  riderOrders: [],
  riderActiveOrder: null,
  ws: null
};

document.addEventListener('DOMContentLoaded', () => {
  const urlParams = new URLSearchParams(window.location.search);
  const stallIdParam = urlParams.get('stallId');
  if (stallIdParam) {
    PARTNER_STATE.vendorStallId = stallIdParam;
  }

  initWebSocket();
  loadStalls();

  const role = urlParams.get('role');
  if (role && ['vendor', 'rider'].includes(role)) {
    switchPartnerRole(role);
  }

  window.addEventListener('thela_language_changed', () => {
    if (PARTNER_STATE.stalls.length === 0) {
      renderNoStallsState();
    } else {
      if (PARTNER_STATE.currentRole === 'vendor') {
        loadVendorOrders();
        loadVendorMenuItems();
      } else {
        loadRiderOrders();
      }
    }
  });
});

// ==========================================================
// 1. WEBSOCKET REALTIME HUB
// ==========================================================
function initWebSocket() {
  const wsDot = document.getElementById('wsDot');
  const wsText = document.getElementById('wsText');
  const wsDotMobile = document.getElementById('wsDotMobile');
  const wsTextMobile = document.getElementById('wsTextMobile');

  try {
    const wsProto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${wsProto}//${window.location.host}/ws`;

    PARTNER_STATE.ws = new WebSocket(wsUrl);

    PARTNER_STATE.ws.onopen = () => {
      console.log('[Partner WS] Connected');
      if (wsDot) wsDot.className = 'w-2 h-2 rounded-full bg-emerald-500';
      if (wsText) wsText.innerText = 'Live Gateway';
      if (wsDotMobile) wsDotMobile.className = 'w-2 h-2 rounded-full bg-emerald-500';
      if (wsTextMobile) wsTextMobile.innerText = 'Live';

      if (PARTNER_STATE.vendorStallId) {
        subscribeToStall(PARTNER_STATE.vendorStallId);
      }
    };

    PARTNER_STATE.ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        handlePartnerWsMessage(msg);
      } catch (e) {
        console.error('[Partner WS] Error parsing message:', e);
      }
    };

    PARTNER_STATE.ws.onclose = () => {
      console.warn('[Partner WS] Disconnected, retrying in 3s...');
      if (wsDot) wsDot.className = 'w-2 h-2 rounded-full bg-amber-500 animate-pulse';
      if (wsText) wsText.innerText = 'Reconnecting';
      if (wsDotMobile) wsDotMobile.className = 'w-2 h-2 rounded-full bg-amber-500 animate-pulse';
      if (wsTextMobile) wsTextMobile.innerText = 'Offline';
      setTimeout(initWebSocket, 3000);
    };

    PARTNER_STATE.ws.onerror = (err) => {
      console.warn('[Partner WS] Error:', err);
    };
  } catch (err) {
    console.error('[Partner WS] Failed to init:', err);
  }
}

function subscribeToStall(stallId) {
  if (PARTNER_STATE.ws && PARTNER_STATE.ws.readyState === WebSocket.OPEN) {
    PARTNER_STATE.ws.send(JSON.stringify({
      type: 'SUBSCRIBE',
      payload: { stallId: stallId, role: 'vendor' }
    }));
  }
}

function handlePartnerWsMessage(data) {
  switch (data.type) {
    case 'NEW_ORDER_RECEIVED':
      playChime();
      showToast(`🔔 New Order #${data.payload.order.id} received! ₹${data.payload.order.grand_total}`);
      incrementVendorBadge();
      loadVendorOrders();
      loadRiderOrders();
      break;

    case 'ORDER_STATUS_CHANGED':
      showToast(`⚡ Order #${data.payload.orderId} status: ${formatStatus(data.payload.status)}`);
      loadVendorOrders();
      loadRiderOrders();
      break;

    case 'ORDER_DELIVERED':
      showToast(`🎉 Order #${data.payload.orderId} Delivered!`);
      loadVendorOrders();
      loadRiderOrders();
      break;

    case 'STALL_STATUS_CHANGED':
    case 'ITEM_STOCK_CHANGED':
      loadVendorMenuItems();
      break;

    case 'STALL_VERIFICATION_CHANGED':
      loadStalls();
      showToast('🛡️ Stall verification details updated by platform admin');
      break;
  }
}

function incrementVendorBadge() {
  const badge = document.getElementById('partnerVendorBadge');
  if (!badge) return;
  const current = parseInt(badge.innerText || '0', 10) + 1;
  badge.innerText = current;
  badge.classList.remove('hidden');
}

// ==========================================================
// 2. ROLE SWITCHER
// ==========================================================
function switchPartnerRole(role) {
  PARTNER_STATE.currentRole = role;

  const vendorView = document.getElementById('partnerVendorView');
  const riderView = document.getElementById('partnerRiderView');
  const tabVendor = document.getElementById('tabVendor');
  const tabRider = document.getElementById('tabRider');

  if (role === 'vendor') {
    vendorView.classList.remove('hidden');
    riderView.classList.add('hidden');
    tabVendor.className = 'px-3 py-1.5 rounded-lg transition-all bg-orange-600 text-white shadow-sm flex items-center space-x-1.5';
    tabRider.className = 'px-3 py-1.5 rounded-lg transition-all text-gray-400 hover:text-white flex items-center space-x-1.5';

    const badge = document.getElementById('partnerVendorBadge');
    if (badge) {
      badge.innerText = '0';
      badge.classList.add('hidden');
    }

    if (PARTNER_STATE.stalls.length > 0 && PARTNER_STATE.vendorStallId) {
      loadVendorOrders();
      loadVendorMenuItems();
    } else {
      renderNoStallsState();
    }
  } else {
    vendorView.classList.add('hidden');
    riderView.classList.remove('hidden');
    tabRider.className = 'px-3 py-1.5 rounded-lg transition-all bg-emerald-600 text-white shadow-sm flex items-center space-x-1.5';
    tabVendor.className = 'px-3 py-1.5 rounded-lg transition-all text-gray-400 hover:text-white flex items-center space-x-1.5';

    loadRiderOrders();
  }
}

// ==========================================================
// 3. SOUND SYNTHESIS ENGINE (Web Audio API)
// ==========================================================
function playChime() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    if (ctx.state === 'suspended') ctx.resume();

    const now = ctx.currentTime;
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, now);
    osc1.frequency.setValueAtTime(880.00, now + 0.12);
    gain1.gain.setValueAtTime(0.4, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.9);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.9);

    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(880.00, now + 0.12);
    osc2.frequency.setValueAtTime(1174.66, now + 0.28);
    gain2.gain.setValueAtTime(0.3, now + 0.12);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 1.2);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.12);
    osc2.stop(now + 1.2);
  } catch (e) {
    console.warn('Sound chime failed:', e);
  }
}

function testChime() {
  playChime();
  showToast('🔔 Kitchen order bell sound tested!');
}

// ==========================================================
// 4. VENDOR KITCHEN POS LOGIC
// ==========================================================
async function loadStalls() {
  try {
    const res = await fetch('/api/stalls');
    const data = await res.json();
    PARTNER_STATE.stalls = data.stalls || [];

    const select = document.getElementById('vendorStallSelect');
    if (PARTNER_STATE.stalls.length === 0) {
      PARTNER_STATE.vendorStallId = null;
      if (select) {
        select.innerHTML = '<option value="">No stalls registered</option>';
      }
      renderNoStallsState();
      return;
    }

    if (select) {
      select.innerHTML = PARTNER_STATE.stalls.map(s => `
        <option value="${s.id}" ${s.id === PARTNER_STATE.vendorStallId ? 'selected' : ''}>${s.name}</option>
      `).join('');
    }

    if (!PARTNER_STATE.vendorStallId || !PARTNER_STATE.stalls.some(s => s.id === PARTNER_STATE.vendorStallId)) {
      PARTNER_STATE.vendorStallId = PARTNER_STATE.stalls[0].id;
      if (select) select.value = PARTNER_STATE.vendorStallId;
    }

    subscribeToStall(PARTNER_STATE.vendorStallId);
    updateVendorTrustCard();
    loadVendorOrders();
    loadVendorMenuItems();
  } catch (err) {
    console.error('Failed to fetch stalls:', err);
  }
}

function renderNoStallsState() {
  const tr = (k, fb) => (typeof t === 'function' ? t(k, fb) : fb);
  const container = document.getElementById('vendorOrdersList');
  if (container) {
    container.innerHTML = `
      <div class="py-12 px-6 text-center text-gray-500 bg-white rounded-3xl border border-dashed border-orange-200 shadow-sm">
        <div class="w-14 h-14 mx-auto mb-3 bg-orange-50 text-orange-600 rounded-2xl flex items-center justify-center text-2xl">
          <i class="fa-solid fa-store"></i>
        </div>
        <h3 class="font-black text-gray-900 text-base mb-1">${tr('no_stalls_title', 'No Food Stalls Registered Yet')}</h3>
        <p class="text-xs text-gray-500 max-w-sm mx-auto mb-4">${tr('no_stalls_desc', 'Register your real street food thela or quick-service stall to start receiving live customer orders on this kitchen terminal.')}</p>
        <a href="/onboard-vendor.html" class="inline-flex items-center space-x-2 bg-gradient-to-r from-orange-600 to-amber-600 text-white font-black text-xs px-5 py-2.5 rounded-xl shadow-md hover:opacity-95 transition">
          <i class="fa-solid fa-plus-circle"></i>
          <span>${tr('register_stall_btn', 'Register New Street Stall')}</span>
        </a>
      </div>
    `;
  }
  const menuContainer = document.getElementById('vendorMenuItemsList');
  if (menuContainer) {
    menuContainer.innerHTML = `
      <div class="py-6 text-center text-gray-400 text-xs">
        No menu items yet. Register a stall first to configure dishes.
      </div>
    `;
  }
  const countBadge = document.getElementById('vendorActiveCount');
  if (countBadge) countBadge.innerText = '0 Active';
}

function onVendorStallChange() {
  const select = document.getElementById('vendorStallSelect');
  PARTNER_STATE.vendorStallId = select.value;
  subscribeToStall(PARTNER_STATE.vendorStallId);
  updateVendorTrustCard();
  loadVendorOrders();
  loadVendorMenuItems();
}

function updateVendorTrustCard() {
  const stall = PARTNER_STATE.stalls.find(s => s.id === PARTNER_STATE.vendorStallId);
  const card = document.getElementById('vendorTrustHubCard');
  if (!card) return;
  if (!stall) {
    card.classList.add('hidden');
    return;
  }
  card.classList.remove('hidden');

  const overallBadge = document.getElementById('vendorTrustOverallBadge');
  const fssaiBadge = document.getElementById('vendorFssaiBadge');
  const fssaiNum = document.getElementById('vendorFssaiNum');
  const fssaiNotes = document.getElementById('vendorFssaiNotes');

  const hygieneBadge = document.getElementById('vendorHygieneBadge');
  const hygieneScore = document.getElementById('vendorHygieneScore');
  const hygieneNotes = document.getElementById('vendorHygieneNotes');

  const identityBadge = document.getElementById('vendorIdentityBadge');
  const addressText = document.getElementById('vendorAddressText');

  // 1. FSSAI
  const fStatus = stall.fssai_status || (stall.fssai_number ? 'submitted' : 'not_submitted');
  const fNum = stall.fssai_number || 'Not Provided';
  if (fssaiNum) fssaiNum.innerText = `No: ${fNum}`;

  if (fStatus === 'verified') {
    fssaiBadge.className = 'px-2 py-0.5 rounded-md text-[10px] font-black bg-emerald-100 text-emerald-800';
    fssaiBadge.innerText = 'Verified ✓';
    fssaiNotes.innerText = `Verified on ${stall.fssai_verified_at ? new Date(stall.fssai_verified_at).toLocaleDateString() : 'Record'}. Valid license.`;
  } else if (fStatus === 'under_verification') {
    fssaiBadge.className = 'px-2 py-0.5 rounded-md text-[10px] font-black bg-blue-100 text-blue-800';
    fssaiBadge.innerText = 'Under Review';
    fssaiNotes.innerText = 'Document undergoing validation on FoSCoS portal.';
  } else if (fStatus === 'rejected') {
    fssaiBadge.className = 'px-2 py-0.5 rounded-md text-[10px] font-black bg-red-100 text-red-800';
    fssaiBadge.innerText = 'Action Required';
    fssaiNotes.innerText = stall.fssai_rejection_reason || 'Certificate mismatch. Contact admin to correct.';
  } else if (fStatus === 'expired') {
    fssaiBadge.className = 'px-2 py-0.5 rounded-md text-[10px] font-black bg-gray-200 text-gray-800';
    fssaiBadge.innerText = 'Expired';
    fssaiNotes.innerText = 'FSSAI License expired. Please renew with FoSCoS.';
  } else {
    fssaiBadge.className = 'px-2 py-0.5 rounded-md text-[10px] font-black bg-amber-100 text-amber-800';
    fssaiBadge.innerText = stall.fssai_number ? 'Submitted' : 'Pending Upload';
    fssaiNotes.innerText = stall.fssai_number ? 'Submitted during onboarding. Awaiting platform review.' : 'No FSSAI number provided. Enter in profile to get verified.';
  }

  // 2. Hygiene Inspection
  const hStatus = stall.hygiene_status || 'not_inspected';
  if (hStatus === 'verified') {
    hygieneBadge.className = 'px-2 py-0.5 rounded-md text-[10px] font-black bg-amber-100 text-amber-800';
    hygieneBadge.innerText = 'Hygiene Certified ★';
    hygieneScore.innerText = `Score: ${stall.hygiene_score || 95}/100`;
    hygieneNotes.innerText = `Inspected by ${stall.hygiene_inspected_by || 'Quality Team'} on ${stall.hygiene_verified_at ? new Date(stall.hygiene_verified_at).toLocaleDateString() : 'Record'}.`;
  } else if (hStatus === 'scheduled') {
    hygieneBadge.className = 'px-2 py-0.5 rounded-md text-[10px] font-black bg-blue-100 text-blue-800';
    hygieneBadge.innerText = 'Inspection Scheduled';
    hygieneScore.innerText = 'Auditor Assigned';
    hygieneNotes.innerText = 'Auditor will visit your cart location for physical hygiene check.';
  } else if (hStatus === 'failed') {
    hygieneBadge.className = 'px-2 py-0.5 rounded-md text-[10px] font-black bg-red-100 text-red-800';
    hygieneBadge.innerText = 'Audit Failed';
    hygieneScore.innerText = `Score: ${stall.hygiene_score || 'N/A'}`;
    hygieneNotes.innerText = stall.hygiene_notes || 'Cleanliness standards not met. Fix issues for re-audit.';
  } else {
    hygieneBadge.className = 'px-2 py-0.5 rounded-md text-[10px] font-black bg-gray-200 text-gray-700';
    hygieneBadge.innerText = 'Pending Physical Audit';
    hygieneScore.innerText = 'Not Inspected Yet';
    hygieneNotes.innerText = 'RO water, clean oil & covered cart will be checked during on-ground audit.';
  }

  // 3. Identity
  if (addressText) addressText.innerText = stall.address || 'Indiranagar 100ft Rd';
  if (stall.identity_status === 'verified' || stall.is_verified) {
    identityBadge.className = 'px-2 py-0.5 rounded-md text-[10px] font-black bg-emerald-100 text-emerald-800';
    identityBadge.innerText = 'Verified KYC ✓';
  } else {
    identityBadge.className = 'px-2 py-0.5 rounded-md text-[10px] font-black bg-gray-200 text-gray-700';
    identityBadge.innerText = 'Pending Review';
  }

  // Overall Trust Banner
  if (fStatus === 'verified' && hStatus === 'verified') {
    overallBadge.className = 'px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 flex items-center';
    overallBadge.innerHTML = '<i class="fa-solid fa-crown mr-1 text-amber-500"></i> Thela Gold Standard';
  } else if (fStatus === 'verified') {
    overallBadge.className = 'px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800';
    overallBadge.innerText = 'FSSAI Verified';
  } else if (hStatus === 'verified') {
    overallBadge.className = 'px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-800';
    overallBadge.innerText = 'Thela Hygiene Verified';
  } else {
    overallBadge.className = 'px-2.5 py-0.5 rounded-full text-[10px] font-black bg-gray-100 text-gray-700';
    overallBadge.innerText = 'Audits in Progress';
  }
}

async function loadVendorOrders() {
  if (!PARTNER_STATE.vendorStallId) return;
  try {
    const res = await fetch(`/api/orders/stall/${PARTNER_STATE.vendorStallId}`);
    const data = await res.json();
    PARTNER_STATE.vendorOrders = data.orders || [];
    renderVendorOrders(PARTNER_STATE.vendorOrders);
  } catch (e) {
    console.error('Failed to load vendor orders:', e);
  }
}

function renderVendorOrders(orders) {
  const container = document.getElementById('vendorOrdersList');
  const countBadge = document.getElementById('vendorActiveCount');
  if (!container) return;

  const active = orders.filter(o => o.status !== 'DELIVERED' && o.status !== 'CANCELLED');
  if (countBadge) countBadge.innerText = `${active.length} Active`;

  if (active.length === 0) {
    container.innerHTML = `
      <div class="py-12 text-center text-gray-400 bg-white rounded-3xl border border-gray-200">
        <i class="fa-solid fa-fire-burner text-3xl text-gray-300 mb-2"></i>
        <p class="font-black text-sm text-gray-700">${t('kitchen_tawa_clean', 'Kitchen Tawa is Clean!')}</p>
        <p class="text-xs text-gray-400 mt-1">${t('waiting_orders', 'New incoming orders will appear here automatically with bell notification.')}</p>
      </div>
    `;
    return;
  }

  container.innerHTML = active.map(order => {
    const itemsText = order.items.map(i => `
      <div class="flex items-center justify-between py-1 text-xs">
        <div>
          <span class="font-black text-gray-900">${i.qty}x</span>
          <span class="font-bold text-gray-800 ml-1">${i.name}</span>
          ${Object.keys(i.customs || {}).length > 0 ? `
            <div class="text-[10px] text-orange-600 font-semibold pl-4">
              ${Object.values(i.customs).join(', ')}
            </div>
          ` : ''}
        </div>
        <span class="font-black text-gray-700">₹${i.price * i.qty}</span>
      </div>
    `).join('');

    return `
      <div class="bg-white rounded-3xl border-2 border-orange-200 p-5 shadow-sm space-y-3 animate-in fade-in duration-200">
        <div class="flex items-start justify-between border-b border-gray-100 pb-3">
          <div>
            <div class="flex items-center space-x-2">
              <span class="font-black text-base text-gray-900">Order #${order.id}</span>
              <span class="text-xs font-mono font-bold bg-gray-100 px-2 py-0.5 rounded">OTP: ${order.otp}</span>
              ${order.eco_packaging ? '<span class="bg-green-100 text-green-700 text-[10px] font-black px-1.5 py-0.5 rounded">🍃 ECO DONA</span>' : ''}
            </div>
            <p class="text-xs text-gray-500 mt-0.5">
              Customer: <span class="font-bold text-gray-800">${order.customer_name}</span> (+91 ${order.customer_phone})
            </p>
          </div>
          <span class="px-2.5 py-1 rounded-full text-xs font-black ${getStatusBadgeClass(order.status)}">
            ${formatStatus(order.status)}
          </span>
        </div>

        <div class="bg-gray-50 rounded-2xl p-3 divide-y divide-gray-200/60">
          ${itemsText}
        </div>

        <div class="flex items-center justify-between text-xs text-gray-600">
          <div>Instruction: <strong class="text-gray-900">${order.delivery_instruction || 'Standard'}</strong></div>
          <div class="text-base font-black text-gray-900">Total: ₹${order.grand_total}</div>
        </div>

        <div class="pt-2 border-t border-gray-100 flex items-center justify-end space-x-2">
          ${order.status === 'PLACED' ? `
            <button onclick="advanceCookingStage('${order.id}', 'ACCEPTED')" class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-sm transition">
              ${t('accept_btn', 'Accept Order')}
            </button>
          ` : ''}
          ${['PLACED', 'ACCEPTED'].includes(order.status) ? `
            <button onclick="advanceCookingStage('${order.id}', 'COOKING')" class="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-sm transition flex items-center space-x-1.5">
              <i class="fa-solid fa-fire"></i>
              <span>${t('start_cooking_btn', 'Start Cooking')}</span>
            </button>
          ` : ''}
          ${order.status === 'COOKING' ? `
            <button onclick="advanceCookingStage('${order.id}', 'READY_FOR_PICKUP')" class="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm transition flex items-center space-x-1.5">
              <i class="fa-solid fa-box"></i>
              <span>${t('packed_ready_btn', 'Packed & Ready')}</span>
            </button>
          ` : ''}
          ${order.status === 'READY_FOR_PICKUP' ? `
            <span class="text-xs text-purple-700 font-bold bg-purple-50 px-3 py-1.5 rounded-xl border border-purple-200">
              ${t('waiting_rider', '🛵 Waiting for Rider Pickup')}
            </span>
          ` : ''}
        </div>
      </div>
    `;
  }).join('');
}

async function advanceCookingStage(orderId, nextStatus) {
  try {
    const res = await fetch(`/api/orders/${orderId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: nextStatus })
    });
    const data = await res.json();
    if (data.success) {
      showToast(`Order #${orderId} moved to ${formatStatus(nextStatus)}`);
      loadVendorOrders();
    }
  } catch (e) {
    console.error('Failed to advance stage:', e);
  }
}

async function toggleStallOpenStatus() {
  const stall = PARTNER_STATE.stalls.find(s => s.id === PARTNER_STATE.vendorStallId);
  if (!stall) return;

  const newStatus = !stall.isOpen;
  try {
    const res = await fetch(`/api/stalls/${stall.id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isOpen: newStatus })
    });
    const data = await res.json();
    if (data.success) {
      stall.isOpen = newStatus;
      const btn = document.getElementById('vendorToggleOpenBtn');
      const label = document.getElementById('vendorOpenLabel');
      if (newStatus) {
        btn.className = 'px-3 py-1.5 rounded-full text-xs font-extrabold bg-green-100 text-green-700 flex items-center space-x-1.5 transition';
        label.innerText = 'OPEN FOR ORDERS';
      } else {
        btn.className = 'px-3 py-1.5 rounded-full text-xs font-extrabold bg-red-100 text-red-700 flex items-center space-x-1.5 transition';
        label.innerText = 'STORE CLOSED';
      }
      showToast(`Stall is now ${newStatus ? 'OPEN' : 'CLOSED'}`);
    }
  } catch (e) {
    console.error('Failed to toggle open status:', e);
  }
}

async function loadVendorMenuItems() {
  if (!PARTNER_STATE.vendorStallId) return;
  try {
    const res = await fetch(`/api/stalls/${PARTNER_STATE.vendorStallId}`);
    const data = await res.json();
    PARTNER_STATE.vendorMenu = data.items || [];

    const container = document.getElementById('vendorMenuItemsList');
    if (!container) return;

    container.innerHTML = PARTNER_STATE.vendorMenu.map(item => `
      <div class="py-3 flex items-center justify-between">
        <div>
          <div class="font-bold text-xs text-gray-900">${item.name}</div>
          <div class="text-[11px] text-gray-500">₹${item.price} • ${item.isVeg ? 'Veg' : 'Non-Veg'}</div>
        </div>
        <label class="relative inline-flex items-center cursor-pointer">
          <input type="checkbox" ${item.inStock ? 'checked' : ''} onchange="toggleItemStock('${item.id}', this.checked)" class="sr-only peer">
          <div class="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-green-600"></div>
          <span class="ml-2 text-xs font-bold ${item.inStock ? 'text-green-700' : 'text-red-500'}">
            ${item.inStock ? 'In Stock' : '86 / Sold Out'}
          </span>
        </label>
      </div>
    `).join('');
  } catch (e) {
    console.error('Failed to load menu items:', e);
  }
}

async function toggleItemStock(itemId, inStock) {
  try {
    const res = await fetch(`/api/stalls/items/${itemId}/stock`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ inStock: inStock })
    });
    const data = await res.json();
    if (data.success) {
      showToast(inStock ? 'Item marked in stock' : 'Item marked 86/Sold Out');
    }
  } catch (e) {
    console.error('Failed to toggle stock:', e);
  }
}

// ==========================================================
// 5. RIDER FLEET LOGIC
// ==========================================================
async function loadRiderOrders() {
  try {
    const res = await fetch('/api/orders');
    const data = await res.json();
    const orders = data.orders || [];

    // Active gig: first order that is READY_FOR_PICKUP or OUT_FOR_DELIVERY
    const activeGig = orders.find(o => ['READY_FOR_PICKUP', 'OUT_FOR_DELIVERY', 'COOKING'].includes(o.status));
    const completedTrips = orders.filter(o => o.status === 'DELIVERED');

    renderRiderActiveGig(activeGig);
    renderRiderTrips(completedTrips);

    // Calculate today's earnings (₹40 per trip + any tips)
    const totalEarnings = completedTrips.reduce((sum, o) => sum + 40 + (o.tip || 0), 0);
    const earningsEl = document.getElementById('riderEarningsTotal');
    if (earningsEl) earningsEl.innerText = `₹${totalEarnings.toFixed(2)}`;
  } catch (e) {
    console.error('Failed to load rider gigs:', e);
  }
}

function renderRiderActiveGig(gig) {
  const container = document.getElementById('riderActiveGig');
  if (!container) return;

  if (!gig) {
    container.innerHTML = `
      <div class="py-10 text-center text-gray-400">
        <i class="fa-solid fa-circle-check text-4xl text-emerald-400 mb-2"></i>
        <p class="font-extrabold text-sm text-gray-800">${t('rider_caught_up', 'You are all caught up!')}</p>
        <p class="text-xs text-gray-400 mt-1">${t('rider_waiting_stalls', 'Waiting for street stalls to pack fresh orders...')}</p>
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <div class="flex items-start justify-between border-b border-gray-100 pb-3">
      <div>
        <span class="text-xs font-black bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">${t('rider_active_gig', 'ACTIVE GIG')}</span>
        <h3 class="font-extrabold text-base text-gray-900 mt-1">Order #${gig.id}</h3>
        <p class="text-xs text-gray-500 font-medium">Pickup from: <strong class="text-gray-800">${gig.stall_name}</strong></p>
      </div>
      <div class="text-right">
        <div class="text-xs text-gray-400">Payout</div>
        <div class="text-base font-black text-emerald-600">₹${40 + (gig.tip || 0)}</div>
        ${gig.tip ? `<span class="text-[10px] text-orange-600 font-bold">(incl. ₹${gig.tip} Tip)</span>` : ''}
      </div>
    </div>

    <!-- Delivery Address Details -->
    <div class="bg-gray-50 rounded-2xl p-3 space-y-2 text-xs">
      <div class="flex items-start space-x-2">
        <i class="fa-solid fa-location-dot text-orange-600 mt-0.5"></i>
        <div>
          <div class="font-bold text-gray-900">Delivery Address:</div>
          <div class="text-gray-600">${gig.delivery_address || 'Doorstep Delivery'}</div>
          ${gig.delivery_instruction ? `<div class="text-orange-600 font-semibold mt-0.5">Note: "${gig.delivery_instruction}"</div>` : ''}
        </div>
      </div>
      <div class="flex items-center space-x-2 pt-1 border-t border-gray-200/60">
        <i class="fa-solid fa-phone text-emerald-600"></i>
        <span>Customer: <strong>${gig.customer_name}</strong> (+91 ${gig.customer_phone})</span>
      </div>
    </div>

    <!-- Gig Action Buttons -->
    <div class="flex flex-col sm:flex-row items-center gap-2 pt-2">
      ${gig.status === 'READY_FOR_PICKUP' || gig.status === 'COOKING' ? `
        <button onclick="advanceRiderStage('${gig.id}', 'OUT_FOR_DELIVERY')" class="w-full sm:flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-md transition flex items-center justify-center space-x-2">
          <i class="fa-solid fa-motorcycle"></i>
          <span>${t('rider_pickup_btn', 'Picked Up — Start Delivery Ride')}</span>
        </button>
      ` : ''}

      ${gig.status === 'OUT_FOR_DELIVERY' ? `
        <div class="w-full space-y-2">
          <div class="text-xs font-bold text-purple-700 bg-purple-50 p-2.5 rounded-xl border border-purple-200 flex items-center justify-between">
            <span>🛵 Rider en-route to customer doorstep</span>
            <span class="font-mono font-black text-purple-900">Required OTP: ${gig.otp}</span>
          </div>
          <div class="flex items-center space-x-2">
            <input type="text" id="riderVerifyOtpInput" placeholder="${t('rider_otp_placeholder', 'Enter Customer 4-digit OTP')}" maxlength="4"
              class="flex-1 bg-gray-50 border border-gray-300 rounded-xl px-3 py-2.5 text-xs font-black tracking-widest text-center focus:ring-2 focus:ring-emerald-500">
            <button onclick="verifyDoorstepOtp('${gig.id}')" class="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-md transition">
              ${t('rider_verify_btn', 'Verify & Complete')}
            </button>
          </div>
        </div>
      ` : ''}
    </div>
  `;
}

async function advanceRiderStage(orderId, nextStatus) {
  try {
    const res = await fetch(`/api/orders/${orderId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: nextStatus })
    });
    const data = await res.json();
    if (data.success) {
      showToast(`Order #${orderId} marked as ${formatStatus(nextStatus)}`);
      loadRiderOrders();
    }
  } catch (e) {
    console.error('Failed to advance rider stage:', e);
  }
}

async function verifyDoorstepOtp(orderId) {
  const input = document.getElementById('riderVerifyOtpInput');
  const otp = input ? input.value.trim() : '';

  if (!otp || otp.length !== 4) {
    showToast('Please enter the 4-digit OTP provided by customer');
    return;
  }

  try {
    const res = await fetch(`/api/orders/${orderId}/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ otp: otp })
    });
    const data = await res.json();
    if (data.success) {
      showToast(`🎉 Delivery Verified! ₹40 credited to your partner account.`);
      loadRiderOrders();
    } else {
      showToast(data.message || 'Invalid OTP. Please check with customer.');
    }
  } catch (e) {
    console.error('OTP verification error:', e);
  }
}

function renderRiderTrips(trips) {
  const container = document.getElementById('riderTripsList');
  if (!container) return;

  if (trips.length === 0) {
    container.innerHTML = `<div class="py-4 text-center text-gray-400 text-xs">${t('no_trips_yet', 'No completed trips yet today.')}</div>`;
    return;
  }

  container.innerHTML = trips.slice(0, 5).map(trip => `
    <div class="py-2.5 flex items-center justify-between">
      <div>
        <div class="font-bold text-gray-900">Trip #${trip.id} — ${trip.stall_name}</div>
        <div class="text-[10px] text-gray-400">${new Date(trip.created_at).toLocaleTimeString()} • ${trip.delivery_address || 'Doorstep'}</div>
      </div>
      <div class="text-right">
        <span class="font-black text-emerald-600">+₹${40 + (trip.tip || 0)}</span>
        <div class="text-[10px] text-gray-400">Delivered ✓</div>
      </div>
    </div>
  `).join('');
}

// Helpers
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
  const existing = document.getElementById('partnerToast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.id = 'partnerToast';
  toast.className = 'fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-gray-900 text-white px-4 py-2.5 rounded-2xl shadow-xl font-bold text-xs flex items-center space-x-2 border border-gray-700';
  toast.innerHTML = `<span>${message}</span>`;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}
