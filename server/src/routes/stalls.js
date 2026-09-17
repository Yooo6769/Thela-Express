// ThelaExpress - Stalls & Menu Catalog Routes
const express = require('express');
const router = express.Router();
const db = require('../db');
const wsManager = require('../websocket');

// GET /api/stalls/categories (All available street food categories + custom vendor categories)
router.get('/categories', (req, res) => {
  res.json({ categories: db.getCategories() });
});

// GET /api/stalls
router.get('/', (req, res) => {
  const { category, search, vegOnly } = req.query;
  let stalls = db.getStalls(category);

  if (vegOnly === 'true') {
    stalls = stalls.filter(s => s.isVeg);
  }

  if (search && search.trim()) {
    const q = search.toLowerCase();
    stalls = stalls.filter(s => 
      s.name.toLowerCase().includes(q) || 
      s.specialty.toLowerCase().includes(q)
    );
  }

  res.json({ stalls });
});

// GET /api/stalls/:id
router.get('/:id', (req, res) => {
  const stall = db.getStallById(req.params.id);
  if (!stall) {
    return res.status(404).json({ error: 'Stall not found.' });
  }
  const items = db.getMenuItems(stall.id);
  res.json({ stall, items });
});

// PATCH /api/stalls/:id/toggle-open
router.patch('/:id/toggle-open', (req, res) => {
  const stall = db.getStallById(req.params.id);
  if (!stall) {
    return res.status(404).json({ error: 'Stall not found.' });
  }

  const updated = db.updateStall(stall.id, { isOpen: !stall.isOpen });
  
  wsManager.broadcastAll({
    type: 'STALL_STATUS_CHANGED',
    payload: { stallId: stall.id, isOpen: updated.isOpen }
  });

  res.json({ success: true, stall: updated });
});

// PATCH /api/stalls/menu/:itemId/stock
router.patch('/menu/:itemId/stock', (req, res) => {
  const { inStock } = req.body;
  const updatedItem = db.toggleItemStock(req.params.itemId, inStock);
  if (!updatedItem) {
    return res.status(404).json({ error: 'Item not found.' });
  }

  wsManager.broadcastToStall(updatedItem.stall_id, {
    type: 'ITEM_STOCK_CHANGED',
    payload: { itemId: updatedItem.id, inStock: updatedItem.inStock }
  });

  res.json({ success: true, item: updatedItem });
});

module.exports = router;
