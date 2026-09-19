// ThelaExpress - Production Server & Realtime API Gateway
const express = require('express');
const http = require('http');
const cors = require('cors');
const path = require('path');
const wsManager = require('./websocket');

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
const server = http.createServer(app);

const PORT = process.env.PORT || 5000;

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

// Serve frontend static files
const publicDir = path.join(__dirname, '..', '..', 'public');
app.use(express.static(publicDir));

// Fallback to index.html for SPA routing
app.get('*', (req, res) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ error: 'Endpoint not found.' });
  }
  res.sendFile(path.join(publicDir, 'index.html'));
});

// Initialize WebSockets
wsManager.init(server);

// Start listening
server.listen(PORT, '0.0.0.0', () => {
  console.log('====================================================');
  console.log(`  THELAEXPRESS BACKEND & WEBSOCKET GATEWAY ONLINE `);
  console.log('====================================================');
  console.log(`  REST API:   http://localhost:${PORT}/api/health`);
  console.log(`  WebSockets: ws://localhost:${PORT}/ws`);
  console.log(`  Web App:    http://localhost:${PORT}`);
  console.log('====================================================');
});
