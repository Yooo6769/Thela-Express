// ThelaExpress - Real Vendor & Rider Self-Onboarding Routes
const express = require('express');
const router = express.Router();
const db = require('../db');
const wsManager = require('../websocket');

// POST /api/onboard/vendor (Real Street Food Stall Registration)
router.post('/vendor', (req, res) => {
  const {
    owner_name,
    owner_phone,
    name,
    category,
    specialty,
    address,
    lat,
    lng,
    upi_id,
    fssai_number,
    isVeg,
    imageUrl,
    menu_items
  } = req.body;

  if (!name || !owner_phone) {
    return res.status(400).json({ error: 'Stall name and owner phone number are required.' });
  }

  const cleanPhone = owner_phone.replace(/\D/g, '').slice(-10);

  const result = db.registerStall({
    owner_name: owner_name || 'Street Vendor',
    owner_phone: cleanPhone,
    name,
    category: category || 'chaat',
    specialty: specialty || 'Authentic Street Bites',
    address: address || 'Street Address',
    lat: lat || null,
    lng: lng || null,
    upi_id: upi_id || `${cleanPhone}@upi`,
    fssai_number: fssai_number || '',
    isVeg: isVeg !== undefined ? isVeg : true,
    imageUrl: imageUrl || 'https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=800&q=80',
    hygieneHighlights: req.body.hygieneHighlights || []
  }, menu_items || []);

  console.log(`[ONBOARD] Real Stall registered: ${result.stall.name} (${result.stall.id}) by ${cleanPhone}`);

  // Broadcast to all clients (Customer app will immediately see new stall)
  wsManager.broadcastAll({
    type: 'STALL_STATUS_CHANGED',
    payload: { stallId: result.stall.id, action: 'NEW_STALL_ADDED' }
  });

  res.status(201).json({
    success: true,
    message: 'Stall successfully onboarded!',
    stall: result.stall,
    items: result.items,
    posUrl: `/partner.html?role=vendor&stallId=${result.stall.id}`
  });
});

// POST /api/onboard/rider (Real Delivery Partner Registration)
router.post('/rider', (req, res) => {
  const {
    name,
    phone,
    vehicle,
    vehicle_number,
    upi_id,
    area
  } = req.body;

  if (!name || !phone) {
    return res.status(400).json({ error: 'Rider name and mobile phone number are required.' });
  }

  const cleanPhone = phone.replace(/\D/g, '').slice(-10);

  const rider = db.registerRider({
    name,
    phone: cleanPhone,
    vehicle: vehicle || 'EV Scooter',
    vehicle_number: vehicle_number || '',
    upi_id: upi_id || `${cleanPhone}@upi`,
    area: area || 'Operating Zone'
  });

  console.log(`[ONBOARD] Real Rider registered: ${rider.name} (${rider.id}) Phone: ${cleanPhone}`);

  res.status(201).json({
    success: true,
    message: 'Delivery partner registered successfully!',
    rider,
    consoleUrl: `/partner.html?role=rider&riderId=${rider.id}`
  });
});

module.exports = router;
