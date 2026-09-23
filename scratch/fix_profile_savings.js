// scratch/fix_profile_savings.js
const fs = require('fs');
const path = require('path');

const htmlPath = path.join(__dirname, '..', 'public', 'index.html');
let html = fs.readFileSync(htmlPath, 'utf8');

html = html.replace(
  '<span>saved ₹10816</span>',
  '<span id="profileGoldSavings">saved ₹10,816</span>'
);

html = html.replace(
  'id="profileMoneyAmount"',
  'id="profileWalletAmount" data-alias="profileMoneyAmount"'
);

fs.writeFileSync(htmlPath, html, 'utf8');
console.log('✓ Successfully added profileGoldSavings and profileWalletAmount to index.html');
