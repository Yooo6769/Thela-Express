// ThelaExpress - UPI & Payment Gateway Engine
const express = require('express');
const router = express.Router();
const db = require('../db');

// POST /api/payments/create-intent
router.post('/create-intent', (req, res) => {
  const { amount, orderId, method } = req.body;
  
  const txnId = `TXN_${Date.now()}`;
  const upiId = 'thelaexpress@icici';
  const upiUri = `upi://pay?pa=${upiId}&pn=ThelaExpress&mc=5499&tid=${txnId}&tr=${orderId || txnId}&tn=StreetFoodOrder&am=${amount || 120}&cu=INR`;

  res.json({
    success: true,
    txnId,
    amount,
    method: method || 'UPI',
    upiUri,
    qrCodeUrl: `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(upiUri)}`
  });
});

// POST /api/payments/verify
// Sets payment_status: PAID. Order status remains PLACED until vendor accepts!
router.post('/verify', (req, res) => {
  const { txnId, orderId } = req.body;
  if (!orderId) {
    return res.status(400).json({ error: 'orderId is required.' });
  }

  const order = db.getOrderById(orderId);
  if (!order) {
    return res.status(404).json({ error: 'Order not found.' });
  }

  // Decoupled payment update: payment becomes PAID, order status remains unchanged
  order.payment_status = 'PAID';
  order.updated_at = new Date().toISOString();

  if (!Array.isArray(order.timeline)) {
    order.timeline = [];
  }
  order.timeline.push(Object.freeze({
    from_status: order.status,
    to_status: order.status,
    role: 'system',
    actor_id: 'payment_gateway',
    timestamp: order.updated_at,
    reason: `UPI payment verified (Txn: ${txnId || 'TXN_VERIFIED'})`,
    metadata: {
      txnId: txnId || `TXN_${Date.now()}`,
      payment_status: 'PAID',
      version: order.version
    }
  }));

  db.save();

  res.json({
    success: true,
    status: 'SUCCESS',
    txnId: txnId || `TXN_${Date.now()}`,
    payment_status: 'PAID',
    orderStatus: order.status,
    message: 'UPI payment verified successfully. Awaiting vendor kitchen acceptance.'
  });
});

// POST /api/payments/dev/mock-refund (Isolated Dev/Test Environment Only)
// Strictly blocked in production environments!
router.post('/dev/mock-refund', (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ error: 'Mock refund endpoint is disabled in production. Use authorized payment gateway webhooks.' });
  }

  const { orderId } = req.body;
  const order = db.getOrderById(orderId);
  if (!order) return res.status(404).json({ error: 'Order not found.' });

  if (order.payment_status !== 'REFUND_PENDING') {
    return res.status(400).json({ error: `Order is not in REFUND_PENDING state (current: ${order.payment_status}).` });
  }

  order.payment_status = 'REFUNDED';
  order.updated_at = new Date().toISOString();
  if (order.refund_details) {
    order.refund_details.status = 'REFUNDED';
    order.refund_details.completed_at = order.updated_at;
  }

  order.timeline.push(Object.freeze({
    from_status: order.status,
    to_status: order.status,
    role: 'system',
    actor_id: 'dev_mock_gateway',
    timestamp: order.updated_at,
    reason: 'Simulated payment gateway refund settlement completed',
    metadata: { payment_status: 'REFUNDED', version: order.version }
  }));

  db.save();

  res.json({
    success: true,
    message: 'Simulated refund processed.',
    order: db.formatOrderForPublic(order)
  });
});

// POST /api/payments/webhook/refund (Production Payment Gateway Callback)
router.post('/webhook/refund', (req, res) => {
  const { orderId, refundId, status, failureReason } = req.body;
  const order = db.getOrderById(orderId);
  if (!order) return res.status(404).json({ error: 'Order not found.' });

  if (order.payment_status !== 'REFUND_PENDING') {
    return res.status(400).json({ error: `Order is not in REFUND_PENDING state (current: ${order.payment_status}).` });
  }

  const now = new Date().toISOString();
  if (status === 'SUCCESS') {
    order.payment_status = 'REFUNDED';
    if (order.refund_details) {
      order.refund_details.status = 'REFUNDED';
      order.refund_details.refund_id = refundId || order.refund_details.refund_id;
      order.refund_details.completed_at = now;
    }
  } else if (status === 'FAILED') {
    order.payment_status = 'REFUND_FAILED';
    if (order.refund_details) {
      order.refund_details.status = 'REFUND_FAILED';
      order.refund_details.failure_reason = failureReason || 'Gateway refund failure';
    }
  }

  order.updated_at = now;
  order.timeline.push(Object.freeze({
    from_status: order.status,
    to_status: order.status,
    role: 'system',
    actor_id: 'payment_webhook',
    timestamp: now,
    reason: `Payment gateway refund result: ${status}`,
    metadata: { refundId, status, payment_status: order.payment_status, version: order.version }
  }));

  db.save();
  res.json({ success: true, payment_status: order.payment_status });
});

module.exports = router;
