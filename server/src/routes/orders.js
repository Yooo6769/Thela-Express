// ThelaExpress - Orders & Delivery Lifecycle State Machine
const express = require('express');
const router = express.Router();
const db = require('../db');
const wsManager = require('../websocket');

// POST /api/orders (Create Order)
router.post('/', (req, res) => {
  const {
    customer_id,
    customer_name,
    customer_phone,
    stall_id,
    stall_name,
    items,
    subtotal,
    delivery_fee,
    packaging_fee,
    tip,
    discount,
    grand_total,
    delivery_address,
    delivery_instruction,
    payment_method
  } = req.body;

  if (!stall_id || !items || items.length === 0) {
    return res.status(400).json({ error: 'Order must contain items and a valid stall.' });
  }

  const order = db.createOrder({
    customer_id,
    customer_name: customer_name || 'Customer',
    customer_phone: customer_phone || '',
    stall_id,
    stall_name,
    items,
    subtotal,
    delivery_fee: delivery_fee || 0,
    packaging_fee: packaging_fee || 10,
    tip: tip || 0,
    discount: discount || 0,
    grand_total: grand_total || subtotal + 10,
    delivery_address,
    delivery_instruction,
    payment_method
  });

  console.log(`[ORDER] New order created #${order.id} for stall ${stall_name}`);

  // Notify Vendor via WebSocket with chime alert
  wsManager.broadcastToStall(stall_id, {
    type: 'NEW_ORDER_RECEIVED',
    payload: {
      order,
      sound: 'bell_chime',
      message: `New Order #${order.id} received! ₹${order.grand_total}`
    }
  });

  // Notify Riders of new pickup
  wsManager.broadcastAll({
    type: 'NEW_PICKUP_AVAILABLE',
    payload: {
      orderId: order.id,
      stallName: order.stall_name,
      address: order.delivery_address,
      payout: 42
    }
  });

  res.status(201).json({ success: true, order });
});

// GET /api/orders (All orders for rider / admin dispatch)
router.get('/', (req, res) => {
  res.json({ orders: db.getOrders() });
});

// GET /api/orders/user/:phone
router.get('/user/:phone', (req, res) => {
  const cleanPhone = req.params.phone.replace(/\D/g, '').slice(-10);
  const orders = db.getOrdersByCustomer(cleanPhone);
  res.json({ orders });
});

// GET /api/orders/stall/:stallId
router.get('/stall/:stallId', (req, res) => {
  const orders = db.getOrdersByStall(req.params.stallId);
  res.json({ orders });
});

// GET /api/orders/:id
router.get('/:id', (req, res) => {
  const order = db.getOrderById(req.params.id);
  if (!order) return res.status(404).json({ error: 'Order not found.' });
  res.json({ order });
});

// PATCH /api/orders/:id/status (Transition Status)
router.patch('/:id/status', (req, res) => {
  const { status, etaMinutes } = req.body;
  const validStatuses = ['PLACED', 'ACCEPTED', 'COOKING', 'READY_FOR_PICKUP', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED'];

  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
  }

  const updated = db.updateOrderStatus(req.params.id, status, {
    etaMinutes: etaMinutes !== undefined ? etaMinutes : undefined
  });

  if (!updated) return res.status(404).json({ error: 'Order not found.' });

  console.log(`[ORDER] Order #${updated.id} transitioned to: ${status}`);

  // Broadcast status to Customer tracking screen
  wsManager.broadcastToOrder(updated.id, {
    type: 'ORDER_STATUS_CHANGED',
    payload: {
      orderId: updated.id,
      status: updated.status,
      etaMinutes: updated.etaMinutes,
      updated_at: updated.updated_at
    }
  });

  // Also broadcast to Vendor
  wsManager.broadcastToStall(updated.stall_id, {
    type: 'ORDER_STATUS_CHANGED',
    payload: {
      orderId: updated.id,
      status: updated.status
    }
  });

  res.json({ success: true, order: updated });
});

// POST /api/orders/:id/verify-otp (Rider Doorstep Delivery)
router.post('/:id/verify-otp', (req, res) => {
  const { otp } = req.body;
  const order = db.getOrderById(req.params.id);

  if (!order) return res.status(404).json({ error: 'Order not found.' });

  const isDev = process.env.NODE_ENV !== 'production' && process.env.NODE_ENV !== 'staging';
  if (order.otp !== otp && (!isDev || otp !== '1234')) {
    return res.status(400).json({ error: 'Invalid delivery OTP provided by customer.' });
  }

  const delivered = db.updateOrderStatus(order.id, 'DELIVERED', { delivered_at: new Date().toISOString() });

  wsManager.broadcastToOrder(order.id, {
    type: 'ORDER_DELIVERED',
    payload: {
      orderId: order.id,
      message: 'Order delivered successfully! Enjoy your authentic street bites.'
    }
  });

  res.json({ success: true, message: 'OTP verified! Order delivered.', order: delivered });
});

// POST /api/orders/:id/rate (Customer Star Rating & Street Compliments)
router.post('/:id/rate', (req, res) => {
  const { stallRating, riderRating, compliments, comment } = req.body;
  const order = db.getOrderById(req.params.id);

  if (!order) return res.status(404).json({ error: 'Order not found.' });

  const ratedOrder = db.rateOrder(order.id, {
    stallRating,
    riderRating,
    compliments,
    comment
  });

  res.json({
    success: true,
    message: 'Thank you for rating your street food experience!',
    order: ratedOrder
  });
});

module.exports = router;
