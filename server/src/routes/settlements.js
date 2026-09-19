// ThelaExpress - Settlements, Partner Earnings & Financial Reconciliation Router
// Enforces role-scoping: Vendors only view their own stall, Riders only their own earnings, Admin full reconciliation.

const express = require('express');
const router = express.Router();
const db = require('../db');
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

function requireAuth(req, res, next) {
  if (!req.auth || !req.auth.authenticated) {
    return res.status(401).json({ error: 'Authentication required. Please log in.' });
  }
  next();
}

router.use(authenticateUser);

// GET /api/settlements/vendor/:stallId
// Scoped to authenticated vendor (or admin)
router.get('/vendor/:stallId', (req, res) => {
  const stallId = req.params.stallId;
  const result = db.getVendorSettlements(stallId, req.auth);
  if (!result.success) {
    return res.status(result.code || 403).json({ error: result.error });
  }
  res.json(result);
});

// GET /api/settlements/rider/:riderId
// Scoped to authenticated rider (or admin)
router.get('/rider/:riderId', (req, res) => {
  const riderId = req.params.riderId;
  const result = db.getRiderSettlements(riderId, req.auth);
  if (!result.success) {
    return res.status(result.code || 403).json({ error: result.error });
  }
  res.json(result);
});

// POST /api/settlements/payout (Initiate Payout Batch)
// Requires finance or admin role. Transitions settlements: ELIGIBLE -> PROCESSING.
// NEVER transitions directly to PAID!
router.post('/payout', async (req, res) => {
  try {
    const { settlementType, settlementIds, idempotencyKey } = req.body;
    const actorRole = req.auth?.role || 'system';
    const actorId = req.auth?.actorId || 'system';

    if (!['admin', 'finance'].includes(actorRole)) {
      return res.status(403).json({ error: 'Unauthorized: Only finance or admin roles can initiate payouts.' });
    }

    const batchResult = db.createPayoutBatch({
      settlementType,
      settlementIds,
      actorRole,
      actorId,
      idempotencyKey
    });

    if (!batchResult.success) {
      return res.status(batchResult.code || 400).json({ error: batchResult.error });
    }

    // Call payment provider payout initiation
    const payoutInit = await paymentProvider.initiatePayout({
      settlementId: batchResult.batch.id,
      beneficiaryUpi: 'payouts@bank',
      amount: batchResult.batch.total_amount,
      idempotencyKey
    });

    batchResult.batch.provider_payout_id = payoutInit.providerPayoutId;
    db.save();

    res.json({
      success: true,
      status: 'PROCESSING',
      batch: batchResult.batch,
      message: 'Payout batch initiated with payment provider. Awaiting confirmation callback.',
      isDuplicate: Boolean(batchResult.isDuplicate)
    });
  } catch (err) {
    console.error('[SETTLEMENTS] Error creating payout batch:', err);
    res.status(500).json({ error: err.message || 'Payout batch initiation failed.' });
  }
});

// POST /api/settlements/confirm-payout (Confirm Payout from Gateway / Webhook)
// Transitions batch and settlements: PROCESSING -> PAID
router.post('/confirm-payout', async (req, res) => {
  try {
    const { batchId, testOutcome } = req.body;
    const actorRole = req.auth?.role || 'system';
    const actorId = req.auth?.actorId || 'system';

    if (!['admin', 'finance'].includes(actorRole)) {
      return res.status(403).json({ error: 'Unauthorized: Only finance or admin can confirm payouts.' });
    }

    const batch = (db.data.payout_batches || []).find(b => b.id === batchId);
    if (!batch) {
      return res.status(404).json({ error: 'Payout batch not found.' });
    }

    if (batch.status === 'PAID') {
      return res.json({ success: true, batch, isDuplicate: true, message: 'Payout was already confirmed.' });
    }

    const confirmResult = await paymentProvider.confirmPayout({
      providerPayoutId: batch.provider_payout_id || `pout_${batch.id}`,
      testOutcome
    });

    if (!confirmResult.success) {
      db.confirmPayoutBatch({
        batchId,
        status: 'FAILED',
        failureReason: confirmResult.error,
        actorRole
      });
      return res.status(502).json({ success: false, status: 'FAILED', error: confirmResult.error });
    }

    const finalBatch = db.confirmPayoutBatch({
      batchId,
      providerPayoutId: confirmResult.providerPayoutId,
      utr: confirmResult.utr,
      status: 'SUCCESS',
      actorRole
    });

    res.json({
      success: true,
      status: 'PAID',
      batch: finalBatch.batch,
      utr: confirmResult.utr,
      message: `Payout batch #${batchId} confirmed and paid out.`
    });
  } catch (err) {
    console.error('[SETTLEMENTS] Error confirming payout:', err);
    res.status(500).json({ error: err.message || 'Payout confirmation failed.' });
  }
});

// GET /api/settlements/reconciliation
// Admin-only financial reconciliation overview
router.get('/reconciliation', (req, res) => {
  const result = db.getReconciliationReport(req.auth);
  if (!result.success) {
    return res.status(result.code || 403).json({ error: result.error });
  }
  res.json(result);
});

module.exports = router;
