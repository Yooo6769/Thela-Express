// ThelaExpress Partner Portal Engine (Vendor Kitchen POS & Delivery Fleet)

const PARTNER_STATE = {
  currentRole: 'vendor', // 'vendor' or 'rider'
  stalls: [],
  vendorStallId: null,
  vendorStallData: null,
  vendorGates: null,
  vendorCanAcceptOrders: false,
  vendorOrders: [],
  vendorMenu: [],
  riderOrders: [],
  riderActiveOrder: null,
  riderData: null,
  riderGates: null,
  riderCanClaimGigs: false,
  currentRiderId: 'rdr_1',
  ws: null
};

function getPartnerAuthHeaders(forRole = PARTNER_STATE.currentRole) {
  const headers = { 'Content-Type': 'application/json' };
  if (forRole === 'vendor') {
    const token = localStorage.getItem('thela_vendor_token') || localStorage.getItem('thela_applicant_token') || `thela_tok_vendor_${PARTNER_STATE.vendorStallId || 'stall_1'}`;
    headers['Authorization'] = `Bearer ${token}`;
  } else {
    const token = localStorage.getItem('thela_rider_token') || localStorage.getItem('thela_applicant_token') || `thela_tok_rider_${PARTNER_STATE.currentRiderId || 'rdr_1'}`;
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

document.addEventListener('DOMContentLoaded', () => {
  const urlParams = new URLSearchParams(window.location.search);
  const stallIdParam = urlParams.get('stallId') || localStorage.getItem('thela_vendor_stall_id');
  if (stallIdParam) {
    PARTNER_STATE.vendorStallId = stallIdParam;
  }
  const riderIdParam = urlParams.get('riderId') || localStorage.getItem('thela_rider_id');
  if (riderIdParam) {
    PARTNER_STATE.currentRiderId = riderIdParam;
  }

  initWebSocket();
  loadStalls();

  const role = urlParams.get('role');
  if (role && ['vendor', 'rider'].includes(role)) {
    switchPartnerRole(role);
  }

  window.addEventListener('thela_language_changed', () => {
    const curStall = PARTNER_STATE.vendorStallData || PARTNER_STATE.stalls.find(s => s.id === PARTNER_STATE.vendorStallId);
    if (curStall) {
      renderStoreStatus(curStall);
      renderVendorActivationStatus();
    }
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
      if (data.payload && data.payload.stallId === PARTNER_STATE.vendorStallId) {
        if (PARTNER_STATE.vendorStallData) {
          if (data.payload.store_status) PARTNER_STATE.vendorStallData.store_status = data.payload.store_status;
          if (data.payload.isOpen !== undefined) PARTNER_STATE.vendorStallData.isOpen = data.payload.isOpen;
          if (data.payload.status) PARTNER_STATE.vendorStallData.status = data.payload.status;
        }
        renderStoreStatus(PARTNER_STATE.vendorStallData);
        renderVendorActivationStatus();
      }
      loadVendorMenuItems();
      break;

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

    // If a specific stallId is targeted (or stored), fetch authoritative application status
    if (PARTNER_STATE.vendorStallId) {
      try {
        const stRes = await fetch(`/api/onboard/vendor/status/${PARTNER_STATE.vendorStallId}`, {
          headers: getPartnerAuthHeaders('vendor')
        });
        const stData = await stRes.json();
        if (stData.success && stData.stall) {
          PARTNER_STATE.vendorStallData = stData.stall;
          PARTNER_STATE.vendorGates = stData.gates || [];
          PARTNER_STATE.vendorCanAcceptOrders = Boolean(stData.can_accept_orders);

          // If this stall is not in public LIVE stalls, add it to options
          if (!PARTNER_STATE.stalls.some(s => s.id === stData.stall.id)) {
            PARTNER_STATE.stalls.unshift(stData.stall);
          }
        }
      } catch (err) {
        console.warn('Could not fetch vendor status:', err);
      }
    }

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
        <option value="${s.id}" ${s.id === PARTNER_STATE.vendorStallId ? 'selected' : ''}>
          ${s.name} ${s.status === 'LIVE' ? '🟢 (LIVE)' : `⏳ (${s.status || 'SUBMITTED'})`}
        </option>
      `).join('');
    }

    if (!PARTNER_STATE.vendorStallId || !PARTNER_STATE.stalls.some(s => s.id === PARTNER_STATE.vendorStallId)) {
      PARTNER_STATE.vendorStallId = PARTNER_STATE.stalls[0].id;
      if (select) select.value = PARTNER_STATE.vendorStallId;
    }

    // Refresh stall data pointer
    const curStall = PARTNER_STATE.stalls.find(s => s.id === PARTNER_STATE.vendorStallId);
    if (curStall && !PARTNER_STATE.vendorStallData) {
      PARTNER_STATE.vendorStallData = curStall;
    }

    subscribeToStall(PARTNER_STATE.vendorStallId);
    renderStoreStatus(PARTNER_STATE.vendorStallData || curStall);
    renderVendorActivationStatus();
    updateVendorTrustCard();
    loadVendorOrders();
    loadVendorMenuItems();
  } catch (err) {
    console.error('Failed to fetch stalls:', err);
  }
}

function deriveStoreStatus(stall) {
  if (!stall) {
    return {
      code: 'NOT_FOUND',
      label: 'NOT FOUND',
      i18nKey: 'store_status_not_found',
      isOpen: false,
      canAcceptOrders: false,
      isLive: false,
      canToggleOpen: false,
      badgeClass: 'bg-gray-100 text-gray-600 border-gray-300',
      dotClass: 'bg-gray-400',
      failedGates: ['Stall not found']
    };
  }
  const raw = (stall.status || 'APPLICATION_SUBMITTED').toUpperCase();

  if (raw === 'APPLICATION_SUBMITTED') {
    return {
      code: 'APPLICATION_SUBMITTED',
      label: 'APPLICATION PENDING',
      i18nKey: 'store_status_application_pending',
      isOpen: false,
      canAcceptOrders: false,
      isLive: false,
      canToggleOpen: false,
      badgeClass: 'bg-amber-100 text-amber-800 border-amber-300',
      dotClass: 'bg-amber-500',
      failedGates: ['Application pending review']
    };
  }
  if (raw === 'DOCUMENT_VERIFICATION') {
    return {
      code: 'DOCUMENT_VERIFICATION',
      label: 'VERIFICATION IN PROGRESS',
      i18nKey: 'store_status_verification_in_progress',
      isOpen: false,
      canAcceptOrders: false,
      isLive: false,
      canToggleOpen: false,
      badgeClass: 'bg-purple-100 text-purple-800 border-purple-300',
      dotClass: 'bg-purple-500',
      failedGates: ['Document verification in progress']
    };
  }
  if (raw === 'PHYSICAL_INSPECTION') {
    return {
      code: 'PHYSICAL_INSPECTION',
      label: 'VERIFICATION IN PROGRESS',
      i18nKey: 'store_status_verification_in_progress',
      isOpen: false,
      canAcceptOrders: false,
      isLive: false,
      canToggleOpen: false,
      badgeClass: 'bg-indigo-100 text-indigo-800 border-indigo-300',
      dotClass: 'bg-indigo-500',
      failedGates: ['Physical inspection in progress']
    };
  }
  if (raw === 'CORRECTION_REQUIRED') {
    return {
      code: 'CORRECTION_REQUIRED',
      label: 'CORRECTION REQUIRED',
      i18nKey: 'store_status_correction_required',
      isOpen: false,
      canAcceptOrders: false,
      isLive: false,
      canToggleOpen: false,
      badgeClass: 'bg-orange-100 text-orange-800 border-orange-300',
      dotClass: 'bg-orange-500',
      failedGates: ['Corrections required']
    };
  }
  if (raw === 'REJECTED') {
    return {
      code: 'REJECTED',
      label: 'APPLICATION REJECTED',
      i18nKey: 'store_status_application_rejected',
      isOpen: false,
      canAcceptOrders: false,
      isLive: false,
      canToggleOpen: false,
      badgeClass: 'bg-red-100 text-red-800 border-red-300',
      dotClass: 'bg-red-500',
      failedGates: ['Application rejected']
    };
  }
  if (raw === 'SUSPENDED') {
    return {
      code: 'SUSPENDED',
      label: 'SUSPENDED',
      i18nKey: 'store_status_suspended',
      isOpen: false,
      canAcceptOrders: false,
      isLive: false,
      canToggleOpen: false,
      badgeClass: 'bg-red-100 text-red-800 border-red-300',
      dotClass: 'bg-red-500',
      failedGates: ['Operations suspended']
    };
  }
  if (raw === 'INACTIVE') {
    return {
      code: 'INACTIVE',
      label: 'INACTIVE',
      i18nKey: 'store_status_inactive',
      isOpen: false,
      canAcceptOrders: false,
      isLive: false,
      canToggleOpen: true,
      badgeClass: 'bg-gray-200 text-gray-700 border-gray-400',
      dotClass: 'bg-gray-500',
      failedGates: []
    };
  }
  if (raw === 'APPROVED') {
    return {
      code: 'APPROVED',
      label: 'APPROVED — NOT LIVE',
      i18nKey: 'store_status_approved_not_live',
      isOpen: false,
      canAcceptOrders: false,
      isLive: false,
      canToggleOpen: true,
      badgeClass: 'bg-blue-100 text-blue-800 border-blue-300',
      dotClass: 'bg-blue-500',
      failedGates: []
    };
  }
  if (raw === 'LIVE') {
    const isOpen = stall.isOpen === true || stall.isOpen === 1 || stall.isOpen === 'true';
    if (isOpen) {
      return {
        code: 'OPEN_FOR_ORDERS',
        label: 'OPEN FOR ORDERS',
        i18nKey: 'store_open',
        isOpen: true,
        canAcceptOrders: true,
        isLive: true,
        canToggleOpen: true,
        badgeClass: 'bg-green-100 text-green-700 border-green-300',
        dotClass: 'bg-green-600',
        failedGates: []
      };
    } else {
      return {
        code: 'STORE_CLOSED',
        label: 'STORE CLOSED',
        i18nKey: 'store_closed',
        isOpen: false,
        canAcceptOrders: false,
        isLive: true,
        canToggleOpen: true,
        badgeClass: 'bg-red-100 text-red-700 border-red-300',
        dotClass: 'bg-red-600',
        failedGates: []
      };
    }
  }

  return {
    code: raw,
    label: 'APPLICATION PENDING',
    i18nKey: 'store_status_application_pending',
    isOpen: false,
    canAcceptOrders: false,
    isLive: false,
    canToggleOpen: false,
    badgeClass: 'bg-gray-100 text-gray-700 border-gray-300',
    dotClass: 'bg-gray-500',
    failedGates: []
  };
}

function renderStoreStatus(stall) {
  const toggleBtn = document.getElementById('vendorToggleOpenBtn');
  const openLabel = document.getElementById('vendorOpenLabel');
  const openDot = document.getElementById('vendorOpenDot');
  if (!toggleBtn || !openLabel) return;

  if (!stall) {
    toggleBtn.disabled = true;
    openLabel.innerText = 'NO STALL SELECTED';
    toggleBtn.className = 'px-3 py-1.5 rounded-full text-xs font-extrabold bg-gray-100 text-gray-500 border border-gray-300 flex items-center space-x-1.5 cursor-not-allowed opacity-80';
    if (openDot) openDot.className = 'w-2 h-2 rounded-full bg-gray-400';
    return;
  }

  const storeStatus = stall.store_status || deriveStoreStatus(stall);
  const labelText = (typeof t === 'function' && storeStatus.i18nKey)
    ? t(storeStatus.i18nKey, storeStatus.label)
    : storeStatus.label;

  openLabel.innerText = labelText;
  toggleBtn.disabled = !storeStatus.canToggleOpen;
  const canClick = Boolean(storeStatus.canToggleOpen);
  toggleBtn.className = `px-3 py-1.5 rounded-full text-xs font-extrabold flex items-center space-x-1.5 transition border ${storeStatus.badgeClass || 'bg-gray-100 text-gray-700 border-gray-300'} ${canClick ? 'cursor-pointer hover:opacity-90 active:scale-95 shadow-sm' : 'cursor-not-allowed opacity-90'}`;

  if (openDot) {
    openDot.className = `w-2 h-2 rounded-full ${storeStatus.dotClass || 'bg-gray-400'}`;
  }
}

async function onVendorStallChange() {
  const select = document.getElementById('vendorStallSelect');
  if (!select || !select.value) return;

  const stallId = select.value;
  PARTNER_STATE.vendorStallId = stallId;
  localStorage.setItem('thela_vendor_stall_id', stallId);

  const openLabel = document.getElementById('vendorOpenLabel');
  if (openLabel) openLabel.innerText = 'CHECKING STATUS...';

  try {
    const res = await fetch(`/api/onboard/vendor/status/${stallId}`, {
      headers: getPartnerAuthHeaders('vendor')
    });
    const data = await res.json();
    if (data.success && data.stall) {
      PARTNER_STATE.vendorStallData = data.stall;
      PARTNER_STATE.vendorGates = data.gates || [];
      PARTNER_STATE.vendorCanAcceptOrders = Boolean(data.can_accept_orders);

      const idx = PARTNER_STATE.stalls.findIndex(s => s.id === stallId);
      if (idx !== -1) {
        PARTNER_STATE.stalls[idx] = data.stall;
      } else {
        PARTNER_STATE.stalls.push(data.stall);
      }
    } else {
      PARTNER_STATE.vendorStallData = PARTNER_STATE.stalls.find(s => s.id === stallId) || null;
    }
  } catch (err) {
    console.warn('Error fetching stall details:', err);
    PARTNER_STATE.vendorStallData = PARTNER_STATE.stalls.find(s => s.id === stallId) || null;
  }

  const curStall = PARTNER_STATE.vendorStallData || PARTNER_STATE.stalls.find(s => s.id === stallId);
  renderStoreStatus(curStall);
  renderVendorActivationStatus();
  updateVendorTrustCard();
  subscribeToStall(stallId);
  loadVendorOrders();
  loadVendorMenuItems();
}

async function toggleStallOpenStatus() {
  const curStall = PARTNER_STATE.vendorStallData || PARTNER_STATE.stalls.find(s => s.id === PARTNER_STATE.vendorStallId);
  if (!curStall) {
    showToast('⚠️ No active stall selected.', 'warning');
    return;
  }

  const storeStatus = curStall.store_status || deriveStoreStatus(curStall);
  if (!storeStatus.canToggleOpen) {
    showToast(`⚠️ Store status is "${storeStatus.label}". Complete verification requirements before opening for orders.`, 'error');
    return;
  }

  const newTargetOpen = !curStall.isOpen;
  const toggleBtn = document.getElementById('vendorToggleOpenBtn');
  if (toggleBtn) {
    toggleBtn.disabled = true;
    toggleBtn.style.opacity = '0.6';
  }

  try {
    const res = await fetch(`/api/stalls/${curStall.id}/toggle-open`, {
      method: 'PATCH',
      headers: getPartnerAuthHeaders('vendor'),
      body: JSON.stringify({
        isOpen: newTargetOpen,
        expectedVersion: curStall.version
      })
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      const errMsg = data.error || 'Failed to update store status';
      const failedGates = Array.isArray(data.failedGates) && data.failedGates.length > 0
        ? `\nMissing: ${data.failedGates.join('; ')}`
        : '';
      showToast(`❌ ${errMsg}${failedGates}`, 'error');
      if (data.store_status) {
        curStall.store_status = data.store_status;
        renderStoreStatus(curStall);
      }
      return;
    }

    if (data.stall) {
      PARTNER_STATE.vendorStallData = data.stall;
      const idx = PARTNER_STATE.stalls.findIndex(s => s.id === curStall.id);
      if (idx !== -1) {
        PARTNER_STATE.stalls[idx] = data.stall;
      }
    } else {
      curStall.isOpen = newTargetOpen;
      curStall.status = newTargetOpen ? 'LIVE' : (curStall.status === 'APPROVED' ? 'APPROVED' : 'INACTIVE');
      if (data.store_status) curStall.store_status = data.store_status;
    }

    const updatedStall = PARTNER_STATE.vendorStallData || curStall;
    renderStoreStatus(updatedStall);
    renderVendorActivationStatus();
    showToast(`✅ Store status: ${updatedStall.store_status?.label || (updatedStall.isOpen ? 'OPEN FOR ORDERS' : 'STORE CLOSED')}`);
  } catch (err) {
    console.error('Failed to toggle stall status:', err);
    showToast('❌ Network error updating store status.', 'error');
  } finally {
    const updatedStall = PARTNER_STATE.vendorStallData || curStall;
    renderStoreStatus(updatedStall);
  }
}

// Expose globally for HTML event handlers
window.onVendorStallChange = onVendorStallChange;
window.toggleStallOpenStatus = toggleStallOpenStatus;

function renderVendorActivationStatus() {
  const stall = PARTNER_STATE.vendorStallData || PARTNER_STATE.stalls.find(s => s.id === PARTNER_STATE.vendorStallId);
  const card = document.getElementById('vendorActivationStatusCard');
  if (!card || !stall) return;

  // Authoritatively update top store status bar
  renderStoreStatus(stall);

  card.classList.remove('hidden');

  const status = stall.status || 'APPLICATION_SUBMITTED';
  const statusBadge = document.getElementById('vendorStatusBadge');
  const stageDesc = document.getElementById('vendorStageDesc');
  const posBadge = document.getElementById('vendorCanAcceptOrdersBadge');
  const gatesList = document.getElementById('vendorActivationGatesList');
  const iconWrap = document.getElementById('vendorStageIconWrap');

  if (status === 'LIVE') {
    statusBadge.className = 'px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800';
    statusBadge.innerText = 'LIVE • MARKETPLACE ACTIVE';
    stageDesc.innerText = 'Your stall has passed all 7 activation gates and is live for customer ordering.';
    iconWrap.className = 'w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center text-lg font-black';
    iconWrap.innerHTML = '<i class="fa-solid fa-circle-check"></i>';
    posBadge.innerHTML = '<span class="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700 inline-flex items-center space-x-1"><i class="fa-solid fa-signal"></i><span>Kitchen POS Active</span></span>';
  } else if (status === 'SUSPENDED') {
    statusBadge.className = 'px-2.5 py-0.5 rounded-full text-[10px] font-black bg-red-100 text-red-800';
    statusBadge.innerText = 'SUSPENDED';
    stageDesc.innerText = `Stall operations suspended: ${stall.suspension_reason || 'Compliance violation'}. Re-review required before reinstatement.`;
    iconWrap.className = 'w-10 h-10 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center text-lg font-black';
    iconWrap.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i>';
    posBadge.innerHTML = '<span class="px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-800 inline-flex items-center space-x-1"><i class="fa-solid fa-lock"></i><span>POS Inactive — Suspended</span></span>';
  } else if (status === 'APPROVED') {
    statusBadge.className = 'px-2.5 py-0.5 rounded-full text-[10px] font-black bg-blue-100 text-blue-800';
    statusBadge.innerText = 'APPROVED (PENDING FINAL ACTIVATION)';
    stageDesc.innerText = 'Application approved! All gates verified. Stall ready to go LIVE.';
    iconWrap.className = 'w-10 h-10 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center text-lg font-black';
    iconWrap.innerHTML = '<i class="fa-solid fa-stamp"></i>';
    posBadge.innerHTML = '<span class="px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 inline-flex items-center space-x-1"><i class="fa-solid fa-stamp"></i><span>POS Inactive — Pending Launch</span></span>';
  } else if (status === 'CORRECTION_REQUIRED') {
    statusBadge.className = 'px-2.5 py-0.5 rounded-full text-[10px] font-black bg-orange-100 text-orange-800';
    statusBadge.innerText = 'CORRECTION REQUIRED';
    stageDesc.innerText = 'Action required: Review notes and resubmit corrected stall documents.';
    iconWrap.className = 'w-10 h-10 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center text-lg font-black';
    iconWrap.innerHTML = '<i class="fa-solid fa-circle-exclamation"></i>';
    posBadge.innerHTML = '<span class="px-3 py-1 rounded-full text-xs font-bold bg-orange-100 text-orange-800 inline-flex items-center space-x-1"><i class="fa-solid fa-circle-exclamation"></i><span>POS Inactive — Corrections Required</span></span>';
  } else if (status === 'REJECTED') {
    statusBadge.className = 'px-2.5 py-0.5 rounded-full text-[10px] font-black bg-red-100 text-red-800';
    statusBadge.innerText = 'APPLICATION REJECTED';
    stageDesc.innerText = 'Application has been rejected by compliance review.';
    iconWrap.className = 'w-10 h-10 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center text-lg font-black';
    iconWrap.innerHTML = '<i class="fa-solid fa-ban"></i>';
    posBadge.innerHTML = '<span class="px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-800 inline-flex items-center space-x-1"><i class="fa-solid fa-ban"></i><span>POS Inactive — Rejected</span></span>';
  } else if (status === 'PHYSICAL_INSPECTION') {
    statusBadge.className = 'px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-800';
    statusBadge.innerText = 'PHYSICAL INSPECTION';
    stageDesc.innerText = 'On-site physical & hygiene audit scheduled. Field auditor will inspect cart and verify physical location.';
    iconWrap.className = 'w-10 h-10 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center text-lg font-black';
    iconWrap.innerHTML = '<i class="fa-solid fa-clipboard-check"></i>';
    posBadge.innerHTML = '<span class="px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 inline-flex items-center space-x-1"><i class="fa-solid fa-lock"></i><span>POS Inactive — Pending Approval</span></span>';
  } else if (status === 'DOCUMENT_VERIFICATION') {
    statusBadge.className = 'px-2.5 py-0.5 rounded-full text-[10px] font-black bg-purple-100 text-purple-800';
    statusBadge.innerText = 'DOCUMENT VERIFICATION';
    stageDesc.innerText = 'FSSAI license and vendor identity documents under compliance review.';
    iconWrap.className = 'w-10 h-10 rounded-2xl bg-purple-100 text-purple-600 flex items-center justify-center text-lg font-black';
    iconWrap.innerHTML = '<i class="fa-solid fa-file-shield"></i>';
    posBadge.innerHTML = '<span class="px-3 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-800 inline-flex items-center space-x-1"><i class="fa-solid fa-lock"></i><span>POS Inactive — Pending Approval</span></span>';
  } else {
    statusBadge.className = 'px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-800';
    statusBadge.innerText = 'APPLICATION_SUBMITTED';
    stageDesc.innerText = 'Application submitted. Stage 1 document verification pending.';
    iconWrap.className = 'w-10 h-10 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center text-lg font-black';
    iconWrap.innerHTML = '<i class="fa-solid fa-hourglass-half"></i>';
    posBadge.innerHTML = '<span class="px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 inline-flex items-center space-x-1"><i class="fa-solid fa-lock"></i><span>POS Inactive — Pending Approval</span></span>';
  }

  const gates = [
    {
      name: 'FSSAI License Verified',
      passed: stall.fssai_status === 'verified',
      detail: stall.fssai_number ? `No: ${stall.fssai_number}` : 'Awaiting FSSAI document'
    },
    {
      name: 'Physical Hygiene Audit (Score ≥ 80)',
      passed: stall.hygiene_status === 'verified' && (stall.hygiene_score || 0) >= 80,
      detail: stall.hygiene_score ? `Score: ${stall.hygiene_score}/100` : 'Field inspection pending'
    },
    {
      name: 'On-Site Location Verified',
      passed: Boolean(stall.location_verified),
      detail: stall.location_verified ? 'Verified by on-site auditor' : 'Untrusted applicant GPS evidence'
    },
    {
      name: 'Active Menu Configured',
      passed: PARTNER_STATE.vendorMenu.length > 0 || (stall.items && stall.items.length > 0),
      detail: `${PARTNER_STATE.vendorMenu.length || (stall.items ? stall.items.length : 0)} items registered`
    },
    {
      name: 'Direct Daily UPI Settled',
      passed: Boolean(stall.upi_id && stall.upi_id.includes('@')),
      detail: stall.upi_id || 'Missing UPI payout ID'
    },
    {
      name: 'Service Radius Operational Safety',
      passed: typeof stall.lat === 'number' && typeof stall.lng === 'number' && stall.lat >= 12.0 && stall.lat <= 13.5 && stall.lng >= 77.0 && stall.lng <= 78.0,
      detail: stall.lat ? `${stall.lat.toFixed(4)}° N, ${stall.lng.toFixed(4)}° E` : 'Coordinates pending'
    },
    {
      name: 'Platform Operations Approved',
      passed: ['APPROVED', 'LIVE'].includes(status),
      detail: ['APPROVED', 'LIVE'].includes(status) ? 'Formally authorized' : 'Pending final approval'
    }
  ];

  gatesList.innerHTML = gates.map(g => `
    <div class="p-2.5 rounded-xl border ${g.passed ? 'bg-emerald-50/50 border-emerald-200' : 'bg-gray-50 border-gray-200'} flex items-start space-x-2">
      <span class="mt-0.5 text-xs ${g.passed ? 'text-emerald-600' : 'text-gray-400'}">
        <i class="fa-solid ${g.passed ? 'fa-circle-check' : 'fa-circle-notch'}"></i>
      </span>
      <div class="flex-1 min-w-0">
        <div class="font-bold text-gray-900 truncate">${g.name}</div>
        <div class="text-[10px] text-gray-500">${g.detail}</div>
      </div>
      <span class="px-1.5 py-0.5 rounded text-[9px] font-black ${g.passed ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-200 text-gray-600'}">
        ${g.passed ? 'PASSED' : 'PENDING'}
      </span>
    </div>
  `).join('');
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
  if (addressText) addressText.innerText = stall.address || 'Registered Street Location';
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
    loadVendorSettlements();
  } catch (e) {
    console.error('Failed to load vendor orders:', e);
  }
}

async function loadVendorSettlements() {
  if (!PARTNER_STATE.vendorStallId) return;
  try {
    const res = await fetch(`/api/settlements/vendor/${PARTNER_STATE.vendorStallId}`, {
      headers: getPartnerAuthHeaders('vendor')
    });
    const data = await res.json();
    if (data.success) {
      renderVendorSettlements(data);
    }
  } catch (e) {
    console.error('Failed to load vendor settlements:', e);
  }
}

function renderVendorSettlements(data) {
  const grossEl = document.getElementById('vstlGrossSales');
  const commEl = document.getElementById('vstlPlatformCommission');
  const eligEl = document.getElementById('vstlEligibleBalance');
  const paidEl = document.getElementById('vstlPaidBalance');
  const tbody = document.getElementById('vendorSettlementsTableBody');

  if (grossEl) grossEl.innerText = `₹${data.summary.grossSales || 0}`;
  if (commEl) commEl.innerText = `₹${data.summary.platformCommission || 0}`;
  if (eligEl) eligEl.innerText = `₹${data.summary.eligibleBalance || 0}`;
  if (paidEl) paidEl.innerText = `₹${data.summary.paidBalance || 0}`;

  if (!tbody) return;

  const settlements = data.settlements || [];
  if (settlements.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" class="p-6 text-center text-gray-400 text-xs">
          No settlements recorded yet for this stall. Deliver orders to generate earnings.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = settlements.map(s => {
    let badgeClass = 'bg-amber-100 text-amber-800';
    let label = 'Pending';
    if (s.status === 'ELIGIBLE') { badgeClass = 'bg-emerald-100 text-emerald-800'; label = 'Eligible'; }
    else if (s.status === 'PROCESSING') { badgeClass = 'bg-blue-100 text-blue-800'; label = 'Processing'; }
    else if (s.status === 'PAID') { badgeClass = 'bg-purple-100 text-purple-800'; label = 'Paid'; }
    else if (s.status === 'CANCELLED') { badgeClass = 'bg-gray-100 text-gray-600'; label = 'Refunded / Void'; }

    return `
      <tr class="hover:bg-gray-50/80 transition">
        <td class="p-2.5 font-mono font-bold text-gray-900">#${s.order_id}</td>
        <td class="p-2.5 font-bold text-gray-800">₹${s.gross_sales || 0}</td>
        <td class="p-2.5 text-gray-500">₹${s.packaging_fee || 10}</td>
        <td class="p-2.5 text-orange-600 font-semibold">-₹${s.commission_deducted || 0}</td>
        <td class="p-2.5 font-black text-gray-900">₹${s.current_balance !== undefined ? s.current_balance : s.net_payable}</td>
        <td class="p-2.5">
          <span class="px-2 py-0.5 rounded-full text-[10px] font-black ${badgeClass}">${label}</span>
        </td>
        <td class="p-2.5 text-right font-mono text-[10px] text-gray-400">
          ${s.utr || 'Awaiting Batch'}
        </td>
      </tr>
    `;
  }).join('');
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
            <button onclick="advanceCookingStage('${order.id}', 'ACCEPTED', ${order.version || 1})" class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-sm transition">
              ${t('accept_btn', 'Accept Order')}
            </button>
            <button onclick="declineVendorOrder('${order.id}', ${order.version || 1})" class="px-3 py-2 bg-red-100 hover:bg-red-200 text-red-700 font-bold text-xs rounded-xl transition">
              ${t('decline_btn', 'Decline')}
            </button>
          ` : ''}
          ${order.status === 'ACCEPTED' ? `
            <button onclick="advanceCookingStage('${order.id}', 'PREPARING', ${order.version || 1})" class="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-sm transition flex items-center space-x-1.5">
              <i class="fa-solid fa-fire"></i>
              <span>${t('start_cooking_btn', 'Start Cooking')}</span>
            </button>
          ` : ''}
          ${order.status === 'PREPARING' ? `
            <button onclick="advanceCookingStage('${order.id}', 'READY_FOR_PICKUP', ${order.version || 1})" class="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm transition flex items-center space-x-1.5">
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

async function advanceCookingStage(orderId, nextStatus, version) {
  try {
    const res = await fetch(`/api/orders/${orderId}/status`, {
      method: 'PATCH',
      headers: getPartnerAuthHeaders('vendor'),
      body: JSON.stringify({
        status: nextStatus,
        expectedVersion: version
      })
    });
    const data = await res.json();
    if (data.success) {
      showToast(`Order #${orderId} moved to ${formatStatus(nextStatus)}`);
      loadVendorOrders();
    } else {
      showToast(data.error || 'Failed to update order stage.');
    }
  } catch (e) {
    console.error('Failed to advance stage:', e);
  }
}

async function declineVendorOrder(orderId, version) {
  const reason = prompt('Please enter reason for declining order (e.g., Sold out, kitchen rush):') || 'Vendor unable to fulfill order at this time';
  try {
    const res = await fetch(`/api/orders/${orderId}/status`, {
      method: 'PATCH',
      headers: getPartnerAuthHeaders('vendor'),
      body: JSON.stringify({
        status: 'REJECTED',
        reason: reason,
        expectedVersion: version
      })
    });
    const data = await res.json();
    if (data.success) {
      showToast(`Order #${orderId} declined.`);
      loadVendorOrders();
    } else {
      showToast(data.error || 'Failed to decline order.');
    }
  } catch (e) {
    console.error('Failed to decline order:', e);
  }
}

async function toggleStallOpenStatus() {
  const stall = PARTNER_STATE.vendorStallData || PARTNER_STATE.stalls.find(s => s.id === PARTNER_STATE.vendorStallId);
  if (!stall) return;

  if (stall.status !== 'LIVE') {
    showToast(`Cannot open store: Stall is in ${stall.status || 'SUBMITTED'} stage. Marketplace activation requires all 7 verified gates.`);
    return;
  }

  const newStatus = !stall.isOpen;
  try {
    const res = await fetch(`/api/stalls/${stall.id}/status`, {
      method: 'PATCH',
      headers: getPartnerAuthHeaders('vendor'),
      body: JSON.stringify({ isOpen: newStatus })
    });
    const data = await res.json();
    if (data.success) {
      stall.isOpen = newStatus;
      const btn = document.getElementById('vendorToggleOpenBtn');
      const label = document.getElementById('vendorOpenLabel');
      if (newStatus) {
        btn.className = 'px-3 py-1.5 rounded-full text-xs font-extrabold bg-green-100 text-green-700 flex items-center space-x-1.5 transition cursor-pointer';
        label.innerText = 'OPEN FOR ORDERS';
      } else {
        btn.className = 'px-3 py-1.5 rounded-full text-xs font-extrabold bg-red-100 text-red-700 flex items-center space-x-1.5 transition cursor-pointer';
        label.innerText = 'STORE CLOSED';
      }
      showToast(`Stall is now ${newStatus ? 'OPEN' : 'CLOSED'}`);
    } else {
      showToast(data.error || 'Cannot change store status.');
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
    // 1. Fetch authoritative rider application & gate status
    if (PARTNER_STATE.currentRiderId) {
      try {
        const rdrRes = await fetch(`/api/onboard/rider/status/${PARTNER_STATE.currentRiderId}`, {
          headers: getPartnerAuthHeaders('rider')
        });
        const rdrData = await rdrRes.json();
        if (rdrData.success && rdrData.rider) {
          PARTNER_STATE.riderData = rdrData.rider;
          PARTNER_STATE.riderGates = rdrData.gates || [];
          PARTNER_STATE.riderCanClaimGigs = Boolean(rdrData.can_claim_gigs);
          renderRiderActivationStatus();
        }
      } catch (err) {
        console.warn('Could not load rider status:', err);
      }
    }

    const res = await fetch('/api/orders');
    const data = await res.json();
    const orders = data.orders || [];

    // Active gig: order in any active rider fulfillment stage
    const activeGig = orders.find(o => ['READY_FOR_PICKUP', 'RIDER_ASSIGNED', 'RIDER_ARRIVING', 'PICKED_UP', 'OUT_FOR_DELIVERY'].includes(o.status));
    const completedTrips = orders.filter(o => o.status === 'DELIVERED');

    renderRiderActiveGig(activeGig);

    // Fetch authoritative backend rider earnings and settlements
    try {
      const stlRes = await fetch(`/api/settlements/rider/${PARTNER_STATE.currentRiderId}`, {
        headers: getPartnerAuthHeaders('rider')
      });
      const stlData = await stlRes.json();
      if (stlData.success) {
        const earnings = stlData.summary || {};
        const earningsEl = document.getElementById('riderEarningsTotal');
        if (earningsEl) {
          earningsEl.innerText = `₹${(earnings.total_earnings ?? earnings.totalEarnings ?? 0).toFixed(2)}`;
        }
        const eligibleEl = document.getElementById('riderEligibleEarnings');
        if (eligibleEl) {
          eligibleEl.innerText = `₹${(earnings.eligible_earnings ?? earnings.eligibleEarnings ?? 0).toFixed(2)}`;
        }
        renderRiderTrips(completedTrips, stlData.settlements);
      } else {
        renderRiderTrips(completedTrips);
      }
    } catch (err) {
      renderRiderTrips(completedTrips);
    }
  } catch (e) {
    console.error('Failed to load rider gigs:', e);
  }
}

function renderRiderActivationStatus() {
  const rider = PARTNER_STATE.riderData;
  const card = document.getElementById('riderActivationStatusCard');
  if (!card || !rider) return;

  card.classList.remove('hidden');

  const status = rider.status || 'APPLICATION_SUBMITTED';
  const statusBadge = document.getElementById('riderStatusBadge');
  const stageDesc = document.getElementById('riderStageDesc');
  const gigsBadge = document.getElementById('riderCanClaimGigsBadge');
  const gatesList = document.getElementById('riderActivationGatesList');
  const iconWrap = document.getElementById('riderStageIconWrap');
  const subtext = document.getElementById('riderStatusSubtext');
  const headerVehicle = document.getElementById('riderHeaderVehicle');
  const headerName = document.getElementById('riderHeaderName');

  if (headerName) headerName.innerText = rider.name || 'Delivery Partner';

  const isApproved = ['APPROVED', 'AVAILABLE'].includes(status);

  if (isApproved) {
    statusBadge.className = 'px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800';
    statusBadge.innerText = status === 'AVAILABLE' ? 'AVAILABLE (ONLINE)' : 'APPROVED (READY)';
    stageDesc.innerText = 'Your partner profile and vehicle documents have been verified by operations.';
    iconWrap.className = 'w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center text-lg font-black';
    iconWrap.innerHTML = '<i class="fa-solid fa-circle-check"></i>';
    gigsBadge.innerHTML = '<span class="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700 inline-flex items-center space-x-1"><i class="fa-solid fa-motorcycle"></i><span>Eligible for Gigs</span></span>';
    if (subtext) subtext.innerHTML = '<span class="text-emerald-600 font-bold"><i class="fa-solid fa-signal mr-1"></i>Duty: ONLINE • Ready for pickups</span>';
    if (headerVehicle) {
      headerVehicle.innerText = `${rider.vehicle || 'Fleet'} • ${rider.vehicle_number || 'EV'}`;
      headerVehicle.className = 'bg-emerald-100 text-emerald-700 font-bold px-2 py-0.5 rounded-full text-[10px]';
    }
  } else {
    statusBadge.className = 'px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-800';
    statusBadge.innerText = status;
    stageDesc.innerText = 'Application under review. Gigs cannot be claimed until identity and documents are verified.';
    iconWrap.className = 'w-10 h-10 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center text-lg font-black';
    iconWrap.innerHTML = '<i class="fa-solid fa-hourglass-half"></i>';
    gigsBadge.innerHTML = '<span class="px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700 inline-flex items-center space-x-1"><i class="fa-solid fa-ban"></i><span>Gigs Inactive (Pending Approval)</span></span>';
    if (subtext) subtext.innerHTML = '<span class="text-amber-600 font-bold"><i class="fa-solid fa-clock mr-1"></i>Duty: INACTIVE • Verification Pending</span>';
    if (headerVehicle) {
      headerVehicle.innerText = `${rider.vehicle || 'Fleet'} • ${status}`;
      headerVehicle.className = 'bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-full text-[10px]';
    }
  }

  const gates = [
    {
      name: 'Identity & Phone Check',
      passed: Boolean(rider.phone && rider.phone.length >= 10),
      detail: rider.phone ? `+91 ${rider.phone}` : 'Pending'
    },
    {
      name: 'Vehicle & Driving Details',
      passed: Boolean(rider.vehicle),
      detail: rider.vehicle ? `${rider.vehicle} (${rider.vehicle_number || 'Provided'})` : 'Pending'
    },
    {
      name: 'Direct UPI Payout Account',
      passed: Boolean(rider.upi_id && rider.upi_id.includes('@')),
      detail: rider.upi_id || 'Missing UPI address'
    },
    {
      name: 'Platform Operations Review',
      passed: isApproved,
      detail: isApproved ? 'Formally Approved' : 'Review in progress'
    }
  ];

  gatesList.innerHTML = gates.map(g => `
    <div class="p-2.5 rounded-xl border ${g.passed ? 'bg-emerald-50/50 border-emerald-200' : 'bg-gray-50 border-gray-200'} flex items-start space-x-2">
      <span class="mt-0.5 text-xs ${g.passed ? 'text-emerald-600' : 'text-gray-400'}">
        <i class="fa-solid ${g.passed ? 'fa-circle-check' : 'fa-circle-notch'}"></i>
      </span>
      <div class="flex-1 min-w-0">
        <div class="font-bold text-gray-900 truncate">${g.name}</div>
        <div class="text-[10px] text-gray-500">${g.detail}</div>
      </div>
      <span class="px-1.5 py-0.5 rounded text-[9px] font-black ${g.passed ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-200 text-gray-600'}">
        ${g.passed ? 'PASSED' : 'PENDING'}
      </span>
    </div>
  `).join('');
}

function renderRiderActiveGig(gig) {
  const container = document.getElementById('riderActiveGig');
  if (!container) return;

  if (PARTNER_STATE.riderData && !['APPROVED', 'AVAILABLE'].includes(PARTNER_STATE.riderData.status)) {
    container.innerHTML = `
      <div class="py-10 text-center text-gray-500 bg-amber-50/40 rounded-3xl border border-dashed border-amber-200 p-6">
        <div class="w-14 h-14 mx-auto mb-3 bg-amber-100 text-amber-700 rounded-2xl flex items-center justify-center text-2xl">
          <i class="fa-solid fa-id-card"></i>
        </div>
        <h3 class="font-black text-gray-900 text-base mb-1">Partner Account Under Review</h3>
        <p class="text-xs text-gray-500 max-w-md mx-auto mb-2">Your application is currently in status <strong class="font-mono text-amber-700">${PARTNER_STATE.riderData.status}</strong>. You cannot accept delivery gigs until verified and approved by operations.</p>
        <span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
          <i class="fa-solid fa-shield mr-1.5"></i>Review In Progress
        </span>
      </div>
    `;
    return;
  }

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

    <!-- Gig Action Buttons (Canonical Progression) -->
    <div class="flex flex-col sm:flex-row items-center gap-2 pt-2">
      ${gig.status === 'READY_FOR_PICKUP' ? `
        <button onclick="claimRiderGig('${gig.id}')" class="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs rounded-xl shadow-md transition flex items-center justify-center space-x-2">
          <i class="fa-solid fa-hand-holding-hand"></i>
          <span>${t('rider_claim_btn', 'Accept Delivery Gig')}</span>
        </button>
      ` : ''}

      ${gig.status === 'RIDER_ASSIGNED' ? `
        <button onclick="advanceRiderStage('${gig.id}', 'RIDER_ARRIVING', ${gig.version || 1})" class="w-full sm:flex-1 py-3 bg-amber-600 hover:bg-amber-700 text-white font-black text-xs rounded-xl shadow-md transition flex items-center justify-center space-x-2">
          <i class="fa-solid fa-motorcycle"></i>
          <span>${t('rider_arriving_btn', 'Heading to Stall')}</span>
        </button>
        <button onclick="releaseRiderGig('${gig.id}', ${gig.version || 1})" class="px-4 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold text-xs rounded-xl transition">
          <span>Release Gig</span>
        </button>
      ` : ''}

      ${gig.status === 'RIDER_ARRIVING' ? `
        <button onclick="advanceRiderStage('${gig.id}', 'PICKED_UP', ${gig.version || 1})" class="w-full sm:flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-md transition flex items-center justify-center space-x-2">
          <i class="fa-solid fa-box-open"></i>
          <span>${t('rider_collect_btn', 'Collected Food from Counter')}</span>
        </button>
        <button onclick="releaseRiderGig('${gig.id}', ${gig.version || 1})" class="px-4 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold text-xs rounded-xl transition">
          <span>Release Gig</span>
        </button>
      ` : ''}

      ${gig.status === 'PICKED_UP' ? `
        <button onclick="advanceRiderStage('${gig.id}', 'OUT_FOR_DELIVERY', ${gig.version || 1})" class="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-md transition flex items-center justify-center space-x-2">
          <i class="fa-solid fa-route"></i>
          <span>${t('rider_start_ride_btn', 'Start Delivery Ride (En Route)')}</span>
        </button>
      ` : ''}

      ${gig.status === 'OUT_FOR_DELIVERY' ? `
        <div class="w-full space-y-2">
          <div class="text-xs font-bold text-purple-700 bg-purple-50 p-2.5 rounded-xl border border-purple-200 flex items-center justify-between">
            <span>🛵 Rider en-route to customer doorstep</span>
            <span class="text-xs text-purple-600 font-bold">Ask customer for 4-digit OTP</span>
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

async function claimRiderGig(orderId) {
  if (PARTNER_STATE.riderData && !['APPROVED', 'AVAILABLE'].includes(PARTNER_STATE.riderData.status)) {
    showToast(`Cannot claim gig: Partner account is in status "${PARTNER_STATE.riderData.status}". Operations approval required.`);
    return;
  }
  try {
    const res = await fetch(`/api/orders/${orderId}/assign-rider`, {
      method: 'POST',
      headers: getPartnerAuthHeaders('rider')
    });
    const data = await res.json();
    if (data.success) {
      showToast('🛵 Delivery gig accepted! Heading to stall.');
      loadRiderOrders();
    } else {
      showToast(data.error || 'Failed to claim gig.');
    }
  } catch (e) {
    console.error('Failed to claim gig:', e);
  }
}

async function releaseRiderGig(orderId, version) {
  if (!confirm('Release this gig back to the fleet dispatch pool?')) return;
  try {
    const res = await fetch(`/api/orders/${orderId}/status`, {
      method: 'PATCH',
      headers: getPartnerAuthHeaders('rider'),
      body: JSON.stringify({
        status: 'READY_FOR_PICKUP',
        reason: 'Rider released gig for reassignment',
        expectedVersion: version
      })
    });
    const data = await res.json();
    if (data.success) {
      showToast('Gig returned to dispatch pool.');
      loadRiderOrders();
    } else {
      showToast(data.error || 'Failed to release gig.');
    }
  } catch (e) {
    console.error('Failed to release gig:', e);
  }
}

async function advanceRiderStage(orderId, nextStatus, version) {
  try {
    const res = await fetch(`/api/orders/${orderId}/status`, {
      method: 'PATCH',
      headers: getPartnerAuthHeaders('rider'),
      body: JSON.stringify({
        status: nextStatus,
        expectedVersion: version
      })
    });
    const data = await res.json();
    if (data.success) {
      showToast(`Order #${orderId} marked as ${formatStatus(nextStatus)}`);
      loadRiderOrders();
    } else {
      showToast(data.error || 'Failed to update delivery stage.');
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
      headers: getPartnerAuthHeaders('rider'),
      body: JSON.stringify({ otp: otp })
    });
    const data = await res.json();
    if (data.success) {
      showToast(`🎉 Delivery Verified! ₹40 credited to your partner account.`);
      loadRiderOrders();
    } else {
      showToast(data.error || 'Invalid OTP. Please check with customer.');
    }
  } catch (e) {
    console.error('Failed to verify OTP:', e);
  }
}

function renderRiderTrips(trips, settlements = []) {
  const container = document.getElementById('riderTripsList');
  if (!container) return;

  if (!trips || trips.length === 0) {
    container.innerHTML = `<div class="py-4 text-center text-gray-400 text-xs">${t('no_trips_yet', 'No completed trips yet today.')}</div>`;
    return;
  }

  container.innerHTML = trips.slice(0, 8).map(trip => {
    const stl = Array.isArray(settlements) ? settlements.find(s => s.order_id === trip.id) : null;
    let badgeClass = 'bg-emerald-100 text-emerald-800';
    let label = 'Eligible';

    if (stl) {
      if (stl.status === 'PENDING') { badgeClass = 'bg-amber-100 text-amber-800'; label = 'Pending'; }
      else if (stl.status === 'ELIGIBLE') { badgeClass = 'bg-emerald-100 text-emerald-800'; label = 'Eligible'; }
      else if (stl.status === 'PROCESSING') { badgeClass = 'bg-blue-100 text-blue-800'; label = 'Processing'; }
      else if (stl.status === 'PAID') { badgeClass = 'bg-purple-100 text-purple-800'; label = 'Paid'; }
      else if (stl.status === 'CANCELLED') { badgeClass = 'bg-gray-100 text-gray-600'; label = 'Cancelled'; }
    }

    const earned = stl ? (stl.current_balance !== undefined ? stl.current_balance : stl.total_earnings) : (40 + (trip.tip || 0));

    return `
      <div class="py-2.5 flex items-center justify-between">
        <div>
          <div class="font-bold text-gray-900 flex items-center space-x-1.5">
            <span>Trip #${trip.id} — ${trip.stall_name}</span>
            <span class="px-1.5 py-0.2 rounded text-[9px] font-black ${badgeClass}">${label}</span>
          </div>
          <div class="text-[10px] text-gray-400">
            ${new Date(trip.created_at).toLocaleTimeString()} • ${trip.delivery_address || 'Doorstep'}
            ${trip.tip ? `• <span class="text-orange-600 font-bold">Includes ₹${trip.tip} Tip</span>` : ''}
          </div>
        </div>
        <div class="text-right">
          <span class="font-black text-emerald-600">+₹${earned}</span>
          <div class="text-[10px] text-gray-400">${stl?.utr || 'Delivered ✓'}</div>
        </div>
      </div>
    `;
  }).join('');
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
