// ThelaExpress - Production-Grade Centralized Order Lifecycle Router
const express = require('express');
const router = express.Router();
const db = require('../db');
const wsManager = require('../websocket');
const { calculateOrderPricing } = require('../payments/pricing_engine');

// Middleware: Authenticate and derive role strictly server-side
function authenticateUser(req, res, next) {
  const token = req.headers.authorization || req.headers['x-auth-token'];
  if (!token) {
    req.auth = { authenticated: false };
    return next();
  }
  const auth = db.resolveAuth(token);
  req.auth = auth;
  next();
}

function requireAuth(req, res, next) {
  if (!req.auth || !req.auth.authenticated) {
    return res.status(401).json({ error: 'Authentication required. Please log in.' });
  }
  next();
}

router.use(authenticateUser);

// POST /api/orders (Create Order)
// Client CANNOT supply payment_status: PAID; payment_status is ALWAYS initialized to PENDING.
// Client prices, fees, totals, and commissions are completely discarded; calculated authoritatively server-side.
router.post('/', (req, res) => {
  const {
    stall_id,
    stall_name,
    items,
    tip,
    delivery_address,
    delivery_instruction,
    payment_method,
    coupon_code,
    couponCode,
    testOtp
  } = req.body;

  if (!stall_id || !items || items.length === 0) {
    return res.status(400).json({ error: 'Order must contain items and a valid stall.' });
  }

  const stall = db.getStallById(stall_id);
  if (!stall) {
    return res.status(404).json({ error: 'Stall not found.' });
  }

  // Continuous LIVE Revalidation Gate: Stall must be currently LIVE, open, and compliant with all mandatory activation gates
  const acceptanceCheck = db.checkStallCanAcceptOrders(stall);
  if (!acceptanceCheck.canAccept) {
    return res.status(400).json({ error: `Cannot place order: ${acceptanceCheck.reason}` });
  }

  // Authoritative server-side price calculation
  let pricingResult;
  try {
    pricingResult = calculateOrderPricing({
      stall,
      stallMenuItems: db.getMenuItems(stall_id),
      items,
      clientTip: tip,
      couponCode: coupon_code || couponCode,
      platformSettings: db.data.settings || {}
    });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }

  // Derive customer details from authenticated session if available
  const customerId = req.auth?.authenticated ? req.auth.actorId : (req.body.customer_id || '');
  const customerPhone = (req.auth?.phone || req.body.customer_phone || '').replace(/\D/g, '').slice(-10);
  const customerName = (req.auth?.user?.name || req.body.customer_name || 'Customer');

  // Any client-supplied payment_status, subtotal, discount, grand_total in req.body is completely ignored.
  const order = db.createOrder({
    customer_id: customerId,
    customer_name: customerName,
    customer_phone: customerPhone,
    stall_id,
    stall_name: stall.name || stall_name,
    items: pricingResult.items,
    tip: pricingResult.pricing.tip,
    delivery_address: delivery_address || '',
    delivery_instruction: delivery_instruction || 'Leave at Door',
    payment_method: payment_method || 'UPI',
    ...(process.env.NODE_ENV === 'test' && testOtp ? { testOtp } : {})
  });

  console.log(`[ORDER] Order created #${order.id} for stall ${stall_name} [Status: ${order.status}, Payment: ${order.payment_status}]`);

  // WebSocket notifications (downstream alerts only)
  wsManager.broadcastToStall(stall_id, {
    type: 'NEW_ORDER_RECEIVED',
    payload: {
      order: db.formatOrderForPublic(order),
      sound: 'bell_chime',
      message: `New Order #${order.id} received! ₹${order.grand_total}`
    }
  });

  wsManager.broadcastAll({
    type: 'NEW_PICKUP_AVAILABLE',
    payload: {
      orderId: order.id,
      stallName: order.stall_name,
      address: order.delivery_address,
      payout: 40
    }
  });

  // Return formatted order to customer with OTP decrypted for customer view
  const publicOrder = db.formatOrderForPublic(order, {
    role: 'customer',
    actorId: customerId,
    phone: customerPhone
  });

  res.status(201).json({ success: true, order: publicOrder });
});

// GET /api/orders (Orders list)
router.get('/', (req, res) => {
  const orders = db.getOrders().map(o => db.formatOrderForPublic(o, req.auth));
  res.json({ orders });
});

// GET /api/orders/user/:phone
router.get('/user/:phone', (req, res) => {
  const cleanPhone = req.params.phone.replace(/\D/g, '').slice(-10);
  const orders = db.getOrdersByCustomer(cleanPhone).map(o => db.formatOrderForPublic(o, req.auth));
  res.json({ orders });
});

// GET /api/orders/stall/:stallId
router.get('/stall/:stallId', (req, res) => {
  const orders = db.getOrdersByStall(req.params.stallId).map(o => db.formatOrderForPublic(o, req.auth));
  res.json({ orders });
});

// GET /api/orders/:id
router.get('/:id', (req, res) => {
  const order = db.getOrderById(req.params.id);
  if (!order) return res.status(404).json({ error: 'Order not found.' });
  res.json({ order: db.formatOrderForPublic(order, req.auth) });
});

// PATCH /api/orders/:id/status (Transition Status)
// Never trusts client-supplied role or riderId from body or query!
router.patch('/:id/status', requireAuth, (req, res) => {
  const { status, etaMinutes, reason, expectedVersion } = req.body;
  const order = db.getOrderById(req.params.id);

  if (!order) {
    return res.status(404).json({ error: 'Order not found.' });
  }

  // Derive role and actorId strictly from req.auth
  const actorRole = req.auth.role;
  const actorId = req.auth.actorId;

  // 1. Enforce ownership server-side
  if (actorRole === 'vendor') {
    const isOwner = req.auth.ownedStallIds?.includes(order.stall_id);
    if (!isOwner) {
      return res.status(403).json({ error: 'Forbidden: You do not own the food stall for this order.' });
    }
  } else if (actorRole === 'rider') {
    // Rider cannot transition an order assigned to another rider
    if (order.rider_id && order.rider_id !== actorId) {
      return res.status(403).json({ error: 'Forbidden: This order is assigned to another delivery partner.' });
    }
  } else if (actorRole === 'customer') {
    // Customers can only cancel their own orders (subject to pre-cooking check)
    const isOwner = (order.customer_phone === req.auth.phone || order.customer_id === actorId);
    if (!isOwner) {
      return res.status(403).json({ error: 'Forbidden: You are not authorized to modify this order.' });
    }
    if (status !== 'CANCELLED') {
      return res.status(403).json({ error: `Forbidden: Customers cannot transition order to status '${status}'.` });
    }
  }

  // 2. Call State Machine
  const transitionResult = db.transitionOrderStatus(order.id, status, {
    expectedVersion: expectedVersion !== undefined ? Number(expectedVersion) : undefined,
    actorRole,
    actorId,
    reason: reason || '',
    extra: {
      etaMinutes: etaMinutes !== undefined ? Number(etaMinutes) : undefined
    }
  });

  if (!transitionResult.success) {
    return res.status(transitionResult.code || 400).json({ error: transitionResult.error });
  }

  const updated = transitionResult.order;
  console.log(`[ORDER] Order #${updated.id} transitioned to: ${status} by ${actorRole}:${actorId} (Version: ${updated.version})`);

  // 3. Broadcast downstream notifications via WebSocket
  wsManager.broadcastToOrder(updated.id, {
    type: 'ORDER_STATUS_CHANGED',
    payload: {
      orderId: updated.id,
      status: updated.status,
      etaMinutes: updated.etaMinutes,
      version: updated.version,
      updated_at: updated.updated_at
    }
  });

  wsManager.broadcastToStall(updated.stall_id, {
    type: 'ORDER_STATUS_CHANGED',
    payload: {
      orderId: updated.id,
      status: updated.status,
      version: updated.version
    }
  });

  res.json({ success: true, order: db.formatOrderForPublic(updated, req.auth) });
});

// POST /api/orders/:id/assign-rider (Rider Claims Gig)
// Strictly derives rider identity from session token, ignoring any riderId in body
router.post('/:id/assign-rider', requireAuth, (req, res) => {
  if (req.auth.role !== 'rider' && req.auth.role !== 'admin') {
    return res.status(403).json({ error: 'Only registered delivery partners can claim gigs.' });
  }

  const riderId = req.auth.actorId;
  const result = db.assignRiderToOrder(req.params.id, riderId);

  if (!result.success) {
    return res.status(result.code || 400).json({ error: result.error });
  }

  const updated = result.order;

  // Broadcast to Customer tracking screen
  wsManager.broadcastToOrder(updated.id, {
    type: 'ORDER_STATUS_CHANGED',
    payload: {
      orderId: updated.id,
      status: updated.status,
      rider_name: updated.rider_name,
      rider_phone: updated.rider_phone,
      version: updated.version
    }
  });

  res.json({ success: true, message: 'Gig assigned successfully!', order: db.formatOrderForPublic(updated, req.auth) });
});

// POST /api/orders/:id/verify-otp (Rider Doorstep Delivery Completion)
// Verifies authenticated rider, OUT_FOR_DELIVERY state, cryptographically checks OTP and permanently consumes it
router.post('/:id/verify-otp', requireAuth, (req, res) => {
  if (req.auth.role !== 'rider' && req.auth.role !== 'admin') {
    return res.status(403).json({ error: 'Only delivery partners can verify doorstep delivery OTP.' });
  }

  const { otp } = req.body;
  if (!otp) {
    return res.status(400).json({ error: 'Delivery OTP is required.' });
  }

  const result = db.verifyDeliveryOtp(req.params.id, otp, {
    actorId: req.auth.actorId,
    actorRole: req.auth.role
  });

  if (!result.success) {
    return res.status(result.code || 400).json({ error: result.error });
  }

  const delivered = result.order;

  // Broadcast to Customer tracking screen
  wsManager.broadcastToOrder(delivered.id, {
    type: 'ORDER_DELIVERED',
    payload: {
      orderId: delivered.id,
      status: 'DELIVERED',
      version: delivered.version,
      message: 'Order delivered successfully! Enjoy your authentic street bites.'
    }
  });

  res.json({ success: true, message: 'OTP verified! Order delivered.', order: db.formatOrderForPublic(delivered, req.auth) });
});

// POST /api/orders/:id/cancel
router.post('/:id/cancel', requireAuth, (req, res) => {
  const { reason, expectedVersion } = req.body;
  const order = db.getOrderById(req.params.id);

  if (!order) return res.status(404).json({ error: 'Order not found.' });

  // Ownership verification
  if (req.auth.role === 'customer') {
    const isOwner = (order.customer_phone === req.auth.phone || order.customer_id === req.auth.actorId);
    if (!isOwner) return res.status(403).json({ error: 'Forbidden: You are not authorized to cancel this order.' });
  } else if (req.auth.role === 'vendor') {
    const isOwner = req.auth.ownedStallIds?.includes(order.stall_id);
    if (!isOwner) return res.status(403).json({ error: 'Forbidden: You do not own the stall for this order.' });
  }

  const result = db.transitionOrderStatus(order.id, 'CANCELLED', {
    expectedVersion: expectedVersion !== undefined ? Number(expectedVersion) : undefined,
    actorRole: req.auth.role,
    actorId: req.auth.actorId,
    reason: reason || 'Cancelled by user'
  });

  if (!result.success) {
    return res.status(result.code || 400).json({ error: result.error });
  }

  wsManager.broadcastToOrder(order.id, {
    type: 'ORDER_STATUS_CHANGED',
    payload: {
      orderId: order.id,
      status: 'CANCELLED',
      payment_status: result.order.payment_status,
      version: result.order.version
    }
  });

  res.json({ success: true, message: 'Order cancelled.', order: db.formatOrderForPublic(result.order, req.auth) });
});

// POST /api/orders/:id/rate (Customer Star Rating & Auto-Settlement to COMPLETED)
router.post('/:id/rate', requireAuth, (req, res) => {
  const { stallRating, riderRating, compliments, comment } = req.body;
  const order = db.getOrderById(req.params.id);

  if (!order) return res.status(404).json({ error: 'Order not found.' });

  // Verify customer ownership
  if (req.auth.role === 'customer') {
    const isOwner = (order.customer_phone === req.auth.phone || order.customer_id === req.auth.actorId);
    if (!isOwner) return res.status(403).json({ error: 'Forbidden: You did not place this order.' });
  }

  const ratedOrder = db.rateOrder(order.id, {
    stallRating,
    riderRating,
    compliments,
    comment
  });

  res.json({
    success: true,
    message: 'Thank you for rating your street food experience!',
    order: db.formatOrderForPublic(ratedOrder, req.auth)
  });
});

module.exports = router;
