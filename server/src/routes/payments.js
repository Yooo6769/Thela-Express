// ThelaExpress - UPI & Payment Gateway Simulation Routes
const express = require('express');
const router = express.Router();
const db = require('../db');

// POST /api/payments/create-intent
router.post('/create-intent', (req, res) => {
  const { amount, orderId, method } = req.body;
  
  const txnId = `TXN_${Date.now()}`;
  const upiId = 'thelaexpress@icici';
  // Standard UPI URI format for GPay, PhonePe, Paytm
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
router.post('/verify', (req, res) => {
  const { txnId, orderId } = req.body;
  if (orderId) {
    db.updateOrderStatus(orderId, 'ACCEPTED', { payment_status: 'PAID' });
  }

  res.json({
    success: true,
    status: 'SUCCESS',
    txnId: txnId || `TXN_${Date.now()}`,
    message: 'UPI payment verified successfully.'
  });
});

module.exports = router;
