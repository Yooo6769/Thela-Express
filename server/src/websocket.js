// ThelaExpress - Realtime WebSocket Hub & Event Broker
const WebSocket = require('ws');
const url = require('url');

class WebSocketManager {
  constructor() {
    this.wss = null;
    this.clients = new Map(); // ws -> { role, stallId, orderId, userId }
  }

  init(server) {
    this.wss = new WebSocket.Server({ server, path: '/ws' });

    this.wss.on('connection', (ws, req) => {
      const parsedUrl = url.parse(req.url, true);
      const query = parsedUrl.query || {};
      
      const meta = {
        role: query.role || 'anonymous',
        stallId: query.stallId || null,
        orderId: query.orderId || null,
        userId: query.userId || null
      };

      this.clients.set(ws, meta);
      console.log(`[WS] Client connected: role=${meta.role}, stall=${meta.stallId}, order=${meta.orderId}`);

      ws.send(JSON.stringify({
        type: 'CONNECTED',
        payload: { message: 'Connected to ThelaExpress Realtime Gateway' }
      }));

      ws.on('message', (message) => {
        try {
          const data = JSON.parse(message);
          this.handleClientMessage(ws, data);
        } catch (e) {
          console.error('[WS] Invalid JSON received:', e);
        }
      });

      ws.on('close', () => {
        this.clients.delete(ws);
        console.log(`[WS] Client disconnected: ${meta.role}`);
      });
    });

    console.log('[WS] WebSocket Server initialized on /ws');
  }

  handleClientMessage(ws, data) {
    const meta = this.clients.get(ws) || {};
    
    // If client sends registration or channel join
    if (data.type === 'SUBSCRIBE') {
      if (data.payload.orderId) meta.orderId = data.payload.orderId;
      if (data.payload.stallId) meta.stallId = data.payload.stallId;
      if (data.payload.role) meta.role = data.payload.role;
      this.clients.set(ws, meta);
    }

    // If rider sends live GPS coordinates
    if (data.type === 'RIDER_TELEMETRY') {
      const { riderId, orderId, lat, lng } = data.payload;
      this.broadcastToOrder(orderId, {
        type: 'RIDER_LOCATION_UPDATE',
        payload: { riderId, lat, lng, timestamp: Date.now() }
      });
    }
  }

  // Broadcast to specific stall (e.g. Vendor POS new order bell)
  broadcastToStall(stallId, event) {
    const payloadStr = JSON.stringify(event);
    this.clients.forEach((meta, client) => {
      if (client.readyState === WebSocket.OPEN && meta.stallId === stallId) {
        client.send(payloadStr);
      }
    });
  }

  // Broadcast to specific order (e.g. Customer tracking live status or rider position)
  broadcastToOrder(orderId, event) {
    const payloadStr = JSON.stringify(event);
    this.clients.forEach((meta, client) => {
      if (client.readyState === WebSocket.OPEN && meta.orderId === orderId) {
        client.send(payloadStr);
      }
    });
  }

  // Broadcast to all connected clients
  broadcastAll(event) {
    const payloadStr = JSON.stringify(event);
    this.clients.forEach((meta, client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(payloadStr);
      }
    });
  }
}

module.exports = new WebSocketManager();
