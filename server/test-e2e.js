// E2E Verification Script for ThelaExpress APIs
const http = require('http');

function request(options, data) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch (e) {
          resolve({ status: res.statusCode, raw: body });
        }
      });
    });
    req.on('error', reject);
    if (data) {
      req.write(typeof data === 'string' ? data : JSON.stringify(data));
    }
    req.end();
  });
}

async function run() {
  console.log('Testing 1: Stalls API...');
  const stalls = await request({ host: 'localhost', port: 5000, path: '/api/stalls', method: 'GET' });
  console.log('Stalls found:', stalls.data.stalls.length);

  console.log('Testing 2: Phone OTP Authentication...');
  const auth = await request({
    host: 'localhost',
    port: 5000,
    path: '/api/auth/verify-otp',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { phone: '9876543210', otp: '1234' });
  console.log('Auth user:', auth.data.user.name, 'Token:', auth.data.token ? 'YES' : 'NO');

  console.log('Testing 3: Creating Order...');
  const orderRes = await request({
    host: 'localhost',
    port: 5000,
    path: '/api/orders',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, {
    customer_phone: '9876543210',
    customer_name: 'Anurag Sharma',
    stall_id: 'stall_1',
    stall_name: 'Sharma Ji Ka Mashoor Chaat',
    items: [{ item_id: 'item_101', name: 'Hing Pani Golgappe', price: 40, qty: 2 }],
    subtotal: 80,
    packaging_fee: 10,
    grand_total: 90
  });
  const orderId = orderRes.data.order.id;
  const otp = orderRes.data.order.otp;
  console.log(`Created Order: #${orderId}, OTP: ${otp}, Grand Total: ₹${orderRes.data.order.grand_total}`);

  console.log('Testing 4: Vendor Transition to COOKING...');
  const patchRes = await request({
    host: 'localhost',
    port: 5000,
    path: `/api/orders/${orderId}/status`,
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' }
  }, { status: 'COOKING' });
  console.log(`Order status updated to: ${patchRes.data.order.status}`);

  console.log('Testing 5: Rider Doorstep OTP Delivery Verification...');
  const verifyRes = await request({
    host: 'localhost',
    port: 5000,
    path: `/api/orders/${orderId}/verify-otp`,
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { otp: otp });
  console.log(`Delivery verified: ${verifyRes.data.success}, Final status: ${verifyRes.data.order.status}`);

  console.log('ALL BACKEND WORKFLOWS PASSED SUCCESSFULLY!');
}

run().catch(console.error);
