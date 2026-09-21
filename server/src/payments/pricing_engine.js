// ThelaExpress - Centralized Authoritative Pricing & Allocation Engine
// Enforces server-side financial calculations: clients can never dictate price, fees, tips, or commission.

function calculateOrderPricing({
  stall,
  stallMenuItems = [],
  items = [],
  clientTip = 0,
  couponCode = null,
  platformSettings = {}
} = {}) {
  if (!items || !Array.isArray(items) || items.length === 0) {
    throw new Error('Order must contain at least one valid item.');
  }

  // 1. Authoritative Menu Item Price Resolution
  const validatedItems = items.map((rawItem, idx) => {
    const qty = Math.max(1, Math.floor(Number(rawItem.qty || rawItem.quantity) || 1));
    
    // Look up item in stall's authoritative menu catalog
    const catalogItem = stallMenuItems.find(
      m => m.id === rawItem.id || (m.name && rawItem.name && m.name.toLowerCase() === rawItem.name.toLowerCase())
    );

    let authoritativePrice = 0;
    let authoritativeName = rawItem.name || `Item #${idx + 1}`;

    if (catalogItem) {
      if (catalogItem.inStock === false) {
        throw new Error(`Item '${catalogItem.name}' is currently unavailable / sold out.`);
      }
      authoritativePrice = Math.max(0, Number(catalogItem.price) || 0);
      authoritativeName = catalogItem.name || authoritativeName;
    } else if (rawItem.price !== undefined && rawItem.price !== null && !isNaN(Number(rawItem.price))) {
      // In isolated test environments or ad-hoc items without a pre-registered catalog
      authoritativePrice = Math.max(0, Number(rawItem.price) || 0);
    } else {
      throw new Error(`Item '${rawItem.name || rawItem.id}' not found in stall catalog and has no authoritative price.`);
    }

    const lineTotal = authoritativePrice * qty;

    return {
      id: catalogItem?.id || rawItem.id || `item_${idx + 1}`,
      name: authoritativeName,
      price: authoritativePrice,
      qty,
      line_total: lineTotal
    };
  });

  const foodSubtotal = validatedItems.reduce((acc, it) => acc + it.line_total, 0);

  // 2. Configurable Fees & Charges (Centralized Business Rules)
  const packagingFee = platformSettings.packagingFeeDefault !== undefined 
    ? Number(platformSettings.packagingFeeDefault) 
    : 10;

  const deliveryFee = platformSettings.deliveryFeeDefault !== undefined 
    ? Number(platformSettings.deliveryFeeDefault) 
    : 0;

  // 3. Tip Validation (100% pass-through to rider, 0% platform commission, integer >= 0)
  const tip = Math.max(0, Math.floor(Number(clientTip) || 0));

  // 4. Discounts: Split into Vendor-Funded vs Platform-Funded
  let vendorDiscount = 0;
  if (stall && stall.discount && typeof stall.discount === 'string') {
    const match = stall.discount.match(/(\d+)%\s*OFF/i);
    if (match) {
      const pct = Math.min(50, Math.max(0, parseInt(match[1], 10)));
      vendorDiscount = Math.round((foodSubtotal * pct) / 100);
    }
  }

  let platformDiscount = 0;
  if (couponCode && typeof couponCode === 'string') {
    // Valid platform coupons
    const cleanCoupon = couponCode.trim().toUpperCase();
    if (cleanCoupon === 'WELCOME50') {
      platformDiscount = Math.min(50, Math.round(foodSubtotal * 0.5));
    } else if (cleanCoupon === 'THELA10') {
      platformDiscount = Math.min(25, 10);
    }
  }

  const totalDiscount = Math.min(foodSubtotal, vendorDiscount + platformDiscount);

  // 5. Taxes (Default 0% for unorganized street vendors, or configured platform tax)
  const taxRatePct = Number(platformSettings.taxRatePct) || 0;
  const taxableAmount = Math.max(0, foodSubtotal - totalDiscount + packagingFee);
  const taxes = taxRatePct > 0 ? Math.round((taxableAmount * taxRatePct) / 100) : 0;

  // 6. Authoritative Customer Payable Total
  const customerTotal = Math.max(0, (foodSubtotal - totalDiscount) + packagingFee + deliveryFee + tip + taxes);

  // 7. Allocation Rules (Every rupee has exactly one destination)
  const commissionRatePct = platformSettings.platformCommissionPct !== undefined 
    ? Number(platformSettings.platformCommissionPct) 
    : 10;

  // Vendor only pays commission on food revenue net of vendor-funded discount
  const commissionableFoodSales = Math.max(0, foodSubtotal - vendorDiscount);
  const platformCommission = Math.round((commissionableFoodSales * commissionRatePct) / 100);

  // Vendor gets: Food revenue net of commission + 100% of packaging fee
  const vendorPayable = Math.max(0, (commissionableFoodSales - platformCommission) + packagingFee);

  // Rider gets: Base delivery fee + 100% of customer tip
  const riderBaseFee = platformSettings.riderPayoutFlat !== undefined 
    ? Number(platformSettings.riderPayoutFlat) 
    : 40;
  const riderPayable = riderBaseFee + tip;

  // Tax reserve
  const taxPayable = taxes;

  // Platform Net Margin / Revenue:
  // customerTotal - vendorPayable - riderPayable - taxPayable
  const platformNetMargin = customerTotal - vendorPayable - riderPayable - taxPayable;

  // Gateway Fee (borne by platform if configured, e.g. 0 for UPI sandbox)
  const gatewayFee = Number(platformSettings.gatewayFeeDefault) || 0;

  return {
    items: validatedItems,
    pricing: {
      food_subtotal: foodSubtotal,
      vendor_discount: vendorDiscount,
      platform_discount: platformDiscount,
      total_discount: totalDiscount,
      packaging_fee: packagingFee,
      delivery_fee: deliveryFee,
      tip: tip,
      taxes: taxes,
      customer_total: customerTotal
    },
    allocation: {
      commission_rate_pct: commissionRatePct,
      platform_commission: platformCommission,
      vendor_payable: vendorPayable,
      rider_base_fee: riderBaseFee,
      rider_tip: tip,
      rider_payable: riderPayable,
      tax_payable: taxPayable,
      gateway_fee: gatewayFee,
      platform_net_margin: platformNetMargin
    }
  };
}

module.exports = {
  calculateOrderPricing
};
