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

router.use(authenticateUser);

// GET /api/admin/overview
router.get('/overview', (req, res) => {
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

// PATCH /api/admin/stalls/:id/fssai (Admin FSSAI Verification Lifecycle)
router.patch('/stalls/:id/fssai', (req, res) => {
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
router.post('/stalls/:id/hygiene-inspection', (req, res) => {
  const { status, score, inspectedBy, checklist, checklistVerified, notes } = req.body;
  const stall = db.recordHygieneInspection(req.params.id, {
    status: status || 'verified',
    score: score !== undefined ? parseInt(score) : 95,
    inspectedBy: inspectedBy || 'ThelaExpress Quality Auditor',
    checklist: checklist,
    checklistVerified: checklistVerified,
    notes: notes || 'Stall inspected and approved on site.'
  });

  if (!stall) return res.status(404).json({ error: 'Stall not found.' });

  wsManager.broadcastAll({
    type: 'STALL_VERIFICATION_CHANGED',
    payload: { stallId: stall.id, hygiene: stall.hygiene_status, score: stall.hygiene_score, trustBadges: stall.trustBadges }
  });

  res.json({ success: true, message: `Hygiene inspection recorded (${stall.hygiene_status})`, stall });
});

// PATCH /api/admin/stalls/:id/identity (Admin KYC & Location Verification)
router.patch('/stalls/:id/identity', (req, res) => {
  const { status, notes } = req.body;
  const stall = db.updateStallIdentity(req.params.id, { status, notes });
  if (!stall) return res.status(404).json({ error: 'Stall not found.' });

  wsManager.broadcastAll({
    type: 'STALL_VERIFICATION_CHANGED',
    payload: { stallId: stall.id, identity: stall.identity_status, trustBadges: stall.trustBadges }
  });

  res.json({ success: true, message: `Identity status updated to ${stall.identity_status}`, stall });
});

// PATCH /api/admin/stalls/:id/verify (Legacy alias)
router.patch('/stalls/:id/verify', (req, res) => {
  const { isApproved } = req.body;
  const stall = db.verifyStall(req.params.id, Boolean(isApproved));
  if (!stall) return res.status(404).json({ error: 'Stall not found.' });

  wsManager.broadcastAll({
    type: 'STALL_VERIFICATION_CHANGED',
    payload: { stallId: stall.id, is_verified: stall.is_verified, trustBadges: stall.trustBadges }
  });

  res.json({ success: true, stall });
});

// PATCH /api/admin/riders/:id/verify
router.patch('/riders/:id/verify', (req, res) => {
  const { isApproved } = req.body;
  const rider = db.verifyRider(req.params.id, Boolean(isApproved));
  if (!rider) return res.status(404).json({ error: 'Rider not found.' });

  res.json({ success: true, rider });
});

// GET /api/admin/payouts (Settlement Ledger for Vendors & Riders backed by real records)
router.get('/payouts', (req, res) => {
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
router.get('/reconciliation', (req, res) => {
  const result = db.getReconciliationReport(req.auth);
  res.json(result);
});

// PATCH /api/admin/settings
router.patch('/settings', (req, res) => {
  const updated = db.updateSettings(req.body);
  res.json({ success: true, settings: updated });
});

module.exports = router;
