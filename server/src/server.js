// ThelaExpress - Production Server & Realtime API Gateway
const http = require('http');
const app = require('./app');
const wsManager = require('./websocket');

const server = http.createServer(app);
const PORT = process.env.PORT || 5000;

// Initialize WebSockets
wsManager.init(server);

// Start listening if run directly
if (require.main === module) {
  server.listen(PORT, '0.0.0.0', () => {
    console.log('====================================================');
    console.log(`  THELAEXPRESS BACKEND & WEBSOCKET GATEWAY ONLINE `);
    console.log('====================================================');
    console.log(`  REST API:   http://localhost:${PORT}/api/health`);
    console.log(`  WebSockets: ws://localhost:${PORT}/ws`);
    console.log(`  Web App:    http://localhost:${PORT}`);
    console.log('====================================================');
  });
}

module.exports = { app, server };
