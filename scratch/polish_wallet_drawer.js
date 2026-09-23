// scratch/polish_wallet_drawer.js
const fs = require('fs');
const path = require('path');

const htmlPath = path.join(__dirname, '..', 'public', 'index.html');
let html = fs.readFileSync(htmlPath, 'utf8').replace(/\r\n/g, '\n');

// Polish walletDrawer inner content
html = html.replace(
  '<div class="p-4 border-b border-stone-800 flex items-center justify-between">',
  '<div class="p-4 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between">'
);
html = html.replace(
  '<h3 class="font-black text-sm text-white">Thela Money Wallet</h3>',
  '<h3 class="font-black text-sm text-stone-900 dark:text-white">Thela Money Wallet</h3>'
);
html = html.replace(
  '<p class="text-[10px] text-stone-400">Instant 1-tap checkout & lightning refunds</p>',
  '<p class="text-[10px] text-stone-500 dark:text-stone-400">Instant 1-tap checkout & lightning refunds</p>'
);
html = html.replace(
  '<button onclick="closeWalletDrawer()" class="w-8 h-8 rounded-full bg-stone-900 text-stone-400 hover:text-white flex items-center justify-center">',
  '<button onclick="closeWalletDrawer()" class="w-8 h-8 rounded-full bg-stone-100 dark:bg-stone-900 text-stone-600 dark:text-stone-400 hover:bg-stone-200 dark:hover:text-white flex items-center justify-center">'
);
html = html.replace(
  '<label class="font-bold text-stone-400">Quick Recharge Amount</label>',
  '<label class="font-bold text-stone-700 dark:text-stone-400">Quick Recharge Amount</label>'
);
html = html.replace(
  '<button onclick="rechargeWallet(200)" class="py-2 rounded-xl bg-stone-900 border border-stone-800 hover:border-amber-500 text-white font-bold transition">+₹200</button>',
  '<button onclick="rechargeWallet(200)" class="py-2 rounded-xl bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-800 hover:border-amber-500 text-stone-900 dark:text-white font-bold transition shadow-xs">+₹200</button>'
);
html = html.replace(
  '<button onclick="rechargeWallet(500)" class="py-2 rounded-xl bg-stone-900 border border-stone-800 hover:border-amber-500 text-white font-bold transition">+₹500</button>',
  '<button onclick="rechargeWallet(500)" class="py-2 rounded-xl bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-800 hover:border-amber-500 text-stone-900 dark:text-white font-bold transition shadow-xs">+₹500</button>'
);
html = html.replace(
  '<button onclick="rechargeWallet(1000)" class="py-2 rounded-xl bg-stone-900 border border-stone-800 hover:border-amber-500 text-white font-bold transition">+₹1000</button>',
  '<button onclick="rechargeWallet(1000)" class="py-2 rounded-xl bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-800 hover:border-amber-500 text-stone-900 dark:text-white font-bold transition shadow-xs">+₹1000</button>'
);
html = html.replace(
  '<div class="text-xs font-black text-stone-400 uppercase tracking-wider">Recent Transactions</div>',
  '<div class="text-xs font-black text-stone-500 dark:text-stone-400 uppercase tracking-wider">Recent Transactions</div>'
);
html = html.replace(
  '<div class="bg-stone-900 border border-stone-800 rounded-2xl p-4 text-center text-xs text-stone-500">',
  '<div class="bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-4 text-center text-xs text-stone-500 dark:text-stone-400">'
);

fs.writeFileSync(htmlPath, html.replace(/\n/g, '\r\n'), 'utf8');
console.log('✓ walletDrawer polished with adaptive theme classes');
