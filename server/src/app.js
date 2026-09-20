// ThelaExpress - Production Express App Setup
const express = require('express');
const cors = require('cors');
const path = require('path');

const authRoutes = require('./routes/auth');
const stallsRoutes = require('./routes/stalls');
const ordersRoutes = require('./routes/orders');
const paymentsRoutes = require('./routes/payments');
const ridersRoutes = require('./routes/riders');
const onboardRoutes = require('./routes/onboard');
const adminRoutes = require('./routes/admin');
const usersRoutes = require('./routes/users');
const settlementsRoutes = require('./routes/settlements');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Mount API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/stalls', stallsRoutes);
app.use('/api/orders', ordersRoutes);
app.use('/api/payments', paymentsRoutes);
app.use('/api/settlements', settlementsRoutes);
app.use('/api/riders', ridersRoutes);
app.use('/api/onboard', onboardRoutes);
app.use('/api/admin', adminRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ONLINE',
    service: 'ThelaExpress Production Backend',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Serve frontend static files with explicit no-cache headers for scripts and HTML
const publicDir = path.join(__dirname, '..', '..', 'public');
app.use(express.static(publicDir, {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.html') || filePath.endsWith('.js')) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    }
  }
}));

// Fallback to index.html for SPA routing
app.get('*', (req, res) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ error: 'Endpoint not found.' });
  }
  res.sendFile(path.join(publicDir, 'index.html'));
});

module.exports = app;
