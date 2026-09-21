// ThelaExpress - Platform Admin & Business Management Routes
const express = require('express');
const router = express.Router();
const db = require('../db');
const wsManager = require('../websocket');

// Middleware: Derive authentication and role server-side
function authenticateUser(req, res, next) {
  const token = req.headers.authorization || req.headers['x-auth-token'];
  if (!token) {
    req.auth = { authenticated: false };
    return next();
  }
  req.auth = db.resolveAuth(token);
  next();
}

function requireAdmin(req, res, next) {
  if (!req.auth || !req.auth.authenticated || (req.auth.role !== 'admin' && req.auth.role !== 'reviewer' && req.auth.role !== 'auditor')) {
    return res.status(403).json({ error: 'Forbidden: Authorized administrative or compliance reviewer role required.' });
  }
  next();
}

router.use(authenticateUser);

// GET /api/admin/overview
router.get('/overview', requireAdmin, (req, res) => {
  const stats = db.getPlatformStats();
  const rawStalls = db.data.stalls || [];
  const stalls = rawStalls.map(s => db.formatStallForPublic(s));
  const riders = db.data.riders || [];
  const orders = (db.data.orders || []).slice(0, 20); // last 20 orders

  res.json({
    success: true,
    stats,
    stalls,
    riders,
    recentOrders: orders
  });
});

// GET /api/admin/vendor-applications (List all vendor applications with compliance state)
router.get('/vendor-applications', requireAdmin, (req, res) => {
  const { status, search } = req.query;
  let stalls = db.data.stalls || [];

  if (status && status !== 'all') {
    stalls = stalls.filter(s => s.status === status || s.verification_status === status);
  }

  if (search && search.trim()) {
    const q = search.trim().toLowerCase();
    stalls = stalls.filter(s =>
      s.name.toLowerCase().includes(q) ||
      (s.owner_name && s.owner_name.toLowerCase().includes(q)) ||
      (s.owner_phone && s.owner_phone.includes(q))
    );
  }

  const formatted = stalls.map(s => {
    const gateEval = db.validateVendorLiveActivationGates(s);
    return {
      ...s,
      gatesPassed: gateEval.eligible,
      missingRequirements: gateEval.reasons,
      menuItemCount: db.getMenuItems(s.id).length
    };
  });

  res.json({ success: true, applications: formatted });
});

// GET /api/admin/rider-applications (List all rider partner applications)
router.get('/rider-applications', requireAdmin, (req, res) => {
  const { status, search } = req.query;
  let riders = db.data.riders || [];

  if (status && status !== 'all') {
    riders = riders.filter(r => r.status === status || r.verification_status === status);
  }

  if (search && search.trim()) {
    const q = search.trim().toLowerCase();
    riders = riders.filter(r =>
      r.name.toLowerCase().includes(q) ||
      (r.phone && r.phone.includes(q)) ||
      (r.area && r.area.toLowerCase().includes(q))
    );
  }

  const formatted = riders.map(r => {
    const gateEval = db.validateRiderActivationGates(r);
    return {
      ...r,
      gatesPassed: gateEval.eligible,
      missingRequirements: gateEval.reasons
    };
  });

  res.json({ success: true, applications: formatted });
});

// POST /api/admin/stalls/:id/transition (Authoritative Stall Stage Transition)
// Zero Admin Bypass: Even admin transitions to LIVE must satisfy all 7 mandatory activation gates
router.post('/stalls/:id/transition', requireAdmin, (req, res) => {
  const { nextStatus, expectedVersion, reason, extra } = req.body;

  if (!nextStatus) {
    return res.status(400).json({ error: 'Target nextStatus is required.' });
  }

  const result = db.transitionStallStatus(req.params.id, nextStatus, {
    expectedVersion,
    actorRole: req.auth.role,
    actorId: req.auth.actorId,
    reason: reason || `Admin transitioned status to ${nextStatus}`,
    extra
  });

  if (!result.success) {
    return res.status(result.code || 400).json({
      error: result.error,
      failedGates: result.failedGates || []
    });
  }

  wsManager.broadcastAll({
    type: 'STALL_STATUS_CHANGED',
    payload: { stallId: req.params.id, status: nextStatus, action: 'STATUS_TRANSITION' }
  });

  res.json({
    success: true,
    message: `Stall status successfully transitioned to ${nextStatus}`,
    stall: result.stall,
    idempotent: Boolean(result.idempotent)
  });
});

// POST /api/admin/riders/:id/transition (Authoritative Rider Stage Transition)
router.post('/riders/:id/transition', requireAdmin, (req, res) => {
  const { nextStatus, expectedVersion, reason, extra } = req.body;

  if (!nextStatus) {
    return res.status(400).json({ error: 'Target nextStatus is required.' });
  }

  const result = db.transitionRiderStatus(req.params.id, nextStatus, {
    expectedVersion,
    actorRole: req.auth.role,
    actorId: req.auth.actorId,
    reason: reason || `Admin transitioned rider status to ${nextStatus}`,
    extra
  });

  if (!result.success) {
    return res.status(result.code || 400).json({
      error: result.error,
      failedGates: result.failedGates || []
    });
  }

  wsManager.broadcastAll({
    type: 'RIDER_STATUS_CHANGED',
    payload: { riderId: req.params.id, status: nextStatus, action: 'STATUS_TRANSITION' }
  });

  res.json({
    success: true,
    message: `Rider status successfully transitioned to ${nextStatus}`,
    rider: result.rider,
    idempotent: Boolean(result.idempotent)
  });
});

// POST /api/admin/stalls/:id/location-verify (Authorized Location Verification)
router.post('/stalls/:id/location-verify', requireAdmin, (req, res) => {
  const { verified, notes } = req.body;
  const stall = db.updateStallLocationVerification(req.params.id, {
    verified: Boolean(verified),
    verifiedBy: req.auth.actorId,
    notes
  });

  if (!stall) return res.status(404).json({ error: 'Stall not found.' });

  res.json({
    success: true,
    message: `Physical location verification updated: ${verified ? 'VERIFIED' : 'UNVERIFIED'}`,
    stall
  });
});

// PATCH /api/admin/stalls/:id/fssai (Admin FSSAI Regulatory Verification)
router.patch('/stalls/:id/fssai', requireAdmin, (req, res) => {
  const { status, fssaiNumber, expiryDate, rejectionReason, notes } = req.body;
  const stall = db.updateStallFssai(req.params.id, {
    status,
    fssaiNumber,
    expiryDate,
    rejectionReason,
    notes
  });

  if (!stall) return res.status(404).json({ error: 'Stall not found.' });

  wsManager.broadcastAll({
    type: 'STALL_VERIFICATION_CHANGED',
    payload: { stallId: stall.id, fssai: stall.fssai_status, trustBadges: stall.trustBadges }
  });

  res.json({ success: true, message: `FSSAI status updated to ${stall.fssai_status}`, stall });
});

// POST /api/admin/stalls/:id/hygiene-inspection (Admin Physical/Virtual Cart Hygiene Inspection)
router.post('/stalls/:id/hygiene-inspection', requireAdmin, (req, res) => {
  const { status, score, inspectedBy, checklist, checklistVerified, notes, verifyLocation } = req.body;
  const stall = db.recordHygieneInspection(req.params.id, {
    status: status || 'verified',
    score: score !== undefined ? parseInt(score) : 95,
    inspectedBy: inspectedBy || req.auth.actorId || 'ThelaExpress Quality Auditor',
    checklist: checklist,
    checklistVerified: checklistVerified,
    notes: notes || 'Stall inspected and certified on site.',
    verifyLocation: verifyLocation !== undefined ? Boolean(verifyLocation) : true
  });

  if (!stall) return res.status(404).json({ error: 'Stall not found.' });

  wsManager.broadcastAll({
    type: 'STALL_VERIFICATION_CHANGED',
    payload: { stallId: stall.id, hygiene: stall.hygiene_status, score: stall.hygiene_score, trustBadges: stall.trustBadges }
  });

  res.json({ success: true, message: `Hygiene inspection recorded (${stall.hygiene_status})`, stall });
});

// PATCH /api/admin/stalls/:id/identity (Admin KYC & Document Verification)
router.patch('/stalls/:id/identity', requireAdmin, (req, res) => {
  const { status, notes } = req.body;
  const stall = db.updateStallIdentity(req.params.id, { status, notes });
  if (!stall) return res.status(404).json({ error: 'Stall not found.' });

  wsManager.broadcastAll({
    type: 'STALL_VERIFICATION_CHANGED',
    payload: { stallId: stall.id, identity: stall.identity_status, trustBadges: stall.trustBadges }
  });

  res.json({ success: true, message: `Identity status updated to ${stall.identity_status}`, stall });
});

// PATCH /api/admin/stalls/:id/verify (Legacy alias - requires admin)
router.patch('/stalls/:id/verify', requireAdmin, (req, res) => {
  const { isApproved } = req.body;
  const stall = db.verifyStall(req.params.id, Boolean(isApproved));
  if (!stall) return res.status(404).json({ error: 'Stall not found.' });

  wsManager.broadcastAll({
    type: 'STALL_VERIFICATION_CHANGED',
    payload: { stallId: stall.id, is_verified: stall.is_verified, trustBadges: stall.trustBadges }
  });

  res.json({ success: true, stall });
});

// PATCH /api/admin/riders/:id/verify (Legacy alias - requires admin)
router.patch('/riders/:id/verify', requireAdmin, (req, res) => {
  const { isApproved } = req.body;
  const rider = db.verifyRider(req.params.id, Boolean(isApproved));
  if (!rider) return res.status(404).json({ error: 'Rider not found.' });

  res.json({ success: true, rider });
});

// DELETE /api/admin/stalls/:id (Permanent removal of test/spam stall applications)
router.delete('/stalls/:id', requireAdmin, (req, res) => {
  const stall = db.deleteStall(req.params.id);
  if (!stall) {
    return res.status(404).json({ error: 'Stall not found.' });
  }

  wsManager.broadcastAll({
    type: 'STALL_DELETED',
    payload: { stallId: req.params.id, name: stall.name }
  });

  res.json({
    success: true,
    message: `Stall "${stall.name}" (${req.params.id}) deleted successfully.`
  });
});

// DELETE /api/admin/riders/:id (Permanent removal of test/spam rider applications)
router.delete('/riders/:id', requireAdmin, (req, res) => {
  const rider = db.deleteRider(req.params.id);
  if (!rider) {
    return res.status(404).json({ error: 'Rider not found.' });
  }

  wsManager.broadcastAll({
    type: 'RIDER_DELETED',
    payload: { riderId: req.params.id, name: rider.name }
  });

  res.json({
    success: true,
    message: `Rider "${rider.name}" (${req.params.id}) deleted successfully.`
  });
});

// GET /api/admin/payouts (Settlement Ledger for Vendors & Riders backed by real records)
router.get('/payouts', requireAdmin, (req, res) => {
  const vendorSettlements = db.data.vendor_settlements || [];
  const riderSettlements = db.data.rider_settlements || [];
  const payoutBatches = db.data.payout_batches || [];

  // Group real settlements by stall
  const vendorGroups = {};
  vendorSettlements.forEach(s => {
    if (!vendorGroups[s.stall_id]) {
      const stall = db.getStallById(s.stall_id);
      vendorGroups[s.stall_id] = {
        stall_id: s.stall_id,
        stall_name: s.stall_name || (stall ? stall.name : 'Thela'),
        upi_id: stall ? (stall.upi_id || `${stall.owner_phone}@upi`) : 'vendor@upi',
        ordersCount: 0,
        grossSales: 0,
        platformCut: 0,
        netPayableToVendor: 0,
        eligiblePayable: 0,
        processingPayable: 0,
        paidOut: 0,
        settlement_ids: [],
        eligible_settlement_ids: [],
        processingBatchId: null,
        status: 'PENDING'
      };
    }
    const rec = vendorGroups[s.stall_id];
    rec.ordersCount += 1;
    rec.grossSales += (s.gross_sales || 0);
    rec.platformCut += (s.commission_deducted || 0);
    rec.netPayableToVendor += (s.current_balance || 0);
    rec.settlement_ids.push(s.id);
    if (s.status === 'ELIGIBLE') {
      rec.eligiblePayable += s.current_balance;
      rec.eligible_settlement_ids.push(s.id);
    }
    if (s.status === 'PROCESSING') {
      rec.processingPayable += s.current_balance;
    }
    if (s.status === 'PAID') {
      rec.paidOut += s.current_balance;
    }
  });

  // Calculate overall vendor status and link processing batches
  Object.values(vendorGroups).forEach(rec => {
    const activeBatch = payoutBatches.find(b =>
      b.status === 'PROCESSING' &&
      b.settlement_type === 'vendor' &&
      b.settlement_ids.some(id => rec.settlement_ids.includes(id))
    );
    if (activeBatch) rec.processingBatchId = activeBatch.id;

    if (rec.processingPayable > 0 || rec.processingBatchId) {
      rec.status = 'PROCESSING';
    } else if (rec.eligiblePayable > 0) {
      rec.status = 'ELIGIBLE';
    } else if (rec.paidOut > 0 && rec.netPayableToVendor === 0) {
      rec.status = 'PAID';
    } else {
      rec.status = 'PENDING';
    }
  });

  // Group real settlements by rider
  const riderGroups = {};
  riderSettlements.forEach(s => {
    const rId = s.rider_id;
    if (!rId) return; // Unassigned gig or cancelled before assignment

    if (!riderGroups[rId]) {
      const rider = db.getRiderById(rId);
      riderGroups[rId] = {
        rider_id: rId,
        rider_name: rider ? rider.name : 'Delivery Partner',
        upi_id: rider ? (rider.upi_id || `${rider.phone}@upi`) : 'rider@upi',
        deliveriesCount: 0,
        totalEarnings: 0,
        eligibleEarnings: 0,
        processingEarnings: 0,
        paidOut: 0,
        settlement_ids: [],
        eligible_settlement_ids: [],
        processingBatchId: null,
        status: 'PENDING'
      };
    }
    const rec = riderGroups[rId];
    rec.deliveriesCount += 1;
    rec.totalEarnings += (s.current_balance || 0);
    rec.settlement_ids.push(s.id);
    if (s.status === 'ELIGIBLE') {
      rec.eligibleEarnings += s.current_balance;
      rec.eligible_settlement_ids.push(s.id);
    }
    if (s.status === 'PROCESSING') {
      rec.processingEarnings += s.current_balance;
    }
    if (s.status === 'PAID') {
      rec.paidOut += s.current_balance;
    }
  });

  // Calculate overall rider status and link processing batches
  Object.values(riderGroups).forEach(rec => {
    const activeBatch = payoutBatches.find(b =>
      b.status === 'PROCESSING' &&
      b.settlement_type === 'rider' &&
      b.settlement_ids.some(id => rec.settlement_ids.includes(id))
    );
    if (activeBatch) rec.processingBatchId = activeBatch.id;

    if (rec.processingEarnings > 0 || rec.processingBatchId) {
      rec.status = 'PROCESSING';
    } else if (rec.eligibleEarnings > 0) {
      rec.status = 'ELIGIBLE';
    } else if (rec.paidOut > 0 && rec.totalEarnings === 0) {
      rec.status = 'PAID';
    } else {
      rec.status = 'PENDING';
    }
  });

  res.json({
    success: true,
    vendorSettlements: Object.values(vendorGroups),
    riderSettlements: Object.values(riderGroups),
    rawVendorRecords: vendorSettlements,
    rawRiderRecords: riderSettlements,
    payoutBatches: (payoutBatches || []).slice(-15).reverse()
  });
});

// GET /api/admin/reconciliation (Double-entry reconciliation monitor)
router.get('/reconciliation', requireAdmin, (req, res) => {
  const result = db.getReconciliationReport(req.auth);
  res.json(result);
});

// PATCH /api/admin/settings
router.patch('/settings', requireAdmin, (req, res) => {
  const updated = db.updateSettings(req.body);
  res.json({ success: true, settings: updated });
});

module.exports = router;
