// ThelaExpress - Delivery Partner (Rider) & GPS Telemetry Routes
const express = require('express');
const router = express.Router();
const db = require('../db');
const wsManager = require('../websocket');

// GET /api/riders
router.get('/', (req, res) => {
  res.json({ riders: db.getRiders() });
});

// POST /api/riders/:id/location (Broadcast GPS telemetry)
router.post('/:id/location', (req, res) => {
  const { lat, lng, orderId } = req.body;
  const rider = db.updateRiderLocation(req.params.id, lat, lng);

  if (!rider) return res.status(404).json({ error: 'Rider not found.' });

  if (orderId) {
    wsManager.broadcastToOrder(orderId, {
      type: 'RIDER_LOCATION_UPDATE',
      payload: {
        riderId: rider.id,
        lat,
        lng,
        timestamp: Date.now()
      }
    });
  }

  res.json({ success: true, rider });
});

module.exports = router;
