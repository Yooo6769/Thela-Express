// ThelaExpress - Stalls & Menu Catalog Routes
const express = require('express');
const router = express.Router();
const db = require('../db');
const wsManager = require('../websocket');

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

// GET /api/stalls
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
  const items = db.getMenuItems(stall.id);
  res.json({ stall: db.formatStallForPublic(stall), items });
});

// GET /api/stalls/:id/trust (Full Trust & Verification Transparency Dossier)
router.get('/:id/trust', (req, res) => {
  const stall = db.getStallById(req.params.id);
  if (!stall) {
    return res.status(404).json({ error: 'Stall not found.' });
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
      lat: stall.lat,
      lng: stall.lng
    },
    stallId: stall.id,
    stallName: stall.name,
    ownerName: stall.owner_name,
    address: stall.address,
    lat: stall.lat,
    lng: stall.lng,
    badges: formatted.trustBadges,
    fssai: {
      status: stall.fssai_status || (stall.fssai_number ? 'submitted' : 'not_submitted'),
      number: rawFssai,
      maskedNumber: maskedFssai,
      registrationNumber: maskedFssai,
      verifiedAt: stall.fssai_verified_at,
      expiryDate: stall.fssai_expiry_date,
      rejectionReason: stall.fssai_rejection_reason,
      notes: stall.fssai_notes || ''
    },
    hygiene: {
      status: stall.hygiene_status || 'not_inspected',
      score: stall.hygiene_score,
      verifiedAt: stall.hygiene_verified_at,
      inspectedBy: stall.hygiene_inspected_by,
      checklist: stall.hygiene_checklist_verified || {},
      checklistVerified: Array.isArray(stall.hygiene_checklist_verified) ? stall.hygiene_checklist_verified : (stall.hygiene_checklist_verified ? Object.keys(stall.hygiene_checklist_verified).filter(k => stall.hygiene_checklist_verified[k]) : []),
      completedChecks: Array.isArray(stall.hygiene_checklist_verified) ? stall.hygiene_checklist_verified : (stall.hygiene_checklist_verified ? Object.keys(stall.hygiene_checklist_verified).filter(k => stall.hygiene_checklist_verified[k]) : []),
      selfDeclaration: stall.hygiene_self_declaration || [],
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
  });
});

// PATCH /api/stalls/:id/toggle-open
router.patch('/:id/toggle-open', (req, res) => {
  const stall = db.getStallById(req.params.id);
  if (!stall) {
    return res.status(404).json({ error: 'Stall not found.' });
  }

  const updated = db.updateStall(stall.id, { isOpen: !stall.isOpen });
  
  wsManager.broadcastAll({
    type: 'STALL_STATUS_CHANGED',
    payload: { stallId: stall.id, isOpen: updated.isOpen }
  });

  res.json({ success: true, stall: updated });
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
