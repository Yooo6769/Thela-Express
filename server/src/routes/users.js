// ThelaExpress - Customer Profile, Address Book & Preferences Router
const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /api/users/:phone (Retrieve Profile & Addresses)
router.get('/:phone', (req, res) => {
  const cleanPhone = (req.params.phone || '').replace(/\D/g, '').slice(-10);
  if (!cleanPhone) return res.status(400).json({ error: 'Valid phone number required.' });

  let user = db.findUserByPhone(cleanPhone);
  if (!user) {
    user = db.createUser({ phone: cleanPhone });
  }

  const pastOrders = db.getOrdersByCustomer(cleanPhone);

  res.json({
    success: true,
    user: {
      ...user,
      totalOrders: pastOrders.length,
      deliveredOrders: pastOrders.filter(o => o.status === 'DELIVERED').length
    }
  });
});

// PUT /api/users/:phone (Update Profile)
router.put('/:phone', (req, res) => {
  const cleanPhone = (req.params.phone || '').replace(/\D/g, '').slice(-10);
  if (!cleanPhone) return res.status(400).json({ error: 'Valid phone number required.' });

  const { name, email, vegPreference } = req.body;
  const updatedUser = db.updateUser(cleanPhone, { name, email, vegPreference });

  res.json({ success: true, user: updatedUser });
});

const { resolveIndianAddressCoordinates } = require('../utils/indian_geocoder');

// POST /api/users/:phone/addresses (Add Address)
router.post('/:phone/addresses', (req, res) => {
  const cleanPhone = (req.params.phone || '').replace(/\D/g, '').slice(-10);
  if (!cleanPhone) return res.status(400).json({ error: 'Valid phone number required.' });

  const { tag, house, street, landmark, city, lat, lng, isDefault, title, address: legacyAddress, pincode } = req.body;
  const effectiveHouse = house || title || '';
  const effectiveStreet = street || legacyAddress || '';
  if (!effectiveStreet && !effectiveHouse) {
    return res.status(400).json({ error: 'Address details (House/Flat or Street) required.' });
  }

  // Resolve genuine geographic coordinates across all Indian PIN codes & states
  const combinedText = [effectiveHouse, effectiveStreet, landmark, city, pincode].filter(Boolean).join(' ');
  const isGpsSource = req.body.source === 'gps' || req.body.isGps === true;
  const geoResult = resolveIndianAddressCoordinates(combinedText, (isGpsSource && typeof lat === 'number' && typeof lng === 'number' && !isNaN(lat) && !isNaN(lng)) ? { lat, lng } : null);

  let finalLat = null;
  let finalLng = null;
  if (isGpsSource && typeof lat === 'number' && typeof lng === 'number' && !isNaN(lat) && !isNaN(lng)) {
    finalLat = lat;
    finalLng = lng;
  } else if (geoResult.isResolved) {
    finalLat = geoResult.lat;
    finalLng = geoResult.lng;
  } else if (typeof lat === 'number' && typeof lng === 'number' && !isNaN(lat) && !isNaN(lng)) {
    finalLat = lat;
    finalLng = lng;
  }

  const finalPincode = pincode || geoResult.pincode || '';
  const finalArea = geoResult.area || city || effectiveStreet;

  const address = db.addUserAddress(cleanPhone, { 
    tag, 
    house: effectiveHouse, 
    street: effectiveStreet, 
    landmark, 
    city, 
    area: finalArea,
    pincode: finalPincode,
    lat: finalLat, 
    lng: finalLng, 
    isDefault 
  });
  const user = db.findUserByPhone(cleanPhone);

  res.status(201).json({ success: true, address, addresses: user.addresses });
});

// DELETE /api/users/:phone/addresses/:id (Delete Address)
router.delete('/:phone/addresses/:id', (req, res) => {
  const cleanPhone = (req.params.phone || '').replace(/\D/g, '').slice(-10);
  const addressId = req.params.id;

  const deleted = db.deleteUserAddress(cleanPhone, addressId);
  if (!deleted) return res.status(404).json({ error: 'Address not found.' });

  const user = db.findUserByPhone(cleanPhone);
  res.json({ success: true, addresses: user.addresses });
});

// PATCH /api/users/:phone/addresses/:id/default (Set Default Address)
router.patch('/:phone/addresses/:id/default', (req, res) => {
  const cleanPhone = (req.params.phone || '').replace(/\D/g, '').slice(-10);
  const addressId = req.params.id;

  const updated = db.setDefaultAddress(cleanPhone, addressId);
  if (!updated) return res.status(404).json({ error: 'Address not found.' });

  const user = db.findUserByPhone(cleanPhone);
  res.json({ success: true, addresses: user.addresses });
});

// POST /api/users/:phone/favorites/:stallId (Toggle Favorite)
router.post('/:phone/favorites/:stallId', (req, res) => {
  const cleanPhone = (req.params.phone || '').replace(/\D/g, '').slice(-10);
  const stallId = req.params.stallId;

  const result = db.toggleFavorite(cleanPhone, stallId);
  res.json({ success: true, isFavorite: result.isFavorite, favorites: result.favorites });
});

module.exports = router;
