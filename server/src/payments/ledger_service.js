// ThelaExpress - Append-Only Financial Ledger & Reconciliation Engine
// Enforces mathematical balance and absolute immutability of past transactions.

class LedgerService {
  constructor(db) {
    this.db = db;
  }

  // 1. Record Initial Payment Inflow (FUNDS_COLLECTED)
  recordOrderPaymentFunds(order, paymentRecord, pricingAllocation) {
    if (!this.db.data.ledger_entries) this.db.data.ledger_entries = [];
    if (!this.db.data.vendor_settlements) this.db.data.vendor_settlements = [];
    if (!this.db.data.rider_settlements) this.db.data.rider_settlements = [];

    // Idempotency: prevent recording funds more than once for the same order
    const existing = this.db.data.ledger_entries.find(
      e => e.order_id === order.id && e.entry_type === 'FUNDS_COLLECTED'
    );
    if (existing) {
      return { success: true, ledgerEntry: existing, isDuplicate: true };
    }

    const now = new Date().toISOString();
    const pricing = pricingAllocation.pricing;
    const allocation = pricingAllocation.allocation;

    const ledgerEntry = Object.freeze({
      id: `ledg_fund_${order.id}_${Date.now()}`,
      order_id: order.id,
      entry_type: 'FUNDS_COLLECTED',
      customer_paid: pricing.customer_total,
      food_subtotal: pricing.food_subtotal,
      vendor_discount: pricing.vendor_discount,
      platform_discount: pricing.platform_discount,
      packaging_fee: pricing.packaging_fee,
      delivery_fee: pricing.delivery_fee,
      tip: pricing.tip,
      taxes: pricing.taxes,
      platform_commission: allocation.platform_commission,
      vendor_payable: allocation.vendor_payable,
      rider_payable: allocation.rider_payable,
      tax_payable: allocation.tax_payable,
      gateway_fee: allocation.gateway_fee,
      platform_net_margin: allocation.platform_net_margin,
      payment_ref: paymentRecord.providerTransactionId,
      is_sandbox: Boolean(paymentRecord.isSandbox || paymentRecord.mode === 'SANDBOX'),
      created_at: now
    });

    this.db.data.ledger_entries.push(ledgerEntry);

    // Initial Vendor Settlement Record (PENDING)
    const vendorSettlement = {
      id: `vstl_${order.id}`,
      order_id: order.id,
      stall_id: order.stall_id,
      stall_name: order.stall_name,
      gross_sales: (pricing.food_subtotal - pricing.vendor_discount) + pricing.packaging_fee,
      packaging_fee: pricing.packaging_fee,
      commission_rate_pct: allocation.commission_rate_pct,
      commission_deducted: allocation.platform_commission,
      original_payable: allocation.vendor_payable,
      net_payable: allocation.vendor_payable,
      current_balance: allocation.vendor_payable,
      status: 'PENDING', // PENDING -> ELIGIBLE -> PROCESSING -> PAID
      payout_id: null,
      utr: null,
      is_sandbox: Boolean(paymentRecord.isSandbox || paymentRecord.mode === 'SANDBOX'),
      created_at: now,
      updated_at: now
    };
    this.db.data.vendor_settlements.push(vendorSettlement);

    // Initial Rider Settlement Record (PENDING)
    const riderSettlement = {
      id: `rstl_${order.id}`,
      order_id: order.id,
      rider_id: order.rider_id || null,
      base_fee: allocation.rider_base_fee,
      tip: allocation.rider_tip,
      original_earnings: allocation.rider_payable,
      net_earnings: allocation.rider_payable,
      total_earnings: allocation.rider_payable,
      current_balance: allocation.rider_payable,
      status: 'PENDING', // PENDING -> ELIGIBLE -> PROCESSING -> PAID
      payout_id: null,
      utr: null,
      is_sandbox: Boolean(paymentRecord.isSandbox || paymentRecord.mode === 'SANDBOX'),
      created_at: now,
      updated_at: now
    };
    this.db.data.rider_settlements.push(riderSettlement);

    this.db.save();
    return { success: true, ledgerEntry, vendorSettlement, riderSettlement };
  }

  // 2. Append-Only Refund & Adjustment Entry (NEVER mutates original entry!)
  recordRefundAdjustment(order, {
    refundAmount,
    refundType = 'FULL',
    reason = '',
    actorRole = 'system',
    actorId = 'system',
    providerRefundId = ''
  } = {}) {
    if (!this.db.data.ledger_entries) this.db.data.ledger_entries = [];
    const cleanRefund = Math.round(Number(refundAmount));
    if (cleanRefund <= 0) {
      throw new Error('Refund amount must be greater than 0.');
    }

    const currentSummary = this.getOrderFinancialSummary(order.id);
    if (cleanRefund > currentSummary.net_customer_payment) {
      throw new Error(`Cannot refund ₹${cleanRefund}. Maximum refundable amount is ₹${currentSummary.net_customer_payment}.`);
    }

    const initialFund = this.db.data.ledger_entries.find(
      e => e.order_id === order.id && e.entry_type === 'FUNDS_COLLECTED'
    );
    if (!initialFund) {
      throw new Error(`Cannot issue refund: No funds collected record found for order #${order.id}.`);
    }

    const vStl = this.db.data.vendor_settlements.find(s => s.order_id === order.id);
    const rStl = this.db.data.rider_settlements.find(s => s.order_id === order.id);

    let vendorDelta = 0;
    let riderDelta = 0;
    let taxDelta = 0;
    let platformDelta = 0;

    const commissionPct = (vStl && vStl.commission_rate_pct) || 10;

    if (refundType === 'FULL' || cleanRefund === currentSummary.net_customer_payment) {
      // Full Reversal
      vendorDelta = -currentSummary.net_vendor_payable;
      riderDelta = -currentSummary.net_rider_payable;
      taxDelta = -currentSummary.net_tax_payable;
      platformDelta = -currentSummary.net_platform_margin;
    } else if (refundType === 'PARTIAL_FOOD') {
      // Partial food refund: Vendor food amount reversed proportionally net of commission
      // Rider completed delivery, so rider keeps base fee and tip (riderDelta = 0)
      const foodRefundAmount = cleanRefund;
      const vendorShare = Math.round(foodRefundAmount * ((100 - commissionPct) / 100));
      const platformCommShare = foodRefundAmount - vendorShare;

      vendorDelta = -Math.min(currentSummary.net_vendor_payable, vendorShare);
      riderDelta = 0; // delivery was performed
      taxDelta = 0;
      platformDelta = -(cleanRefund + vendorDelta); // platform absorbs remaining difference
    } else if (refundType === 'DELIVERY_FEE') {
      // Late delivery fee refund absorbed by platform; vendor and rider unaffected
      vendorDelta = 0;
      riderDelta = 0;
      taxDelta = 0;
      platformDelta = -cleanRefund;
    } else {
      // Generic proportional allocation
      vendorDelta = -Math.min(currentSummary.net_vendor_payable, Math.round(cleanRefund * 0.75));
      riderDelta = 0;
      taxDelta = 0;
      platformDelta = -(cleanRefund + vendorDelta);
    }

    const now = new Date().toISOString();
    const adjustmentEntry = Object.freeze({
      id: `ledg_adj_${order.id}_${Date.now()}`,
      order_id: order.id,
      entry_type: 'REFUND',
      refund_type: refundType,
      refund_amount: cleanRefund,
      vendor_payable_delta: vendorDelta,
      rider_payable_delta: riderDelta,
      tax_delta: taxDelta,
      platform_margin_delta: platformDelta,
      provider_refund_id: providerRefundId,
      reason,
      actor_role: actorRole,
      actor_id: actorId,
      created_at: now
    });

    this.db.data.ledger_entries.push(adjustmentEntry);

    // Update settlement current balances without deleting history
    if (vStl) {
      vStl.current_balance = Math.max(0, vStl.current_balance + vendorDelta);
      if (vStl.current_balance === 0) {
        vStl.status = 'CANCELLED';
      }
      vStl.updated_at = now;
    }

    if (rStl) {
      rStl.current_balance = Math.max(0, rStl.current_balance + riderDelta);
      if (rStl.current_balance === 0) {
        rStl.status = 'CANCELLED';
      }
      rStl.updated_at = now;
    }

    this.db.save();
    return { success: true, adjustmentEntry, orderId: order.id };
  }

  // 3. Update Rider Assignment on Settlement
  assignRiderToSettlement(orderId, riderId) {
    if (!this.db.data.rider_settlements) return;
    const rStl = this.db.data.rider_settlements.find(s => s.order_id === orderId);
    if (rStl) {
      rStl.rider_id = riderId;
      rStl.updated_at = new Date().toISOString();
      this.db.save();
    }
  }

  // 4. Mark Settlements ELIGIBLE when Order is DELIVERED
  onOrderDelivered(orderId) {
    const vStl = (this.db.data.vendor_settlements || []).find(s => s.order_id === orderId);
    const rStl = (this.db.data.rider_settlements || []).find(s => s.order_id === orderId);
    const now = new Date().toISOString();

    if (vStl && vStl.status === 'PENDING' && vStl.current_balance > 0) {
      vStl.status = 'ELIGIBLE';
      vStl.eligible_at = now;
      vStl.updated_at = now;
    }
    if (rStl && rStl.status === 'PENDING' && rStl.current_balance > 0) {
      rStl.status = 'ELIGIBLE';
      rStl.eligible_at = now;
      rStl.updated_at = now;
    }
    this.db.save();
  }

  // 5. Derive Current Financial Balance from Append-Only Ledger
  getOrderFinancialSummary(orderId) {
    const entries = (this.db.data.ledger_entries || []).filter(e => e.order_id === orderId);
    
    let totalCustomerPaid = 0;
    let totalRefunded = 0;
    let netVendorPayable = 0;
    let netRiderPayable = 0;
    let netTaxPayable = 0;
    let netPlatformMargin = 0;

    entries.forEach(e => {
      if (e.entry_type === 'FUNDS_COLLECTED') {
        totalCustomerPaid += e.customer_paid;
        netVendorPayable += e.vendor_payable;
        netRiderPayable += e.rider_payable;
        netTaxPayable += e.tax_payable;
        netPlatformMargin += e.platform_net_margin;
      } else if (e.entry_type === 'REFUND') {
        totalRefunded += e.refund_amount;
        netVendorPayable += (e.vendor_payable_delta || 0);
        netRiderPayable += (e.rider_payable_delta || 0);
        netTaxPayable += (e.tax_delta || 0);
        netPlatformMargin += (e.platform_margin_delta || 0);
      }
    });

    const netCustomerPayment = totalCustomerPaid - totalRefunded;
    const balancedTotal = netVendorPayable + netRiderPayable + netTaxPayable + netPlatformMargin;
    const isBalanced = netCustomerPayment === balancedTotal;

    return {
      orderId,
      entriesCount: entries.length,
      total_customer_paid: totalCustomerPaid,
      total_refunded: totalRefunded,
      net_customer_payment: netCustomerPayment,
      net_vendor_payable: netVendorPayable,
      net_rider_payable: netRiderPayable,
      net_tax_payable: netTaxPayable,
      net_platform_margin: netPlatformMargin,
      is_balanced: isBalanced,
      discrepancy: netCustomerPayment - balancedTotal,
      entries
    };
  }

  // 6. Platform-Wide Financial Reconciliation Report
  getPlatformReconciliation() {
    const orders = this.db.data.orders || [];
    const results = orders.map(o => this.getOrderFinancialSummary(o.id));

    const totalCollected = results.reduce((acc, r) => acc + r.total_customer_paid, 0);
    const totalRefunded = results.reduce((acc, r) => acc + r.total_refunded, 0);
    const netVendorPayable = results.reduce((acc, r) => acc + r.net_vendor_payable, 0);
    const netRiderPayable = results.reduce((acc, r) => acc + r.net_rider_payable, 0);
    const netTaxPayable = results.reduce((acc, r) => acc + r.net_tax_payable, 0);
    const netPlatformMargin = results.reduce((acc, r) => acc + r.net_platform_margin, 0);

    const netCollected = totalCollected - totalRefunded;
    const sumAllocated = netVendorPayable + netRiderPayable + netTaxPayable + netPlatformMargin;

    return {
      totalOrdersAudited: results.length,
      totalCollected,
      totalRefunded,
      netCollected,
      netVendorPayable,
      netRiderPayable,
      netTaxPayable,
      netPlatformMargin,
      isPlatformBalanced: netCollected === sumAllocated,
      discrepancy: netCollected - sumAllocated,
      orderSummaries: results
    };
  }
}

module.exports = LedgerService;
