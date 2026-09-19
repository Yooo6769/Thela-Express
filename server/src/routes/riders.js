// ThelaExpress - Delivery Partner (Rider) & GPS Telemetry Routes
const express = require('express');
const router = express.Router();
const db = require('../db');
const wsManager = require('../websocket');

// Middleware to resolve auth token if present
function authenticateRequest(req, res, next) {
  const token = req.headers.authorization || req.headers['x-auth-token'];
  if (!token) {
    req.auth = { authenticated: false };
    return next();
  }
  req.auth = db.resolveAuth(token);
  next();
}

router.use(authenticateRequest);

// GET /api/riders (Returns riders; filtered to approved for non-admin)
router.get('/', (req, res) => {
  const isAdmin = req.auth?.authenticated && req.auth.role === 'admin';
  let riders = db.data.riders || [];
  if (!isAdmin) {
    riders = riders.filter(r => r.verification_status === 'APPROVED' && r.status === 'AVAILABLE');
  }
  res.json({ riders });
});

// GET /api/riders/:id
router.get('/:id', (req, res) => {
  const rider = db.getRiderById(req.params.id);
  if (!rider) return res.status(404).json({ error: 'Rider not found.' });

  const isSelf = req.auth?.authenticated && req.auth.role === 'rider' && req.auth.actorId === rider.id;
  const isAdmin = req.auth?.authenticated && req.auth.role === 'admin';

  if (!isSelf && !isAdmin && (rider.verification_status !== 'APPROVED' || rider.status !== 'AVAILABLE')) {
    return res.status(404).json({ error: 'Rider not available.' });
  }

  res.json({ rider });
});

// PATCH /api/riders/:id/toggle-online or /api/riders/:id/availability
// Server-authoritative: A rider can only go AVAILABLE/online if APPROVED by admin
router.patch(['/:id/toggle-online', '/:id/availability'], (req, res) => {
  const rider = db.getRiderById(req.params.id);
  if (!rider) return res.status(404).json({ error: 'Rider not found.' });

  if (!req.auth || !req.auth.authenticated) {
    return res.status(401).json({ error: 'Authentication required.' });
  }

  const isSelf = req.auth.role === 'rider' && req.auth.actorId === rider.id;
  const isAdmin = req.auth.role === 'admin';

  if (!isSelf && !isAdmin) {
    return res.status(403).json({ error: 'Forbidden: You are not authorized to modify this rider availability.' });
  }

  const willBeOnline = req.body.is_online !== undefined ? Boolean(req.body.is_online) : (req.body.isOnline !== undefined ? Boolean(req.body.isOnline) : !rider.is_online);
  const targetStatus = willBeOnline ? 'AVAILABLE' : 'OFFLINE';

  const result = db.transitionRiderStatus(rider.id, targetStatus, {
    expectedVersion: req.body.expectedVersion,
    actorRole: req.auth.role,
    actorId: req.auth.actorId,
    reason: willBeOnline ? 'Rider went online for dispatch' : 'Rider went offline'
  });

  if (!result.success) {
    return res.status(result.code || 400).json({
      error: result.error,
      failedGates: result.failedGates || []
    });
  }

  wsManager.broadcastAll({
    type: 'RIDER_STATUS_CHANGED',
    payload: { riderId: rider.id, isOnline: willBeOnline, status: targetStatus }
  });

  res.json({ success: true, rider: result.rider });
});

// POST /api/riders/:id/location (Broadcast GPS telemetry)
router.post('/:id/location', (req, res) => {
  const rider = db.getRiderById(req.params.id);
  if (!rider) return res.status(404).json({ error: 'Rider not found.' });

  // Verify rider identity
  if (req.auth?.authenticated) {
    const isSelf = req.auth.role === 'rider' && req.auth.actorId === rider.id;
    const isAdmin = req.auth.role === 'admin';
    if (!isSelf && !isAdmin) {
      return res.status(403).json({ error: 'Forbidden: Cannot update location for another rider.' });
    }
  }

  const { lat, lng, orderId } = req.body;
  const updatedRider = db.updateRiderLocation(req.params.id, lat, lng);

  if (orderId) {
    wsManager.broadcastToOrder(orderId, {
      type: 'RIDER_LOCATION_UPDATE',
      payload: {
        riderId: updatedRider.id,
        lat,
        lng,
        timestamp: Date.now()
      }
    });
  }

  res.json({ success: true, rider: updatedRider });
});

module.exports = router;
