// ThelaExpress - Real Vendor & Rider Self-Onboarding Routes
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

// POST /api/onboard/vendor (Real Street Food Stall Application Submission)
// Server-authoritative: Submitting an application puts stall in APPLICATION_SUBMITTED (NEVER LIVE)
router.post('/vendor', (req, res) => {
  const {
    owner_name,
    owner_phone,
    name,
    category,
    specialty,
    address,
    landmark,
    lat,
    lng,
    location_accuracy,
    location_accuracy_meters,
    location_source,
    upi_id,
    fssai_number,
    isVeg,
    imageUrl,
    menu_items
  } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Stall or cart brand name is required.' });
  }

  if (!owner_phone) {
    return res.status(400).json({ error: 'Owner mobile phone number is required.' });
  }

  const cleanPhone = owner_phone.replace(/\D/g, '').slice(-10);
  if (cleanPhone.length !== 10) {
    return res.status(400).json({ error: 'Please enter a valid 10-digit Indian mobile number.' });
  }

  const accVal = (typeof location_accuracy === 'number' ? location_accuracy : (typeof location_accuracy_meters === 'number' ? location_accuracy_meters : parseFloat(location_accuracy || location_accuracy_meters) || null));

  const result = db.registerStall({
    owner_name: (owner_name || 'Vendor Applicant').trim(),
    owner_phone: cleanPhone,
    name: name.trim(),
    category: category || 'chaat',
    specialty: (specialty || 'Authentic Street Bites').trim(),
    address: (address || 'Street Address').trim(),
    landmark: (landmark || '').trim(),
    lat: lat || null,
    lng: lng || null,
    location_accuracy: accVal,
    location_accuracy_meters: accVal,
    location_source: location_source || 'browser_applicant',
    upi_id: (upi_id || '').trim(),
    fssai_number: (fssai_number || '').trim(),
    isVeg: isVeg !== undefined ? isVeg : true,
    imageUrl: imageUrl || 'https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=800&q=80',
    hygieneHighlights: req.body.hygieneHighlights || []
  }, menu_items || []);

  console.log(`[ONBOARD] Vendor Application submitted: ${result.stall.name} (${result.stall.id}) by ${cleanPhone} [Status: ${result.stall.status}]`);

  // Notice: We deliberately DO NOT broadcast NEW_STALL_ADDED to customer app
  // because unapproved stalls must remain 100% invisible until LIVE activation.

  const scopedToken = `thela_tok_vendor_${result.stall.id}`;

  res.status(201).json({
    success: true,
    message: 'Application submitted — verification pending',
    status: result.stall.status,
    verification_status: result.stall.verification_status,
    stall: result.stall,
    token: scopedToken,
    applicant_token: scopedToken,
    timeline: result.stall.timeline,
    next_steps: [
      'Stage 1: Document Verification — Legal identity & FSSAI registration audit',
      'Stage 2: Physical Hygiene Inspection — On-site cart and water sanitization audit',
      'Stage 3: Approval & Activation — Authoritative approval to unlock live customer ordering'
    ],
    posUrl: `/partner.html?role=vendor&stallId=${result.stall.id}`
  });
});

// GET /api/onboard/vendor/status/:id (Vendor Application Status Tracking)
router.get('/vendor/status/:id', (req, res) => {
  // Authorization check: only owner or admin can view application status
  if (!req.auth || !req.auth.authenticated) {
    return res.status(401).json({ error: 'Authentication required to view application status.' });
  }
  const isOwner = req.auth.role === 'vendor' && (req.auth.stallId === req.params.id || req.auth.ownedStallIds?.includes(req.params.id));
  const isAdmin = req.auth.role === 'admin';
  if (!isOwner && !isAdmin) {
    return res.status(403).json({ error: 'Forbidden: You are not authorized to view this application.' });
  }

  const stall = db.getStallById(req.params.id);
  if (!stall) {
    return res.status(404).json({ error: 'Stall application not found.' });
  }

  const gateEvaluation = db.validateVendorLiveActivationGates(stall);
  const formatted = db.formatStallForPublic(stall);
  const storeStatus = formatted.store_status || db.getStallStoreStatus(stall);

  res.json({
    success: true,
    stall: formatted,
    stallId: stall.id,
    stallName: stall.name,
    status: stall.status,
    verification_status: stall.verification_status,
    isOpen: storeStatus.isOpen,
    store_status: storeStatus,
    store_status_label: storeStatus.label,
    effective_store_status: storeStatus.code,
    can_accept_orders: storeStatus.canAcceptOrders,
    gatesPassed: gateEvaluation.eligible,
    missingRequirements: gateEvaluation.reasons,
    locationVerified: stall.location_verified,
    fssaiStatus: stall.fssai_status,
    hygieneStatus: stall.hygiene_status,
    timeline: stall.timeline || [],
    version: stall.version
  });
});

// POST /api/onboard/rider (Real Delivery Partner Registration)
// Server-authoritative: Submitting putting rider in APPLICATION_SUBMITTED (NEVER AVAILABLE)
router.post('/rider', (req, res) => {
  const {
    name,
    phone,
    vehicle,
    vehicle_number,
    upi_id,
    area
  } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Rider full name is required.' });
  }

  if (!phone) {
    return res.status(400).json({ error: 'Rider mobile phone number is required.' });
  }

  const cleanPhone = phone.replace(/\D/g, '').slice(-10);
  if (cleanPhone.length !== 10) {
    return res.status(400).json({ error: 'Please enter a valid 10-digit Indian mobile number.' });
  }

  const rider = db.registerRider({
    name: name.trim(),
    phone: cleanPhone,
    vehicle: vehicle || 'EV Scooter',
    vehicle_number: (vehicle_number || '').trim(),
    upi_id: (upi_id || '').trim(),
    area: (area || 'Operating Zone').trim()
  });

  console.log(`[ONBOARD] Rider Application submitted: ${rider.name} (${rider.id}) Phone: ${cleanPhone} [Status: ${rider.status}]`);

  const scopedToken = `thela_tok_rider_${rider.id}`;

  res.status(201).json({
    success: true,
    message: 'Application submitted — review pending',
    status: rider.status,
    verification_status: rider.verification_status,
    rider,
    token: scopedToken,
    applicant_token: scopedToken,
    timeline: rider.timeline,
    payout_rule: 'Configured Payout Rule: ₹40.00 / Delivery upon verified doorstep OTP (Active upon partner approval)',
    next_steps: [
      'Stage 1: Identity Review — Driving license, national ID, and vehicle registration review',
      'Stage 2: Partner Approval — Security clearance and dispatch pool activation',
      'Stage 3: Available for Orders — Open delivery console and go online for live orders'
    ],
    consoleUrl: `/partner.html?role=rider&riderId=${rider.id}`
  });
});

// GET /api/onboard/rider/status/:id (Rider Application Status Tracking)
router.get('/rider/status/:id', (req, res) => {
  // Authorization check: only rider itself or admin can view status
  if (!req.auth || !req.auth.authenticated) {
    return res.status(401).json({ error: 'Authentication required to view application status.' });
  }
  const isSelf = req.auth.role === 'rider' && req.auth.actorId === req.params.id;
  const isAdmin = req.auth.role === 'admin';
  if (!isSelf && !isAdmin) {
    return res.status(403).json({ error: 'Forbidden: You are not authorized to view this application.' });
  }

  const rider = db.getRiderById(req.params.id);
  if (!rider) {
    return res.status(404).json({ error: 'Rider application not found.' });
  }

  const gateEvaluation = db.validateRiderActivationGates(rider);

  res.json({
    success: true,
    rider,
    riderId: rider.id,
    riderName: rider.name,
    status: rider.status,
    verification_status: rider.verification_status,
    isOnline: rider.is_online,
    gatesPassed: gateEvaluation.eligible,
    missingRequirements: gateEvaluation.reasons,
    timeline: rider.timeline || [],
    version: rider.version
  });
});

module.exports = router;
