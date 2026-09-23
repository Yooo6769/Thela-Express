// scratch/fix_pills_ids.js
const fs = require('fs');
const path = require('path');

const htmlPath = path.join(__dirname, '..', 'public', 'index.html');
let html = fs.readFileSync(htmlPath, 'utf8');

html = html.replace(
  '<button onclick="openFilterDrawer()" class="px-3 py-1.5 rounded-xl border border-stone-200',
  '<button id="btnFilterAll" onclick="openFilterDrawer()" class="px-3 py-1.5 rounded-xl border border-stone-200'
);

html = html.replace(
  'id="pillNearFast"',
  'id="btnNearFast" data-alias="pillNearFast"'
);

html = html.replace(
  'id="pillNoPackaging"',
  'id="btnNoPackaging" data-alias="pillNoPackaging"'
);

html = html.replace(
  'id="pillTopRated"',
  'id="btnTopRated" data-alias="pillTopRated"'
);

html = html.replace(
  '<button onclick="scrollToDiscoverySection(\'secUnder100\')"',
  '<button id="btnUnder100" onclick="scrollToDiscoverySection(\'secUnder100\')"'
);

html = html.replace(
  'id="favPillBtn"',
  'id="btnFavorites" data-alias="favPillBtn"'
);

fs.writeFileSync(htmlPath, html, 'utf8');
console.log('✓ Successfully added IDs to quick filter pills in index.html');
