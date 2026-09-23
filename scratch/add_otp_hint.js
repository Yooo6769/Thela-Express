// scratch/add_otp_hint.js
const fs = require('fs');
const path = require('path');

const htmlPath = path.join(__dirname, '..', 'public', 'index.html');
let html = fs.readFileSync(htmlPath, 'utf8');

const target = 'Enter the 4-digit verification code sent to your phone.';
const repl = 'Enter the 4-digit code sent to your phone or use test code: <strong class="text-orange-600 font-mono">1234</strong>';

if (html.includes(target)) {
  html = html.replace(target, repl);
  fs.writeFileSync(htmlPath, html, 'utf8');
  console.log('✓ Successfully added OTP helper text in index.html');
} else {
  console.warn('Target not found');
}
