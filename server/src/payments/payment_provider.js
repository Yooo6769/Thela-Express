// ThelaExpress - Unified Payment Gateway & Sandbox Adapter
// Strictly enforces separation between Sandbox/Test verification and real-money gateway verification.

const crypto = require('crypto');

const SERVER_SIGNING_SECRET = process.env.PAYMENT_SIGNING_SECRET || 'thela_sbx_secret_sec9982_production_guard';

class PaymentProvider {
  constructor() {
    this.keyId = process.env.RAZORPAY_KEY_ID || null;
    this.keySecret = process.env.RAZORPAY_KEY_SECRET || null;
    this.isProductionConnected = Boolean(this.keyId && this.keySecret && !this.keyId.startsWith('rzp_test_'));
    this.mode = this.isProductionConnected ? 'PRODUCTION_GATEWAY' : 'SANDBOX';
  }

  getMode() {
    return {
      mode: this.mode,
      isSandbox: this.mode === 'SANDBOX',
      isProduction: this.mode === 'PRODUCTION_GATEWAY',
      providerName: this.isProductionConnected ? 'RAZORPAY_LIVE' : 'SANDBOX_ADAPTER',
      warning: this.mode === 'SANDBOX' 
        ? 'TEST / SANDBOX ENVIRONMENT — Simulated payment only, no real money will be charged.' 
        : null
    };
  }

  // 1. Create Payment Intent
  async createPaymentIntent({ orderId, amount, currency = 'INR', customerPhone = '' }) {
    if (!orderId || amount === undefined || amount === null) {
      throw new Error('orderId and authoritative amount are required to create payment intent.');
    }

    const timestamp = Date.now();
    const cleanAmount = Math.round(Number(amount));

    if (this.mode === 'PRODUCTION_GATEWAY') {
      // In production gateway mode, call real Razorpay / Payment Gateway API
      // Credentials must be present
      throw new Error('Production gateway credentials configured but live network call requires external API connection.');
    }

    // Explicit SANDBOX Adapter Flow
    const providerTxnId = `txn_sbx_${orderId}_${timestamp}`;
    const signingPayload = `${orderId}:${cleanAmount}:${providerTxnId}:${currency}`;
    const hmacSignature = crypto.createHmac('sha256', SERVER_SIGNING_SECRET)
      .update(signingPayload)
      .digest('hex');

    const sandboxUpiUri = `upi://pay?pa=thelaexpress.sandbox@bank&pn=ThelaExpressSandbox&am=${cleanAmount}&cu=${currency}&tr=${providerTxnId}&tn=TEST_ORDER_${orderId}&mode=sandbox`;

    return {
      success: true,
      mode: 'SANDBOX',
      isSandbox: true,
      provider: 'SANDBOX_ADAPTER',
      providerTransactionId: providerTxnId,
      orderId,
      amount: cleanAmount,
      currency,
      signature: hmacSignature,
      upiUri: sandboxUpiUri,
      qrCodeData: `[SANDBOX_TEST_PAYMENT] Order #${orderId} - ₹${cleanAmount} (TEST ONLY - NO REAL MONEY CHARGED)`,
      warning: 'TEST / SANDBOX ENVIRONMENT — Simulated payment only, no real money will be charged.',
      createdAt: new Date().toISOString()
    };
  }

  // 2. Verify Payment (Cryptographic HMAC validation, never trusts raw client declaration)
  async verifyPayment({ orderId, amount, providerTransactionId, signature, testSimulationOutcome }) {
    if (!orderId || !providerTransactionId || !signature) {
      return {
        success: false,
        error: 'Payment verification failed: Missing transaction reference or cryptographic signature.'
      };
    }

    // Sandbox failure simulation if explicitly requested in test suite
    if (testSimulationOutcome === 'FAIL') {
      return {
        success: false,
        mode: 'SANDBOX',
        status: 'FAILED',
        error: 'Simulated payment gateway declined transaction.'
      };
    }

    const cleanAmount = Math.round(Number(amount));
    const expectedPayload = `${orderId}:${cleanAmount}:${providerTransactionId}:INR`;
    const expectedSignature = crypto.createHmac('sha256', SERVER_SIGNING_SECRET)
      .update(expectedPayload)
      .digest('hex');

    // Constant-time comparison to prevent timing side-channel leaks
    const sigBuf = Buffer.from(signature, 'utf8');
    const expBuf = Buffer.from(expectedSignature, 'utf8');

    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
      return {
        success: false,
        error: 'Invalid payment signature. Potential tampering or expired token.'
      };
    }

    return {
      success: true,
      mode: 'SANDBOX',
      isSandbox: true,
      status: 'VERIFIED',
      provider: 'SANDBOX_ADAPTER',
      providerTransactionId,
      amount: cleanAmount,
      currency: 'INR',
      verifiedAt: new Date().toISOString(),
      metadata: {
        method: 'UPI_SANDBOX',
        verified_by: 'SANDBOX_HMAC_ENGINE',
        is_real_money: false
      }
    };
  }

  // 3. Process Refund via Provider
  async processRefund({ paymentTransactionId, amount, reason, idempotencyKey, testSimulationOutcome }) {
    if (!paymentTransactionId || !amount) {
      throw new Error('paymentTransactionId and refund amount are required.');
    }

    if (testSimulationOutcome === 'FAIL') {
      return {
        success: false,
        status: 'REFUND_FAILED',
        error: 'Gateway declined refund request (insufficient merchant float).'
      };
    }

    const refundId = `ref_sbx_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    return {
      success: true,
      status: 'REFUNDED',
      mode: 'SANDBOX',
      isSandbox: true,
      providerRefundId: refundId,
      paymentTransactionId,
      amount: Math.round(Number(amount)),
      reason: reason || 'Customer requested cancellation',
      completedAt: new Date().toISOString(),
      metadata: {
        is_real_money: false,
        idempotencyKey
      }
    };
  }

  // 4. Process Payout (Requires 2-step confirmation: PROCESSING -> PAID)
  async initiatePayout({ settlementId, beneficiaryUpi, amount, idempotencyKey }) {
    if (!settlementId || !beneficiaryUpi || !amount) {
      throw new Error('settlementId, beneficiaryUpi and amount are required to initiate payout.');
    }

    const payoutId = `pout_sbx_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
    return {
      success: true,
      status: 'PROCESSING',
      mode: 'SANDBOX',
      isSandbox: true,
      providerPayoutId: payoutId,
      settlementId,
      beneficiaryUpi,
      amount: Math.round(Number(amount)),
      initiatedAt: new Date().toISOString(),
      metadata: {
        is_real_money: false,
        idempotencyKey
      }
    };
  }

  async confirmPayout({ providerPayoutId, testOutcome }) {
    if (!providerPayoutId) {
      throw new Error('providerPayoutId is required to confirm payout.');
    }

    if (testOutcome === 'FAIL') {
      return {
        success: false,
        status: 'FAILED',
        error: 'Bank rejected UPI payout transfer (Invalid VPA or PSP server timeout).'
      };
    }

    const utr = `UTR_SBX_${Date.now()}_${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
    return {
      success: true,
      status: 'PAID',
      mode: 'SANDBOX',
      isSandbox: true,
      providerPayoutId,
      utr,
      paidAt: new Date().toISOString(),
      metadata: {
        is_real_money: false
      }
    };
  }
}

module.exports = new PaymentProvider();
