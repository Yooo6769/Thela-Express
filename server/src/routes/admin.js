// ThelaExpress - Platform Admin & Business Management Routes
const express = require('express');
const router = express.Router();
const db = require('../db');
const wsManager = require('../websocket');

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

// GET /api/admin/payouts (Settlement Ledger for Vendors & Riders)
router.get('/payouts', (req, res) => {
  const orders = db.data.orders || [];
  const deliveredOrders = orders.filter(o => o.status === 'DELIVERED');
  const commissionPct = db.data.settings?.platformCommissionPct || 10;
  const riderPayoutFlat = db.data.settings?.riderPayoutFlat || 40;

  // Aggregate by Stall
  const vendorPayouts = {};
  deliveredOrders.forEach(o => {
    if (!vendorPayouts[o.stall_id]) {
      const stall = db.getStallById(o.stall_id);
      vendorPayouts[o.stall_id] = {
        stall_id: o.stall_id,
        stall_name: o.stall_name,
        upi_id: stall ? (stall.upi_id || `${stall.owner_phone}@upi`) : 'vendor@upi',
        ordersCount: 0,
        grossSales: 0,
        platformCut: 0,
        netPayableToVendor: 0
      };
    }
    const rec = vendorPayouts[o.stall_id];
    rec.ordersCount += 1;
    rec.grossSales += (o.subtotal || 0);
    const cut = Math.round(((o.subtotal || 0) * commissionPct) / 100);
    rec.platformCut += cut;
    rec.netPayableToVendor += ((o.subtotal || 0) - cut);
  });

  // Aggregate by Rider
  const riderPayouts = {};
  deliveredOrders.forEach(o => {
    const rId = o.rider_id || 'rdr_1';
    if (!riderPayouts[rId]) {
      const rider = db.getRiderById(rId);
      riderPayouts[rId] = {
        rider_id: rId,
        rider_name: rider ? rider.name : 'Ramesh Kumar',
        upi_id: rider ? (rider.upi_id || `${rider.phone}@upi`) : 'rider@upi',
        deliveriesCount: 0,
        totalPayout: 0
      };
    }
    riderPayouts[rId].deliveriesCount += 1;
    riderPayouts[rId].totalPayout += riderPayoutFlat;
  });

  res.json({
    success: true,
    vendorSettlements: Object.values(vendorPayouts),
    riderSettlements: Object.values(riderPayouts)
  });
});

// PATCH /api/admin/settings
router.patch('/settings', (req, res) => {
  const updated = db.updateSettings(req.body);
  res.json({ success: true, settings: updated });
});

module.exports = router;
