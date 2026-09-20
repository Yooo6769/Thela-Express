// ThelaExpress - Stalls & Menu Catalog Routes
const express = require('express');
const router = express.Router();
const db = require('../db');
const wsManager = require('../websocket');

// Middleware to resolve auth token if present
function authenticateRequest(req, res, next) {
  const token = req.headers.authorization || req.headers['x-auth-token'];
  if (!token) {
    req.auth = { authenticated: false };
    return next();
  }
  req.auth = db.resolveAuth(token);
  next();
}

router.use(authenticateRequest);

// GET /api/stalls/categories (All available street food categories + custom vendor categories)
router.get('/categories', (req, res) => {
  res.json({ categories: db.getCategories() });
});

// GET /api/stalls/capacity (Live Platform Delivery Capacity Telemetry)
router.get('/capacity', (req, res) => {
  res.json({
    success: true,
    capacity: db.getDeliveryCapacity()
  });
});

// GET /api/stalls (Returns ONLY stalls that are LIVE and compliant with mandatory gates)
router.get('/', (req, res) => {
  const { category, search, vegOnly, lat, lng } = req.query;
  let stalls = db.getStalls(category, lat, lng);

  if (vegOnly === 'true') {
    stalls = stalls.filter(s => s.isVeg);
  }

  if (search && search.trim()) {
    const q = search.toLowerCase();
    stalls = stalls.filter(s => 
      s.name.toLowerCase().includes(q) || 
      s.specialty.toLowerCase().includes(q)
    );
  }

  res.json({ stalls, capacity: db.getDeliveryCapacity() });
});

// GET /api/stalls/:id
router.get('/:id', (req, res) => {
  const stall = db.getStallById(req.params.id);
  if (!stall) {
    return res.status(404).json({ error: 'Stall not found.' });
  }

  // If stall is not LIVE, only authorized owner or admin can view it
  if (stall.status !== 'LIVE' || !stall.isOpen) {
    const isOwner = req.auth?.authenticated && req.auth.role === 'vendor' &&
      (req.auth.stallId === stall.id || req.auth.ownedStallIds?.includes(stall.id));
    const isAdmin = req.auth?.authenticated && req.auth.role === 'admin';

    if (!isOwner && !isAdmin) {
      return res.status(404).json({ error: 'Stall not available or undergoing verification.' });
    }
  }

  const items = db.getMenuItems(stall.id);
  res.json({ stall: db.formatStallForPublic(stall), items });
});

// GET /api/stalls/:id/trust (Full Trust & Verification Transparency Dossier)
router.get('/:id/trust', (req, res) => {
  const stall = db.getStallById(req.params.id);
  if (!stall) {
    return res.status(404).json({ error: 'Stall not found.' });
  }

  // If stall is not LIVE, protect from public unless owner/admin
  if (stall.status !== 'LIVE' || !stall.isOpen) {
    const isOwner = req.auth?.authenticated && req.auth.role === 'vendor' &&
      (req.auth.stallId === stall.id || req.auth.ownedStallIds?.includes(stall.id));
    const isAdmin = req.auth?.authenticated && req.auth.role === 'admin';

    if (!isOwner && !isAdmin) {
      return res.status(404).json({ error: 'Trust dossier unavailable for unverified stall.' });
    }
  }

  const formatted = db.formatStallForPublic(stall);
  const rawFssai = stall.fssai_number || '';
  const maskedFssai = rawFssai.length > 6 
    ? `${rawFssai.slice(0, 4)}••••${rawFssai.slice(-4)}`
    : (rawFssai || 'Not Submitted');

  res.json({
    success: true,
    stall: {
      id: stall.id,
      name: stall.name,
      ownerName: stall.owner_name,
      address: stall.address,
      location: { lat: stall.lat, lng: stall.lng },
      locationVerified: Boolean(stall.location_verified),
      trustBadges: formatted.trustBadges,
      hygieneScore: stall.hygiene_score || null,
      ordersCount: formatted.ordersCount,
      fssai: {
        numberMasked: maskedFssai,
        status: stall.fssai_status || 'not_submitted',
        verifiedAt: stall.fssai_verified_at,
        expiryDate: stall.fssai_expiry_date
      },
      hygiene: {
        status: stall.hygiene_status || 'not_inspected',
        verifiedAt: stall.hygiene_verified_at,
        score: stall.hygiene_score,
        inspectedBy: stall.hygiene_inspected_by,
        notes: stall.hygiene_notes || ''
      },
      completedChecks: Array.isArray(stall.hygiene_checklist_verified) ? stall.hygiene_checklist_verified : (stall.hygiene_checklist_verified ? Object.keys(stall.hygiene_checklist_verified).filter(k => stall.hygiene_checklist_verified[k]) : []),
      identity: {
        status: stall.identity_status || 'pending',
        verifiedAt: stall.identity_verified_at,
        isVerified: Boolean(stall.is_verified)
      },
      auditStandard: {
        frequency: 'Every 90 days',
        standards: ['RO Mineral Water', 'Covered Glass Food Cart', '100% Food-Grade Dona & Paper', 'Fresh Oil Standard'],
        reportingContact: 'grievance@thelaexpress.in'
      }
    }
  });
});

// GET /api/stalls/:id/status
// Returns authoritative store status, open state, and verification details
router.get('/:id/status', (req, res) => {
  const stall = db.getStallById(req.params.id);
  if (!stall) {
    return res.status(404).json({ error: 'Stall not found.' });
  }
  const storeStatus = db.getStallStoreStatus(stall);
  res.json({
    success: true,
    stallId: stall.id,
    stallName: stall.name,
    status: stall.status,
    isOpen: storeStatus.isOpen,
    canAcceptOrders: storeStatus.canAcceptOrders,
    store_status: storeStatus
  });
});

// PATCH /api/stalls/:id/status, /api/stalls/:id/toggle-open, or /api/stalls/:id/toggle-live
// Server-authoritative: A stall can only be toggled LIVE if it is APPROVED and satisfies all 7 activation gates
router.patch(['/:id/status', '/:id/toggle-open', '/:id/toggle-live'], (req, res) => {
  const stall = db.getStallById(req.params.id);
  if (!stall) {
    return res.status(404).json({ error: 'Stall not found.' });
  }

  // Authorization check
  if (!req.auth || !req.auth.authenticated) {
    return res.status(401).json({ error: 'Authentication required.' });
  }
  const isOwner = req.auth.role === 'vendor' &&
    (req.auth.stallId === stall.id || req.auth.ownedStallIds?.includes(stall.id));
  const isAdmin = req.auth.role === 'admin';

  if (!isOwner && !isAdmin) {
    return res.status(403).json({ error: 'Forbidden: You are not authorized to modify this stall status.' });
  }

  const willBeOpen = req.body.isOpen !== undefined ? Boolean(req.body.isOpen) : !stall.isOpen;
  const currentStoreStatus = db.getStallStoreStatus(stall);

  // If opening is requested but stall is in non-eligible status, block immediately
  if (willBeOpen && !['APPROVED', 'LIVE', 'INACTIVE'].includes(stall.status)) {
    return res.status(400).json({
      error: `Store open toggle blocked. Stall is currently in state "${currentStoreStatus.label}". It must be APPROVED and satisfy all 7 activation gates before opening for orders.`,
      store_status: currentStoreStatus,
      failedGates: currentStoreStatus.failedGates || []
    });
  }

  // Case 1: Stall is already LIVE and owner toggles daily open/close
  if (stall.status === 'LIVE') {
    if (willBeOpen) {
      const gateResult = db.validateVendorLiveActivationGates(stall);
      if (!gateResult.eligible) {
        stall.isOpen = false;
        db.save();
        const formatted = db.formatStallForPublic(stall);
        return res.status(400).json({
          error: `Cannot open stall for orders. Mandatory compliance gates failed: ${gateResult.reasons.join('; ')}`,
          failedGates: gateResult.reasons,
          store_status: formatted.store_status
        });
      }
      stall.isOpen = true;
      stall.updated_at = new Date().toISOString();
      db.save();
    } else {
      stall.isOpen = false;
      stall.updated_at = new Date().toISOString();
      db.save();
    }

    const formatted = db.formatStallForPublic(stall);
    wsManager.broadcastAll({
      type: 'STALL_STATUS_CHANGED',
      payload: { stallId: stall.id, isOpen: stall.isOpen, status: stall.status, store_status: formatted.store_status }
    });

    return res.json({ success: true, stall: formatted, store_status: formatted.store_status });
  }

  // Case 2: Transitioning from APPROVED or INACTIVE to LIVE (or closing to INACTIVE)
  const targetStatus = willBeOpen ? 'LIVE' : 'INACTIVE';
  const result = db.transitionStallStatus(stall.id, targetStatus, {
    expectedVersion: req.body.expectedVersion,
    actorRole: req.auth.role,
    actorId: req.auth.actorId,
    reason: willBeOpen ? 'Vendor opened kitchen for orders' : 'Vendor closed kitchen'
  });

  if (!result.success) {
    return res.status(result.code || 400).json({
      error: result.error,
      failedGates: result.failedGates || [],
      store_status: db.getStallStoreStatus(stall)
    });
  }

  wsManager.broadcastAll({
    type: 'STALL_STATUS_CHANGED',
    payload: { stallId: stall.id, isOpen: willBeOpen, status: targetStatus, store_status: result.stall?.store_status }
  });

  res.json({ success: true, stall: result.stall, store_status: result.stall?.store_status });
});

// PATCH /api/stalls/menu/:itemId/stock
router.patch('/menu/:itemId/stock', (req, res) => {
  const { inStock } = req.body;
  const updatedItem = db.toggleItemStock(req.params.itemId, inStock);
  if (!updatedItem) {
    return res.status(404).json({ error: 'Item not found.' });
  }

  wsManager.broadcastToStall(updatedItem.stall_id, {
    type: 'ITEM_STOCK_CHANGED',
    payload: { itemId: updatedItem.id, inStock: updatedItem.inStock }
  });

  res.json({ success: true, item: updatedItem });
});

module.exports = router;
