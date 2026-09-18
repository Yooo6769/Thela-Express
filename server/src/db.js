// ThelaExpress - Persistent Storage & Database Engine
const fs = require('fs');
const path = require('path');

const DB_FILE = path.join(__dirname, '..', 'data', 'thela.db.json');

// Initial clean production data (No mock vendors, dishes or fake orders)
const SEED_DATA = {
  users: [],
  stalls: [],
  menu_items: [],
  orders: [],
  riders: [],
  otps: {}
};

class Database {
  constructor() {
    this.ensureDirectory();
    this.load();
  }

  ensureDirectory() {
    const dir = path.dirname(DB_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  load() {
    if (!fs.existsSync(DB_FILE)) {
      this.data = JSON.parse(JSON.stringify(SEED_DATA));
      this.save();
    } else {
      try {
        const raw = fs.readFileSync(DB_FILE, 'utf8');
        this.data = JSON.parse(raw);
        if (!this.data.settings) {
          this.data.settings = {
            platformUpi: 'thelaexpress@icici',
            platformCommissionPct: 10,
            riderPayoutFlat: 40,
            deliveryRadiusKm: 2.5
          };
          this.save();
        }
      } catch (e) {
        console.error('Failed to parse DB file, resetting to seed:', e);
        this.data = JSON.parse(JSON.stringify(SEED_DATA));
        this.data.settings = {
          platformUpi: 'thelaexpress@icici',
          platformCommissionPct: 10,
          riderPayoutFlat: 40,
          deliveryRadiusKm: 2.5
        };
        this.save();
      }
    }
  }

  save() {
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(this.data, null, 2), 'utf8');
    } catch (e) {
      console.error('Failed to write DB file:', e);
    }
  }

  // Users & Profiles
  findUserByPhone(phone) {
    if (!phone) return null;
    const cleanPhone = phone.replace(/\D/g, '').slice(-10);
    return this.data.users.find(u => u.phone === cleanPhone);
  }

  createUser(userData) {
    const cleanPhone = (userData.phone || '').replace(/\D/g, '').slice(-10);
    const user = {
      id: `usr_${Date.now()}`,
      phone: cleanPhone,
      name: userData.name || 'Street Foodie',
      email: userData.email || '',
      role: userData.role || 'customer',
      membership: 'Thela Club Member',
      vegPreference: !!userData.vegPreference,
      favorites: userData.favorites || [],
      addresses: userData.addresses || [],
      created_at: new Date().toISOString()
    };
    this.data.users.push(user);
    this.save();
    return user;
  }

  updateUser(phone, updateData) {
    let user = this.findUserByPhone(phone);
    if (!user) {
      user = this.createUser({ phone, ...updateData });
      return user;
    }
    if (updateData.name !== undefined) user.name = updateData.name.trim();
    if (updateData.email !== undefined) user.email = updateData.email.trim();
    if (updateData.vegPreference !== undefined) user.vegPreference = !!updateData.vegPreference;
    if (updateData.membership !== undefined) user.membership = updateData.membership;
    this.save();
    return user;
  }

  addUserAddress(phone, addressData) {
    let user = this.findUserByPhone(phone);
    if (!user) {
      user = this.createUser({ phone });
    }
    if (!user.addresses) user.addresses = [];

    const isDefault = addressData.isDefault || user.addresses.length === 0;
    if (isDefault) {
      user.addresses.forEach(a => { a.isDefault = false; });
    }

    const house = (addressData.house || '').trim();
    const street = (addressData.street || '').trim();
    const landmark = (addressData.landmark || '').trim();
    const city = (addressData.city || 'Bengaluru').trim();

    let fullTitle = house ? `${house}, ${street}` : street;
    if (landmark) fullTitle += ` (Near ${landmark})`;
    if (!fullTitle) fullTitle = 'Custom Delivery Point';

    const newAddress = {
      id: `addr_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      tag: addressData.tag || 'Home', // 'Home', 'Work', 'Other'
      house: house,
      street: street,
      landmark: landmark,
      city: city,
      title: fullTitle,
      lat: parseFloat(addressData.lat) || 12.9719,
      lng: parseFloat(addressData.lng) || 77.6412,
      isDefault: isDefault
    };

    user.addresses.unshift(newAddress);
    this.save();
    return newAddress;
  }

  deleteUserAddress(phone, addressId) {
    const user = this.findUserByPhone(phone);
    if (!user || !user.addresses) return false;
    const idx = user.addresses.findIndex(a => a.id === addressId);
    if (idx === -1) return false;
    const wasDefault = user.addresses[idx].isDefault;
    user.addresses.splice(idx, 1);
    if (wasDefault && user.addresses.length > 0) {
      user.addresses[0].isDefault = true;
    }
    this.save();
    return true;
  }

  setDefaultAddress(phone, addressId) {
    const user = this.findUserByPhone(phone);
    if (!user || !user.addresses) return false;
    user.addresses.forEach(a => {
      a.isDefault = (a.id === addressId);
    });
    this.save();
    return true;
  }

  toggleFavorite(phone, stallId) {
    let user = this.findUserByPhone(phone);
    if (!user) user = this.createUser({ phone });
    if (!user.favorites) user.favorites = [];

    const idx = user.favorites.indexOf(stallId);
    let isFavorite = false;
    if (idx > -1) {
      user.favorites.splice(idx, 1);
    } else {
      user.favorites.push(stallId);
      isFavorite = true;
    }
    this.save();
    return { isFavorite, favorites: user.favorites };
  }

  computeTrustBadges(stall) {
    if (!stall) return [];
    const badges = [];
    if (stall.fssai_status === 'verified') {
      badges.push({
        id: 'fssai_verified',
        type: 'fssai',
        label: 'FSSAI Verified',
        icon: 'fa-shield-check',
        color: 'emerald',
        verifiedAt: stall.fssai_verified_at,
        details: `License #${stall.fssai_number ? (stall.fssai_number.length > 6 ? stall.fssai_number.slice(0, 4) + '••••' + stall.fssai_number.slice(-4) : stall.fssai_number) : 'Verified'}`
      });
    }
    if (stall.hygiene_status === 'verified' || stall.hygiene_status === 'certified') {
      badges.push({
        id: 'hygiene_verified',
        type: 'hygiene',
        label: 'Thela Hygiene Verified',
        icon: 'fa-sparkles',
        color: 'amber',
        verifiedAt: stall.hygiene_verified_at,
        score: stall.hygiene_score || 95,
        details: `Hygiene Score: ${stall.hygiene_score || 95}/100`
      });
    }
    if (stall.identity_status === 'verified' || stall.is_verified) {
      badges.push({
        id: 'thela_verified',
        type: 'identity',
        label: 'Thela Verified Partner',
        icon: 'fa-circle-check',
        color: 'blue',
        verifiedAt: stall.identity_verified_at,
        details: 'Physical cart & vendor KYC verified'
      });
    }
    if (badges.length === 0) {
      badges.push({
        id: 'under_review',
        type: 'pending',
        label: 'Audits in Progress',
        icon: 'fa-clock-rotate-left',
        color: 'gray',
        details: 'Initial onboarding verification underway'
      });
    }
    return badges;
  }

  formatStallForPublic(stall) {
    if (!stall) return null;
    const badges = this.computeTrustBadges(stall);
    const primaryBadge = badges.find(b => b.type !== 'pending') || badges[0];
    return {
      ...stall,
      trustBadges: badges,
      hygieneBadge: primaryBadge ? primaryBadge.label : 'Audits in Progress'
    };
  }

  // Stalls & Categories
  getStalls(category) {
    let list = this.data.stalls || [];
    if (category && category !== 'all') {
      const target = category.toLowerCase().replace(/[^a-z0-9]/g, '');
      list = list.filter(s => {
        if (!s.category) return false;
        const cat = s.category.toLowerCase().replace(/[^a-z0-9]/g, '');
        return cat === target || s.category.toLowerCase() === category.toLowerCase() || s.category.toLowerCase().includes(category.toLowerCase());
      });
    }
    return list.map(s => this.formatStallForPublic(s));
  }

  getCategories() {
    const defaultCats = [
      { id: 'all', name: 'All Stalls', icon: '🍽️' },
      { id: 'chaat', name: 'Chaat & Pani Puri', icon: '🥔' },
      { id: 'vadapav', name: 'Vada Pav', icon: '🍔' },
      { id: 'pavbhaji', name: 'Pav Bhaji & Tawa', icon: '🍲' },
      { id: 'momos', name: 'Momos & Dimsums', icon: '🥟' },
      { id: 'rolls', name: 'Kathi Rolls', icon: '🌯' },
      { id: 'south', name: 'Benne Dosa & Idli', icon: '🥞' },
      { id: 'parathas', name: 'Chole Bhature & Parathas', icon: '🫓' },
      { id: 'samosa', name: 'Samosa & Kachori', icon: '🥟' },
      { id: 'chinese', name: 'Chinese Wok & Noodles', icon: '🍜' },
      { id: 'biryani', name: 'Biryani & Kebab', icon: '🍗' },
      { id: 'shawarma', name: 'Shawarma', icon: '🥙' },
      { id: 'sweets', name: 'Jalebi & Sweets', icon: '🍯' },
      { id: 'beverages', name: 'Chai & Lassi', icon: '🥤' },
      { id: 'juices', name: 'Fresh Juices & Shakes', icon: '🍉' }
    ];

    // Collect any unique custom categories typed by real vendors
    const stallCats = new Set((this.data.stalls || []).map(s => s.category).filter(Boolean));
    stallCats.forEach(c => {
      const exists = defaultCats.some(d => d.id.toLowerCase() === c.toLowerCase() || d.name.toLowerCase() === c.toLowerCase());
      if (!exists) {
        defaultCats.push({
          id: c.toLowerCase(),
          name: c.charAt(0).toUpperCase() + c.slice(1),
          icon: '🍲'
        });
      }
    });

    return defaultCats;
  }

  getStallById(id) {
    return this.data.stalls.find(s => s.id === id);
  }

  updateStall(id, updates) {
    const stall = this.getStallById(id);
    if (stall) {
      Object.assign(stall, updates);
      this.save();
    }
    return stall;
  }

  // Menu items
  getMenuItems(stallId) {
    return this.data.menu_items.filter(m => m.stall_id === stallId);
  }

  toggleItemStock(itemId, inStock) {
    const item = this.data.menu_items.find(m => m.id === itemId);
    if (item) {
      item.inStock = inStock;
      this.save();
    }
    return item;
  }

  // Orders
  getOrders() {
    return this.data.orders;
  }

  getOrderById(id) {
    return this.data.orders.find(o => o.id === id);
  }

  getOrdersByCustomer(phone) {
    return this.data.orders.filter(o => o.customer_phone === phone).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }

  getOrdersByStall(stallId) {
    return this.data.orders.filter(o => o.stall_id === stallId).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }

  createOrder(orderData) {
    const otp = Math.floor(1000 + Math.random() * 9000).toString();
    const orderId = `TH-${Math.floor(1000 + Math.random() * 9000)}`;
    const newOrder = {
      id: orderId,
      customer_id: orderData.customer_id || '',
      customer_name: orderData.customer_name || 'Customer',
      customer_phone: (orderData.customer_phone || '').replace(/\D/g, '').slice(-10),
      stall_id: orderData.stall_id,
      stall_name: orderData.stall_name,
      items: orderData.items || [],
      subtotal: orderData.subtotal || 0,
      delivery_fee: orderData.delivery_fee || 0,
      packaging_fee: orderData.packaging_fee || 10,
      tip: orderData.tip || 0,
      discount: orderData.discount || 0,
      grand_total: orderData.grand_total || 0,
      status: 'PLACED',
      otp: otp,
      delivery_address: orderData.delivery_address || '',
      delivery_instruction: orderData.delivery_instruction || 'Leave at Door',
      payment_method: orderData.payment_method || 'UPI',
      payment_status: 'PAID',
      rider_id: orderData.rider_id || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    this.data.orders.unshift(newOrder);
    this.save();
    return newOrder;
  }

  updateOrderStatus(orderId, status, extra = {}) {
    const order = this.getOrderById(orderId);
    if (order) {
      order.status = status;
      order.updated_at = new Date().toISOString();
      Object.assign(order, extra);
      this.save();
    }
    return order;
  }

  rateOrder(orderId, ratingData) {
    const order = this.getOrderById(orderId);
    if (!order) return null;

    const stallRating = Math.min(5, Math.max(1, parseInt(ratingData.stallRating) || 5));
    const riderRating = Math.min(5, Math.max(1, parseInt(ratingData.riderRating) || 5));

    order.rating = {
      stallRating: stallRating,
      riderRating: riderRating,
      compliments: ratingData.compliments || [],
      comment: (ratingData.comment || '').trim(),
      created_at: new Date().toISOString()
    };

    // Recalculate stall rating
    const stall = this.getStallById(order.stall_id);
    if (stall) {
      if (!stall.ratingSum) {
        stall.ratingSum = (stall.rating || 4.8) * 10;
        stall.ratingCount = 10;
      }
      stall.ratingSum += stallRating;
      stall.ratingCount += 1;
      stall.rating = +(stall.ratingSum / stall.ratingCount).toFixed(1);
      stall.reviewsCount = `${stall.ratingCount} ratings`;
    }

    this.save();
    return order;
  }

  // Riders
  getRiders() {
    return this.data.riders;
  }

  getRiderById(id) {
    return this.data.riders.find(r => r.id === id);
  }

  updateRiderLocation(riderId, lat, lng) {
    const rider = this.getRiderById(riderId);
    if (rider) {
      rider.lat = lat;
      rider.lng = lng;
      this.save();
    }
    return rider;
  }

  // OTP Management
  saveOtp(phone, otp) {
    this.data.otps[phone] = {
      otp: otp,
      expires_at: Date.now() + 5 * 60 * 1000 // 5 minutes
    };
    this.save();
  }

  verifyOtp(phone, enteredOtp) {
    // Universal developer test OTP: '1234'
    if (enteredOtp === '1234') return true;
    const record = this.data.otps[phone];
    if (record && record.otp === enteredOtp && Date.now() <= record.expires_at) {
      delete this.data.otps[phone];
      this.save();
      return true;
    }
    return false;
  }

  // Real Vendor Self-Onboarding
  registerStall(stallData, menuItems = []) {
    const stallId = `stall_${Date.now()}`;
    const hasFssai = Boolean(stallData.fssai_number && stallData.fssai_number.trim());
    const newStall = {
      id: stallId,
      owner_name: stallData.owner_name || 'Vendor Partner',
      owner_phone: stallData.owner_phone,
      name: stallData.name,
      category: stallData.category || 'chaat',
      rating: 5.0,
      reviewsCount: '1 (New)',
      deliveryTime: '15-20 min',
      distance: '0.9 km',
      lat: parseFloat(stallData.lat) || 12.9725,
      lng: parseFloat(stallData.lng) || 77.6408,
      specialty: stallData.specialty || 'Authentic Street Special',
      heritageStory: stallData.heritageStory || 'Newly onboarded authentic street vendor on ThelaExpress.',
      priceForTwo: stallData.priceForTwo || '₹120 for two',
      discount: stallData.discount || '15% OFF On First Order',
      imageUrl: stallData.imageUrl || 'https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=800&q=80',
      upi_id: stallData.upi_id || 'vendor@upi',
      address: stallData.address || 'Indiranagar 100ft Rd',
      isOpen: true,
      isVeg: stallData.isVeg !== undefined ? Boolean(stallData.isVeg) : true,

      // 1. FSSAI Registration Lifecycle
      fssai_number: hasFssai ? stallData.fssai_number.trim() : '',
      fssai_status: hasFssai ? 'submitted' : 'not_submitted', // 'not_submitted' | 'submitted' | 'under_verification' | 'verified' | 'rejected' | 'expired'
      fssai_verified_at: null,
      fssai_expiry_date: null,
      fssai_rejection_reason: null,
      fssai_notes: '',

      // 2. Thela Express Hygiene Inspection Lifecycle (independent of FSSAI)
      hygiene_status: 'not_inspected', // 'not_inspected' | 'scheduled' | 'verified' | 'failed' | 'revoked'
      hygiene_score: null,
      hygiene_verified_at: null,
      hygiene_inspected_by: null,
      hygiene_notes: '',
      hygiene_checklist_verified: {
        roWater: false,
        coveredCart: false,
        foodGradePackaging: false,
        cleanOilPractice: false,
        cartSanitization: false
      },
      // Self-declared requirements submitted by vendor (informational, not certified badge)
      hygiene_self_declaration: stallData.hygieneHighlights || ['RO Clean Water', 'Covered Food Cart', 'Food-Grade Dona'],

      // 3. Vendor Identity & Location KYC
      identity_status: 'pending', // 'pending' | 'verified' | 'rejected'
      identity_verified_at: null,
      is_verified: false,

      created_at: new Date().toISOString()
    };

    this.data.stalls.push(newStall);

    // Save menu items
    if (Array.isArray(menuItems) && menuItems.length > 0) {
      menuItems.forEach((m, idx) => {
        const itemObj = {
          id: `item_${Date.now()}_${idx + 1}`,
          stall_id: stallId,
          name: m.name,
          description: m.description || 'Prepared fresh on order with authentic spices.',
          price: parseFloat(m.price) || 50,
          originalPrice: m.originalPrice ? parseFloat(m.originalPrice) : (parseFloat(m.price) + 15),
          rating: 5.0,
          reviews: 1,
          isVeg: m.isVeg !== undefined ? Boolean(m.isVeg) : true,
          bestseller: Boolean(m.bestseller),
          inStock: true,
          image: m.image || 'https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=600&q=80',
          customizations: m.customizations || []
        };
        this.data.menu_items.push(itemObj);
      });
    }

    this.save();
    return { stall: newStall, items: this.getMenuItems(stallId) };
  }

  // Real Delivery Agent Self-Onboarding
  registerRider(riderData) {
    const riderId = `rdr_${Date.now()}`;
    const newRider = {
      id: riderId,
      name: riderData.name,
      phone: riderData.phone,
      vehicle: riderData.vehicle || 'EV Scooter',
      vehicle_number: riderData.vehicle_number || '',
      upi_id: riderData.upi_id || '',
      area: riderData.area || 'Indiranagar',
      rating: 5.0,
      deliveriesCount: 0,
      is_online: true,
      is_verified: true,
      lat: 12.9735,
      lng: 77.6400,
      created_at: new Date().toISOString()
    };

    this.data.riders.push(newRider);
    this.save();
    return newRider;
  }

  // Admin Verification & Trust Management
  updateStallFssai(stallId, { status, fssaiNumber, expiryDate, rejectionReason, notes } = {}) {
    const stall = this.getStallById(stallId);
    if (!stall) return null;

    if (fssaiNumber !== undefined && fssaiNumber.trim()) {
      stall.fssai_number = fssaiNumber.trim();
    }
    if (status) {
      stall.fssai_status = status;
      if (status === 'verified') {
        stall.fssai_verified_at = new Date().toISOString();
        stall.fssai_rejection_reason = null;
      } else if (status === 'rejected') {
        stall.fssai_rejection_reason = rejectionReason || 'Certificate invalid or mismatch with business name.';
        stall.fssai_verified_at = null;
      } else if (status === 'expired') {
        stall.fssai_rejection_reason = 'FSSAI License has expired.';
      }
    }
    if (expiryDate !== undefined) stall.fssai_expiry_date = expiryDate;
    if (notes !== undefined) stall.fssai_notes = notes;

    this.save();
    return this.formatStallForPublic(stall);
  }

  recordHygieneInspection(stallId, { status, score, inspectedBy, checklist, checklistVerified, notes } = {}) {
    const stall = this.getStallById(stallId);
    if (!stall) return null;

    if (status) {
      stall.hygiene_status = status;
      if (status === 'verified' || status === 'certified') {
        stall.hygiene_verified_at = new Date().toISOString();
      } else if (['failed', 'revoked'].includes(status)) {
        stall.hygiene_verified_at = null;
      }
    }
    if (score !== undefined) stall.hygiene_score = parseInt(score) || 90;
    if (inspectedBy !== undefined) stall.hygiene_inspected_by = inspectedBy;
    const finalChecklist = checklistVerified !== undefined ? checklistVerified : checklist;
    if (finalChecklist !== undefined) {
      if (Array.isArray(finalChecklist)) {
        stall.hygiene_checklist_verified = finalChecklist;
      } else {
        stall.hygiene_checklist_verified = Object.assign(stall.hygiene_checklist_verified || {}, finalChecklist);
      }
    }
    if (notes !== undefined) stall.hygiene_notes = notes;

    this.save();
    return this.formatStallForPublic(stall);
  }

  updateStallIdentity(stallId, { status, notes } = {}) {
    const stall = this.getStallById(stallId);
    if (!stall) return null;

    if (status) {
      stall.identity_status = status;
      stall.is_verified = (status === 'verified');
      stall.identity_verified_at = (status === 'verified') ? new Date().toISOString() : null;
    }
    if (notes !== undefined) stall.identity_notes = notes;

    this.save();
    return this.formatStallForPublic(stall);
  }

  verifyStall(stallId, isApproved) {
    return this.updateStallIdentity(stallId, { status: isApproved ? 'verified' : 'rejected' });
  }

  verifyRider(riderId, isApproved) {
    const rider = this.getRiderById(riderId);
    if (rider) {
      rider.is_verified = isApproved;
      this.save();
    }
    return rider;
  }

  // Platform Business Analytics & Financials
  getPlatformStats() {
    const orders = this.data.orders || [];
    const deliveredOrders = orders.filter(o => o.status === 'DELIVERED');
    const totalRevenue = deliveredOrders.reduce((sum, o) => sum + (o.grand_total || 0), 0);
    const subtotalTotal = deliveredOrders.reduce((sum, o) => sum + (o.subtotal || 0), 0);
    const commissionPct = this.data.settings?.platformCommissionPct || 10;
    const platformCommission = Math.round((subtotalTotal * commissionPct) / 100);
    const riderPayoutFlat = this.data.settings?.riderPayoutFlat || 40;
    const totalRiderPayouts = deliveredOrders.length * riderPayoutFlat;
    const netPlatformMargin = platformCommission + (deliveredOrders.length * 10) - totalRiderPayouts; // delivery fee / packaging margins

    return {
      totalOrders: orders.length,
      deliveredOrders: deliveredOrders.length,
      activeOrders: orders.filter(o => !['DELIVERED', 'CANCELLED'].includes(o.status)).length,
      grossMerchandiseValue: totalRevenue,
      subtotalSum: subtotalTotal,
      platformCommission,
      commissionPct,
      riderPayoutFlat,
      totalRiderPayouts,
      stallsCount: (this.data.stalls || []).length,
      activeStalls: (this.data.stalls || []).filter(s => s.isOpen).length,
      ridersCount: (this.data.riders || []).length,
      activeRiders: (this.data.riders || []).filter(r => r.is_online).length,
      settings: this.data.settings || {}
    };
  }

  getSettings() {
    return this.data.settings || {
      platformUpi: 'thelaexpress@icici',
      platformCommissionPct: 10,
      riderPayoutFlat: 40,
      deliveryRadiusKm: 2.5
    };
  }

  updateSettings(newSettings) {
    this.data.settings = Object.assign(this.getSettings(), newSettings);
    this.save();
    return this.data.settings;
  }
}

module.exports = new Database();
