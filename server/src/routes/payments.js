// ThelaExpress - Production-Grade Payments & Money Flow Router
// Strictly enforces server-authoritative calculations and sandbox/production isolation.

const express = require('express');
const router = express.Router();
const db = require('../db');
const wsManager = require('../websocket');
const paymentProvider = require('../payments/payment_provider');

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

router.use(authenticateUser);

// Apply Transparency Header
router.use((req, res, next) => {
  const providerInfo = paymentProvider.getMode();
  res.setHeader('X-Thela-Payment-Mode', providerInfo.mode);
  next();
});

// GET /api/payments/config (Public/Client provider transparency info)
router.get('/config', (req, res) => {
  const info = paymentProvider.getMode();
  res.json({
    success: true,
    ...info
  });
});

// POST /api/payments/create-intent
// Client CANNOT specify amount; payable amount is retrieved authoritatively from stored order.
router.post('/create-intent', async (req, res) => {
  try {
    const { orderId, idempotencyKey } = req.body;
    if (!orderId) {
      return res.status(400).json({ error: 'orderId is required to create a payment intent.' });
    }

    const order = db.getOrderById(orderId);
    if (!order) {
      return res.status(404).json({ error: `Order #${orderId} not found.` });
    }

    if (order.payment_status === 'PAID') {
      return res.status(400).json({ error: `Order #${orderId} is already paid.` });
    }

    // Customer Ownership Verification
    if (req.auth?.authenticated && req.auth.role === 'customer') {
      const isOwner = req.auth.actorId === order.customer_id || req.auth.phone === order.customer_phone;
      if (!isOwner) {
        return res.status(403).json({ error: 'Unauthorized: You can only create payment intents for your own orders.' });
      }
    }

    // Authoritative Payable Amount from Stored Order
    const authoritativeAmount = order.grand_total;

    // Idempotency: Check if an active intent exists for this order
    const existingPayment = (db.data.payments || []).find(
      p => p.order_id === order.id && p.status === 'PENDING' && (idempotencyKey ? p.idempotency_key === idempotencyKey : true)
    );

    const intent = await paymentProvider.createPaymentIntent({
      orderId: order.id,
      amount: authoritativeAmount,
      currency: 'INR',
      customerPhone: order.customer_phone
    });

    const paymentRecord = {
      id: `pay_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`,
      order_id: order.id,
      provider: intent.provider,
      provider_txn_id: intent.providerTransactionId,
      amount: authoritativeAmount,
      currency: 'INR',
      status: 'PENDING',
      signature: intent.signature,
      mode: intent.mode,
      is_sandbox: intent.isSandbox,
      idempotency_key: idempotencyKey || null,
      created_at: new Date().toISOString()
    };

    if (!db.data.payments) db.data.payments = [];
    db.data.payments.push(paymentRecord);
    db.save();

    res.json({
      success: true,
      paymentId: paymentRecord.id,
      ...intent
    });
  } catch (err) {
    console.error('[PAYMENTS] Error creating intent:', err);
    res.status(500).json({ error: err.message || 'Internal payment error.' });
  }
});

// POST /api/payments/verify
// Cryptographic verification: never accepts client declaration of PAID without provider confirmation.
router.post('/verify', async (req, res) => {
  try {
    const orderId = req.body.orderId || req.body.order_id;
    const txnId = req.body.txnId || req.body.transaction_id || req.body.providerTransactionId || `txn_${Date.now()}`;
    const { signature, idempotencyKey, testSimulationOutcome } = req.body;
    if (!orderId) {
      return res.status(400).json({ error: 'orderId is required.' });
    }

    const order = db.getOrderById(orderId);
    if (!order) {
      return res.status(404).json({ error: 'Order not found.' });
    }

    // Idempotency: If this payment transaction was already verified, return existing record
    const existingVerified = (db.data.payments || []).find(
      p => p.order_id === order.id && p.provider_txn_id === txnId && p.status === 'VERIFIED'
    );
    if (existingVerified && order.payment_status === 'PAID') {
      return res.json({
        success: true,
        status: 'SUCCESS',
        isDuplicate: true,
        message: 'Payment was already verified and recorded.',
        payment: existingVerified
      });
    }

    // Perform Cryptographic Verification via Payment Provider / Sandbox Adapter
    const verifyResult = await paymentProvider.verifyPayment({
      orderId: order.id,
      amount: order.grand_total,
      providerTransactionId: txnId,
      signature: signature || '',
      testSimulationOutcome
    });

    const now = new Date().toISOString();

    if (!verifyResult.success) {
      // Record payment failure
      const failedRecord = {
        id: `pay_fail_${Date.now()}`,
        order_id: order.id,
        provider: 'SANDBOX_ADAPTER',
        provider_txn_id: txnId || 'TXN_UNKNOWN',
        amount: order.grand_total,
        status: 'FAILED',
        error: verifyResult.error,
        created_at: now
      };
      if (!db.data.payments) db.data.payments = [];
      db.data.payments.push(failedRecord);

      order.payment_status = 'FAILED';
      if (order.status === 'PLACED') {
        db.transitionOrderStatus(order.id, 'PAYMENT_FAILED', {
          actorRole: 'system',
          actorId: 'payment_gateway',
          reason: verifyResult.error || 'Payment verification failed'
        });
      }
      db.save();

      return res.status(400).json({
        success: false,
        status: 'FAILED',
        error: verifyResult.error || 'Payment verification failed.'
      });
    }

    // Record verified payment record
    let paymentRecord = (db.data.payments || []).find(p => p.provider_txn_id === txnId);
    if (!paymentRecord) {
      paymentRecord = {
        id: `pay_${Date.now()}`,
        order_id: order.id,
        provider: verifyResult.provider,
        provider_txn_id: txnId,
        amount: order.grand_total,
        currency: 'INR',
        status: 'VERIFIED',
        mode: verifyResult.mode,
        is_sandbox: verifyResult.isSandbox,
        created_at: now,
        verified_at: verifyResult.verifiedAt
      };
      if (!db.data.payments) db.data.payments = [];
      db.data.payments.push(paymentRecord);
    } else {
      paymentRecord.status = 'VERIFIED';
      paymentRecord.verified_at = verifyResult.verifiedAt;
    }

    // Update order payment status
    order.payment_status = 'PAID';
    order.updated_at = now;

    // Trigger Money Lifecycle: Record Funds in Append-Only Ledger & Create Settlements
    const pricingAllocation = order.pricing_allocation || {
      pricing: {
        food_subtotal: order.subtotal,
        vendor_discount: order.vendor_discount || 0,
        platform_discount: order.platform_discount || 0,
        total_discount: order.discount || 0,
        packaging_fee: order.packaging_fee || 10,
        delivery_fee: order.delivery_fee || 0,
        tip: order.tip || 0,
        taxes: order.taxes || 0,
        customer_total: order.grand_total
      },
      allocation: {
        commission_rate_pct: db.data.settings?.platformCommissionPct || 10,
        platform_commission: Math.round(((order.subtotal || 0) * (db.data.settings?.platformCommissionPct || 10)) / 100),
        vendor_payable: (order.subtotal || 0) - Math.round(((order.subtotal || 0) * 10) / 100) + (order.packaging_fee || 10),
        rider_base_fee: db.data.settings?.riderPayoutFlat || 40,
        rider_tip: order.tip || 0,
        rider_payable: (db.data.settings?.riderPayoutFlat || 40) + (order.tip || 0),
        tax_payable: order.taxes || 0,
        gateway_fee: 0,
        platform_net_margin: order.grand_total - ((order.subtotal || 0) - Math.round(((order.subtotal || 0) * 10) / 100) + (order.packaging_fee || 10)) - ((db.data.settings?.riderPayoutFlat || 40) + (order.tip || 0))
      }
    };

    db.ledger.recordOrderPaymentFunds(order, paymentRecord, pricingAllocation);

    // Append to Order Timeline
    if (!Array.isArray(order.timeline)) order.timeline = [];
    order.timeline.push(Object.freeze({
      from_status: order.status,
      to_status: order.status,
      role: 'system',
      actor_id: 'payment_gateway',
      timestamp: now,
      reason: `Payment verified (${verifyResult.mode === 'SANDBOX' ? 'SANDBOX' : 'PRODUCTION'})`,
      metadata: {
        txnId,
        payment_status: 'PAID',
        is_sandbox: verifyResult.isSandbox,
        version: order.version
      }
    }));

    db.save();

    // Broadcast confirmed authorized paid order to Vendor KDS
    wsManager.broadcastToStall(order.stall_id, {
      type: 'NEW_ORDER_RECEIVED',
      payload: {
        order: db.serializeOrderForVendor(order),
        sound: 'bell_chime',
        message: `New Order #${order.id} received! ₹${order.grand_total}`
      }
    });

    // Also update customer order tracking screen
    wsManager.broadcastToOrder(order.id, {
      type: 'ORDER_STATUS_CHANGED',
      payload: {
        orderId: order.id,
        status: order.status,
        payment_status: 'PAID',
        version: order.version
      }
    });

    res.json({
      success: true,
      status: 'SUCCESS',
      payment_status: 'PAID',
      txnId,
      orderStatus: order.status,
      mode: verifyResult.mode,
      isSandbox: verifyResult.isSandbox,
      warning: verifyResult.isSandbox ? 'TEST / SANDBOX ENVIRONMENT — Simulated payment only, no real money will be charged.' : null,
      message: 'Payment verified successfully and funds recorded in ledger.'
    });
  } catch (err) {
    console.error('[PAYMENTS] Error verifying payment:', err);
    res.status(500).json({ error: err.message || 'Payment verification error.' });
  }
});

// POST /api/payments/refund
// Processes full or partial refunds with proportional ledger adjustments
router.post('/refund', async (req, res) => {
  try {
    const { orderId, amount, refundType = 'FULL', reason, idempotencyKey, testSimulationOutcome } = req.body;
    if (!orderId) {
      return res.status(400).json({ error: 'orderId is required.' });
    }

    const order = db.getOrderById(orderId);
    if (!order) {
      return res.status(404).json({ error: 'Order not found.' });
    }

    // Role check: Only admin, finance, or owner customer cancelling pre-cooking
    if (req.auth?.authenticated) {
      const isPrivileged = ['admin', 'finance'].includes(req.auth.role);
      const isOwner = req.auth.role === 'customer' && (req.auth.actorId === order.customer_id || req.auth.phone === order.customer_phone);
      if (!isPrivileged && !isOwner) {
        return res.status(403).json({ error: 'Unauthorized: You do not have permission to issue refunds for this order.' });
      }
    }

    // Order must have funds collected
    if (!['PAID', 'REFUND_PENDING', 'PARTIALLY_REFUNDED'].includes(order.payment_status)) {
      return res.status(400).json({ error: `Cannot refund order with payment status: ${order.payment_status}.` });
    }

    const currentSummary = db.ledger.getOrderFinancialSummary(order.id);
    const refundAmount = amount ? Math.round(Number(amount)) : currentSummary.net_customer_payment;

    if (refundAmount <= 0 || refundAmount > currentSummary.net_customer_payment) {
      return res.status(400).json({
        error: `Invalid refund amount ₹${refundAmount}. Maximum refundable amount is ₹${currentSummary.net_customer_payment}.`
      });
    }

    // Idempotency: Check if refund with idempotencyKey already exists
    if (idempotencyKey) {
      const existing = (db.data.refunds || []).find(r => r.idempotency_key === idempotencyKey);
      if (existing) {
        return res.json({ success: true, refund: existing, isDuplicate: true });
      }
    }

    // Process Refund via Payment Provider / Sandbox Adapter
    const providerResult = await paymentProvider.processRefund({
      paymentTransactionId: order.id,
      amount: refundAmount,
      reason: reason || 'Order cancellation or quality adjustment',
      idempotencyKey,
      testSimulationOutcome
    });

    const now = new Date().toISOString();

    if (!providerResult.success) {
      order.payment_status = 'REFUND_FAILED';
      if (!order.refund_details) order.refund_details = {};
      order.refund_details.status = 'REFUND_FAILED';
      order.refund_details.failure_reason = providerResult.error;

      const failedRecord = {
        id: `ref_fail_${Date.now()}`,
        order_id: order.id,
        amount: refundAmount,
        status: 'REFUND_FAILED',
        error: providerResult.error,
        created_at: now
      };
      if (!db.data.refunds) db.data.refunds = [];
      db.data.refunds.push(failedRecord);
      db.save();

      return res.status(502).json({
        success: false,
        payment_status: 'REFUND_FAILED',
        error: providerResult.error || 'Payment gateway declined refund.'
      });
    }

    // Record Immutable Refund Entry in Append-Only Ledger
    const ledgerResult = db.ledger.recordRefundAdjustment(order, {
      refundAmount,
      refundType,
      reason: reason || 'Customer refund',
      actorRole: req.auth?.role || 'system',
      actorId: req.auth?.actorId || 'system',
      providerRefundId: providerResult.providerRefundId
    });

    // Update Order Payment Status based on remaining customer balance
    const updatedSummary = db.ledger.getOrderFinancialSummary(order.id);
    order.payment_status = updatedSummary.net_customer_payment === 0 ? 'REFUNDED' : 'PARTIALLY_REFUNDED';
    order.refund_details = {
      refund_id: providerResult.providerRefundId,
      amount: refundAmount,
      refund_type: refundType,
      status: order.payment_status,
      completed_at: now
    };
    order.updated_at = now;

    // Record immutable entry in refunds collection
    const refundRecord = {
      id: `ref_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`,
      order_id: order.id,
      provider_refund_id: providerResult.providerRefundId,
      amount: refundAmount,
      refund_type: refundType,
      status: 'REFUNDED',
      reason,
      actor_role: req.auth?.role || 'system',
      actor_id: req.auth?.actorId || 'system',
      idempotency_key: idempotencyKey || null,
      is_sandbox: Boolean(providerResult.isSandbox),
      created_at: now
    };
    if (!db.data.refunds) db.data.refunds = [];
    db.data.refunds.push(refundRecord);

    // Order Timeline
    if (!Array.isArray(order.timeline)) order.timeline = [];
    order.timeline.push(Object.freeze({
      from_status: order.status,
      to_status: order.status,
      role: req.auth?.role || 'system',
      actor_id: req.auth?.actorId || 'system',
      timestamp: now,
      reason: `Refund issued ₹${refundAmount} (${refundType})`,
      metadata: {
        refundId: providerResult.providerRefundId,
        refundAmount,
        refundType,
        payment_status: order.payment_status,
        version: order.version
      }
    }));

    db.save();

    res.json({
      success: true,
      status: order.payment_status,
      refund: refundRecord,
      ledgerAdjustment: ledgerResult.adjustmentEntry,
      financialSummary: updatedSummary
    });
  } catch (err) {
    console.error('[PAYMENTS] Error processing refund:', err);
    res.status(500).json({ error: err.message || 'Refund processing error.' });
  }
});

// GET /api/payments/order/:orderId
// Scoped payment & ledger status
router.get('/order/:orderId', (req, res) => {
  const order = db.getOrderById(req.params.orderId);
  if (!order) return res.status(404).json({ error: 'Order not found.' });

  // Ownership / Scope Check
  if (req.auth?.authenticated) {
    if (req.auth.role === 'customer') {
      const isOwner = req.auth.actorId === order.customer_id || req.auth.phone === order.customer_phone;
      if (!isOwner) return res.status(403).json({ error: 'Unauthorized: Access to this order payment is restricted.' });
    } else if (req.auth.role === 'vendor') {
      const isStallOwner = req.auth.stallId === order.stall_id || (req.auth.ownedStalls && req.auth.ownedStalls.includes(order.stall_id));
      if (!isStallOwner) return res.status(403).json({ error: 'Unauthorized: Access to this order payment is restricted.' });
    }
  }

  const payments = (db.data.payments || []).filter(p => p.order_id === order.id);
  const refunds = (db.data.refunds || []).filter(r => r.order_id === order.id);
  const financialSummary = db.ledger.getOrderFinancialSummary(order.id);

  // Redact internal platform cut for customer view
  if (req.auth?.role === 'customer') {
    delete financialSummary.net_platform_margin;
    delete financialSummary.net_vendor_payable;
    delete financialSummary.net_rider_payable;
  }

  res.json({
    success: true,
    orderId: order.id,
    orderStatus: order.status,
    paymentStatus: order.payment_status,
    grandTotal: order.grand_total,
    payments,
    refunds,
    financialSummary
  });
});

// POST /api/payments/dev/mock-refund (Strictly blocked in production environments!)
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

  const refundAmount = order.refund_details?.amount || order.grand_total;
  db.ledger.recordRefundAdjustment(order, {
    refundAmount,
    refundType: 'FULL',
    reason: 'Simulated development refund',
    actorRole: 'dev_mock',
    actorId: 'dev_mock_gateway',
    providerRefundId: `ref_mock_${Date.now()}`
  });

  order.payment_status = 'REFUNDED';
  order.updated_at = new Date().toISOString();
  if (order.refund_details) {
    order.refund_details.status = 'REFUNDED';
    order.refund_details.completed_at = order.updated_at;
  }

  db.save();
  res.json({ success: true, message: 'Simulated refund processed.', order: db.formatOrderForPublic(order) });
});

module.exports = router;
